from __future__ import annotations

import shutil
from pathlib import Path

from fastapi import UploadFile

from backend.app.core.config import get_settings
from backend.app.services.data import load_json, resolve_project_path

ALLOWED_TEMPLATE_EXTENSIONS = {".xlsx", ".xls"}


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


def list_messages() -> list[dict[str, object]]:
    return load_json("messages.json")


def list_sidebar_left(role: str) -> dict[str, object]:
    data = load_json("sidebar_left.json")
    if role != "admin":
        data["items"] = [
            item for item in data["items"] if not item.get("admin_only", False)
        ]
    return data


def build_project_tree(username: str) -> dict[str, object]:
    user_dir = ensure_user_dir(username)

    def _build_tree(path: Path, current_project: str | None = None, parent: Path = Path("")):
        tree: list[dict[str, object]] = []
        html_exists_in_folder = False

        if not path.exists():
            return tree, False

        for entry in sorted(path.iterdir(), key=lambda item: item.name.lower()):
            relative_path = parent / entry.name if str(parent) else Path(entry.name)
            rel_path_str = relative_path.as_posix()

            if entry.is_dir():
                project_name = entry.name if current_project is None else current_project
                child_tree, child_has_html = _build_tree(entry, project_name, relative_path)
                tree.append(
                    {
                        "name": entry.name,
                        "type": "folder",
                        "html_exists": child_has_html,
                        "children": child_tree,
                        "path": rel_path_str,
                        "project_name": project_name,
                    }
                )
                if child_has_html:
                    html_exists_in_folder = True
                continue

            is_html = entry.suffix.lower() == ".html"
            if is_html:
                html_exists_in_folder = True
            tree.append(
                {
                    "name": entry.name,
                    "type": "file",
                    "username": username,
                    "project_name": current_project,
                    "path": rel_path_str,
                }
            )

        return tree, html_exists_in_folder

    tree, _ = _build_tree(user_dir)
    return {"title": "Mis Proyectos", "items": tree}


def list_projects_for_user(session_username: str, role: str) -> dict[str, list[str]]:
    projects_root = get_settings().projects_dir
    projects_root.mkdir(parents=True, exist_ok=True)

    if role == "admin":
        owners = [directory.name for directory in projects_root.iterdir() if directory.is_dir()]
    else:
        owners = [session_username]

    projects: dict[str, list[str]] = {}
    for owner in owners:
        owner_dir = projects_root / owner
        if owner_dir.exists():
            projects[owner] = sorted(
                [directory.name for directory in owner_dir.iterdir() if directory.is_dir()]
            )
        else:
            projects[owner] = []

    return projects


async def _save_upload(target_path: Path, upload: UploadFile) -> None:
    with target_path.open("wb") as destination:
        while chunk := await upload.read(1024 * 1024):
            destination.write(chunk)
    await upload.close()


async def create_project(
    username: str,
    project_name: str,
    template_file: UploadFile,
    additional_files: list[UploadFile],
) -> tuple[bool, str]:
    try:
        normalized_name = normalize_project_name(project_name)
    except ValueError as exc:
        return False, str(exc)

    if not template_file.filename:
        return False, "Debes seleccionar un archivo Excel para el proyecto"

    if not allowed_template_file(template_file.filename):
        return False, "El archivo base debe ser un Excel permitido (.xls o .xlsx)"

    user_dir = ensure_user_dir(username)
    project_dir = user_dir / normalized_name
    if project_dir.exists():
        return False, f"El proyecto '{normalized_name}' ya existe"

    project_dir.mkdir()
    try:
        excel_name = template_file.filename
        if Path(excel_name).suffix.lower() in {".xlsx", ".xls"}:
            excel_name = "template.xlsx"
        await _save_upload(project_dir / excel_name, template_file)

        for upload in additional_files:
            if upload.filename:
                await _save_upload(project_dir / upload.filename, upload)
        return True, f"Proyecto '{normalized_name}' creado correctamente."
    except Exception as exc:
        if project_dir.exists():
            shutil.rmtree(project_dir)
        return False, f"Error al crear proyecto: {exc}"


def get_project_dir(owner: str, project_name: str) -> Path:
    owner_dir = _resolve_owner_dir(owner)
    normalized_name = normalize_project_name(project_name)
    return (owner_dir / normalized_name).resolve()


def get_project_details(owner: str, project_name: str) -> dict[str, object]:
    project_dir = get_project_dir(owner, project_name)
    if not project_dir.exists() or not project_dir.is_dir():
        raise FileNotFoundError("Proyecto no encontrado")

    files = sorted([item.name for item in project_dir.iterdir() if item.is_file()])
    return {"owner": owner, "name": project_dir.name, "files": files}


async def update_project(
    owner: str,
    project_name: str,
    new_name: str | None,
    excel_file: UploadFile | None,
    additional_files: list[UploadFile],
) -> tuple[bool, str, str]:
    try:
        current_name = normalize_project_name(project_name)
        project_dir = get_project_dir(owner, current_name)
    except ValueError as exc:
        return False, str(exc), project_name

    if not project_dir.exists() or not project_dir.is_dir():
        return False, "Proyecto no encontrado", project_name

    if excel_file and excel_file.filename and not allowed_template_file(excel_file.filename):
        return (
            False,
            "El archivo base debe ser un Excel permitido (.xls o .xlsx)",
            current_name,
        )

    if new_name:
        try:
            normalized_new_name = normalize_project_name(new_name)
        except ValueError as exc:
            return False, str(exc), current_name
        if normalized_new_name != current_name:
            new_dir = get_project_dir(owner, normalized_new_name)
            if new_dir.exists():
                return False, "Ya existe un proyecto con ese nombre", current_name
            project_dir.rename(new_dir)
            project_dir = new_dir
            current_name = normalized_new_name

    has_uploads = bool(
        (excel_file and excel_file.filename)
        or any(upload.filename for upload in additional_files)
    )
    if has_uploads:
        for item in project_dir.iterdir():
            if item.is_file():
                item.unlink()
            elif item.is_dir():
                shutil.rmtree(item)

        if excel_file and excel_file.filename:
            excel_name = excel_file.filename
            if Path(excel_name).suffix.lower() in {".xlsx", ".xls"}:
                excel_name = "template.xlsx"
            await _save_upload(project_dir / excel_name, excel_file)

        for upload in additional_files:
            if upload.filename:
                await _save_upload(project_dir / upload.filename, upload)

    return True, "Proyecto actualizado correctamente", current_name


def delete_project(owner: str, project_name: str) -> tuple[bool, str]:
    try:
        normalized_name = normalize_project_name(project_name)
        project_dir = get_project_dir(owner, normalized_name)
    except ValueError as exc:
        return False, str(exc)

    if not project_dir.exists() or not project_dir.is_dir():
        return False, "Proyecto no encontrado."
    shutil.rmtree(project_dir)
    return True, f"Proyecto '{normalized_name}' eliminado correctamente."


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
