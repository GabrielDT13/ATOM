from __future__ import annotations

import re
from typing import Any, Literal

from backend.app.core.config import get_settings
from backend.app.services.project_inventory import normalize_project_name
from backend.app.services.supabase import (
    SupabaseError,
    build_query_string,
    call_rpc_with_service_role,
    request_with_service_role,
)

ProjectMemberRole = Literal["editor", "owner", "viewer"]


def _slugify_project_name(owner: str, project_name: str) -> str:
    normalized = f"{owner}-{project_name}".strip().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    return slug or "project"


def _fetch_profiles(
    *,
    filters: dict[str, str] | None = None,
    limit: int | None = None,
    order: str | None = "username.asc",
) -> list[dict[str, Any]]:
    query_params: dict[str, str | int | None] = {
        "select": "id,email,username,full_name,avatar_url,department,bio,is_active,roles",
        "order": order,
        "limit": limit,
    }
    if filters:
        query_params.update(filters)

    payload = request_with_service_role(
        "GET",
        f"/rest/v1/vw_profiles?{build_query_string(query_params)}",
    )
    if not isinstance(payload, list):
        raise SupabaseError("Supabase devolvió una lista de perfiles inválida")
    return [profile for profile in payload if isinstance(profile, dict)]


def _get_profile_by_username(username: str) -> dict[str, Any] | None:
    profiles = _fetch_profiles(filters={"username": f"eq.{username}"}, limit=1, order=None)
    return profiles[0] if profiles else None


def _fetch_project_records(
    *,
    filters: dict[str, str] | None = None,
    limit: int | None = None,
    order: str | None = "owner_username.asc,name.asc",
) -> list[dict[str, Any]]:
    query_params: dict[str, str | int | None] = {
        "select": "id,owner_id,owner_username,name,slug,description,status,created_at,updated_at,member_count",
        "order": order,
        "limit": limit,
    }
    if filters:
        query_params.update(filters)

    payload = request_with_service_role(
        "GET",
        f"/rest/v1/vw_projects?{build_query_string(query_params)}",
    )
    if not isinstance(payload, list):
        raise SupabaseError("Supabase devolvió una lista de proyectos inválida")
    return [project for project in payload if isinstance(project, dict)]


def _get_project_record(owner: str, project_name: str) -> dict[str, Any] | None:
    projects = _fetch_project_records(
        filters={
            "owner_username": f"eq.{owner}",
            "name": f"eq.{project_name}",
        },
        limit=1,
        order=None,
    )
    return projects[0] if projects else None


def _list_all_project_records() -> list[dict[str, Any]]:
    return _fetch_project_records()


def _list_owned_project_records(username: str) -> list[dict[str, Any]]:
    return _fetch_project_records(filters={"owner_username": f"eq.{username}"})


def _list_shared_project_records(user_id: str) -> list[dict[str, Any]]:
    payload = request_with_service_role(
        "GET",
        "/rest/v1/vw_projects_with_users?"
        + build_query_string(
            {
                "select": "project_id,member_role",
                "member_id": f"eq.{user_id}",
                "member_role": "neq.owner",
                "order": "project_name.asc",
            }
        ),
    )
    if not isinstance(payload, list):
        raise SupabaseError("Supabase devolvió una lista de miembros de proyecto inválida")

    projects: list[dict[str, Any]] = []
    for row in payload:
        if not isinstance(row, dict):
            continue
        project_id = str(row.get("project_id") or "").strip()
        if not project_id:
            continue
        records = _fetch_project_records(filters={"id": f"eq.{project_id}"}, limit=1, order=None)
        if records:
            project = records[0].copy()
            member_role = str(row.get("member_role") or "viewer").strip().lower()
            project["access_role"] = member_role if member_role in {"editor", "viewer"} else "viewer"
            projects.append(project)
    return projects


def _upsert_project_record(owner: str, project_name: str) -> dict[str, Any]:
    normalized_name = normalize_project_name(project_name)
    project_dir = get_settings().projects_dir / owner / normalized_name
    if not project_dir.exists() or not project_dir.is_dir():
        raise FileNotFoundError("Proyecto no encontrado")

    existing = _get_project_record(owner, normalized_name)
    if existing:
        return existing

    owner_profile = _get_profile_by_username(owner)
    if not owner_profile:
        raise SupabaseError("No se encontró el propietario del proyecto en Supabase")

    owner_id = str(owner_profile.get("id") or "").strip()
    if not owner_id:
        raise SupabaseError("El propietario del proyecto no tiene un id válido")

    call_rpc_with_service_role(
        "admin_create_project",
        json_body={
            "p_description": None,
            "p_name": normalized_name,
            "p_owner_user_id": owner_id,
            "p_slug": _slugify_project_name(owner, normalized_name),
            "p_status": "active",
        },
    )
    created = _get_project_record(owner, normalized_name)
    if not created:
        raise SupabaseError("No se pudo registrar el proyecto en Supabase")
    return created


def _rename_project_record(owner: str, current_name: str, new_name: str) -> None:
    record = _get_project_record(owner, current_name)
    if not record:
        _upsert_project_record(owner, current_name)
        record = _get_project_record(owner, current_name)
    if not record:
        raise SupabaseError("No se pudo resolver el proyecto en Supabase")

    call_rpc_with_service_role(
        "admin_update_project",
        json_body={
            "p_name": new_name,
            "p_project_id": record["id"],
            "p_slug": _slugify_project_name(owner, new_name),
        },
    )


def _delete_project_record(owner: str, project_name: str) -> None:
    record = _get_project_record(owner, project_name)
    if not record:
        return
    call_rpc_with_service_role(
        "admin_delete_project",
        json_body={"p_project_id": record["id"]},
    )


def _list_project_members_by_project_id(project_id: str) -> list[dict[str, Any]]:
    payload = request_with_service_role(
        "GET",
        "/rest/v1/vw_projects_with_users?"
        + build_query_string(
            {
                "select": "project_id,owner_id,owner_username,member_id,member_username,member_role,member_created_at",
                "project_id": f"eq.{project_id}",
                "order": "member_username.asc",
            }
        ),
    )
    if not isinstance(payload, list):
        raise SupabaseError("Supabase devolvió una lista de miembros inválida")
    return [member for member in payload if isinstance(member, dict)]


def _get_project_member(project_id: str, user_id: str) -> dict[str, Any] | None:
    members = _list_project_members_by_project_id(project_id)
    for member in members:
        if str(member.get("member_id") or "").strip() == user_id:
            return member
    return None


def _get_project_access_role(
    user_id: str,
    username: str,
    role: str,
    owner: str,
    project_name: str,
) -> ProjectMemberRole | None:
    if role == "admin" or username == owner:
        return "owner"
    project = _get_project_record(owner, project_name)
    if not project:
        return None

    member = _get_project_member(str(project["id"]), user_id)
    if not member:
        return None

    member_role = str(member.get("member_role") or "").strip().lower()
    if member_role in {"editor", "owner", "viewer"}:
        return member_role  # type: ignore[return-value]
    return None


def user_can_view_project(user_id: str, username: str, role: str, owner: str, project_name: str) -> bool:
    return _get_project_access_role(user_id, username, role, owner, project_name) is not None


def user_can_edit_project(user_id: str, username: str, role: str, owner: str, project_name: str) -> bool:
    access_role = _get_project_access_role(user_id, username, role, owner, project_name)
    return access_role in {"editor", "owner"}
