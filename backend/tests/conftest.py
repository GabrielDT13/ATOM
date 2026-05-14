from __future__ import annotations

from pathlib import Path

import pytest
from backend.app.core.config import get_settings


@pytest.fixture(autouse=True)
def default_runtime_env(monkeypatch: pytest.MonkeyPatch):
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture()
def isolated_app_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> dict[str, Path]:
    data_dir = tmp_path / "data"
    projects_dir = tmp_path / "projects"
    r_scripts_dir = tmp_path / "r_scripts"
    examples_dir = tmp_path / "frontend" / "public" / "examples"

    data_dir.mkdir()
    projects_dir.mkdir()
    r_scripts_dir.mkdir()
    examples_dir.mkdir(parents=True)

    monkeypatch.setenv("ATOM_PROJECT_ROOT", str(tmp_path))
    monkeypatch.setenv("ATOM_DATA_DIR", str(data_dir))
    monkeypatch.setenv("ATOM_PROJECTS_DIR", str(projects_dir))
    monkeypatch.setenv("ATOM_R_SCRIPTS_DIR", str(r_scripts_dir))
    monkeypatch.setenv("ATOM_PUBLIC_EXAMPLES_DIR", str(examples_dir))
    monkeypatch.setenv("SESSION_SECRET", "test-session-secret")
    monkeypatch.setenv("JWT_SECRET", "test-jwt-secret")
    monkeypatch.setenv("JWT_AUDIENCE", "authenticated")

    get_settings.cache_clear()
    yield {
        "data_dir": data_dir,
        "examples_dir": examples_dir,
        "projects_dir": projects_dir,
    }
    get_settings.cache_clear()


@pytest.fixture()
def client(isolated_app_env: dict[str, Path]):
    from backend.app.main import create_app
    from fastapi.testclient import TestClient

    with TestClient(create_app()) as test_client:
        yield test_client
