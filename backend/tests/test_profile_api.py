from __future__ import annotations

from fastapi.testclient import TestClient


def test_get_my_profile_route_returns_profile(client: TestClient, monkeypatch) -> None:
    from backend.app.api.routes import profile as profile_routes

    monkeypatch.setattr(
        profile_routes,
        "get_current_user",
        lambda request: {"id": "11111111-1111-1111-1111-111111111111"},
    )
    monkeypatch.setattr(
        profile_routes,
        "get_my_profile",
        lambda user_id: {
            "id": user_id,
            "email": "doctor@example.com",
            "username": "doctor",
            "display_name": "Dra. Ada",
            "role": "user",
            "department": "Genómica",
            "bio": "Perfil",
            "joined_at": "2026-03-01T10:00:00+00:00",
            "updated_at": "2026-03-10T12:00:00+00:00",
            "preferences": {
                "email_notifications": True,
                "security_alerts": True,
                "dark_mode": False,
                "interface_language": "es",
            },
            "summary": {
                "active_projects": 2,
                "collaborations": 1,
                "pending_reviews": 1,
            },
            "projects_preview": {
                "owned": [],
                "collaborations": [],
            },
            "activity": [
                {
                    "kind": "profile",
                    "title": "Perfil actualizado",
                    "description": "Se actualizó la biografía.",
                    "created_at": "2026-03-10T12:00:00+00:00",
                }
            ],
        },
    )

    response = client.get("/api/profile/me")

    assert response.status_code == 200
    assert response.json()["username"] == "doctor"


def test_update_my_profile_route_forwards_payload_and_refreshes_session(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import profile as profile_routes

    captured_payload: dict[str, object] = {}

    def fake_get_current_user(request):
        request.session["auth"] = {"access_token": "session-access-token"}
        request.session["user"] = {"id": "11111111-1111-1111-1111-111111111111"}
        return {
            "id": "11111111-1111-1111-1111-111111111111",
            "email": "doctor@example.com",
            "username": "doctor",
        }

    def fake_update_my_profile(**kwargs):
        captured_payload.update(kwargs)
        return (
            True,
            "Perfil actualizado correctamente",
            {
                "id": kwargs["user_id"],
                "email": "doctor@example.com",
                "username": "doctor",
                "display_name": "Dra. Ada",
                "role": "user",
                "department": "Genómica",
                "bio": "Perfil",
                "joined_at": "2026-03-01T10:00:00+00:00",
                "updated_at": "2026-03-10T12:00:00+00:00",
                "preferences": {
                    "email_notifications": False,
                    "security_alerts": True,
                    "dark_mode": True,
                    "interface_language": "es",
                },
                "summary": {
                    "active_projects": 2,
                    "collaborations": 1,
                    "pending_reviews": 1,
                },
                "projects_preview": {
                    "owned": [],
                    "collaborations": [],
                },
                "activity": [],
            },
        )

    monkeypatch.setattr(profile_routes, "get_current_user", fake_get_current_user)
    monkeypatch.setattr(profile_routes, "update_my_profile", fake_update_my_profile)
    monkeypatch.setattr(
        profile_routes,
        "get_session_user_by_id",
        lambda user_id: {
            "id": user_id,
            "email": "doctor@example.com",
            "username": "doctor",
            "role": "user",
            "display_name": "Dra. Ada",
        },
    )

    response = client.put(
        "/api/profile/me",
        json={
            "username": "doctor",
            "display_name": "Dra. Ada",
            "email": "doctor@example.com",
            "department": "Genómica",
            "bio": "Perfil",
            "preferences": {
                "email_notifications": False,
                "security_alerts": True,
                "dark_mode": True,
                "interface_language": "es",
            },
        },
    )

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert captured_payload == {
        "user_id": "11111111-1111-1111-1111-111111111111",
        "access_token": "session-access-token",
        "username": "doctor",
        "email": "doctor@example.com",
        "display_name": "Dra. Ada",
        "department": "Genómica",
        "bio": "Perfil",
        "preferences": {
            "email_notifications": False,
            "security_alerts": True,
            "dark_mode": True,
            "interface_language": "es",
        },
    }


def test_change_my_password_route_forwards_payload(client: TestClient, monkeypatch) -> None:
    from backend.app.api.routes import profile as profile_routes

    def fake_get_current_user(request):
        request.session["auth"] = {"access_token": "session-access-token"}
        return {
            "id": "11111111-1111-1111-1111-111111111111",
            "email": "doctor@example.com",
        }

    monkeypatch.setattr(profile_routes, "get_current_user", fake_get_current_user)
    captured_payload: dict[str, object] = {}
    monkeypatch.setattr(
        profile_routes,
        "change_my_password",
        lambda **kwargs: captured_payload.update(kwargs) or (True, "Contraseña actualizada correctamente"),
    )
    monkeypatch.setattr(
        profile_routes,
        "get_session_user_by_id",
        lambda user_id: {
            "id": user_id,
            "email": "doctor@example.com",
            "username": "doctor",
            "role": "user",
            "display_name": "Dra. Ada",
            "must_change_password": False,
            "welcome_tour_seen": False,
        },
    )

    response = client.post(
        "/api/profile/me/password",
        json={
            "current_password": "actual123",
            "new_password": "nueva123",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "message": "Contraseña actualizada correctamente",
        "profile": None,
    }
    assert captured_payload == {
        "access_token": "session-access-token",
        "current_password": "actual123",
        "new_password": "nueva123",
    }


def test_complete_required_password_change_route_forwards_payload(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import profile as profile_routes

    def fake_get_current_user(request):
        request.session["auth"] = {"access_token": "session-access-token"}
        request.session["user"] = {"id": "11111111-1111-1111-1111-111111111111"}
        return {
            "id": "11111111-1111-1111-1111-111111111111",
            "email": "doctor@example.com",
        }

    captured_payload: dict[str, object] = {}
    monkeypatch.setattr(profile_routes, "get_current_user", fake_get_current_user)
    monkeypatch.setattr(
        profile_routes,
        "complete_required_password_change",
        lambda **kwargs: captured_payload.update(kwargs) or (True, "Contraseña actualizada correctamente"),
    )
    monkeypatch.setattr(
        profile_routes,
        "get_session_user_by_id",
        lambda user_id: {
            "id": user_id,
            "email": "doctor@example.com",
            "username": "doctor",
            "role": "user",
            "display_name": "Dra. Ada",
            "must_change_password": False,
            "welcome_tour_seen": False,
        },
    )

    response = client.post(
        "/api/profile/me/password/required",
        json={
            "new_password": "NuevaSegura123",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "message": "Contraseña actualizada correctamente",
        "profile": None,
    }
    assert captured_payload == {
        "access_token": "session-access-token",
        "new_password": "NuevaSegura123",
    }


def test_mark_welcome_tour_seen_route_updates_session(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import profile as profile_routes

    def fake_get_current_user(request):
        request.session["auth"] = {"access_token": "session-access-token"}
        request.session["user"] = {"id": "11111111-1111-1111-1111-111111111111"}
        return {
            "id": "11111111-1111-1111-1111-111111111111",
            "email": "doctor@example.com",
        }

    monkeypatch.setattr(profile_routes, "get_current_user", fake_get_current_user)
    monkeypatch.setattr(
        profile_routes,
        "mark_welcome_tour_seen",
        lambda user_id: (True, "Guía de bienvenida actualizada"),
    )
    monkeypatch.setattr(
        profile_routes,
        "get_session_user_by_id",
        lambda user_id: {
            "id": user_id,
            "email": "doctor@example.com",
            "username": "doctor",
            "role": "user",
            "display_name": "Dra. Ada",
            "must_change_password": False,
            "welcome_tour_seen": True,
        },
    )

    response = client.post("/api/profile/me/welcome-tour/seen")

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "message": "Guía de bienvenida actualizada",
        "profile": None,
    }


def test_delete_my_account_route_clears_session_when_deletion_succeeds(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import profile as profile_routes

    def fake_get_current_user(request):
        request.session["auth"] = {"access_token": "session-access-token"}
        request.session["user"] = {
            "id": "11111111-1111-1111-1111-111111111111",
            "username": "doctor",
        }
        return {"username": "doctor"}

    monkeypatch.setattr(profile_routes, "get_current_user", fake_get_current_user)
    captured_payload: dict[str, object] = {}
    monkeypatch.setattr(
        profile_routes,
        "delete_my_account",
        lambda **kwargs: captured_payload.update(kwargs) or (True, "Cuenta eliminada correctamente"),
    )

    response = client.delete("/api/profile/me")

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "message": "Cuenta eliminada correctamente",
        "profile": None,
    }
    assert captured_payload == {
        "access_token": "session-access-token",
        "username": "doctor",
    }


def test_delete_my_account_route_keeps_session_when_deletion_fails(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import profile as profile_routes

    def fake_get_current_user(request):
        request.session["auth"] = {"access_token": "session-access-token"}
        request.session["user"] = {
            "id": "11111111-1111-1111-1111-111111111111",
            "username": "doctor",
        }
        return {"username": "doctor"}

    monkeypatch.setattr(profile_routes, "get_current_user", fake_get_current_user)
    monkeypatch.setattr(
        profile_routes,
        "delete_my_account",
        lambda **kwargs: (False, "No se pudo eliminar la cuenta"),
    )

    response = client.delete("/api/profile/me")

    assert response.status_code == 200
    assert response.json() == {
        "success": False,
        "message": "No se pudo eliminar la cuenta",
        "profile": None,
    }
    session = client.cookies.get("session")
    assert session is not None
