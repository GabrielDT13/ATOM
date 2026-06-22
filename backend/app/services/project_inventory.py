from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from backend.app.services.database import fetch_one
from backend.app.services.project_storage import (
    get_legacy_owner_dir,
    get_legacy_project_dir,
    migrate_legacy_project_dir,
)
from fastapi import UploadFile
from psycopg.errors import UndefinedTable

ALLOWED_TEMPLATE_EXTENSIONS = {".xlsx", ".xls"}
ProjectStatus = Literal["configured", "empty", "results"]
ProjectFileKind = Literal["additional", "result", "template"]
ProjectAnalysisProfile = Literal["basic", "enhanced"]
ProjectAnalysisVariant = Literal["basic", "enhanced", "python"]
ProjectLifecycleStatus = Literal["active", "draft"]
ProjectStudyType = Literal["atac-seq", "chip-seq", "rna-seq", "scrna-seq"]
PROJECT_INTERNAL_DIRNAME = ".atom"
PROJECT_SETTINGS_FILENAME = "project-config.json"


def _resolve_owner_dir(owner: str) -> Path:
    return get_legacy_owner_dir(owner)


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


def _project_internal_dir(project_dir: Path) -> Path:
    return project_dir / PROJECT_INTERNAL_DIRNAME


def _project_settings_path(project_dir: Path) -> Path:
    return _project_internal_dir(project_dir) / PROJECT_SETTINGS_FILENAME


def _is_internal_project_path(file_path: str) -> bool:
    path = Path(file_path)
    parts = path.parts
    return bool(parts) and parts[0] == PROJECT_INTERNAL_DIRNAME


def normalize_project_analysis_profile(value: object) -> ProjectAnalysisProfile:
    normalized = str(value or "").strip().lower()
    if normalized == "enhanced":
        return "enhanced"
    return "basic"


def normalize_project_analysis_variant(value: object) -> ProjectAnalysisVariant:
    normalized = str(value or "").strip().lower()
    if normalized in {"python", "python-poc"}:
        return "python"
    if normalized in {"enhanced", "extended", "pro"}:
        return "enhanced"
    return "basic"


def normalize_project_study_type(value: object) -> ProjectStudyType:
    normalized = str(value or "").strip().lower()
    if normalized in {"atac-seq", "chip-seq", "scrna-seq"}:
        return normalized  # type: ignore[return-value]
    return "rna-seq"


def normalize_project_lifecycle_status(value: object) -> ProjectLifecycleStatus:
    normalized = str(value or "").strip().lower()
    if normalized == "active":
        return "active"
    return "draft"


def normalize_enabled_analysis_variants(
    values: object,
    *,
    study_type: ProjectStudyType = "rna-seq",
    fallback_profile: object | None = None,
) -> list[ProjectAnalysisVariant]:
    if study_type != "rna-seq":
        return ["basic"]

    normalized_items: list[ProjectAnalysisVariant] = []
    raw_items = values if isinstance(values, list | tuple | set) else []
    for item in raw_items:
        normalized_variant = normalize_project_analysis_variant(item)
        if normalized_variant not in normalized_items:
            normalized_items.append(normalized_variant)

    if not normalized_items:
        legacy_profile = normalize_project_analysis_profile(fallback_profile)
        return ["enhanced"] if legacy_profile == "enhanced" else ["basic"]

    ordered_variants = [variant for variant in ("basic", "enhanced", "python") if variant in normalized_items]
    return ordered_variants or ["basic"]


def normalize_primary_analysis_variant(
    value: object,
    *,
    enabled_variants: list[ProjectAnalysisVariant] | None = None,
    fallback_profile: object | None = None,
    study_type: ProjectStudyType = "rna-seq",
) -> ProjectAnalysisVariant:
    allowed_variants = normalize_enabled_analysis_variants(
        enabled_variants or [],
        fallback_profile=fallback_profile,
        study_type=study_type,
    )
    normalized_variant = normalize_project_analysis_variant(value)
    if normalized_variant in allowed_variants:
        return normalized_variant
    return allowed_variants[0]


def _default_project_settings() -> dict[str, object]:
    return {
        "analysis_profile": "basic",
        "enabled_analysis_variants": ["basic"],
        "primary_analysis_variant": "basic",
        "project_state": "draft",
        "study_type": "rna-seq",
    }


def read_project_settings(project_dir: Path) -> dict[str, object]:
    settings_path = _project_settings_path(project_dir)
    if not settings_path.exists():
        return _default_project_settings()

    try:
        payload = json.loads(settings_path.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        payload = {}

    settings_payload = payload or {}
    study_type = normalize_project_study_type(settings_payload.get("study_type"))
    enabled_variants = normalize_enabled_analysis_variants(
        settings_payload.get("enabled_analysis_variants"),
        fallback_profile=settings_payload.get("analysis_profile"),
        study_type=study_type,
    )
    primary_variant = normalize_primary_analysis_variant(
        settings_payload.get("primary_analysis_variant"),
        enabled_variants=enabled_variants,
        fallback_profile=settings_payload.get("analysis_profile"),
        study_type=study_type,
    )
    analysis_profile = "enhanced" if primary_variant == "enhanced" else "basic"

    return {
        "analysis_profile": analysis_profile,
        "enabled_analysis_variants": enabled_variants,
        "primary_analysis_variant": primary_variant,
        "project_state": normalize_project_lifecycle_status(settings_payload.get("project_state")),
        "study_type": study_type,
    }


def write_project_settings(
    project_dir: Path,
    *,
    analysis_profile: object | None = None,
    enabled_analysis_variants: object | None = None,
    primary_analysis_variant: object | None = None,
    project_state: object | None = None,
    study_type: object | None = None,
) -> dict[str, object]:
    current_settings = read_project_settings(project_dir)
    analysis_profile_source = (
        analysis_profile
        if analysis_profile is not None
        else current_settings.get("analysis_profile")
    )
    enabled_variants_source = (
        enabled_analysis_variants
        if enabled_analysis_variants is not None
        else current_settings.get("enabled_analysis_variants")
    )
    primary_variant_source = (
        primary_analysis_variant
        if primary_analysis_variant is not None
        else current_settings.get("primary_analysis_variant")
    )
    if analysis_profile is not None and enabled_analysis_variants is None and primary_analysis_variant is None:
        legacy_profile = normalize_project_analysis_profile(analysis_profile)
        enabled_variants_source = ["enhanced"] if legacy_profile == "enhanced" else ["basic"]
        primary_variant_source = enabled_variants_source[0]

    normalized_study_type = normalize_project_study_type(
        study_type if study_type is not None else current_settings.get("study_type"),
    )
    normalized_enabled_variants = normalize_enabled_analysis_variants(
        enabled_variants_source,
        fallback_profile=analysis_profile_source,
        study_type=normalized_study_type,
    )
    normalized_primary_variant = normalize_primary_analysis_variant(
        primary_variant_source,
        enabled_variants=normalized_enabled_variants,
        fallback_profile=analysis_profile_source,
        study_type=normalized_study_type,
    )
    normalized_profile = "enhanced" if normalized_primary_variant == "enhanced" else "basic"
    normalized_project_state = normalize_project_lifecycle_status(
        project_state if project_state is not None else current_settings.get("project_state"),
    )

    normalized_settings = {
        "analysis_profile": normalized_profile,
        "enabled_analysis_variants": normalized_enabled_variants,
        "primary_analysis_variant": normalized_primary_variant,
        "project_state": normalized_project_state,
        "study_type": normalized_study_type,
    }
    settings_path = _project_settings_path(project_dir)
    settings_path.parent.mkdir(parents=True, exist_ok=True)
    settings_path.write_text(
        json.dumps(normalized_settings, ensure_ascii=True, indent=2) + "\n",
        encoding="utf-8",
    )
    return normalized_settings


def read_project_analysis_profile(project_dir: Path) -> ProjectAnalysisProfile:
    settings = read_project_settings(project_dir)
    return normalize_project_analysis_profile(settings.get("analysis_profile"))


def write_project_analysis_profile(project_dir: Path, profile: object) -> ProjectAnalysisProfile:
    normalized_profile = normalize_project_analysis_profile(profile)
    enabled_variants = ["enhanced"] if normalized_profile == "enhanced" else ["basic"]
    settings = write_project_settings(
        project_dir,
        analysis_profile=normalized_profile,
        enabled_analysis_variants=enabled_variants,
        primary_analysis_variant=enabled_variants[0],
    )
    return normalize_project_analysis_profile(settings.get("analysis_profile"))


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
        [
            path
            for path in project_dir.rglob("*")
            if path.is_file()
            and not _is_internal_project_path(path.relative_to(project_dir).as_posix())
        ],
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

    if metadata:
        created_at = _normalize_timestamp(metadata.get("created_at")) or created_at
        updated_at = _normalize_timestamp(metadata.get("updated_at")) or updated_at
    resolved_name = str(metadata.get("name") or project_dir.name).strip() if metadata else project_dir.name
    resolved_owner = str(metadata.get("owner_username") or metadata.get("owner") or owner).strip() if metadata else owner
    resolved_access_role = (
        str(metadata.get("access_role") or "").strip().lower() if metadata else ""
    )
    resolved_id = str(metadata.get("id") or "").strip() if metadata else ""
    resolved_entity_id = str(metadata.get("entity_id") or "").strip() if metadata else ""
    resolved_entity_logo_url = str(metadata.get("entity_logo_url") or "").strip() if metadata else ""
    resolved_entity_name = str(metadata.get("entity_name") or "").strip() if metadata else ""
    resolved_entity_slug = str(metadata.get("entity_slug") or "").strip() if metadata else ""
    resolved_slug = str(metadata.get("slug") or "").strip() if metadata else ""
    resolved_visibility = str(metadata.get("visibility") or "").strip().lower() if metadata else ""
    project_settings = read_project_settings(project_dir)
    metadata_study_type = metadata.get("study_type") if metadata else None
    metadata_enabled_variants = metadata.get("enabled_analysis_variants") if metadata else None
    metadata_primary_variant = metadata.get("primary_analysis_variant") if metadata else None
    metadata_project_state = metadata.get("project_state") if metadata else None
    metadata_analysis_profile = metadata.get("analysis_profile") if metadata else None

    resolved_study_type = normalize_project_study_type(
        metadata_study_type if metadata_study_type is not None else project_settings.get("study_type"),
    )
    resolved_enabled_variants = normalize_enabled_analysis_variants(
        (
            metadata_enabled_variants
            if metadata_enabled_variants is not None
            else project_settings.get("enabled_analysis_variants")
        ),
        fallback_profile=(
            metadata_analysis_profile
            if metadata_analysis_profile is not None
            else project_settings.get("analysis_profile")
        ),
        study_type=resolved_study_type,
    )
    resolved_primary_variant = normalize_primary_analysis_variant(
        (
            metadata_primary_variant
            if metadata_primary_variant is not None
            else project_settings.get("primary_analysis_variant")
        ),
        enabled_variants=resolved_enabled_variants,
        fallback_profile=(
            metadata_analysis_profile
            if metadata_analysis_profile is not None
            else project_settings.get("analysis_profile")
        ),
        study_type=resolved_study_type,
    )
    resolved_analysis_profile = (
        "enhanced" if resolved_primary_variant == "enhanced" else "basic"
    )
    resolved_project_state = normalize_project_lifecycle_status(
        metadata_project_state if metadata_project_state is not None else project_settings.get("project_state"),
    )

    return {
        "access_role": resolved_access_role or None,
        "additional_files": additional_files,
        "analysis_profile": resolved_analysis_profile,
        "created_at": created_at,
        "entity_id": resolved_entity_id or None,
        "entity_logo_url": resolved_entity_logo_url or None,
        "entity_name": resolved_entity_name or None,
        "entity_slug": resolved_entity_slug or None,
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
        "id": resolved_id or None,
        "name": resolved_name,
        "enabled_analysis_variants": resolved_enabled_variants,
        "owner": resolved_owner,
        "primary_analysis_variant": resolved_primary_variant,
        "project_state": resolved_project_state,
        "slug": resolved_slug or None,
        "status": _project_status(files, html_files),
        "study_type": resolved_study_type,
        "template_file": template_file,
        "updated_at": updated_at,
        "visibility": resolved_visibility if resolved_visibility in {"private", "public"} else "private",
    }


async def _save_upload(target_path: Path, upload: UploadFile) -> None:
    target_path.parent.mkdir(parents=True, exist_ok=True)
    with target_path.open("wb") as destination:
        while chunk := await upload.read(1024 * 1024):
            destination.write(chunk)
    await upload.close()


def _find_project_storage_record(owner: str, project_name: str) -> dict[str, object] | None:
    try:
        return fetch_one(
            """
            SELECT id, owner_username, name
            FROM public.vw_projects
            WHERE owner_username = %s
              AND name = %s
            LIMIT 1
            """,
            (owner, project_name),
        )
    except UndefinedTable:
        return None
    except Exception:
        # Keep filesystem-only fallback working even when DB is unavailable.
        return None


def get_project_dir(owner: str, project_name: str) -> Path:
    normalized_name = normalize_project_name(project_name)
    record = _find_project_storage_record(owner, normalized_name)
    project_id = str((record or {}).get("id") or "").strip()
    if project_id:
        return migrate_legacy_project_dir(project_id, owner=owner, project_name=normalized_name)
    return get_legacy_project_dir(owner, normalized_name)


def _resolve_project_file_path(owner: str, file_path: str) -> Path:
    normalized_path = Path(str(file_path or "").strip().replace("\\", "/"))
    path_parts = normalized_path.parts
    if len(path_parts) < 2:
        raise FileNotFoundError("Archivo no encontrado")

    project_name = normalize_project_name(path_parts[0])
    project_dir = get_project_dir(owner, project_name).resolve()
    relative_file_path = Path(*path_parts[1:]).as_posix()
    target_path = (project_dir / relative_file_path).resolve()
    if project_dir != target_path and project_dir not in target_path.parents:
        raise ValueError("Ruta fuera del directorio permitido")
    return target_path


def read_project_file(owner: str, file_path: str, max_lines: int | None = None) -> dict[str, object]:
    target_path = _resolve_project_file_path(owner, file_path)
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
    target_path = _resolve_project_file_path(owner, file_path)
    if not target_path.exists() or not target_path.is_file():
        raise FileNotFoundError("Archivo no encontrado")
    return target_path
