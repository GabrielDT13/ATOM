from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any

from backend.app.core.config import get_settings
from backend.app.services.auth import build_session_user_from_profile
from backend.app.services.supabase import (
    SupabaseError,
    build_query_string,
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


def _build_user_response(profile: dict[str, Any]) -> dict[str, str | None]:
    return build_session_user_from_profile(profile)


def _fetch_profiles(
    *,
    filters: dict[str, str] | None = None,
    limit: int | None = None,
    order: str | None = "username.asc",
) -> list[dict[str, Any]]:
    query_params: dict[str, str | int | None] = {
        "select": "id,email,username,full_name,avatar_url,is_active,roles",
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


def _create_auth_user(username: str, password: str, email: str) -> str:
    payload = request_with_service_role(
        "POST",
        "/auth/v1/admin/users",
        json_body={
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {
                "username": username,
                "full_name": username,
            },
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
) -> None:
    metadata: dict[str, str] = {"username": username}
    if full_name:
        metadata["full_name"] = full_name
    if avatar_url:
        metadata["avatar_url"] = avatar_url

    payload: dict[str, Any] = {
        "email": email,
        "user_metadata": metadata,
    }
    if password:
        payload["password"] = password

    request_with_service_role(
        "PUT",
        f"/auth/v1/admin/users/{user_id}",
        json_body=payload,
    )


def _delete_auth_user(user_id: str) -> None:
    request_with_service_role("DELETE", f"/auth/v1/admin/users/{user_id}")


def create_user(username: str, password: str, email: str) -> tuple[bool, str]:
    try:
        normalized_username = _normalize_username(username)
    except ValueError as exc:
        return False, str(exc)

    normalized_email = _normalize_email(email)
    if _get_profile_by_username(normalized_username):
        return False, "El usuario ya existe"
    if _get_profile_by_email(normalized_email):
        return False, "El email ya está registrado"

    created_user_id: str | None = None
    try:
        created_user_id = _create_auth_user(normalized_username, password, normalized_email)
        user_dir = get_settings().projects_dir / normalized_username
        user_dir.mkdir(parents=True, exist_ok=True)
    except SupabaseError as exc:
        return False, str(exc)
    except OSError:
        if created_user_id:
            try:
                _delete_auth_user(created_user_id)
            except SupabaseError:
                pass
        return False, "No se pudo preparar la carpeta local del usuario"

    return True, "Usuario registrado correctamente"


def update_user(
    current_username: str,
    new_username: str,
    email: str,
    password: str | None,
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

    other_profile_with_username = _get_profile_by_username(normalized_new_username)
    if (
        normalized_new_username != normalized_current_username
        and other_profile_with_username
        and other_profile_with_username.get("id") != current_profile.get("id")
    ):
        return False, "El nuevo nombre de usuario ya existe", normalized_current_username

    other_profile_with_email = _get_profile_by_email(normalized_email)
    if (
        other_profile_with_email
        and other_profile_with_email.get("id") != current_profile.get("id")
    ):
        return False, "El email ya está registrado", normalized_current_username

    try:
        _update_auth_user(
            str(current_profile["id"]),
            username=normalized_new_username,
            email=normalized_email,
            password=password,
            full_name=str(current_profile.get("full_name") or "").strip() or None,
            avatar_url=str(current_profile.get("avatar_url") or "").strip() or None,
        )

        if normalized_new_username != normalized_current_username:
            projects_root = get_settings().projects_dir
            old_dir = projects_root / normalized_current_username
            new_dir = projects_root / normalized_new_username
            if old_dir.exists():
                old_dir.rename(new_dir)
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

    try:
        _delete_auth_user(str(current_profile["id"]))
    except SupabaseError as exc:
        return False, str(exc)

    user_dir = get_settings().projects_dir / normalized_username
    if user_dir.exists():
        base_path = get_settings().projects_dir.resolve()
        resolved_user_dir = user_dir.resolve()
        if base_path != resolved_user_dir and base_path not in resolved_user_dir.parents:
            return False, "Ruta inválida: no se eliminó la carpeta del usuario por seguridad."
        shutil.rmtree(resolved_user_dir)

    return True, f"Usuario {normalized_username} y su carpeta de proyectos eliminados correctamente."


def get_user_dir(username: str) -> Path:
    normalized_username = _normalize_username(username)
    return get_settings().projects_dir / normalized_username
