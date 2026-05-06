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
    entity_logos_dir: Path
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
    mail_delivery_mode: str
    mail_from_email: str
    mail_from_name: str
    smtp_host: str
    smtp_port: int
    smtp_username: str
    smtp_password: str
    smtp_use_tls: bool
    smtp_use_ssl: bool
    email_token_secret: str
    password_reset_token_ttl_seconds: int
    account_setup_token_ttl_seconds: int


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
    data_dir = _resolve_path("ATOM_DATA_DIR", "data", project_root)
    return Settings(
        project_root=project_root,
        data_dir=data_dir,
        projects_dir=_resolve_path("ATOM_PROJECTS_DIR", str(data_dir / "projects"), project_root),
        entity_logos_dir=_resolve_path("ATOM_ENTITY_LOGOS_DIR", str(data_dir / "entity-logos"), project_root),
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
        mail_delivery_mode=os.getenv("MAIL_DELIVERY_MODE", "console").strip().lower() or "console",
        mail_from_email=os.getenv("MAIL_FROM_EMAIL", "no-reply@atom.local").strip(),
        mail_from_name=os.getenv("MAIL_FROM_NAME", "ATOM").strip() or "ATOM",
        smtp_host=os.getenv("SMTP_HOST", "").strip(),
        smtp_port=int(os.getenv("SMTP_PORT", "587")),
        smtp_username=os.getenv("SMTP_USERNAME", "").strip(),
        smtp_password=os.getenv("SMTP_PASSWORD", "").strip(),
        smtp_use_tls=os.getenv("SMTP_USE_TLS", "true").strip().lower() not in {"0", "false", "no"},
        smtp_use_ssl=os.getenv("SMTP_USE_SSL", "false").strip().lower() in {"1", "true", "yes"},
        email_token_secret=(
            os.getenv("EMAIL_TOKEN_SECRET", "").strip()
            or os.getenv("SESSION_SECRET", "change-this-in-production")
        ),
        password_reset_token_ttl_seconds=int(os.getenv("PASSWORD_RESET_TOKEN_TTL_SECONDS", "3600")),
        account_setup_token_ttl_seconds=int(os.getenv("ACCOUNT_SETUP_TOKEN_TTL_SECONDS", "604800")),
    )
