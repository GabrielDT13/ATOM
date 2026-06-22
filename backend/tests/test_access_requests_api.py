from __future__ import annotations

from fastapi.testclient import TestClient


def test_create_access_request_route_accepts_public_submission(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import access_requests as access_request_routes

    monkeypatch.setattr(
        access_request_routes,
        "create_access_request",
        lambda full_name, email: (
            True,
            "Solicitud enviada correctamente",
            {
                "created_at": "2026-06-15T10:00:00+00:00",
                "email": email,
                "full_name": full_name,
                "id": 8,
                "status": "pending",
                "updated_at": "2026-06-15T10:00:00+00:00",
            },
        ),
    )

    response = client.post(
        "/api/access-requests",
        json={
            "full_name": "Ana Martín",
            "email": "ana@example.com",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "message": "Solicitud enviada correctamente",
        "request": {
            "created_at": "2026-06-15T10:00:00+00:00",
            "email": "ana@example.com",
            "full_name": "Ana Martín",
            "id": 8,
            "status": "pending",
            "updated_at": "2026-06-15T10:00:00+00:00",
        },
        "success": True,
    }


def test_get_access_requests_route_requires_admin(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import access_requests as access_request_routes

    monkeypatch.setattr(
        access_request_routes,
        "require_admin",
        lambda request: {"id": "admin-1", "role": "admin"},
    )
    monkeypatch.setattr(
        access_request_routes,
        "list_access_requests",
        lambda: [
            {
                "created_at": "2026-06-15T10:00:00+00:00",
                "email": "ana@example.com",
                "full_name": "Ana Martín",
                "id": 8,
                "status": "pending",
                "updated_at": "2026-06-15T10:00:00+00:00",
            }
        ],
    )

    response = client.get("/api/access-requests")

    assert response.status_code == 200
    assert response.json() == [
        {
            "created_at": "2026-06-15T10:00:00+00:00",
            "email": "ana@example.com",
            "full_name": "Ana Martín",
            "id": 8,
            "status": "pending",
            "updated_at": "2026-06-15T10:00:00+00:00",
        }
    ]


def test_approve_access_request_route_forwards_admin_payload(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import access_requests as access_request_routes

    captured: dict[str, object] = {}

    monkeypatch.setattr(
        access_request_routes,
        "require_admin",
        lambda request: {"id": "admin-1", "role": "admin"},
    )

    def fake_approve_access_request(
        request_id: int,
        *,
        actor_user_id: str,
        username: str,
        department: str | None = None,
        entity_name: str | None = None,
    ) -> tuple[bool, str, dict[str, object], str | None]:
        captured["request_id"] = request_id
        captured["actor_user_id"] = actor_user_id
        captured["username"] = username
        captured["department"] = department
        captured["entity_name"] = entity_name
        return (
            True,
            "Solicitud aprobada",
            {
                "approved_username": username,
                "created_at": "2026-06-15T10:00:00+00:00",
                "email": "ana@example.com",
                "full_name": "Ana Martín",
                "id": request_id,
                "status": "approved",
                "updated_at": "2026-06-15T10:10:00+00:00",
            },
            "TempPass123",
        )

    monkeypatch.setattr(access_request_routes, "approve_access_request", fake_approve_access_request)

    response = client.post(
        "/api/access-requests/8/approve",
        json={
            "username": "ana.martin",
            "department": "Bioinformática",
            "entity_name": "ULL",
        },
    )

    assert response.status_code == 200
    assert captured == {
        "actor_user_id": "admin-1",
        "department": "Bioinformática",
        "entity_name": "ULL",
        "request_id": 8,
        "username": "ana.martin",
    }
    assert response.json()["temporary_password"] == "TempPass123"


def test_deny_access_request_route_forwards_admin_payload(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import access_requests as access_request_routes

    captured: dict[str, object] = {}

    monkeypatch.setattr(
        access_request_routes,
        "require_admin",
        lambda request: {"id": "admin-1", "role": "admin"},
    )

    def fake_deny_access_request(
        request_id: int,
        *,
        actor_user_id: str,
    ) -> tuple[bool, str, dict[str, object]]:
        captured["request_id"] = request_id
        captured["actor_user_id"] = actor_user_id
        return (
            True,
            "Solicitud denegada",
            {
                "created_at": "2026-06-15T10:00:00+00:00",
                "email": "ana@example.com",
                "full_name": "Ana Martín",
                "id": request_id,
                "status": "denied",
                "updated_at": "2026-06-15T10:12:00+00:00",
            },
        )

    monkeypatch.setattr(access_request_routes, "deny_access_request", fake_deny_access_request)

    response = client.post("/api/access-requests/8/deny")

    assert response.status_code == 200
    assert captured == {
        "actor_user_id": "admin-1",
        "request_id": 8,
    }
