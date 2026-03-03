from __future__ import annotations

import shutil
from pathlib import Path

from backend.app.core.config import get_settings
from backend.app.services.data import dump_json, load_json

USERS_FILE = "users.json"


def _normalize_username(username: str) -> str:
    normalized = username.strip()
    if not normalized:
        raise ValueError("El nombre de usuario es obligatorio")
    if Path(normalized).name != normalized:
        raise ValueError("El nombre de usuario no es válido")
    return normalized


def load_users() -> dict[str, dict[str, str]]:
    return load_json(USERS_FILE)


def authenticate_user(username: str, password: str) -> bool:
    user = load_users().get(username.strip())
    return bool(user and user.get("password") == password)


def build_session_user(username: str) -> dict[str, str]:
    normalized_username = username.strip()
    return {
        "username": normalized_username,
        "role": "admin" if normalized_username == "admin" else "user",
    }


def list_users() -> list[dict[str, str]]:
    users = []
    for username, payload in load_users().items():
        users.append(
            {
                "username": username,
                "email": payload["email"],
                "role": "admin" if username == "admin" else "user",
            }
        )
    return users


def create_user(username: str, password: str, email: str) -> tuple[bool, str]:
    try:
        normalized_username = _normalize_username(username)
    except ValueError as exc:
        return False, str(exc)

    users = load_users()
    if normalized_username in users:
        return False, "El usuario ya existe"

    for user_data in users.values():
        if user_data.get("email") == email:
            return False, "El email ya está registrado"

    users[normalized_username] = {"password": password, "email": email}
    dump_json(USERS_FILE, users)

    user_dir = get_settings().projects_dir / normalized_username
    user_dir.mkdir(parents=True, exist_ok=True)
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

    users = load_users()
    if normalized_current_username not in users:
        return False, "Usuario no encontrado", normalized_current_username

    if (
        normalized_new_username != normalized_current_username
        and normalized_new_username in users
    ):
        return False, "El nuevo nombre de usuario ya existe", normalized_current_username

    for username, user_data in users.items():
        if username != normalized_current_username and user_data.get("email") == email:
            return False, "El email ya está registrado", normalized_current_username

    effective_username = normalized_current_username
    if normalized_new_username != normalized_current_username:
        projects_root = get_settings().projects_dir
        old_dir = projects_root / normalized_current_username
        new_dir = projects_root / normalized_new_username
        if old_dir.exists():
            old_dir.rename(new_dir)
        users[normalized_new_username] = users.pop(normalized_current_username)
        effective_username = normalized_new_username

    users[effective_username]["email"] = email
    if password:
        users[effective_username]["password"] = password

    dump_json(USERS_FILE, users)
    return True, f"Usuario {effective_username} actualizado correctamente", effective_username


def delete_user(username: str) -> tuple[bool, str]:
    try:
        normalized_username = _normalize_username(username)
    except ValueError as exc:
        return False, str(exc)

    users = load_users()
    if normalized_username not in users:
        return False, "El usuario no existe."

    users.pop(normalized_username)
    dump_json(USERS_FILE, users)

    user_dir = get_settings().projects_dir / normalized_username
    if user_dir.exists():
        base_path = get_settings().projects_dir.resolve()
        resolved_user_dir = user_dir.resolve()
        if base_path != resolved_user_dir and base_path not in resolved_user_dir.parents:
            return False, "Ruta inválida: no se eliminó la carpeta del usuario por seguridad."
        shutil.rmtree(resolved_user_dir)

    return True, (
        f"Usuario {normalized_username} y su carpeta de proyectos eliminados correctamente."
    )


def get_user_dir(username: str) -> Path:
    normalized_username = _normalize_username(username)
    return get_settings().projects_dir / normalized_username
