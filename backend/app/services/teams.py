from __future__ import annotations

from typing import Any

from backend.app.services.database import execute, fetch_all, fetch_one, get_db_connection
from backend.app.services.entities import ensure_entity
from backend.app.services.errors import ServiceError


def _normalize_team_name(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise ServiceError("El nombre del equipo es obligatorio")
    return normalized


def _fetch_profiles() -> list[dict[str, Any]]:
    return fetch_all(
        """
        SELECT
          id,
          email,
          username,
          full_name,
          avatar_url,
          entity_name,
          department,
          is_active
        FROM public.vw_profiles
        ORDER BY username ASC
        """
    )


def _get_profile_by_username(username: str) -> dict[str, Any] | None:
    return fetch_one(
        """
        SELECT
          id,
          email,
          username,
          full_name,
          avatar_url,
          entity_name,
          department,
          is_active
        FROM public.vw_profiles
        WHERE username = %s
        LIMIT 1
        """,
        (username,),
    )


def _count_user_team_memberships(user_id: str, *, exclude_team_id: str | None = None) -> int:
    if exclude_team_id:
        payload = fetch_one(
            """
            SELECT count(*) AS membership_total
            FROM internal.team_members
            WHERE user_id = %s
              AND team_id <> %s
            """,
            (user_id, exclude_team_id),
        )
    else:
        payload = fetch_one(
            """
            SELECT count(*) AS membership_total
            FROM internal.team_members
            WHERE user_id = %s
            """,
            (user_id,),
        )
    return int((payload or {}).get("membership_total") or 0)


def _ensure_membership_capacity(profile: dict[str, Any], *, exclude_team_id: str | None = None) -> None:
    user_id = str(profile.get("id") or "").strip()
    username = str(profile.get("username") or "").strip()
    if not user_id or not username:
        raise ServiceError("No se pudo resolver uno de los usuarios del equipo")
    if _count_user_team_memberships(user_id, exclude_team_id=exclude_team_id) >= 5:
        raise ServiceError(f"El usuario @{username} ya pertenece al máximo de 5 equipos")


def _build_team_summary(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "created_at": str(row.get("created_at") or "").strip(),
        "entity_id": str(row.get("entity_id") or "").strip() or None,
        "entity_name": str(row.get("entity_name") or "").strip() or None,
        "entity_slug": str(row.get("entity_slug") or "").strip() or None,
        "id": str(row.get("id") or "").strip(),
        "member_count": int(row.get("member_count") or 0),
        "membership_role": str(row.get("membership_role") or "").strip() or None,
        "name": str(row.get("name") or "").strip(),
        "owner_id": str(row.get("owner_id") or "").strip(),
        "owner_username": str(row.get("owner_username") or "").strip(),
        "slug": str(row.get("slug") or "").strip(),
        "updated_at": str(row.get("updated_at") or "").strip(),
    }


def _build_team_member_response(row: dict[str, Any]) -> dict[str, Any]:
    username = str(row.get("username") or "").strip()
    member_role = str(row.get("member_role") or "member").strip() or "member"
    return {
        "avatar_url": str(row.get("avatar_url") or "").strip() or None,
        "department": str(row.get("department") or "").strip() or None,
        "display_name": str(row.get("full_name") or "").strip() or username,
        "email": str(row.get("email") or "").strip().lower() or None,
        "entity_name": str(row.get("entity_name") or "").strip() or None,
        "id": str(row.get("id") or "").strip(),
        "is_owner": member_role == "owner",
        "member_role": member_role,
        "username": username,
    }


def _get_team_record_for_user(team_id: str, session_user_id: str, role: str) -> dict[str, Any] | None:
    payload = fetch_one(
        """
        SELECT
          t.*,
          tm.member_role AS membership_role
        FROM public.vw_teams t
        LEFT JOIN public.vw_team_members tm
          ON tm.team_id = t.id
         AND tm.member_id = %s
        WHERE t.id = %s
          AND (%s = 'admin' OR tm.member_id = %s)
        LIMIT 1
        """,
        (session_user_id, team_id, role, session_user_id),
    )
    if payload:
        return payload
    if role == "admin":
        return fetch_one("SELECT * FROM public.vw_teams WHERE id = %s LIMIT 1", (team_id,))
    return None


def _require_team_manager(team_id: str, session_user_id: str, session_username: str, role: str) -> dict[str, Any]:
    team = _get_team_record_for_user(team_id, session_user_id, role)
    if not team:
        raise ServiceError("Equipo no encontrado")
    if role == "admin" or str(team.get("owner_username") or "").strip() == session_username:
        return team
    raise ServiceError("No autorizado")


def _list_team_members(team_id: str) -> list[dict[str, Any]]:
    payload = fetch_all(
        """
        SELECT
          member_profile.id,
          member_profile.username,
          member_profile.email,
          member_profile.full_name,
          member_profile.avatar_url,
          member_profile.department,
          member_profile.entity_name,
          tm.member_role,
          tm.member_created_at
        FROM public.vw_team_members tm
        JOIN public.vw_profiles member_profile
          ON member_profile.id = tm.member_id
        WHERE tm.team_id = %s
        ORDER BY
          CASE WHEN tm.member_role = 'owner' THEN 0 ELSE 1 END,
          lower(COALESCE(member_profile.full_name, member_profile.username)) ASC
        """,
        (team_id,),
    )
    return [_build_team_member_response(item) for item in payload if isinstance(item, dict)]


def list_teams_for_user(session_user_id: str, session_username: str, role: str) -> list[dict[str, Any]]:
    payload = fetch_all(
        """
        SELECT
          t.*,
          tm.member_role AS membership_role
        FROM public.vw_teams t
        LEFT JOIN public.vw_team_members tm
          ON tm.team_id = t.id
         AND tm.member_id = %s
        WHERE (%s = 'admin' OR tm.member_id = %s)
        ORDER BY t.updated_at DESC, lower(t.name) ASC
        """,
        (session_user_id, role, session_user_id),
    )

    teams: list[dict[str, Any]] = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        summary = _build_team_summary(item)
        if summary["id"]:
            teams.append(summary)
    return teams


def get_team_details(team_id: str, session_user_id: str, session_username: str, role: str) -> dict[str, Any]:
    team = _get_team_record_for_user(team_id, session_user_id, role)
    if not team:
        raise ServiceError("Equipo no encontrado")
    summary = _build_team_summary(team)
    summary["members"] = _list_team_members(team_id)
    return summary


def search_team_member_candidates(
    *,
    session_user_id: str,
    query: str,
    limit: int = 8,
    exclude_usernames: list[str] | None = None,
) -> list[dict[str, Any]]:
    normalized_query = query.strip().lower()
    excluded = {item.strip() for item in (exclude_usernames or []) if item.strip()}

    candidates: list[dict[str, Any]] = []
    for profile in _fetch_profiles():
        username = str(profile.get("username") or "").strip()
        user_id = str(profile.get("id") or "").strip()
        if not username or not user_id or username in excluded or user_id == session_user_id:
            continue
        if profile.get("is_active") is False:
            continue

        email = str(profile.get("email") or "").strip().lower()
        display_name = str(profile.get("full_name") or "").strip() or username
        searchable = " ".join(
            [
                username,
                email,
                display_name,
                str(profile.get("department") or "").strip(),
                str(profile.get("entity_name") or "").strip(),
            ]
        ).lower()
        if normalized_query and normalized_query not in searchable:
            continue

        candidates.append(
            {
                "avatar_url": str(profile.get("avatar_url") or "").strip() or None,
                "department": str(profile.get("department") or "").strip() or None,
                "display_name": display_name,
                "email": email or None,
                "entity_name": str(profile.get("entity_name") or "").strip() or None,
                "id": user_id,
                "username": username,
            }
        )
        if len(candidates) >= limit:
            break

    return candidates


def _resolve_member_profiles(member_usernames: list[str]) -> list[dict[str, Any]]:
    profiles: list[dict[str, Any]] = []
    seen: set[str] = set()
    for username in member_usernames:
        normalized = username.strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)

        profile = _get_profile_by_username(normalized)
        if not profile or profile.get("is_active") is False:
            raise ServiceError(f"No se encontró el usuario @{normalized}")
        profiles.append(profile)
    return profiles


def create_team(
    *,
    actor_user_id: str,
    actor_username: str,
    name: str,
    entity_name: str | None,
    member_usernames: list[str],
) -> tuple[bool, str, str | None]:
    try:
        normalized_name = _normalize_team_name(name)
        owner_profile = _get_profile_by_username(actor_username)
        if not owner_profile:
            return False, "No se pudo resolver el usuario autenticado", None

        member_profiles = [
            profile
            for profile in _resolve_member_profiles(member_usernames)
            if str(profile.get("username") or "").strip() != actor_username
        ]
        _ensure_membership_capacity(owner_profile)
        for profile in member_profiles:
            _ensure_membership_capacity(profile)

        slug_payload = fetch_one(
            "SELECT internal.ensure_team_slug(%s, %s, NULL) AS slug",
            (actor_username, normalized_name),
        )
        team_slug = str((slug_payload or {}).get("slug") or "").strip()
        if not team_slug:
            return False, "No se pudo generar el identificador del equipo", None

        team_id: str | None = None
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO internal.teams (owner_id, entity_id, name, slug)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        actor_user_id,
                        ensure_entity(entity_name),
                        normalized_name,
                        team_slug,
                    ),
                )
                created = cursor.fetchone()
                team_id = str((created or {}).get("id") or "").strip() or None
                if not team_id:
                    raise ServiceError("No se pudo crear el equipo")

                cursor.execute(
                    """
                    INSERT INTO internal.team_members (team_id, user_id, member_role)
                    VALUES (%s, %s, 'owner')
                    """,
                    (team_id, actor_user_id),
                )

                for profile in member_profiles:
                    cursor.execute(
                        """
                        INSERT INTO internal.team_members (team_id, user_id, member_role)
                        VALUES (%s, %s, 'member')
                        """,
                        (team_id, str(profile.get("id") or "").strip()),
                    )
            connection.commit()
        return True, "Equipo creado correctamente", team_id
    except Exception as exc:
        return False, str(exc), None


def update_team(
    *,
    team_id: str,
    actor_user_id: str,
    actor_username: str,
    role: str,
    name: str,
    entity_name: str | None,
    member_usernames: list[str],
) -> tuple[bool, str]:
    try:
        team = _require_team_manager(team_id, actor_user_id, actor_username, role)
        normalized_name = _normalize_team_name(name)
        owner_username = str(team.get("owner_username") or "").strip()
        owner_id = str(team.get("owner_id") or "").strip()
        if not owner_username or not owner_id:
            return False, "No se pudo resolver el propietario del equipo"

        target_profiles = [
            profile
            for profile in _resolve_member_profiles(member_usernames)
            if str(profile.get("username") or "").strip() != owner_username
        ]
        target_user_ids = {str(profile.get("id") or "").strip() for profile in target_profiles}
        current_members = _list_team_members(team_id)
        current_non_owner = {
            member["id"]: member
            for member in current_members
            if not member.get("is_owner")
        }

        for profile in target_profiles:
            profile_id = str(profile.get("id") or "").strip()
            if profile_id and profile_id not in current_non_owner:
                _ensure_membership_capacity(profile, exclude_team_id=team_id)

        next_slug = str(team.get("slug") or "").strip()
        if normalized_name != str(team.get("name") or "").strip():
            slug_payload = fetch_one(
                "SELECT internal.ensure_team_slug(%s, %s, %s) AS slug",
                (owner_username, normalized_name, team_id),
            )
            next_slug = str((slug_payload or {}).get("slug") or "").strip()
            if not next_slug:
                return False, "No se pudo actualizar el identificador del equipo"

        remove_user_ids = sorted(set(current_non_owner.keys()) - target_user_ids)
        add_profiles = [
            profile
            for profile in target_profiles
            if str(profile.get("id") or "").strip() not in current_non_owner
        ]

        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE internal.teams
                    SET
                      name = %s,
                      slug = %s,
                      entity_id = %s
                    WHERE id = %s
                    """,
                    (
                        normalized_name,
                        next_slug,
                        ensure_entity(entity_name),
                        team_id,
                    ),
                )

                if remove_user_ids:
                    cursor.execute(
                        """
                        DELETE FROM internal.team_members
                        WHERE team_id = %s
                          AND user_id = ANY(%s)
                          AND member_role <> 'owner'
                        """,
                        (team_id, remove_user_ids),
                    )

                for profile in add_profiles:
                    cursor.execute(
                        """
                        INSERT INTO internal.team_members (team_id, user_id, member_role)
                        VALUES (%s, %s, 'member')
                        """,
                        (team_id, str(profile.get("id") or "").strip()),
                    )
            connection.commit()
        return True, "Equipo actualizado correctamente"
    except Exception as exc:
        return False, str(exc)


def delete_team(*, team_id: str, actor_user_id: str, actor_username: str, role: str) -> tuple[bool, str]:
    try:
        _require_team_manager(team_id, actor_user_id, actor_username, role)
        execute("DELETE FROM internal.teams WHERE id = %s", (team_id,))
        return True, "Equipo eliminado correctamente"
    except Exception as exc:
        return False, str(exc)
