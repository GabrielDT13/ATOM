from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from backend.app.core.config import get_settings
from backend.app.services.database import execute, fetch_all, fetch_one
from backend.app.services.entities import ensure_entity
from backend.app.services.errors import ServiceError
from backend.app.services.project_inventory import normalize_project_name

ProjectMemberRole = Literal["editor", "owner", "viewer"]
PROJECT_MEMBER_ROLE_RANK: dict[str, int] = {
    "viewer": 1,
    "editor": 2,
    "owner": 3,
}


def _normalize_project_member_role(value: Any) -> ProjectMemberRole | None:
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


def _fetch_profiles(
    *,
    filters: dict[str, str] | None = None,
    limit: int | None = None,
    order: str | None = "username.asc",
) -> list[dict[str, Any]]:
    query = """
    SELECT
      id,
      email,
      username,
      full_name,
      avatar_url,
      department,
      bio,
      is_active,
      roles
    FROM public.vw_profiles
    """
    clauses: list[str] = []
    params: list[Any] = []
    if filters:
        if "username" in filters and filters["username"].startswith("eq."):
            clauses.append("username = %s")
            params.append(filters["username"][3:])
        if "id" in filters and filters["id"].startswith("eq."):
            clauses.append("id = %s")
            params.append(filters["id"][3:])
    if clauses:
        query += " WHERE " + " AND ".join(clauses)
    if order:
        query += " ORDER BY username ASC"
    if limit is not None:
        query += " LIMIT %s"
        params.append(limit)
    return fetch_all(query, tuple(params))


def _get_profile_by_username(username: str) -> dict[str, Any] | None:
    profiles = _fetch_profiles(filters={"username": f"eq.{username}"}, limit=1, order=None)
    return profiles[0] if profiles else None


def _fetch_project_records(
    *,
    filters: dict[str, str] | None = None,
    limit: int | None = None,
    order: str | None = "owner_username.asc,name.asc",
) -> list[dict[str, Any]]:
    query = """
    SELECT
      id,
      owner_id,
      owner_username,
      entity_id,
      entity_name,
      entity_slug,
      name,
      slug,
      description,
      status,
      created_at,
      updated_at,
      member_count
    FROM public.vw_projects
    """
    clauses: list[str] = []
    params: list[Any] = []
    if filters:
        if "owner_username" in filters and filters["owner_username"].startswith("eq."):
            clauses.append("owner_username = %s")
            params.append(filters["owner_username"][3:])
        if "name" in filters and filters["name"].startswith("eq."):
            clauses.append("name = %s")
            params.append(filters["name"][3:])
        if "id" in filters and filters["id"].startswith("eq."):
            clauses.append("id = %s")
            params.append(filters["id"][3:])
        if "slug" in filters and filters["slug"].startswith("eq."):
            clauses.append("slug = %s")
            params.append(filters["slug"][3:])
    if clauses:
        query += " WHERE " + " AND ".join(clauses)
    if order:
        query += " ORDER BY owner_username ASC, name ASC"
    if limit is not None:
        query += " LIMIT %s"
        params.append(limit)
    return fetch_all(query, tuple(params))


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


def _is_uuid_like(value: str) -> bool:
    try:
        UUID(value)
    except ValueError:
        return False
    return True


def _get_project_record_by_ref(project_ref: str) -> dict[str, Any] | None:
    normalized_ref = str(project_ref or "").strip()
    if not normalized_ref:
        return None

    filters = (
        {"id": f"eq.{normalized_ref}"}
        if _is_uuid_like(normalized_ref)
        else {"slug": f"eq.{normalized_ref}"}
    )
    projects = _fetch_project_records(filters=filters, limit=1, order=None)
    return projects[0] if projects else None


def _list_all_project_records() -> list[dict[str, Any]]:
    return _fetch_project_records()


def _list_owned_project_records(username: str) -> list[dict[str, Any]]:
    return _fetch_project_records(filters={"owner_username": f"eq.{username}"})


def _list_shared_project_records(user_id: str) -> list[dict[str, Any]]:
    payload = fetch_all(
        """
        WITH direct_access AS (
          SELECT
            project_id,
            CASE member_role
              WHEN 'owner' THEN 3
              WHEN 'editor' THEN 2
              ELSE 1
            END AS role_rank
          FROM public.vw_projects_with_users
          WHERE member_id = %s
        ),
        team_access AS (
          SELECT
            project_id,
            CASE project_member_role
              WHEN 'owner' THEN 3
              WHEN 'editor' THEN 2
              ELSE 1
            END AS role_rank
          FROM public.vw_project_team_members
          WHERE member_id = %s
        ),
        effective_access AS (
          SELECT
            project_id,
            max(role_rank) AS role_rank
          FROM (
            SELECT * FROM direct_access
            UNION ALL
            SELECT * FROM team_access
          ) access_entries
          GROUP BY project_id
        )
        SELECT
          project_id,
          CASE role_rank
            WHEN 3 THEN 'owner'
            WHEN 2 THEN 'editor'
            ELSE 'viewer'
          END AS member_role
        FROM effective_access
        WHERE role_rank < 3
        ORDER BY project_id ASC
        """,
        (user_id, user_id),
    )

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


def _list_project_teams_by_project_id(project_id: str) -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT
          project_id,
          team_id,
          team_name,
          team_slug,
          team_owner_id,
          team_owner_username,
          team_entity_id,
          team_entity_name,
          team_entity_slug,
          team_member_count,
          member_role,
          linked_at
        FROM public.vw_project_teams
        WHERE project_id = %s
        ORDER BY lower(team_name) ASC
        """,
        (project_id,),
    )


def _list_project_team_members_by_project_id(project_id: str) -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT
          project_id,
          team_id,
          team_name,
          team_slug,
          team_owner_id,
          team_owner_username,
          project_member_role,
          member_id,
          member_username,
          team_member_role,
          project_team_created_at,
          team_member_created_at
        FROM public.vw_project_team_members
        WHERE project_id = %s
        ORDER BY lower(team_name) ASC, lower(member_username) ASC
        """,
        (project_id,),
    )


def _get_project_team(project_id: str, team_id: str) -> dict[str, Any] | None:
    teams = _list_project_teams_by_project_id(project_id)
    for team in teams:
        if str(team.get("team_id") or "").strip() == team_id:
            return team
    return None


def _upsert_project_record(owner: str, project_name: str, entity_name: str | None = None) -> dict[str, Any]:
    normalized_name = normalize_project_name(project_name)
    project_dir = get_settings().projects_dir / owner / normalized_name
    if not project_dir.exists() or not project_dir.is_dir():
        raise FileNotFoundError("Proyecto no encontrado")

    existing = _get_project_record(owner, normalized_name)
    if existing:
        return existing

    owner_profile = _get_profile_by_username(owner)
    if not owner_profile:
        raise ServiceError("No se encontró el propietario del proyecto")

    owner_id = str(owner_profile.get("id") or "").strip()
    if not owner_id:
        raise ServiceError("El propietario del proyecto no tiene un id válido")

    slug_row = fetch_one(
        "SELECT internal.ensure_project_slug(%s, %s, NULL) AS slug",
        (owner, normalized_name),
    )
    slug = str((slug_row or {}).get("slug") or "").strip()
    if not slug:
        raise ServiceError("No se pudo calcular el slug del proyecto")
    entity_id = ensure_entity(entity_name)
    execute(
        """
        INSERT INTO internal.projects (owner_id, entity_id, name, slug, description, status)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (owner_id, entity_id, normalized_name, slug, None, "active"),
    )
    created = _get_project_record(owner, normalized_name)
    if not created:
        raise ServiceError("No se pudo registrar el proyecto")
    execute(
        """
        INSERT INTO internal.project_members (project_id, user_id, member_role)
        VALUES (%s, %s, 'owner')
        ON CONFLICT (project_id, user_id) DO UPDATE
        SET member_role = EXCLUDED.member_role
        """,
        (created["id"], owner_id),
    )
    return created


def _rename_project_record(owner: str, current_name: str, new_name: str) -> None:
    record = _get_project_record(owner, current_name)
    if not record:
        _upsert_project_record(owner, current_name)
        record = _get_project_record(owner, current_name)
    if not record:
        raise ServiceError("No se pudo resolver el proyecto")

    slug_row = fetch_one(
        "SELECT internal.ensure_project_slug(%s, %s, %s) AS slug",
        (owner, new_name, record["id"]),
    )
    slug = str((slug_row or {}).get("slug") or "").strip()
    if not slug:
        raise ServiceError("No se pudo resolver el slug del proyecto")
    execute(
        """
        UPDATE internal.projects
        SET name = %s, slug = %s
        WHERE id = %s
        """,
        (new_name, slug, record["id"]),
    )


def _set_project_entity(project_id: str, entity_name: str | None) -> None:
    execute(
        """
        UPDATE internal.projects
        SET entity_id = %s
        WHERE id = %s
        """,
        (ensure_entity(entity_name), project_id),
    )


def _delete_project_record(owner: str, project_name: str) -> None:
    record = _get_project_record(owner, project_name)
    if not record:
        return
    execute("DELETE FROM internal.projects WHERE id = %s", (record["id"],))


def _list_project_members_by_project_id(project_id: str) -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT
          project_id,
          owner_id,
          owner_username,
          member_id,
          member_username,
          member_role,
          member_created_at
        FROM public.vw_projects_with_users
        WHERE project_id = %s
        ORDER BY member_username ASC
        """,
        (project_id,),
    )


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

    project_id = str(project["id"])
    roles: list[str] = []

    member = _get_project_member(project_id, user_id)
    direct_role = _normalize_project_member_role(member.get("member_role") if member else None)
    if direct_role:
        roles.append(direct_role)

    for team_member in _list_project_team_members_by_project_id(project_id):
        if str(team_member.get("member_id") or "").strip() != user_id:
            continue
        team_role = _normalize_project_member_role(team_member.get("project_member_role"))
        if team_role:
            roles.append(team_role)

    return _pick_highest_project_role(roles)


def user_can_view_project(user_id: str, username: str, role: str, owner: str, project_name: str) -> bool:
    return _get_project_access_role(user_id, username, role, owner, project_name) is not None


def user_can_edit_project(user_id: str, username: str, role: str, owner: str, project_name: str) -> bool:
    access_role = _get_project_access_role(user_id, username, role, owner, project_name)
    return access_role in {"editor", "owner"}
