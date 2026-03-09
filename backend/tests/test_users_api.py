from __future__ import annotations

from fastapi.testclient import TestClient


def test_create_user_route_forwards_role_and_department(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import users as user_routes

    captured: dict[str, str | None] = {}

    monkeypatch.setattr(
        user_routes,
        "require_admin",
        lambda request: {"id": "11111111-1111-1111-1111-111111111111", "role": "admin"},
    )

    def fake_create_user(
        username: str,
        password: str,
        email: str,
        role: str,
        department: str | None,
        actor_user_id: str,
    ) -> tuple[bool, str]:
        captured["username"] = username
        captured["password"] = password
        captured["email"] = email
        captured["role"] = role
        captured["department"] = department
        captured["actor_user_id"] = actor_user_id
        return True, "Usuario registrado correctamente"

    monkeypatch.setattr(user_routes, "create_user", fake_create_user)
    monkeypatch.setattr(
        user_routes,
        "get_user_by_username",
        lambda username: {
            "id": "44444444-4444-4444-4444-444444444444",
            "username": username,
            "email": "researcher@example.com",
            "role": "admin",
            "first_name": None,
            "last_name": None,
            "department": "Bioinformatica",
            "display_name": username,
        },
    )

    response = client.post(
        "/api/users",
        json={
            "username": "researcher",
            "password": "secret123",
            "email": "researcher@example.com",
            "role": "admin",
            "department": "Bioinformatica",
        },
    )

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert captured == {
        "username": "researcher",
        "password": "secret123",
        "email": "researcher@example.com",
        "role": "admin",
        "department": "Bioinformatica",
        "actor_user_id": "11111111-1111-1111-1111-111111111111",
    }


def test_update_user_route_requires_admin_and_forwards_role_and_department(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import users as user_routes

    captured: dict[str, str | None] = {}

    monkeypatch.setattr(
        user_routes,
        "require_admin",
        lambda request: {"id": "11111111-1111-1111-1111-111111111111", "role": "admin"},
    )

    def fake_update_user(
        current_username: str,
        new_username: str,
        email: str,
        password: str | None,
        role: str,
        department: str | None,
        actor_user_id: str,
    ) -> tuple[bool, str, str]:
        captured["current_username"] = current_username
        captured["new_username"] = new_username
        captured["email"] = email
        captured["password"] = password
        captured["role"] = role
        captured["department"] = department
        captured["actor_user_id"] = actor_user_id
        return True, "Usuario principal actualizado correctamente", new_username

    monkeypatch.setattr(user_routes, "update_user", fake_update_user)
    monkeypatch.setattr(
        user_routes,
        "get_user_by_username",
        lambda username: {
            "id": "44444444-4444-4444-4444-444444444444",
            "username": username,
            "email": "principal@example.com",
            "role": "admin",
            "first_name": None,
            "last_name": None,
            "department": "Genomica clinica",
            "display_name": username,
        },
    )

    response = client.put(
        "/api/users/researcher",
        json={
          "username": "principal",
          "email": "principal@example.com",
          "password": None,
          "role": "admin",
          "department": "Genomica clinica",
        },
    )

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert captured == {
        "current_username": "researcher",
        "new_username": "principal",
        "email": "principal@example.com",
        "password": None,
        "role": "admin",
        "department": "Genomica clinica",
        "actor_user_id": "11111111-1111-1111-1111-111111111111",
    }
