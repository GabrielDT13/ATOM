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
    public_examples_dir: Path
    database_url: str
    postgres_host: str
    postgres_port: int
    postgres_db: str
    postgres_user: str
    postgres_password: str
    session_secret: str
    backend_host: str
    backend_port: int
    frontend_url: str
    atom_port: int
    jwt_secret: str
    jwt_audience: str
    access_token_ttl_seconds: int
    refresh_token_ttl_seconds: int
    analysis_worker_poll_seconds: float


def _resolve_path(env_var: str, default_relative_path: str, project_root: Path) -> Path:
    raw_value = os.getenv(env_var)
    candidate = Path(raw_value).expanduser() if raw_value else project_root / default_relative_path
    if not candidate.is_absolute():
        candidate = project_root / candidate
    return candidate.resolve()


@lru_cache
def get_settings() -> Settings:
    project_root_env = os.getenv("ATOM_PROJECT_ROOT")
    project_root = (
        Path(project_root_env).expanduser().resolve()
        if project_root_env
        else Path(__file__).resolve().parents[3]
    )
    return Settings(
        project_root=project_root,
        data_dir=_resolve_path("ATOM_DATA_DIR", "data", project_root),
        projects_dir=_resolve_path("ATOM_PROJECTS_DIR", "projects", project_root),
        r_scripts_dir=_resolve_path("ATOM_R_SCRIPTS_DIR", "r_scripts", project_root),
        public_examples_dir=_resolve_path(
            "ATOM_PUBLIC_EXAMPLES_DIR",
            "frontend/public/examples",
            project_root,
        ),
        database_url=os.getenv("DATABASE_URL", "").strip(),
        postgres_host=os.getenv("POSTGRES_HOST", "atom-db").strip(),
        postgres_port=int(os.getenv("POSTGRES_PORT", "5432")),
        postgres_db=os.getenv("POSTGRES_DB", "atom").strip(),
        postgres_user=os.getenv("POSTGRES_USER", "atom").strip(),
        postgres_password=os.getenv("POSTGRES_PASSWORD", "atom").strip(),
        session_secret=os.getenv("SESSION_SECRET", "change-this-in-production"),
        backend_host=os.getenv("BACKEND_HOST", "0.0.0.0"),
        backend_port=int(os.getenv("BACKEND_PORT", "8000")),
        frontend_url=os.getenv("FRONTEND_URL", "http://localhost:3000"),
        atom_port=int(os.getenv("ATOM_PORT", "3000")),
        jwt_secret=os.getenv("JWT_SECRET", "").strip(),
        jwt_audience=os.getenv("JWT_AUDIENCE", "authenticated").strip(),
        access_token_ttl_seconds=int(os.getenv("ACCESS_TOKEN_TTL_SECONDS", os.getenv("JWT_EXP", "3600"))),
        refresh_token_ttl_seconds=int(os.getenv("REFRESH_TOKEN_TTL_SECONDS", "2592000")),
        analysis_worker_poll_seconds=float(os.getenv("ANALYSIS_WORKER_POLL_SECONDS", "2")),
    )
