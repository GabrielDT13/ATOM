from __future__ import annotations

import json
from pathlib import Path

import pytest
from backend.app.core.config import get_settings


@pytest.fixture()
def isolated_app_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> dict[str, Path]:
    data_dir = tmp_path / "data"
    projects_dir = tmp_path / "projects"
    r_scripts_dir = tmp_path / "r_scripts"

    data_dir.mkdir()
    projects_dir.mkdir()
    r_scripts_dir.mkdir()

    users_path = data_dir / "users.json"
    users_path.write_text(
        json.dumps(
            {
                "admin": {
                    "password": "admin123",
                    "email": "admin@example.com",
                    "first_name": "Admin",
                    "last_name": "ATOM",
                    "department": "Administrador del sistema",
                }
            }
        ),
        encoding="utf-8",
    )

    monkeypatch.setenv("ATOM_PROJECT_ROOT", str(tmp_path))
    monkeypatch.setenv("ATOM_DATA_DIR", str(data_dir))
    monkeypatch.setenv("ATOM_PROJECTS_DIR", str(projects_dir))
    monkeypatch.setenv("ATOM_R_SCRIPTS_DIR", str(r_scripts_dir))
    monkeypatch.setenv("SESSION_SECRET", "test-session-secret")

    get_settings.cache_clear()
    yield {
        "data_dir": data_dir,
        "projects_dir": projects_dir,
        "users_path": users_path,
    }
    get_settings.cache_clear()


@pytest.fixture()
def client(isolated_app_env: dict[str, Path]):
    from backend.app.main import create_app
    from fastapi.testclient import TestClient

    with TestClient(create_app()) as test_client:
        yield test_client
