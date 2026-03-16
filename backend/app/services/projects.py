from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any, Literal

from backend.app.constants.navigation import SIDEBAR_LEFT_LINKS, SIDEBAR_LEFT_TITLE
from backend.app.core.config import get_settings
from backend.app.services.dashboard_activity import log_project_dashboard_event
from backend.app.services.project_inventory import (
    _build_project_payload,
    _classify_project_file,
    _list_project_files,
    _normalize_upload_filename,
    _save_upload,
    _template_storage_name,
    allowed_template_file,
    ensure_user_dir,
    get_project_dir,
    normalize_project_name,
)
from backend.app.services.project_inventory import (
    get_download_path as _get_download_path,
)
from backend.app.services.project_inventory import (
    read_project_file as _read_project_file,
)
from backend.app.services.project_supabase import (
    _delete_project_record,
    _fetch_profiles,
    _get_profile_by_username,
    _get_project_access_role,
    _get_project_member,
    _get_project_record,
    _list_all_project_records,
    _list_owned_project_records,
    _list_project_members_by_project_id,
    _list_shared_project_records,
    _rename_project_record,
    _upsert_project_record,
)
from backend.app.services.supabase import (
    SupabaseError,
    call_rpc_with_service_role,
)
from fastapi import UploadFile

ProjectMemberRole = Literal["editor", "owner", "viewer"]
ProjectEditableMemberRole = Literal["editor", "viewer"]


def _log_project_event(
    kind: str,
    *,
    actor_user_id: str | None,
    actor_username: str,
    description: str,
    owner: str,
    project_name: str,
    title: str,
) -> None:
    log_project_dashboard_event(
        kind,
        actor_user_id=actor_user_id,
        actor_username=actor_username,
        description=description,
        project_name=project_name,
        project_owner_username=owner,
        title=title,
    )


def list_sidebar_left(role: str) -> dict[str, object]:
    items: list[dict[str, object]] = []

    for item in SIDEBAR_LEFT_LINKS:
        if item.admin_only and role != "admin":
            continue

        payload: dict[str, object] = {
            "name": item.name,
            "url": item.url,
        }
        if item.admin_only:
            payload["admin_only"] = True
        items.append(payload)

    return {
        "title": SIDEBAR_LEFT_TITLE,
        "items": items,
    }


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


def list_projects_for_user(session_user_id: str, session_username: str, role: str) -> dict[str, object]:
    projects_root = get_settings().projects_dir
    projects_root.mkdir(parents=True, exist_ok=True)

    if role == "admin":
        owners = sorted(directory.name for directory in projects_root.iterdir() if directory.is_dir())
    else:
        owners = [session_username]

    projects: dict[str, list[str]] = {}
    items: list[dict[str, object]] = []
    indexed_items: dict[str, dict[str, object]] = {}
    for owner in owners:
        owner_dir = projects_root / owner
        if owner_dir.exists():
            project_dirs = sorted(
                [directory for directory in owner_dir.iterdir() if directory.is_dir()],
                key=lambda directory: directory.name.lower(),
            )
            projects[owner] = [directory.name for directory in project_dirs]
            for project_dir in project_dirs:
                payload = _build_project_payload(owner, project_dir)
                payload["access_role"] = "owner" if owner == session_username else "viewer"
                indexed_items[f"{owner}::{project_dir.name}"] = payload
        else:
            projects[owner] = []

    try:
        supabase_records = (
            _list_all_project_records()
            if role == "admin"
            else _list_owned_project_records(session_username)
        )
    except SupabaseError:
        supabase_records = []

    for record in supabase_records:
        owner = str(record.get("owner_username") or "").strip()
        project_name = str(record.get("name") or "").strip()
        if not owner or not project_name:
            continue

        project_dir = get_settings().projects_dir / owner / project_name
        projects.setdefault(owner, [])
        if project_name not in projects[owner]:
            projects[owner].append(project_name)

        payload = _build_project_payload(owner, project_dir, record)
        payload["access_role"] = "owner" if owner == session_username else ("editor" if role == "admin" else None)
        indexed_items[f"{owner}::{project_name}"] = payload

    if role != "admin":
        for record in _list_shared_project_records(session_user_id):
            owner = str(record.get("owner_username") or "").strip()
            project_name = str(record.get("name") or "").strip()
            if not owner or not project_name or owner == session_username:
                continue

            project_dir = get_settings().projects_dir / owner / project_name
            projects.setdefault(owner, [])
            if project_name not in projects[owner]:
                projects[owner].append(project_name)
            indexed_items[f"{owner}::{project_name}"] = _build_project_payload(owner, project_dir, record)

    for owner, project_names in projects.items():
        projects[owner] = sorted(project_names, key=lambda item: item.lower())

    items.extend(indexed_items.values())
    items.sort(
        key=lambda item: (
            str(item.get("owner", "")).lower(),
            str(item.get("name", "")).lower(),
        )
    )

    return {"projects": projects, "items": items}

async def create_project(
    actor_user_id: str | None,
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
        excel_name = _normalize_upload_filename(template_file.filename)
        await _save_upload(project_dir / _template_storage_name(excel_name), template_file)

        for upload in additional_files:
            if upload.filename:
                safe_name = _normalize_upload_filename(upload.filename)
                await _save_upload(project_dir / safe_name, upload)
        _upsert_project_record(username, normalized_name)
        _log_project_event(
            "project_created",
            actor_user_id=actor_user_id,
            actor_username=username,
            description=(
                f"Se creó el proyecto {normalized_name} con su plantilla base y "
                f"{len(additional_files)} archivo(s) adicional(es)."
            ),
            owner=username,
            project_name=normalized_name,
            title=f"Proyecto creado: {normalized_name}",
        )
        return True, f"Proyecto '{normalized_name}' creado correctamente."
    except ValueError as exc:
        if project_dir.exists():
            shutil.rmtree(project_dir)
        return False, str(exc)
    except SupabaseError as exc:
        if project_dir.exists():
            shutil.rmtree(project_dir)
        return False, str(exc)
    except Exception as exc:
        if project_dir.exists():
            shutil.rmtree(project_dir)
        return False, f"Error al crear proyecto: {exc}"

def get_project_details(owner: str, project_name: str) -> dict[str, object]:
    project_dir = get_project_dir(owner, project_name)
    if not project_dir.exists() or not project_dir.is_dir():
        raise FileNotFoundError("Proyecto no encontrado")

    metadata = _get_project_record(owner, normalize_project_name(project_name))
    return _build_project_payload(owner, project_dir, metadata)


def user_can_view_project(user_id: str, username: str, role: str, owner: str, project_name: str) -> bool:
    return _get_project_access_role(user_id, username, role, owner, project_name) is not None


def user_can_edit_project(user_id: str, username: str, role: str, owner: str, project_name: str) -> bool:
    access_role = _get_project_access_role(user_id, username, role, owner, project_name)
    return access_role in {"editor", "owner"}


def get_project_members(owner: str, project_name: str) -> list[dict[str, Any]]:
    fallback_owner_member = [
        {
            "avatar_url": None,
            "bio": None,
            "department": None,
            "display_name": owner,
            "email": None,
            "id": f"local-owner::{owner}",
            "is_owner": True,
            "member_role": "owner",
            "username": owner,
        }
    ]

    try:
        record = _upsert_project_record(owner, project_name)
    except SupabaseError:
        return fallback_owner_member

    try:
        members = _list_project_members_by_project_id(str(record["id"]))
        member_ids = {
            str(member.get("member_id") or "").strip()
            for member in members
            if str(member.get("member_id") or "").strip()
        }
        profiles = {
            str(profile.get("id") or "").strip(): profile
            for profile in _fetch_profiles()
            if str(profile.get("id") or "").strip() in member_ids
        }
    except SupabaseError:
        return fallback_owner_member

    payload: list[dict[str, Any]] = []
    for member in members:
        member_id = str(member.get("member_id") or "").strip()
        profile = profiles.get(member_id, {})
        username = str(member.get("member_username") or profile.get("username") or "").strip()
        payload.append(
            {
                "avatar_url": str(profile.get("avatar_url") or "").strip() or None,
                "bio": str(profile.get("bio") or "").strip() or None,
                "department": str(profile.get("department") or "").strip() or None,
                "display_name": str(profile.get("full_name") or "").strip() or username,
                "email": str(profile.get("email") or "").strip().lower() or None,
                "id": member_id,
                "is_owner": str(member.get("member_role") or "").strip() == "owner",
                "member_role": str(member.get("member_role") or "viewer").strip() or "viewer",
                "username": username,
            }
        )

    payload.sort(
        key=lambda member: (
            0 if member["is_owner"] else 1,
            str(member["display_name"] or member["username"]).lower(),
        )
    )
    return payload


def search_project_share_candidates(owner: str, project_name: str, query: str, limit: int = 8) -> list[dict[str, Any]]:
    try:
        _upsert_project_record(owner, project_name)
    except SupabaseError:
        pass
    existing_members = get_project_members(owner, project_name)
    excluded_usernames = {member["username"] for member in existing_members}
    normalized_query = query.strip().lower()

    candidates: list[dict[str, Any]] = []
    try:
        profiles = _fetch_profiles()
    except SupabaseError:
        return []

    for profile in profiles:
        username = str(profile.get("username") or "").strip()
        email = str(profile.get("email") or "").strip().lower()
        display_name = str(profile.get("full_name") or "").strip() or username

        if not username or username in excluded_usernames:
            continue

        if normalized_query:
            searchable = " ".join([username, email, display_name]).lower()
            if normalized_query not in searchable:
                continue

        candidates.append(
            {
                "avatar_url": str(profile.get("avatar_url") or "").strip() or None,
                "bio": str(profile.get("bio") or "").strip() or None,
                "department": str(profile.get("department") or "").strip() or None,
                "display_name": display_name,
                "email": email or None,
                "id": str(profile.get("id") or "").strip(),
                "username": username,
            }
        )
        if len(candidates) >= limit:
            break

    return candidates


def add_project_member(
    owner: str,
    project_name: str,
    username: str,
    member_role: ProjectEditableMemberRole = "viewer",
) -> tuple[bool, str]:
    try:
        project = _upsert_project_record(owner, project_name)
        candidate = _get_profile_by_username(username)
        if not candidate:
            return False, "No se encontró el usuario seleccionado"

        candidate_id = str(candidate.get("id") or "").strip()
        candidate_username = str(candidate.get("username") or "").strip()
        if not candidate_id or not candidate_username:
            return False, "El usuario seleccionado no es válido"
        if candidate_username == owner:
            return False, "El propietario ya tiene acceso al proyecto"

        current_member = _get_project_member(str(project["id"]), candidate_id)
        if current_member:
            call_rpc_with_service_role(
                "admin_set_project_member",
                json_body={
                    "p_member_role": member_role,
                    "p_project_id": project["id"],
                    "p_target_user_id": candidate_id,
                },
            )
            return True, "Permisos del usuario actualizados correctamente"

        call_rpc_with_service_role(
            "admin_set_project_member",
            json_body={
                "p_member_role": member_role,
                "p_project_id": project["id"],
                "p_target_user_id": candidate_id,
            },
        )
        return True, "Proyecto compartido correctamente"
    except SupabaseError as exc:
        return False, str(exc)


def transfer_project_ownership(
    owner: str,
    project_name: str,
    username: str,
    previous_owner_role: ProjectEditableMemberRole = "editor",
) -> tuple[bool, str, str]:
    try:
        normalized_name = normalize_project_name(project_name)
        project_dir = get_project_dir(owner, normalized_name)
        if not project_dir.exists() or not project_dir.is_dir():
            return False, "Proyecto no encontrado", owner

        project = _upsert_project_record(owner, normalized_name)
        candidate = _get_profile_by_username(username)
        if not candidate:
            return False, "No se encontró el usuario seleccionado", owner

        candidate_id = str(candidate.get("id") or "").strip()
        candidate_username = str(candidate.get("username") or "").strip()
        if not candidate_id or not candidate_username:
            return False, "El usuario seleccionado no es válido", owner
        if candidate_username == owner:
            return False, "Ese usuario ya es el propietario del proyecto", owner

        current_member = _get_project_member(str(project["id"]), candidate_id)
        if not current_member:
            return False, "Solo puedes transferir el proyecto a un miembro existente", owner

        next_owner_dir = ensure_user_dir(candidate_username)
        next_project_dir = next_owner_dir / normalized_name
        if next_project_dir.exists():
            return False, "El nuevo propietario ya tiene un proyecto con ese nombre", owner

        project_dir.rename(next_project_dir)
        try:
            call_rpc_with_service_role(
                "admin_transfer_project_ownership",
                json_body={
                    "p_new_owner_user_id": candidate_id,
                    "p_previous_owner_role": previous_owner_role,
                    "p_project_id": project["id"],
                },
            )
        except SupabaseError as exc:
            next_project_dir.rename(project_dir)
            return False, str(exc), owner

        return True, "Propiedad del proyecto transferida correctamente", candidate_username
    except (SupabaseError, ValueError) as exc:
        return False, str(exc), owner


def remove_project_member(owner: str, project_name: str, username: str) -> tuple[bool, str]:
    try:
        project = _upsert_project_record(owner, project_name)
        candidate = _get_profile_by_username(username)
        if not candidate:
            return False, "No se encontró el usuario seleccionado"

        candidate_id = str(candidate.get("id") or "").strip()
        candidate_username = str(candidate.get("username") or "").strip()
        if candidate_username == owner:
            return False, "No puedes quitar el acceso del propietario"

        current_member = _get_project_member(str(project["id"]), candidate_id)
        if not current_member:
            return False, "El usuario no tiene acceso a este proyecto"

        call_rpc_with_service_role(
            "admin_remove_project_member",
            json_body={
                "p_project_id": project["id"],
                "p_target_user_id": candidate_id,
            },
        )
    except SupabaseError as exc:
        return False, str(exc)
    return True, "Acceso eliminado correctamente"


async def update_project(
    actor_user_id: str | None,
    actor_username: str,
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
            try:
                _rename_project_record(owner, current_name, normalized_new_name)
            except SupabaseError as exc:
                new_dir.rename(project_dir)
                return False, str(exc), current_name
            project_dir = new_dir
            current_name = normalized_new_name

    uploaded_template = bool(excel_file and excel_file.filename)
    uploaded_additional_count = len([upload for upload in additional_files if upload.filename])
    has_uploads = bool(
        uploaded_template or uploaded_additional_count > 0
    )
    if has_uploads:
        if uploaded_template:
            for current_file in _list_project_files(project_dir):
                relative_path = current_file.relative_to(project_dir).as_posix()
                if _classify_project_file(relative_path) == "template":
                    current_file.unlink()

            excel_name = _normalize_upload_filename(excel_file.filename or "")
            await _save_upload(project_dir / _template_storage_name(excel_name), excel_file)

        uploads_to_store = [upload for upload in additional_files if upload.filename]
        if uploads_to_store:
            for current_file in _list_project_files(project_dir):
                relative_path = current_file.relative_to(project_dir).as_posix()
                if _classify_project_file(relative_path) == "additional":
                    current_file.unlink()

            for upload in uploads_to_store:
                safe_name = _normalize_upload_filename(upload.filename or "")
                await _save_upload(project_dir / safe_name, upload)

    update_segments: list[str] = []
    if new_name and new_name.strip():
        update_segments.append("nombre actualizado")
    if uploaded_template:
        update_segments.append("plantilla reemplazada")
    if uploaded_additional_count:
        update_segments.append(
            f"{uploaded_additional_count} archivo(s) adicional(es) actualizado(s)"
        )

    _log_project_event(
        "project_updated",
        actor_user_id=actor_user_id,
        actor_username=actor_username,
        description=(
            f"Se actualizó {current_name}: "
            f"{', '.join(update_segments) if update_segments else 'sin cambios de archivos, solo ajustes internos'}."
        ),
        owner=owner,
        project_name=current_name,
        title=f"Proyecto actualizado: {current_name}",
    )
    return True, "Proyecto actualizado correctamente", current_name


def delete_project(
    actor_user_id: str | None,
    actor_username: str,
    owner: str,
    project_name: str,
) -> tuple[bool, str]:
    try:
        normalized_name = normalize_project_name(project_name)
        project_dir = get_project_dir(owner, normalized_name)
    except ValueError as exc:
        return False, str(exc)

    if not project_dir.exists() or not project_dir.is_dir():
        return False, "Proyecto no encontrado."
    shutil.rmtree(project_dir)
    try:
        _delete_project_record(owner, normalized_name)
    except SupabaseError as exc:
        return False, str(exc)
    _log_project_event(
        "project_deleted",
        actor_user_id=actor_user_id,
        actor_username=actor_username,
        description=f"Se eliminó el proyecto {normalized_name} del espacio de trabajo.",
        owner=owner,
        project_name=normalized_name,
        title=f"Proyecto eliminado: {normalized_name}",
    )
    return True, f"Proyecto '{normalized_name}' eliminado correctamente."


def read_project_file(owner: str, file_path: str, max_lines: int | None = None) -> dict[str, object]:
    return _read_project_file(owner, file_path, max_lines)


def get_download_path(owner: str, file_path: str) -> Path:
    return _get_download_path(owner, file_path)
