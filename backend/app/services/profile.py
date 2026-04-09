from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from backend.app.services.emailing import build_absolute_frontend_url, send_password_changed_email
from backend.app.services.database import execute, execute_returning, fetch_all, fetch_one
from backend.app.services.errors import ServiceError
from backend.app.services.users import _delete_user_projects_dir


@dataclass(frozen=True)
class ProfileCollections:
    owned_projects: list[dict[str, Any]]
    collaborations: list[dict[str, Any]]
    preferences: dict[str, Any]
    activity: list[dict[str, Any]]


def _normalize_username(username: str) -> str:
    normalized = username.strip()
    if not normalized:
        raise ValueError("El nombre de usuario es obligatorio")
    if len(normalized) < 3:
        raise ValueError("El nombre de usuario debe tener al menos 3 caracteres")
    return normalized


def _normalize_email(email: str) -> str:
    normalized = email.strip().lower()
    if not normalized or "@" not in normalized:
        raise ValueError("El email no es válido")
    return normalized


def _normalize_optional_text(value: Any) -> str | None:
    normalized = str(value or "").strip()
    return normalized or None


def _normalize_interface_language(value: Any) -> str:
    normalized = str(value or "es").strip().lower() or "es"
    if normalized not in {"es", "en"}:
        raise ValueError("El idioma de la interfaz no es válido")
    return normalized


def _resolve_role(roles: Any) -> str:
    if isinstance(roles, list) and "admin" in roles:
        return "admin"
    return "user"


def _normalize_timestamp(value: Any) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    return raw


def _parse_timestamp(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00")
    return datetime.fromisoformat(normalized)


def _fetch_profile_by_user_id(user_id: str) -> dict[str, Any]:
    profile = fetch_one(
        """
        SELECT
          id,
          email,
          username,
          full_name,
          avatar_url,
          department,
          bio,
          is_active,
          created_at,
          updated_at,
          roles
        FROM public.vw_profiles
        WHERE id = %s
        LIMIT 1
        """,
        (user_id,),
    )
    if not profile:
        raise ServiceError("No se encontró el perfil solicitado")
    return profile


def _fetch_profile_by_username(username: str) -> dict[str, Any] | None:
    return fetch_one(
        """
        SELECT id, username, email
        FROM public.vw_profiles
        WHERE username = %s
        LIMIT 1
        """,
        (username,),
    )


def _fetch_profile_by_email(email: str) -> dict[str, Any] | None:
    return fetch_one(
        """
        SELECT id, username, email
        FROM public.vw_profiles
        WHERE email = %s
        LIMIT 1
        """,
        (email,),
    )


def _fetch_preferences(user_id: str) -> dict[str, Any]:
    payload = fetch_one(
        """
        SELECT
          user_id,
          email_notifications,
          security_alerts,
          dark_mode,
          interface_language
        FROM public.vw_profile_preferences
        WHERE user_id = %s
        LIMIT 1
        """,
        (user_id,),
    )
    if payload:
        return payload
    return {
        "email_notifications": True,
        "security_alerts": True,
        "dark_mode": False,
        "interface_language": "es",
    }


def _save_preferences(
    user_id: str,
    *,
    email_notifications: bool,
    security_alerts: bool,
    dark_mode: bool,
    interface_language: str,
) -> None:
    execute(
        """
        INSERT INTO internal.profile_preferences (
          user_id,
          email_notifications,
          security_alerts,
          dark_mode,
          interface_language
        )
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (user_id) DO UPDATE
        SET
          email_notifications = EXCLUDED.email_notifications,
          security_alerts = EXCLUDED.security_alerts,
          dark_mode = EXCLUDED.dark_mode,
          interface_language = EXCLUDED.interface_language,
          updated_at = now()
        """,
        (user_id, email_notifications, security_alerts, dark_mode, interface_language),
    )


def _fetch_owned_projects(user_id: str) -> list[dict[str, Any]]:
    payload = fetch_all(
        """
        SELECT id, name, status, updated_at, member_count
        FROM public.vw_projects
        WHERE owner_id = %s
        ORDER BY updated_at DESC
        """,
        (user_id,),
    )
    return [row for row in payload if isinstance(row, dict)]


def _fetch_collaborations(user_id: str) -> list[dict[str, Any]]:
    payload = fetch_all(
        """
        SELECT
          project_id,
          project_name,
          project_status,
          member_role,
          member_created_at
        FROM public.vw_projects_with_users
        WHERE member_id = %s
          AND member_role <> 'owner'
        ORDER BY member_created_at DESC
        """,
        (user_id,),
    )
    return [row for row in payload if isinstance(row, dict)]


def _fetch_profile_activity(user_id: str, limit: int = 6) -> list[dict[str, Any]]:
    payload = fetch_all(
        """
        SELECT activity_type, title, description, created_at
        FROM public.vw_profile_activity
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT %s
        """,
        (user_id, limit),
    )
    return [row for row in payload if isinstance(row, dict)]


def _collect_profile_data(user_id: str) -> ProfileCollections:
    return ProfileCollections(
        owned_projects=_fetch_owned_projects(user_id),
        collaborations=_fetch_collaborations(user_id),
        preferences=_fetch_preferences(user_id),
        activity=_fetch_profile_activity(user_id),
    )


def _log_profile_activity(
    user_id: str,
    *,
    activity_type: str,
    title: str,
    description: str,
) -> None:
    execute(
        """
        INSERT INTO internal.profile_activity (user_id, activity_type, title, description)
        VALUES (%s, %s, %s, %s)
        """,
        (user_id, activity_type, title, description),
    )


def _build_summary(
    owned_projects: list[dict[str, Any]],
    collaborations: list[dict[str, Any]],
) -> dict[str, int]:
    active_project_ids = {
        str(project.get("id") or "").strip()
        for project in owned_projects
        if str(project.get("status") or "").strip().lower() != "archived"
    }
    active_project_ids.update(
        str(project.get("project_id") or "").strip()
        for project in collaborations
        if str(project.get("project_status") or "").strip().lower() != "archived"
    )

    pending_review_ids = {
        str(project.get("project_id") or "").strip()
        for project in collaborations
        if str(project.get("member_role") or "").strip().lower() == "editor"
    }
    pending_review_ids.update(
        str(project.get("id") or "").strip()
        for project in owned_projects
        if str(project.get("status") or "").strip().lower() == "draft"
    )

    return {
        "active_projects": len({item for item in active_project_ids if item}),
        "collaborations": len(
            {
                str(project.get("project_id") or "").strip()
                for project in collaborations
                if str(project.get("project_id") or "").strip()
            }
        ),
        "pending_reviews": len({item for item in pending_review_ids if item}),
    }


def _build_activity(
    *,
    owned_projects: list[dict[str, Any]],
    collaborations: list[dict[str, Any]],
    profile_activity: list[dict[str, Any]],
) -> list[dict[str, str]]:
    activity_items: list[dict[str, str]] = []

    for item in profile_activity:
        created_at = _normalize_timestamp(item.get("created_at"))
        if not created_at:
            continue
        activity_items.append(
            {
                "kind": str(item.get("activity_type") or "profile").strip() or "profile",
                "title": str(item.get("title") or "").strip(),
                "description": str(item.get("description") or "").strip(),
                "created_at": created_at,
            }
        )

    for project in collaborations[:3]:
        created_at = _normalize_timestamp(project.get("member_created_at"))
        if not created_at:
            continue
        role = str(project.get("member_role") or "").strip().lower() or "viewer"
        activity_items.append(
            {
                "kind": "collaboration",
                "title": "Nueva colaboración",
                "description": (
                    f"Te incorporaste al proyecto {str(project.get('project_name') or '').strip()} "
                    f"como {role}."
                ).strip(),
                "created_at": created_at,
            }
        )

    for project in owned_projects[:3]:
        created_at = _normalize_timestamp(project.get("updated_at"))
        if not created_at:
            continue
        activity_items.append(
            {
                "kind": "project_updated",
                "title": "Proyecto actualizado",
                "description": (
                    f"Se actualizó el proyecto {str(project.get('name') or '').strip()}."
                ).strip(),
                "created_at": created_at,
            }
        )

    activity_items.sort(key=lambda item: _parse_timestamp(item["created_at"]), reverse=True)
    return activity_items[:6]


def _build_projects_preview(
    owned_projects: list[dict[str, Any]],
    collaborations: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    return {
        "owned": [
            {
                "id": str(project.get("id") or "").strip(),
                "name": str(project.get("name") or "").strip(),
                "status": str(project.get("status") or "").strip().lower() or "draft",
                "updated_at": _normalize_timestamp(project.get("updated_at")),
                "member_count": int(project.get("member_count") or 0),
            }
            for project in owned_projects[:4]
            if str(project.get("id") or "").strip() and str(project.get("name") or "").strip()
        ],
        "collaborations": [
            {
                "project_id": str(project.get("project_id") or "").strip(),
                "project_name": str(project.get("project_name") or "").strip(),
                "project_status": str(project.get("project_status") or "").strip().lower() or "draft",
                "member_role": str(project.get("member_role") or "").strip().lower() or "viewer",
                "member_created_at": _normalize_timestamp(project.get("member_created_at")),
            }
            for project in collaborations[:4]
            if str(project.get("project_id") or "").strip()
            and str(project.get("project_name") or "").strip()
        ],
    }


def _build_profile_response(profile: dict[str, Any]) -> dict[str, Any]:
    user_id = str(profile.get("id") or "").strip()
    collections = _collect_profile_data(user_id)

    return {
        "id": user_id,
        "email": str(profile.get("email") or "").strip().lower(),
        "username": str(profile.get("username") or "").strip(),
        "display_name": str(profile.get("full_name") or "").strip()
        or str(profile.get("username") or "").strip(),
        "role": _resolve_role(profile.get("roles")),
        "department": _normalize_optional_text(profile.get("department")),
        "bio": _normalize_optional_text(profile.get("bio")),
        "joined_at": _normalize_timestamp(profile.get("created_at")),
        "updated_at": _normalize_timestamp(profile.get("updated_at")),
        "preferences": {
            "email_notifications": bool(collections.preferences.get("email_notifications", True)),
            "security_alerts": bool(collections.preferences.get("security_alerts", True)),
            "dark_mode": bool(collections.preferences.get("dark_mode", False)),
            "interface_language": _normalize_interface_language(
                collections.preferences.get("interface_language"),
            ),
        },
        "summary": _build_summary(
            collections.owned_projects,
            collections.collaborations,
        ),
        "activity": _build_activity(
            owned_projects=collections.owned_projects,
            collaborations=collections.collaborations,
            profile_activity=collections.activity,
        ),
        "projects_preview": _build_projects_preview(
            collections.owned_projects,
            collections.collaborations,
        ),
    }


def get_my_profile(user_id: str) -> dict[str, Any]:
    return _build_profile_response(_fetch_profile_by_user_id(user_id))


def _validate_profile_uniqueness(
    *,
    user_id: str,
    username: str,
    email: str,
) -> str | None:
    other_user_with_username = _fetch_profile_by_username(username)
    if other_user_with_username and str(other_user_with_username.get("id") or "").strip() != user_id:
        return "El nombre de usuario ya está en uso"

    other_user_with_email = _fetch_profile_by_email(email)
    if other_user_with_email and str(other_user_with_email.get("id") or "").strip() != user_id:
        return "El email ya está registrado"

    return None


def _update_auth_user_profile(
    user_id: str,
    *,
    username: str,
    email: str,
    display_name: str | None,
    department: str | None,
    bio: str | None,
) -> None:
    rows = execute_returning(
        """
        UPDATE auth.users
        SET
          email = %s,
          raw_user_meta_data = jsonb_build_object(
            'username', %s,
            'full_name', COALESCE(%s, ''),
            'department', COALESCE(%s, ''),
            'bio', COALESCE(%s, '')
          )
        WHERE id = %s
        RETURNING id
        """,
        (email, username, display_name, department, bio, user_id),
    )
    if not rows:
        raise ServiceError("Usuario no encontrado")


def update_my_profile(
    *,
    user_id: str,
    access_token: str,
    username: str,
    email: str,
    display_name: str | None,
    department: str | None,
    bio: str | None,
    preferences: dict[str, Any],
) -> tuple[bool, str, dict[str, Any] | None]:
    try:
        normalized_username = _normalize_username(username)
        normalized_email = _normalize_email(email)
        normalized_language = _normalize_interface_language(preferences.get("interface_language"))
    except ValueError as exc:
        return False, str(exc), None

    uniqueness_error = _validate_profile_uniqueness(
        user_id=user_id,
        username=normalized_username,
        email=normalized_email,
    )
    if uniqueness_error:
        return False, uniqueness_error, None

    try:
        _update_auth_user_profile(
            user_id,
            username=normalized_username,
            email=normalized_email,
            display_name=_normalize_optional_text(display_name),
            department=_normalize_optional_text(department),
            bio=_normalize_optional_text(bio),
        )
        updated = execute_returning(
            """
            UPDATE internal.profiles
            SET
              email = %s,
              username = %s,
              full_name = %s,
              department = %s,
              bio = %s
            WHERE id = %s
            RETURNING id
            """,
            (
                normalized_email,
                normalized_username,
                _normalize_optional_text(display_name),
                _normalize_optional_text(department),
                _normalize_optional_text(bio),
                user_id,
            ),
        )
        if not updated:
            raise ServiceError("No se pudo actualizar el perfil")
        _save_preferences(
            user_id,
            email_notifications=bool(preferences.get("email_notifications", True)),
            security_alerts=bool(preferences.get("security_alerts", True)),
            dark_mode=bool(preferences.get("dark_mode", False)),
            interface_language=normalized_language,
        )
        _log_profile_activity(
            user_id,
            activity_type="profile_updated",
            title="Perfil actualizado",
            description="Se actualizó la información principal del perfil.",
        )
    except ServiceError as exc:
        return False, str(exc), None

    return True, "Perfil actualizado correctamente", get_my_profile(user_id)


def change_my_password(
    *,
    access_token: str,
    current_password: str,
    new_password: str,
) -> tuple[bool, str]:
    try:
        from backend.app.services.auth import validate_access_token

        claims = validate_access_token(access_token)
        user_id = str(claims.get("sub") or "").strip()
        if not user_id:
            raise ServiceError("No autorizado")
        payload = fetch_one(
            """
            SELECT encrypted_password
            FROM auth.users
            WHERE id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        current_hash = str((payload or {}).get("encrypted_password") or "").strip()
        if not current_hash:
            raise ServiceError("Usuario no encontrado")
        password_valid = fetch_one(
            """
            SELECT crypt(%s, %s) = %s AS password_valid
            """,
            (current_password, current_hash, current_hash),
        )
        if not password_valid or password_valid.get("password_valid") is not True:
            raise ServiceError("Email o contraseña incorrectos")
        execute(
            """
            UPDATE auth.users
            SET encrypted_password = crypt(%s, gen_salt('bf'))
            WHERE id = %s
            """,
            (new_password, user_id),
        )
        profile = _fetch_profile_by_user_id(user_id)
        _log_profile_activity(
            user_id,
            activity_type="password_changed",
            title="Cambio de contraseña",
            description="Se actualizó la contraseña de la cuenta.",
        )
        email = str(profile.get("email") or "").strip().lower()
        username = str(profile.get("username") or "").strip()
        if email and username:
            send_password_changed_email(
                to_email=email,
                username=username,
                login_url=build_absolute_frontend_url("/login"),
            )
    except ServiceError as exc:
        return False, str(exc)

    return True, "Contraseña actualizada correctamente"


def delete_my_account(
    *,
    access_token: str,
    username: str,
) -> tuple[bool, str]:
    try:
        from backend.app.services.auth import validate_access_token

        claims = validate_access_token(access_token)
        user_id = str(claims.get("sub") or "").strip()
        if not user_id:
            raise ServiceError("No autorizado")
        owned_project = fetch_one(
            """
            SELECT 1 AS found
            FROM internal.projects
            WHERE owner_id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        if owned_project:
            raise ServiceError(
                "No se puede eliminar la cuenta porque todavía eres propietario "
                "de proyectos. Reasigna o elimina esos proyectos primero."
            )
        deleted = execute_returning(
            """
            DELETE FROM auth.users
            WHERE id = %s
            RETURNING id
            """,
            (user_id,),
        )
        if not deleted:
            raise ServiceError("No se pudo eliminar la cuenta")
        _delete_user_projects_dir(username)
    except (ServiceError, ValueError) as exc:
        return False, str(exc)

    return True, "Cuenta eliminada correctamente"
