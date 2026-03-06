from __future__ import annotations

from pathlib import Path

from backend.app.services import users as user_service


def test_create_user_persists_user_and_project_dir(
    isolated_app_env: dict[str, Path],
    monkeypatch,
) -> None:
    created_payload: dict[str, str] = {}

    monkeypatch.setattr(user_service, "_get_profile_by_username", lambda username: None)
    monkeypatch.setattr(user_service, "_get_profile_by_email", lambda email: None)

    def fake_create_auth_user(username: str, password: str, email: str) -> str:
        created_payload["username"] = username
        created_payload["password"] = password
        created_payload["email"] = email
        return "44444444-4444-4444-4444-444444444444"

    monkeypatch.setattr(user_service, "_create_auth_user", fake_create_auth_user)

    success, _ = user_service.create_user("researcher", "secret123", "researcher@example.com")

    assert success is True
    assert created_payload == {
        "username": "researcher",
        "password": "secret123",
        "email": "researcher@example.com",
    }
    assert (isolated_app_env["projects_dir"] / "researcher").is_dir()
