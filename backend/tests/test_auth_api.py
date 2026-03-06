from __future__ import annotations

from fastapi.testclient import TestClient


def test_health_endpoint_returns_ok(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_login_session_logout_flow(client: TestClient) -> None:
    login_response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    assert login_response.status_code == 200
    assert login_response.json()["authenticated"] is True
    assert login_response.json()["user"]["username"] == "admin"

    session_response = client.get("/api/auth/session")
    assert session_response.status_code == 200
    assert session_response.json()["authenticated"] is True

    logout_response = client.post("/api/auth/logout")
    assert logout_response.status_code == 200
    assert logout_response.json() == {"authenticated": False, "user": None}
