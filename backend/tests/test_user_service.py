from __future__ import annotations

import json
from pathlib import Path

from backend.app.services.auth import create_user


def test_create_user_persists_user_and_project_dir(
    isolated_app_env: dict[str, Path],
) -> None:
    success, _ = create_user("researcher", "secret123", "researcher@example.com")

    assert success is True

    payload = json.loads(isolated_app_env["users_path"].read_text(encoding="utf-8"))
    assert payload["researcher"]["email"] == "researcher@example.com"
    assert (isolated_app_env["projects_dir"] / "researcher").is_dir()
