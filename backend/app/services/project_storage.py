from __future__ import annotations

from pathlib import Path

from backend.app.core.config import get_settings

PROJECT_STORAGE_INDEX_DIRNAME = "by-id"
USER_STORAGE_DIRNAME = "users"


def _storage_root() -> Path:
    root = get_settings().projects_dir.resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def get_project_storage_index_dir() -> Path:
    index_dir = (_storage_root() / PROJECT_STORAGE_INDEX_DIRNAME).resolve()
    index_dir.mkdir(parents=True, exist_ok=True)
    return index_dir


def get_user_storage_root() -> Path:
    user_root = (get_settings().data_dir.resolve() / USER_STORAGE_DIRNAME).resolve()
    user_root.mkdir(parents=True, exist_ok=True)
    return user_root


def get_user_storage_dir(username: str) -> Path:
    user_root = get_user_storage_root()
    user_dir = (user_root / username).resolve()
    if user_dir == user_root or user_root not in user_dir.parents:
        raise ValueError("Usuario no válido")
    return user_dir


def get_legacy_owner_dir(owner: str) -> Path:
    storage_root = _storage_root()
    owner_dir = (storage_root / owner).resolve()
    if owner_dir == storage_root or storage_root not in owner_dir.parents:
        raise ValueError("Usuario no válido")
    return owner_dir


def get_legacy_project_dir(owner: str, project_name: str) -> Path:
    owner_dir = get_legacy_owner_dir(owner)
    project_dir = (owner_dir / project_name).resolve()
    if project_dir == owner_dir or owner_dir not in project_dir.parents:
        raise ValueError("El nombre del proyecto no es válido")
    return project_dir


def get_project_storage_dir(project_id: str) -> Path:
    normalized_id = str(project_id or "").strip()
    if not normalized_id:
        raise ValueError("El proyecto no tiene un id válido")

    shard = normalized_id[:2].lower()
    project_dir = (get_project_storage_index_dir() / shard / normalized_id).resolve()
    index_dir = get_project_storage_index_dir()
    if project_dir == index_dir or index_dir not in project_dir.parents:
        raise ValueError("El id del proyecto no es válido")
    return project_dir


def locate_project_storage_dir(
    project_id: str,
    *,
    owner: str | None = None,
    project_name: str | None = None,
) -> Path:
    project_dir = get_project_storage_dir(project_id)
    if project_dir.exists():
        return project_dir

    if owner and project_name:
        legacy_dir = get_legacy_project_dir(owner, project_name)
        if legacy_dir.exists():
            return legacy_dir

    return project_dir


def cleanup_legacy_owner_dir(owner: str) -> None:
    owner_dir = get_legacy_owner_dir(owner)
    if owner_dir.exists() and not any(owner_dir.iterdir()):
        owner_dir.rmdir()


def migrate_legacy_project_dir(project_id: str, *, owner: str, project_name: str) -> Path:
    project_dir = get_project_storage_dir(project_id)
    if project_dir.exists():
        return project_dir

    legacy_dir = get_legacy_project_dir(owner, project_name)
    if not legacy_dir.exists():
        return project_dir

    project_dir.parent.mkdir(parents=True, exist_ok=True)
    legacy_dir.rename(project_dir)
    cleanup_legacy_owner_dir(owner)
    return project_dir


def ensure_project_storage_dir(
    project_id: str,
    *,
    owner: str | None = None,
    project_name: str | None = None,
) -> Path:
    if owner and project_name:
        project_dir = migrate_legacy_project_dir(project_id, owner=owner, project_name=project_name)
    else:
        project_dir = get_project_storage_dir(project_id)

    project_dir.mkdir(parents=True, exist_ok=True)
    return project_dir


def list_legacy_owner_names() -> list[str]:
    ignored_names = {PROJECT_STORAGE_INDEX_DIRNAME, USER_STORAGE_DIRNAME}
    return sorted(
        [
            directory.name
            for directory in _storage_root().iterdir()
            if directory.is_dir() and directory.name not in ignored_names and not directory.name.startswith(".")
        ],
        key=str.lower,
    )


def list_legacy_project_dirs(owner: str) -> list[Path]:
    owner_dir = get_legacy_owner_dir(owner)
    if not owner_dir.exists():
        return []
    return sorted(
        [directory for directory in owner_dir.iterdir() if directory.is_dir()],
        key=lambda directory: directory.name.lower(),
    )
