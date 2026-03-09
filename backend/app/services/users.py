from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any

from backend.app.core.config import get_settings
from backend.app.services.auth import build_session_user_from_profile
from backend.app.services.supabase import (
    SupabaseError,
    build_query_string,
    call_rpc_with_service_role,
    request_with_service_role,
)


def _normalize_username(username: str) -> str:
    normalized = username.strip()
    if not normalized:
        raise ValueError("El nombre de usuario es obligatorio")
    if Path(normalized).name != normalized:
        raise ValueError("El nombre de usuario no es válido")
    if len(normalized) < 3:
        raise ValueError("El nombre de usuario debe tener al menos 3 caracteres")
    return normalized


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _normalize_optional_text(value: Any) -> str | None:
    normalized = str(value or "").strip()
    return normalized or None


def _build_user_response(profile: dict[str, Any]) -> dict[str, str | None]:
    return build_session_user_from_profile(profile)


def _fetch_profiles(
    *,
    filters: dict[str, str] | None = None,
    limit: int | None = None,
    order: str | None = "username.asc",
) -> list[dict[str, Any]]:
    query_params: dict[str, str | int | None] = {
        "select": "id,email,username,full_name,avatar_url,department,is_active,roles",
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
    normalized_username = _normalize_username(username)
    profiles = _fetch_profiles(
        filters={"username": f"eq.{normalized_username}"},
        limit=1,
        order=None,
    )
    return profiles[0] if profiles else None


def _get_profile_by_email(email: str) -> dict[str, Any] | None:
    normalized_email = _normalize_email(email)
    profiles = _fetch_profiles(
        filters={"email": f"eq.{normalized_email}"},
        limit=1,
        order=None,
    )
    return profiles[0] if profiles else None


def _list_owned_projects(user_id: str, *, limit: int = 3) -> list[dict[str, Any]]:
    payload = request_with_service_role(
        "GET",
        f"/rest/v1/vw_projects?{build_query_string({'select': 'id,name', 'owner_id': f'eq.{user_id}', 'limit': limit, 'order': 'name.asc'})}",
    )
    if not isinstance(payload, list):
        raise SupabaseError("Supabase devolvió una lista de proyectos inválida")
    return [project for project in payload if isinstance(project, dict)]


def _build_owned_projects_message(projects: list[dict[str, Any]]) -> str:
    if not projects:
        return ""

    project_names = [
        str(project.get("name", "")).strip()
        for project in projects
        if str(project.get("name", "")).strip()
    ]

    if not project_names:
        return (
            "No se puede eliminar el usuario porque todavía es propietario de proyectos. "
            "Reasigna o elimina esos proyectos primero."
        )

    listed_names = ", ".join(project_names[:3])
    suffix = "…" if len(project_names) > 3 else ""
    return (
        "No se puede eliminar el usuario porque todavía es propietario de proyectos "
        f"({listed_names}{suffix}). Reasigna o elimina esos proyectos primero."
    )


def get_user_by_username(username: str) -> dict[str, str | None]:
    profile = _get_profile_by_username(username)
    if not profile:
        raise KeyError(f"Usuario no encontrado: {username}")
    return _build_user_response(profile)


def get_user_by_id(user_id: str) -> dict[str, str | None]:
    profiles = _fetch_profiles(filters={"id": f"eq.{user_id}"}, limit=1, order=None)
    if not profiles:
        raise KeyError(f"Usuario no encontrado: {user_id}")
    return _build_user_response(profiles[0])


def list_users() -> list[dict[str, str | None]]:
    return [_build_user_response(profile) for profile in _fetch_profiles()]


def _create_auth_user(
    username: str,
    password: str,
    email: str,
    department: str | None,
) -> str:
    payload = request_with_service_role(
        "POST",
        "/auth/v1/admin/users",
        json_body={
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": _build_auth_user_metadata(
                username=username,
                full_name=username,
                avatar_url=None,
                department=department,
            ),
        },
    )
    if not isinstance(payload, dict) or not isinstance(payload.get("id"), str):
        raise SupabaseError("Supabase no devolvió el usuario creado")
    return payload["id"]


def _update_auth_user(
    user_id: str,
    *,
    username: str,
    email: str,
    password: str | None,
    full_name: str | None,
    avatar_url: str | None,
    department: str | None,
) -> None:
    payload: dict[str, Any] = {
        "email": email,
        "user_metadata": _build_auth_user_metadata(
            username=username,
            full_name=full_name,
            avatar_url=avatar_url,
            department=department,
        ),
    }
    if password:
        payload["password"] = password

    request_with_service_role(
        "PUT",
        f"/auth/v1/admin/users/{user_id}",
        json_body=payload,
    )


def _apply_user_role(
    *,
    actor_user_id: str,
    target_user_id: str,
    role: str,
) -> dict[str, Any]:
    payload = call_rpc_with_service_role(
        "admin_set_user_role",
        json_body={
            "p_actor_user_id": actor_user_id,
            "p_target_user_id": target_user_id,
            "p_role": role,
        },
    )
    if not isinstance(payload, list) or not payload or not isinstance(payload[0], dict):
        raise SupabaseError("Supabase no devolvió el perfil actualizado")
    return payload[0]


def _delete_auth_user(user_id: str) -> None:
    request_with_service_role("DELETE", f"/auth/v1/admin/users/{user_id}")


def _build_auth_user_metadata(
    *,
    username: str,
    full_name: str | None,
    avatar_url: str | None,
    department: str | None,
) -> dict[str, str]:
    metadata: dict[str, str] = {"username": username, "department": department or ""}
    if full_name:
        metadata["full_name"] = full_name
    if avatar_url:
        metadata["avatar_url"] = avatar_url
    return metadata


def _safe_delete_auth_user(user_id: str) -> None:
    try:
        _delete_auth_user(user_id)
    except SupabaseError:
        pass


def _ensure_create_user_is_unique(username: str, email: str) -> str | None:
    if _get_profile_by_username(username):
        return "El usuario ya existe"
    if _get_profile_by_email(email):
        return "El email ya está registrado"
    return None


def _validate_user_update_uniqueness(
    *,
    current_profile: dict[str, Any],
    current_username: str,
    new_username: str,
    email: str,
) -> str | None:
    other_profile_with_username = _get_profile_by_username(new_username)
    if (
        new_username != current_username
        and other_profile_with_username
        and other_profile_with_username.get("id") != current_profile.get("id")
    ):
        return "El nuevo nombre de usuario ya existe"

    other_profile_with_email = _get_profile_by_email(email)
    if other_profile_with_email and other_profile_with_email.get("id") != current_profile.get("id"):
        return "El email ya está registrado"

    return None


def _create_user_projects_dir(username: str) -> Path:
    user_dir = get_user_dir(username)
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir


def _rename_user_projects_dir(current_username: str, new_username: str) -> None:
    if current_username == new_username:
        return

    old_dir = get_user_dir(current_username)
    new_dir = get_user_dir(new_username)
    if old_dir.exists():
        old_dir.rename(new_dir)


def _delete_user_projects_dir(username: str) -> None:
    user_dir = get_user_dir(username)
    if not user_dir.exists():
        return

    base_path = get_settings().projects_dir.resolve()
    resolved_user_dir = user_dir.resolve()
    if base_path != resolved_user_dir and base_path not in resolved_user_dir.parents:
        raise ValueError("Ruta inválida: no se eliminó la carpeta del usuario por seguridad.")

    shutil.rmtree(resolved_user_dir)


def create_user(
    username: str,
    password: str,
    email: str,
    role: str,
    department: str | None,
    actor_user_id: str,
) -> tuple[bool, str]:
    try:
        normalized_username = _normalize_username(username)
    except ValueError as exc:
        return False, str(exc)

    normalized_email = _normalize_email(email)
    uniqueness_error = _ensure_create_user_is_unique(normalized_username, normalized_email)
    if uniqueness_error:
        return False, uniqueness_error

    created_user_id: str | None = None
    user_dir: Path | None = None
    try:
        created_user_id = _create_auth_user(
            normalized_username,
            password,
            normalized_email,
            department,
        )
        _apply_user_role(
            actor_user_id=actor_user_id,
            target_user_id=created_user_id,
            role=role,
        )
        user_dir = _create_user_projects_dir(normalized_username)
    except SupabaseError as exc:
        if user_dir and user_dir.exists():
            shutil.rmtree(user_dir, ignore_errors=True)
        if created_user_id:
            _safe_delete_auth_user(created_user_id)
        return False, str(exc)
    except OSError:
        if created_user_id:
            _safe_delete_auth_user(created_user_id)
        return False, "No se pudo preparar la carpeta local del usuario"

    return True, "Usuario registrado correctamente"


def update_user(
    current_username: str,
    new_username: str,
    email: str,
    password: str | None,
    role: str,
    department: str | None,
    actor_user_id: str,
) -> tuple[bool, str, str]:
    try:
        normalized_current_username = _normalize_username(current_username)
        normalized_new_username = _normalize_username(new_username)
    except ValueError as exc:
        return False, str(exc), current_username

    normalized_email = _normalize_email(email)
    current_profile = _get_profile_by_username(normalized_current_username)
    if not current_profile:
        return False, "Usuario no encontrado", normalized_current_username

    uniqueness_error = _validate_user_update_uniqueness(
        current_profile=current_profile,
        current_username=normalized_current_username,
        new_username=normalized_new_username,
        email=normalized_email,
    )
    if uniqueness_error:
        return False, uniqueness_error, normalized_current_username

    try:
        _update_auth_user(
            str(current_profile["id"]),
            username=normalized_new_username,
            email=normalized_email,
            password=password,
            full_name=_normalize_optional_text(current_profile.get("full_name")),
            avatar_url=_normalize_optional_text(current_profile.get("avatar_url")),
            department=department,
        )
        _apply_user_role(
            actor_user_id=actor_user_id,
            target_user_id=str(current_profile["id"]),
            role=role,
        )
        _rename_user_projects_dir(normalized_current_username, normalized_new_username)
    except SupabaseError as exc:
        return False, str(exc), normalized_current_username
    except OSError:
        return False, "No se pudo actualizar la carpeta local del usuario", normalized_current_username

    return True, f"Usuario {normalized_new_username} actualizado correctamente", normalized_new_username


def delete_user(username: str) -> tuple[bool, str]:
    try:
        normalized_username = _normalize_username(username)
    except ValueError as exc:
        return False, str(exc)

    current_profile = _get_profile_by_username(normalized_username)
    if not current_profile:
        return False, "El usuario no existe."

    owned_projects = _list_owned_projects(str(current_profile["id"]))
    if owned_projects:
        return False, _build_owned_projects_message(owned_projects)

    try:
        _delete_auth_user(str(current_profile["id"]))
    except SupabaseError as exc:
        if "projects_owner_id_fkey" in str(exc):
            return (
                False,
                "No se puede eliminar el usuario porque todavía es propietario de proyectos. "
                "Reasigna o elimina esos proyectos primero.",
            )
        return False, str(exc)

    try:
        _delete_user_projects_dir(normalized_username)
    except ValueError as exc:
        return False, str(exc)

    return True, f"Usuario {normalized_username} y su carpeta de proyectos eliminados correctamente."


def get_user_dir(username: str) -> Path:
    normalized_username = _normalize_username(username)
    return get_settings().projects_dir / normalized_username
