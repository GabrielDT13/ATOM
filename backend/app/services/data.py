from __future__ import annotations

from pathlib import Path

from backend.app.core.config import get_settings


def resolve_project_path(owner: str, relative_path: str) -> Path:
    base_path = (get_settings().projects_dir / owner).resolve()
    target_path = (base_path / relative_path).resolve()
    if base_path != target_path and base_path not in target_path.parents:
        raise ValueError("Ruta fuera del directorio permitido")
    return target_path
