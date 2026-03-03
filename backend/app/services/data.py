from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from backend.app.core.config import get_settings


def load_json(filename: str) -> Any:
    path = get_settings().data_dir / filename
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def dump_json(filename: str, payload: Any) -> None:
    path = get_settings().data_dir / filename
    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, indent=4, ensure_ascii=False)


def resolve_project_path(owner: str, relative_path: str) -> Path:
    base_path = (get_settings().projects_dir / owner).resolve()
    target_path = (base_path / relative_path).resolve()
    if base_path != target_path and base_path not in target_path.parents:
        raise ValueError("Ruta fuera del directorio permitido")
    return target_path
