from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from backend.app.core.config import get_settings
from backend.app.services.data import resolve_project_path
from fastapi import UploadFile

ALLOWED_TEMPLATE_EXTENSIONS = {".xlsx", ".xls"}
ProjectStatus = Literal["configured", "empty", "results"]
ProjectFileKind = Literal["additional", "result", "template"]


def ensure_user_dir(username: str) -> Path:
    user_dir = _resolve_owner_dir(username)
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir


def _resolve_owner_dir(owner: str) -> Path:
    projects_root = get_settings().projects_dir.resolve()
    owner_dir = (projects_root / owner).resolve()
    if owner_dir == projects_root or projects_root not in owner_dir.parents:
        raise ValueError("Usuario no válido")
    return owner_dir


def normalize_project_name(project_name: str) -> str:
    normalized = project_name.strip()
    if not normalized:
        raise ValueError("El nombre del proyecto es obligatorio")
    if Path(normalized).name != normalized:
        raise ValueError("El nombre del proyecto no es válido")
    return normalized


def allowed_template_file(filename: str) -> bool:
    return bool(filename) and Path(filename).suffix.lower() in ALLOWED_TEMPLATE_EXTENSIONS


def _normalize_upload_filename(filename: str) -> str:
    normalized = filename.strip().replace("\\", "/")
    sanitized = Path(normalized).name
    if not sanitized or sanitized in {".", ".."} or sanitized != normalized:
        raise ValueError("El nombre del archivo no es válido")
    return sanitized


def _template_storage_name(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    return f"template{suffix}"


def _file_extension(file_path: str) -> str:
    return Path(file_path).suffix.lower()


def _is_template_path(file_path: str) -> bool:
    path = Path(file_path)
    filename = path.name.lower()
    return filename.startswith("template.") and path.suffix.lower() in ALLOWED_TEMPLATE_EXTENSIONS


def _is_result_path(file_path: str) -> bool:
    return Path(file_path).suffix.lower() in {".html", ".htm"}


def _classify_project_file(file_path: str) -> ProjectFileKind:
    if _is_template_path(file_path):
        return "template"
    if _is_result_path(file_path):
        return "result"
    return "additional"


def _project_status(files: list[str], html_files: list[str]) -> ProjectStatus:
    if html_files:
        return "results"
    if files:
        return "configured"
    return "empty"


def _project_timestamps(project_dir: Path) -> tuple[str, str]:
    stat = project_dir.stat()
    created_at = datetime.fromtimestamp(stat.st_ctime, timezone.utc).isoformat()
    updated_at = datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat()
    return created_at, updated_at


def _normalize_timestamp(value: Any) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _list_project_files(project_dir: Path) -> list[Path]:
    if not project_dir.exists():
        return []
    return sorted(
        [path for path in project_dir.rglob("*") if path.is_file()],
        key=lambda item: item.relative_to(project_dir).as_posix().lower(),
    )


def _build_project_payload(owner: str, project_dir: Path, metadata: dict[str, Any] | None = None) -> dict[str, object]:
    file_paths = _list_project_files(project_dir)
    files = [path.relative_to(project_dir).as_posix() for path in file_paths]
    template_file = next((file for file in files if _is_template_path(file)), None)
    html_files = [file for file in files if _is_result_path(file)]
    additional_files = [
        file
        for file in files
        if file != template_file and not _is_result_path(file)
    ]
    if project_dir.exists():
        created_at, updated_at = _project_timestamps(project_dir)
    else:
        now = datetime.now(timezone.utc).isoformat()
        created_at, updated_at = now, now

    created_at = _normalize_timestamp(metadata.get("created_at")) if metadata else created_at
    updated_at = _normalize_timestamp(metadata.get("updated_at")) if metadata else updated_at
    resolved_name = str(metadata.get("name") or project_dir.name).strip() if metadata else project_dir.name
    resolved_owner = str(metadata.get("owner_username") or metadata.get("owner") or owner).strip() if metadata else owner
    resolved_access_role = (
        str(metadata.get("access_role") or "").strip().lower() if metadata else ""
    )

    return {
        "access_role": resolved_access_role or None,
        "additional_files": additional_files,
        "created_at": created_at,
        "file_count": len(files),
        "file_entries": [
            {
                "extension": _file_extension(relative_path),
                "kind": _classify_project_file(relative_path),
                "name": Path(relative_path).name,
                "path": relative_path,
                "size_bytes": file_path.stat().st_size,
            }
            for file_path, relative_path in zip(file_paths, files, strict=True)
        ],
        "files": files,
        "html_files": html_files,
        "name": resolved_name,
        "owner": resolved_owner,
        "status": _project_status(files, html_files),
        "template_file": template_file,
        "updated_at": updated_at,
    }


async def _save_upload(target_path: Path, upload: UploadFile) -> None:
    with target_path.open("wb") as destination:
        while chunk := await upload.read(1024 * 1024):
            destination.write(chunk)
    await upload.close()


def get_project_dir(owner: str, project_name: str) -> Path:
    owner_dir = _resolve_owner_dir(owner)
    normalized_name = normalize_project_name(project_name)
    return (owner_dir / normalized_name).resolve()


def read_project_file(owner: str, file_path: str, max_lines: int | None = None) -> dict[str, object]:
    target_path = resolve_project_path(owner, file_path)
    if not target_path.exists() or not target_path.is_file():
        raise FileNotFoundError("Archivo no encontrado")

    if max_lines is None:
        try:
            content = target_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            content = "Vista previa no disponible para archivos binarios."
        return {"content": content, "truncated": False}

    lines: list[str] = []
    truncated = False
    try:
        with target_path.open("r", encoding="utf-8") as handle:
            for index, line in enumerate(handle):
                if index >= max_lines:
                    truncated = True
                    break
                lines.append(line)
    except UnicodeDecodeError:
        return {
            "content": "Vista previa no disponible para archivos binarios.",
            "truncated": False,
        }

    return {"content": "".join(lines), "truncated": truncated}


def get_download_path(owner: str, file_path: str) -> Path:
    target_path = resolve_project_path(owner, file_path)
    if not target_path.exists() or not target_path.is_file():
        raise FileNotFoundError("Archivo no encontrado")
    return target_path
