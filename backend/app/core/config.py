from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    project_root: Path
    data_dir: Path
    projects_dir: Path
    r_scripts_dir: Path
    session_secret: str
    backend_host: str
    backend_port: int
    frontend_url: str
    atom_port: int


@lru_cache
def get_settings() -> Settings:
    project_root = Path(__file__).resolve().parents[3]
    return Settings(
        project_root=project_root,
        data_dir=project_root / "data",
        projects_dir=project_root / "projects",
        r_scripts_dir=project_root / "r_scripts",
        session_secret=os.getenv("SESSION_SECRET", "change-this-in-production"),
        backend_host=os.getenv("BACKEND_HOST", "0.0.0.0"),
        backend_port=int(os.getenv("BACKEND_PORT", "8000")),
        frontend_url=os.getenv("FRONTEND_URL", "http://localhost:3000"),
        atom_port=int(os.getenv("ATOM_PORT", "3000")),
    )
