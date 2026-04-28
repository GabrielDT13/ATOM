from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any, Literal

from backend.app.constants.navigation import SIDEBAR_LEFT_LINKS, SIDEBAR_LEFT_TITLE
from backend.app.core.config import get_settings
from backend.app.services.analysis_runs import list_active_analysis_runs_for_projects
from backend.app.services.dashboard_activity import log_project_dashboard_event
from backend.app.services.database import execute
from backend.app.services.errors import ServiceError
from backend.app.services.notifications import (
    notify_project_ownership_transferred,
    notify_project_shared,
)
from backend.app.services.project_inventory import (
    _build_project_payload,
    _classify_project_file,
    _list_project_files,
    _normalize_upload_filename,
    _save_upload,
    _template_storage_name,
    allowed_template_file,
    get_project_dir,
    normalize_project_name,
)
from backend.app.services.project_inventory import (
    get_download_path as _get_download_path,
)
from backend.app.services.project_inventory import (
    read_project_file as _read_project_file,
)
from backend.app.services.project_repository import (
    _create_project_record,
    _delete_project_record,
    _fetch_profiles,
    _get_profile_by_username,
    _get_project_access_role,
    _get_project_member,
    _get_project_record,
    _get_project_record_by_ref,
    _get_project_team,
    _list_all_project_records,
    _list_owned_project_records,
    _list_project_members_by_project_id,
    _list_project_team_members_by_project_id,
    _list_project_teams_by_project_id,
    _list_shared_project_records,
    _rename_project_record,
    _set_project_entity,
    _upsert_project_record,
)
from backend.app.services.project_storage import (
    ensure_project_storage_dir,
    get_legacy_project_dir,
    list_legacy_owner_names,
    list_legacy_project_dirs,
    locate_project_storage_dir,
    migrate_legacy_project_dir,
)
from backend.app.services.teams import get_team_details, list_teams_for_user
from fastapi import UploadFile

ProjectMemberRole = Literal["editor", "owner", "viewer"]
ProjectEditableMemberRole = Literal["editor", "viewer"]
PROJECT_MEMBER_ROLE_RANK: dict[str, int] = {
    "viewer": 1,
    "editor": 2,
    "owner": 3,
}
INTERNAL_PROJECT_SCRIPT_EXTENSIONS = {".r", ".rmd"}


def _normalize_project_member_role(value: object) -> ProjectMemberRole | None:
    normalized = str(value or "").strip().lower()
    if normalized in PROJECT_MEMBER_ROLE_RANK:
        return normalized  # type: ignore[return-value]
    return None


def _pick_highest_project_role(roles: list[str]) -> ProjectMemberRole | None:
    valid_roles = [role for role in roles if role in PROJECT_MEMBER_ROLE_RANK]
    if not valid_roles:
        return None
    best_role = max(valid_roles, key=lambda role: PROJECT_MEMBER_ROLE_RANK[role])
    return best_role  # type: ignore[return-value]


def _build_project_team_response(
    row: dict[str, Any],
    *,
    direct_overlap_usernames: list[str] | None = None,
) -> dict[str, Any]:
    overlap_usernames = sorted(
        {
            str(username or "").strip()
            for username in (direct_overlap_usernames or [])
            if str(username or "").strip()
        },
        key=str.lower,
    )
    return {
        "direct_member_overlap_count": len(overlap_usernames),
        "direct_member_overlap_usernames": overlap_usernames,
        "entity_name": str(row.get("team_entity_name") or "").strip() or None,
        "id": str(row.get("team_id") or "").strip(),
        "linked_at": str(row.get("linked_at") or "").strip(),
        "member_count": int(row.get("team_member_count") or 0),
        "member_role": str(row.get("member_role") or "viewer").strip() or "viewer",
        "name": str(row.get("team_name") or "").strip(),
        "owner_username": str(row.get("team_owner_username") or "").strip(),
        "slug": str(row.get("team_slug") or "").strip(),
    }


def _collect_project_access_state(project_id: str) -> dict[str, Any]:
    direct_members = _list_project_members_by_project_id(project_id)
    team_members = _list_project_team_members_by_project_id(project_id)

    direct_roles_by_user_id: dict[str, ProjectMemberRole] = {}
    effective_roles_by_user_id: dict[str, ProjectMemberRole] = {}
    access_via_teams_by_user_id: dict[str, list[str]] = {}
    direct_overlap_usernames_by_team_id: dict[str, set[str]] = {}

    for member in direct_members:
        user_id = str(member.get("member_id") or "").strip()
        direct_role = _normalize_project_member_role(member.get("member_role"))
        if not user_id or not direct_role:
            continue
        direct_roles_by_user_id[user_id] = direct_role
        effective_roles_by_user_id[user_id] = direct_role

    for member in team_members:
        user_id = str(member.get("member_id") or "").strip()
        team_id = str(member.get("team_id") or "").strip()
        team_name = str(member.get("team_name") or "").strip()
        team_role = _normalize_project_member_role(member.get("project_member_role"))
        username = str(member.get("member_username") or "").strip()
        if not user_id:
            continue

        if team_name:
            team_names = access_via_teams_by_user_id.setdefault(user_id, [])
            if team_name not in team_names:
                team_names.append(team_name)
                team_names.sort(key=str.lower)

        if team_role:
            current_role = effective_roles_by_user_id.get(user_id)
            effective_role = _pick_highest_project_role(
                [str(current_role or "").strip(), team_role]
            )
            if effective_role:
                effective_roles_by_user_id[user_id] = effective_role

        if team_id and user_id in direct_roles_by_user_id and username:
            overlap_usernames = direct_overlap_usernames_by_team_id.setdefault(team_id, set())
            overlap_usernames.add(username)

    return {
        "access_via_teams_by_user_id": access_via_teams_by_user_id,
        "direct_members": direct_members,
        "direct_overlap_usernames_by_team_id": {
            team_id: sorted(usernames, key=str.lower)
            for team_id, usernames in direct_overlap_usernames_by_team_id.items()
        },
        "direct_roles_by_user_id": direct_roles_by_user_id,
        "effective_roles_by_user_id": effective_roles_by_user_id,
        "team_members": team_members,
    }


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


def _attach_active_runs(items: list[dict[str, object]]) -> list[dict[str, object]]:
    project_ids = [
        str(item.get("id") or "").strip()
        for item in items
        if isinstance(item, dict) and str(item.get("id") or "").strip()
    ]
    indexed_runs = list_active_analysis_runs_for_projects(project_ids)
    if not indexed_runs:
        return items

    enriched_items: list[dict[str, object]] = []
    for item in items:
        if not isinstance(item, dict):
            enriched_items.append(item)
            continue
        enriched = item.copy()
        project_id = str(item.get("id") or "").strip()
        active_run = indexed_runs.get(project_id)
        if active_run is not None:
            enriched["active_run"] = active_run
        enriched_items.append(enriched)
    return enriched_items


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


def list_sidebar_projects_for_user(
    session_user_id: str,
    session_username: str,
    role: str,
) -> dict[str, object]:
    collection = list_projects_for_user(session_user_id, session_username, role)
    items: list[dict[str, object]] = []

    for project in collection["items"]:
        if not isinstance(project, dict):
            continue

        project_id = str(project.get("id") or "").strip() or None
        project_slug = str(project.get("slug") or "").strip() or None
        owner = str(project.get("owner") or "").strip()
        name = str(project.get("name") or "").strip()
        html_files = project.get("html_files")
        html_count = len(html_files) if isinstance(html_files, list) else 0
        route_ref = project_slug or project_id

        if not route_ref or not owner or not name:
            continue

        payload = {
            "access_role": project.get("access_role"),
            "can_run": owner == session_username,
            "file_count": int(project.get("file_count") or 0),
            "html_count": html_count,
            "id": project_id,
            "name": name,
            "owner": owner,
            "route_ref": route_ref,
            "slug": project_slug,
            "status": str(project.get("status") or "empty").strip() or "empty",
            "updated_at": str(project.get("updated_at") or "").strip(),
        }
        active_run = project.get("active_run")
        if active_run is not None:
            payload["active_run"] = active_run
        items.append(payload)

    items.sort(
        key=lambda item: (
            str(item.get("owner") or "").lower(),
            str(item.get("name") or "").lower(),
        )
    )

    return {"title": "Proyectos", "items": items}


def list_projects_for_user(session_user_id: str, session_username: str, role: str) -> dict[str, object]:
    get_settings().projects_dir.mkdir(parents=True, exist_ok=True)
    owners = list_legacy_owner_names() if role == "admin" else [session_username]

    projects: dict[str, list[str]] = {}
    items: list[dict[str, object]] = []
    indexed_items: dict[str, dict[str, object]] = {}
    for owner in owners:
        legacy_project_dirs = list_legacy_project_dirs(owner)
        projects[owner] = [directory.name for directory in legacy_project_dirs]
        for legacy_project_dir in legacy_project_dirs:
            try:
                metadata: dict[str, Any] | None = _get_project_record(owner, legacy_project_dir.name)
            except Exception:
                metadata = None
            if metadata is None:
                try:
                    metadata = _upsert_project_record(owner, legacy_project_dir.name)
                except Exception:
                    metadata = None

            project_id = str((metadata or {}).get("id") or "").strip()
            project_dir = (
                migrate_legacy_project_dir(project_id, owner=owner, project_name=legacy_project_dir.name)
                if project_id
                else legacy_project_dir
            )
            payload = _build_project_payload(owner, project_dir, metadata)
            payload["access_role"] = "owner" if owner == session_username else "viewer"
            indexed_items[f"{owner}::{legacy_project_dir.name}"] = payload

    try:
        database_records = (
            _list_all_project_records()
            if role == "admin"
            else _list_owned_project_records(session_username)
        )
    except Exception:
        database_records = []

    for record in database_records:
        owner = str(record.get("owner_username") or "").strip()
        project_name = str(record.get("name") or "").strip()
        if not owner or not project_name:
            continue

        project_id = str(record.get("id") or "").strip()
        project_dir = (
            migrate_legacy_project_dir(project_id, owner=owner, project_name=project_name)
            if project_id
            else get_project_dir(owner, project_name)
        )
        projects.setdefault(owner, [])
        if project_name not in projects[owner]:
            projects[owner].append(project_name)

        payload = _build_project_payload(owner, project_dir, record)
        payload["access_role"] = "owner" if owner == session_username else ("editor" if role == "admin" else None)
        indexed_items[f"{owner}::{project_name}"] = payload

    if role != "admin":
        try:
            shared_records = _list_shared_project_records(session_user_id)
        except Exception:
            shared_records = []
        for record in shared_records:
            owner = str(record.get("owner_username") or "").strip()
            project_name = str(record.get("name") or "").strip()
            if not owner or not project_name or owner == session_username:
                continue

            project_id = str(record.get("id") or "").strip()
            project_dir = (
                migrate_legacy_project_dir(project_id, owner=owner, project_name=project_name)
                if project_id
                else get_project_dir(owner, project_name)
            )
            projects.setdefault(owner, [])
            if project_name not in projects[owner]:
                projects[owner].append(project_name)
            indexed_items[f"{owner}::{project_name}"] = _build_project_payload(owner, project_dir, record)

    for owner, project_names in projects.items():
        projects[owner] = sorted(project_names, key=lambda item: item.lower())

    items.extend(indexed_items.values())
    items = _attach_active_runs(items)
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
    *,
    entity_name: str | None = None,
    team_id: str | None = None,
    actor_role: str = "user",
) -> tuple[bool, str]:
    try:
        normalized_name = normalize_project_name(project_name)
    except ValueError as exc:
        return False, str(exc)

    if not template_file.filename:
        return False, "Debes seleccionar un archivo Excel para el proyecto"

    if not allowed_template_file(template_file.filename):
        return False, "El archivo base debe ser un Excel permitido (.xls o .xlsx)"

    legacy_project_dir = get_legacy_project_dir(username, normalized_name)
    record_created = False
    try:
        existing_record = _get_project_record(username, normalized_name)
    except Exception:
        existing_record = None
    if legacy_project_dir.exists() or existing_record:
        return False, f"El proyecto '{normalized_name}' ya existe"

    project_dir: Path | None = None
    try:
        created_record = _create_project_record(username, normalized_name, entity_name)
        record_created = True
        project_id = str(created_record.get("id") or "").strip()
        project_dir = ensure_project_storage_dir(project_id, owner=username, project_name=normalized_name)

        excel_name = _normalize_upload_filename(template_file.filename)
        await _save_upload(project_dir / _template_storage_name(excel_name), template_file)

        for upload in additional_files:
            if upload.filename:
                safe_name = _normalize_upload_filename(upload.filename)
                await _save_upload(project_dir / safe_name, upload)
        if team_id and team_id.strip():
            linked, linked_message = add_project_team(
                username,
                normalized_name,
                team_id.strip(),
                session_user_id=str(actor_user_id or "").strip(),
                session_username=username,
                role=actor_role,
                member_role="editor",
            )
            if not linked:
                raise ServiceError(linked_message)
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
        if project_dir and project_dir.exists():
            shutil.rmtree(project_dir)
        if record_created:
            try:
                _delete_project_record(username, normalized_name)
            except ServiceError:
                pass
        return False, str(exc)
    except ServiceError as exc:
        if project_dir and project_dir.exists():
            shutil.rmtree(project_dir)
        if record_created:
            try:
                _delete_project_record(username, normalized_name)
            except ServiceError:
                pass
        return False, str(exc)
    except Exception as exc:
        if project_dir and project_dir.exists():
            shutil.rmtree(project_dir)
        if record_created:
            try:
                _delete_project_record(username, normalized_name)
            except ServiceError:
                pass
        return False, f"Error al crear proyecto: {exc}"

def get_project_details(owner: str, project_name: str) -> dict[str, object]:
    try:
        metadata = _get_project_record(owner, normalize_project_name(project_name))
    except Exception:
        metadata = None
    if metadata is None:
        try:
            metadata = _upsert_project_record(owner, normalize_project_name(project_name))
        except (FileNotFoundError, ServiceError):
            metadata = None
        except Exception:
            metadata = None

    project_dir = get_project_dir(owner, project_name)
    if (not project_dir.exists() or not project_dir.is_dir()) and metadata is None:
        raise FileNotFoundError("Proyecto no encontrado")

    payload = _build_project_payload(owner, project_dir, metadata)
    return _attach_active_runs([payload])[0]


def resolve_project_reference(project_ref: str) -> dict[str, Any] | None:
    return _get_project_record_by_ref(project_ref)


def get_project_details_by_ref(project_ref: str) -> dict[str, object]:
    metadata = _get_project_record_by_ref(project_ref)
    if not metadata:
        raise FileNotFoundError("Proyecto no encontrado")

    owner = str(metadata.get("owner_username") or "").strip()
    project_name = str(metadata.get("name") or "").strip()
    if not owner or not project_name:
        raise FileNotFoundError("Proyecto no encontrado")

    project_id = str(metadata.get("id") or "").strip()
    project_dir = (
        migrate_legacy_project_dir(project_id, owner=owner, project_name=project_name)
        if project_id
        else get_project_dir(owner, project_name)
    )
    payload = _build_project_payload(owner, project_dir, metadata)
    return _attach_active_runs([payload])[0]


def user_can_view_project(user_id: str, username: str, role: str, owner: str, project_name: str) -> bool:
    return _get_project_access_role(user_id, username, role, owner, project_name) is not None


def user_can_edit_project(user_id: str, username: str, role: str, owner: str, project_name: str) -> bool:
    access_role = _get_project_access_role(user_id, username, role, owner, project_name)
    return access_role in {"editor", "owner"}


def _is_internal_project_script(file_path: str) -> bool:
    return Path(file_path).suffix.lower() in INTERNAL_PROJECT_SCRIPT_EXTENSIONS


def get_project_members(owner: str, project_name: str) -> list[dict[str, Any]]:
    fallback_owner_member = [
        {
            "access_via_teams": [],
            "avatar_url": None,
            "bio": None,
            "department": None,
            "direct_member_role": "owner",
            "display_name": owner,
            "email": None,
            "has_direct_access": True,
            "id": f"local-owner::{owner}",
            "is_owner": True,
            "member_role": "owner",
            "username": owner,
        }
    ]

    try:
        record = _upsert_project_record(owner, project_name)
    except ServiceError:
        return fallback_owner_member

    try:
        project_id = str(record["id"])
        access_state = _collect_project_access_state(project_id)
        direct_members = list(access_state.get("direct_members") or [])
        team_members = list(access_state.get("team_members") or [])
        member_ids = {
            str(member.get("member_id") or "").strip()
            for member in [*direct_members, *team_members]
            if str(member.get("member_id") or "").strip()
        }
        profiles = {
            str(profile.get("id") or "").strip(): profile
            for profile in _fetch_profiles()
            if str(profile.get("id") or "").strip() in member_ids
        }
    except ServiceError:
        return fallback_owner_member

    payload_by_member_id: dict[str, dict[str, Any]] = {}
    for member in direct_members:
        member_id = str(member.get("member_id") or "").strip()
        if not member_id:
            continue
        profile = profiles.get(member_id, {})
        username = str(member.get("member_username") or profile.get("username") or "").strip()
        direct_role = _normalize_project_member_role(member.get("member_role")) or "viewer"
        payload_by_member_id[member_id] = {
            "access_via_teams": [],
            "avatar_url": str(profile.get("avatar_url") or "").strip() or None,
            "bio": str(profile.get("bio") or "").strip() or None,
            "department": str(profile.get("department") or "").strip() or None,
            "direct_member_role": direct_role,
            "display_name": str(profile.get("full_name") or "").strip() or username,
            "email": str(profile.get("email") or "").strip().lower() or None,
            "has_direct_access": True,
            "id": member_id,
            "is_owner": direct_role == "owner",
            "member_role": direct_role,
            "username": username,
        }

    for member in team_members:
        member_id = str(member.get("member_id") or "").strip()
        if not member_id:
            continue
        profile = profiles.get(member_id, {})
        username = str(member.get("member_username") or profile.get("username") or "").strip()
        team_name = str(member.get("team_name") or "").strip()
        team_role = _normalize_project_member_role(member.get("project_member_role")) or "viewer"

        current = payload_by_member_id.get(member_id)
        if current is None:
            payload_by_member_id[member_id] = {
                "access_via_teams": [team_name] if team_name else [],
                "avatar_url": str(profile.get("avatar_url") or "").strip() or None,
                "bio": str(profile.get("bio") or "").strip() or None,
                "department": str(profile.get("department") or "").strip() or None,
                "direct_member_role": None,
                "display_name": str(profile.get("full_name") or "").strip() or username,
                "email": str(profile.get("email") or "").strip().lower() or None,
                "has_direct_access": False,
                "id": member_id,
                "is_owner": False,
                "member_role": team_role,
                "username": username,
            }
            continue

        access_via_teams = list(current.get("access_via_teams") or [])
        if team_name and team_name not in access_via_teams:
            access_via_teams.append(team_name)
            access_via_teams.sort(key=str.lower)
            current["access_via_teams"] = access_via_teams

        effective_role = _pick_highest_project_role(
            [str(current.get("member_role") or "").strip(), team_role]
        )
        if effective_role:
            current["member_role"] = effective_role

    payload = list(payload_by_member_id.values())

    payload.sort(
        key=lambda member: (
            0 if member["is_owner"] else 1,
            str(member["display_name"] or member["username"]).lower(),
        )
    )
    return payload


def get_project_members_by_ref(project_ref: str) -> list[dict[str, Any]]:
    metadata = _get_project_record_by_ref(project_ref)
    if not metadata:
        raise FileNotFoundError("Proyecto no encontrado")

    owner = str(metadata.get("owner_username") or "").strip()
    project_name = str(metadata.get("name") or "").strip()
    if not owner or not project_name:
        raise FileNotFoundError("Proyecto no encontrado")

    return get_project_members(owner, project_name)


def search_project_share_candidates(owner: str, project_name: str, query: str, limit: int = 8) -> list[dict[str, Any]]:
    try:
        project = _upsert_project_record(owner, project_name)
    except ServiceError:
        project = None
    excluded_usernames = {owner}
    access_state: dict[str, Any] = {
        "access_via_teams_by_user_id": {},
        "direct_roles_by_user_id": {},
        "effective_roles_by_user_id": {},
    }
    if project:
        access_state = _collect_project_access_state(str(project["id"]))
    normalized_query = query.strip().lower()

    candidates: list[dict[str, Any]] = []
    try:
        profiles = _fetch_profiles()
    except ServiceError:
        return []

    for profile in profiles:
        username = str(profile.get("username") or "").strip()
        email = str(profile.get("email") or "").strip().lower()
        display_name = str(profile.get("full_name") or "").strip() or username
        user_id = str(profile.get("id") or "").strip()

        if not username or username in excluded_usernames:
            continue

        if normalized_query:
            searchable = " ".join([username, email, display_name]).lower()
            if normalized_query not in searchable:
                continue

        direct_member_role = access_state["direct_roles_by_user_id"].get(user_id)
        effective_role = access_state["effective_roles_by_user_id"].get(user_id)
        access_via_teams = list(access_state["access_via_teams_by_user_id"].get(user_id) or [])
        candidates.append(
            {
                "access_via_teams": access_via_teams,
                "avatar_url": str(profile.get("avatar_url") or "").strip() or None,
                "bio": str(profile.get("bio") or "").strip() or None,
                "department": str(profile.get("department") or "").strip() or None,
                "direct_member_role": direct_member_role,
                "display_name": display_name,
                "email": email or None,
                "has_direct_access": direct_member_role is not None,
                "id": user_id,
                "member_role": effective_role,
                "username": username,
            }
        )

    candidates.sort(
        key=lambda candidate: (
            2
            if candidate["has_direct_access"]
            else (1 if candidate["access_via_teams"] else 0),
            str(candidate["display_name"] or candidate["username"]).lower(),
        )
    )
    return candidates[:limit]


def list_project_teams(owner: str, project_name: str) -> list[dict[str, Any]]:
    project = _upsert_project_record(owner, project_name)
    project_id = str(project.get("id") or "").strip()
    if not project_id:
        raise ServiceError("No se pudo resolver el proyecto")
    access_state = _collect_project_access_state(project_id)
    overlap_by_team_id = access_state.get("direct_overlap_usernames_by_team_id") or {}
    return [
        _build_project_team_response(
            item,
            direct_overlap_usernames=overlap_by_team_id.get(str(item.get("team_id") or "").strip(), []),
        )
        for item in _list_project_teams_by_project_id(project_id)
        if isinstance(item, dict) and str(item.get("team_id") or "").strip()
    ]


def search_project_team_candidates(
    owner: str,
    project_name: str,
    *,
    session_user_id: str,
    session_username: str,
    role: str,
    query: str,
    limit: int = 8,
) -> list[dict[str, Any]]:
    project = _upsert_project_record(owner, project_name)
    project_id = str(project.get("id") or "").strip()
    linked_team_ids = {
        str(team.get("team_id") or "").strip()
        for team in _list_project_teams_by_project_id(project_id)
        if str(team.get("team_id") or "").strip()
    }
    access_state = _collect_project_access_state(project_id)
    direct_user_ids = set(access_state.get("direct_roles_by_user_id") or {})
    normalized_query = query.strip().lower()

    candidates: list[dict[str, Any]] = []
    try:
        owned_teams = list_teams_for_user(session_user_id, session_username, role)
    except ServiceError:
        return []

    for team in owned_teams:
        team_id = str(team.get("id") or "").strip()
        team_name = str(team.get("name") or "").strip()
        team_owner_username = str(team.get("owner_username") or "").strip()
        entity_name = str(team.get("entity_name") or "").strip()

        if not team_id or team_id in linked_team_ids:
            continue
        if role != "admin" and team_owner_username != session_username:
            continue
        if normalized_query:
            searchable = " ".join([team_name, team_owner_username, entity_name]).lower()
            if normalized_query not in searchable:
                continue

        direct_overlap_usernames: list[str] = []
        try:
            team_details = get_team_details(team_id, session_user_id, session_username, role)
        except ServiceError:
            team_details = {"members": []}
        for member in team_details.get("members") or []:
            member_id = str(member.get("id") or "").strip()
            member_username = str(member.get("username") or "").strip()
            if member_id and member_id in direct_user_ids and member_username:
                direct_overlap_usernames.append(member_username)
        direct_overlap_usernames = sorted(set(direct_overlap_usernames), key=str.lower)

        candidates.append(
            {
                "direct_member_overlap_count": len(direct_overlap_usernames),
                "direct_member_overlap_usernames": direct_overlap_usernames,
                "entity_name": entity_name or None,
                "id": team_id,
                "linked_at": "",
                "member_count": int(team.get("member_count") or 0),
                "member_role": "viewer",
                "name": team_name,
                "owner_username": team_owner_username,
                "slug": str(team.get("slug") or "").strip(),
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
        owner_profile = _get_profile_by_username(owner)
        if not candidate:
            return False, "No se encontró el usuario seleccionado"
        if not owner_profile:
            return False, "No se encontró el propietario del proyecto"

        candidate_id = str(candidate.get("id") or "").strip()
        candidate_username = str(candidate.get("username") or "").strip()
        owner_user_id = str(owner_profile.get("id") or "").strip()
        if not candidate_id or not candidate_username:
            return False, "El usuario seleccionado no es válido"
        if not owner_user_id:
            return False, "El propietario del proyecto no es válido"
        if candidate_username == owner:
            return False, "El propietario ya tiene acceso al proyecto"

        current_member = _get_project_member(str(project["id"]), candidate_id)
        access_state = _collect_project_access_state(str(project["id"]))
        access_via_teams = list(access_state.get("access_via_teams_by_user_id", {}).get(candidate_id) or [])
        previous_role = str(current_member.get("member_role") or "").strip().lower() if current_member else None
        if current_member:
            if previous_role == member_role:
                return True, "El usuario ya contaba con ese nivel de acceso"
            execute(
                """
                INSERT INTO internal.project_members (project_id, user_id, member_role)
                VALUES (%s, %s, %s::internal.project_member_role)
                ON CONFLICT (project_id, user_id) DO UPDATE
                SET member_role = EXCLUDED.member_role
                """,
                (project["id"], candidate_id, member_role),
            )
            notify_project_shared(
                actor_user_id=owner_user_id,
                actor_username=owner,
                member_role=member_role,
                project_id=str(project.get("id") or "").strip() or None,
                project_name=str(project.get("name") or "").strip() or project_name,
                project_owner_username=owner,
                project_slug=str(project.get("slug") or "").strip() or None,
                recipient_user_id=candidate_id,
                updated_existing_access=True,
            )
            return True, "Permisos del usuario actualizados correctamente"

        execute(
            """
            INSERT INTO internal.project_members (project_id, user_id, member_role)
            VALUES (%s, %s, %s::internal.project_member_role)
            ON CONFLICT (project_id, user_id) DO UPDATE
            SET member_role = EXCLUDED.member_role
            """,
            (project["id"], candidate_id, member_role),
        )
        notify_project_shared(
            actor_user_id=owner_user_id,
            actor_username=owner,
            member_role=member_role,
            project_id=str(project.get("id") or "").strip() or None,
            project_name=str(project.get("name") or "").strip() or project_name,
            project_owner_username=owner,
            project_slug=str(project.get("slug") or "").strip() or None,
            recipient_user_id=candidate_id,
            updated_existing_access=False,
        )
        if access_via_teams:
            teams_label = ", ".join(access_via_teams)
            return (
                True,
                f"Acceso directo añadido correctamente. El usuario ya accedia mediante {teams_label}.",
            )
        return True, "Proyecto compartido correctamente"
    except ServiceError as exc:
        return False, str(exc)


def add_project_team(
    owner: str,
    project_name: str,
    team_id: str,
    *,
    session_user_id: str,
    session_username: str,
    role: str,
    member_role: ProjectEditableMemberRole = "viewer",
) -> tuple[bool, str]:
    try:
        project = _upsert_project_record(owner, project_name)
        project_id = str(project.get("id") or "").strip()
        if not project_id:
            return False, "No se pudo resolver el proyecto"

        linked_team = _get_project_team(project_id, team_id)
        if linked_team:
            previous_role = str(linked_team.get("member_role") or "").strip().lower()
            if previous_role == member_role:
                return True, "El equipo ya contaba con ese nivel de acceso"
        team_candidates = {
            str(item.get("id") or "").strip(): item
            for item in list_teams_for_user(session_user_id, session_username, role)
        }
        team_summary = team_candidates.get(team_id)
        if not team_summary:
            return False, "No se encontró el equipo seleccionado"
        if role != "admin" and str(team_summary.get("owner_username") or "").strip() != session_username:
            return False, "Solo puedes compartir equipos que gestionas"

        access_state = _collect_project_access_state(project_id)
        direct_user_ids = set(access_state.get("direct_roles_by_user_id") or {})
        direct_overlap_count = 0
        try:
            team_details = get_team_details(team_id, session_user_id, session_username, role)
        except ServiceError:
            team_details = {"members": []}
        for member in team_details.get("members") or []:
            member_id = str(member.get("id") or "").strip()
            if member_id and member_id in direct_user_ids:
                direct_overlap_count += 1

        execute(
            """
            INSERT INTO internal.project_teams (project_id, team_id, member_role)
            VALUES (%s, %s, %s::internal.project_member_role)
            ON CONFLICT (project_id, team_id) DO UPDATE
            SET member_role = EXCLUDED.member_role
            """,
            (project_id, team_id, member_role),
        )
        if linked_team:
            return True, "Permisos del equipo actualizados correctamente"
        if direct_overlap_count > 0:
            return (
                True,
                "Proyecto compartido con el equipo correctamente. "
                f"{direct_overlap_count} miembro(s) ya tenian acceso directo.",
            )
        return True, "Proyecto compartido con el equipo correctamente"
    except ServiceError as exc:
        return False, str(exc)


def transfer_project_ownership(
    owner: str,
    project_name: str,
    username: str,
    previous_owner_role: ProjectEditableMemberRole = "editor",
) -> tuple[bool, str, str]:
    try:
        normalized_name = normalize_project_name(project_name)
        project = _upsert_project_record(owner, normalized_name)
        candidate = _get_profile_by_username(username)
        owner_profile = _get_profile_by_username(owner)
        if not candidate:
            return False, "No se encontró el usuario seleccionado", owner
        if not owner_profile:
            return False, "No se encontró el propietario actual del proyecto", owner

        candidate_id = str(candidate.get("id") or "").strip()
        candidate_username = str(candidate.get("username") or "").strip()
        owner_user_id = str(owner_profile.get("id") or "").strip()
        if not candidate_id or not candidate_username:
            return False, "El usuario seleccionado no es válido", owner
        if not owner_user_id:
            return False, "El propietario actual del proyecto no es válido", owner
        if candidate_username == owner:
            return False, "Ese usuario ya es el propietario del proyecto", owner

        current_member = _get_project_member(str(project["id"]), candidate_id)
        if not current_member:
            return False, "Solo puedes transferir el proyecto a un miembro existente", owner

        if _get_project_record(candidate_username, normalized_name):
            return False, "El nuevo propietario ya tiene un proyecto con ese nombre", owner

        try:
            previous_owner_id = str(project.get("owner_id") or "").strip()
            if not previous_owner_id:
                raise ServiceError("No se pudo resolver el propietario actual del proyecto")
            execute(
                """
                UPDATE internal.projects
                SET owner_id = %s
                WHERE id = %s
                """,
                (candidate_id, project["id"]),
            )
            execute(
                """
                INSERT INTO internal.project_members (project_id, user_id, member_role)
                VALUES (%s, %s, %s::internal.project_member_role)
                ON CONFLICT (project_id, user_id) DO UPDATE
                SET member_role = EXCLUDED.member_role
                """,
                (project["id"], previous_owner_id, previous_owner_role),
            )
            execute(
                """
                INSERT INTO internal.project_members (project_id, user_id, member_role)
                VALUES (%s, %s, 'owner')
                ON CONFLICT (project_id, user_id) DO UPDATE
                SET member_role = EXCLUDED.member_role
                """,
                (project["id"], candidate_id),
            )
        except ServiceError as exc:
            return False, str(exc), owner

        notify_project_ownership_transferred(
            actor_user_id=owner_user_id,
            actor_username=owner,
            project_id=str(project.get("id") or "").strip() or None,
            project_name=str(project.get("name") or "").strip() or normalized_name,
            project_slug=str(project.get("slug") or "").strip() or None,
            recipient_user_id=candidate_id,
        )

        return True, "Propiedad del proyecto transferida correctamente", candidate_username
    except FileNotFoundError:
        return False, "Proyecto no encontrado", owner
    except (ServiceError, ValueError) as exc:
        return False, str(exc), owner


def remove_project_team(
    owner: str,
    project_name: str,
    team_id: str,
) -> tuple[bool, str]:
    try:
        project = _upsert_project_record(owner, project_name)
        project_id = str(project.get("id") or "").strip()
        if not project_id:
            return False, "No se pudo resolver el proyecto"

        current_team = _get_project_team(project_id, team_id)
        if not current_team:
            return False, "El equipo no tiene acceso a este proyecto"

        execute(
            """
            DELETE FROM internal.project_teams
            WHERE project_id = %s
              AND team_id = %s
            """,
            (project_id, team_id),
        )
    except ServiceError as exc:
        return False, str(exc)
    return True, "Acceso del equipo eliminado correctamente"


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

        execute(
            """
            DELETE FROM internal.project_members
            WHERE project_id = %s
              AND user_id = %s
              AND member_role <> 'owner'
            """,
            (project["id"], candidate_id),
        )
    except ServiceError as exc:
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
    entity_name: str | None = None,
) -> tuple[bool, str, str]:
    try:
        current_name = normalize_project_name(project_name)
        project_record = _upsert_project_record(owner, current_name)
        project_id = str(project_record.get("id") or "").strip()
        project_dir = (
            migrate_legacy_project_dir(project_id, owner=owner, project_name=current_name)
            if project_id
            else get_project_dir(owner, current_name)
        )
    except FileNotFoundError:
        return False, "Proyecto no encontrado", project_name
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
            if _get_project_record(owner, normalized_new_name):
                return False, "Ya existe un proyecto con ese nombre", current_name
            try:
                _rename_project_record(owner, current_name, normalized_new_name)
            except ServiceError as exc:
                return False, str(exc), current_name
            current_name = normalized_new_name

    if entity_name is not None:
        try:
            project_id = str(project_record.get("id") or "").strip()
            if project_id:
                _set_project_entity(project_id, entity_name)
        except ServiceError as exc:
            return False, str(exc), current_name

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
        project = _upsert_project_record(owner, normalized_name)
    except FileNotFoundError:
        return False, "Proyecto no encontrado."
    except ValueError as exc:
        return False, str(exc)

    project_id = str(project.get("id") or "").strip()
    project_dir = (
        locate_project_storage_dir(project_id, owner=owner, project_name=normalized_name)
        if project_id
        else get_project_dir(owner, normalized_name)
    )
    if not project_dir.exists() or not project_dir.is_dir():
        return False, "Proyecto no encontrado."
    shutil.rmtree(project_dir)
    try:
        _delete_project_record(owner, normalized_name)
    except ServiceError as exc:
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
    if _is_internal_project_script(file_path):
        raise ValueError("Los scripts internos del análisis no están disponibles desde la interfaz.")
    return _read_project_file(owner, file_path, max_lines)


def get_download_path(owner: str, file_path: str) -> Path:
    if _is_internal_project_script(file_path):
        raise ValueError("Los scripts internos del análisis no están disponibles desde la interfaz.")
    return _get_download_path(owner, file_path)
