from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

from backend.app.services.auth import AuthenticatedSession, AuthenticationError
from fastapi.testclient import TestClient


def _build_access_token(
    *,
    secret: str,
    sub: str,
    aud: str = "authenticated",
    exp_offset_seconds: int = 3600,
) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": sub,
        "aud": aud,
        "role": "authenticated",
        "exp": int(time.time()) + exp_offset_seconds,
        "iat": int(time.time()),
    }

    def encode_segment(data: dict[str, object]) -> str:
        raw = json.dumps(data, separators=(",", ":"), sort_keys=True).encode("utf-8")
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("utf-8")

    encoded_header = encode_segment(header)
    encoded_payload = encode_segment(payload)
    signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).rstrip(b"=").decode("utf-8")
    return f"{encoded_header}.{encoded_payload}.{encoded_signature}"


def test_health_endpoint_returns_ok(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_login_session_logout_flow(client: TestClient, monkeypatch) -> None:
    from backend.app.api.routes import auth as auth_routes
    from backend.app.services import auth as auth_service

    revoked_tokens: list[tuple[str, str]] = []
    access_token = _build_access_token(
        secret="test-jwt-secret",
        sub="11111111-1111-1111-1111-111111111111",
    )

    monkeypatch.setattr(
        auth_routes,
        "authenticate_email_password",
        lambda email, password: AuthenticatedSession(
            access_token=access_token,
            refresh_token="test-refresh-token",
            user={
                "id": "11111111-1111-1111-1111-111111111111",
                "email": email,
                "username": "admin",
                "role": "admin",
                "first_name": None,
                "last_name": None,
                "department": None,
                "display_name": "Admin Local",
            },
        ),
    )
    monkeypatch.setattr(
        auth_service,
        "get_session_user_by_id",
        lambda user_id: {
            "id": user_id,
            "email": "admin@atom.local",
            "username": "admin",
            "role": "admin",
            "first_name": None,
            "last_name": None,
            "department": None,
            "display_name": "Admin Local",
        },
    )
    monkeypatch.setattr(
        auth_routes,
        "logout_session",
        lambda access_token, scope="local": revoked_tokens.append((access_token, scope)),
    )

    login_response = client.post(
        "/api/auth/login",
        json={"email": "admin@atom.local", "password": "Admin123!"},
    )
    assert login_response.status_code == 200
    assert login_response.json()["authenticated"] is True
    assert login_response.json()["user"]["username"] == "admin"
    assert login_response.json()["user"]["email"] == "admin@atom.local"

    session_response = client.get("/api/auth/session")
    assert session_response.status_code == 200
    assert session_response.json()["authenticated"] is True
    assert session_response.json()["user"]["id"] == "11111111-1111-1111-1111-111111111111"

    logout_response = client.post("/api/auth/logout")
    assert logout_response.status_code == 200
    assert logout_response.json() == {"authenticated": False, "user": None}
    assert revoked_tokens == [(access_token, "local")]


def test_session_returns_unauthenticated_when_access_token_is_invalid(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import auth as auth_routes
    from backend.app.dependencies import auth as auth_dependencies

    monkeypatch.setattr(
        auth_routes,
        "authenticate_email_password",
        lambda email, password: AuthenticatedSession(
            access_token="invalid.jwt.token",
            refresh_token="test-refresh-token",
            user={
                "id": "11111111-1111-1111-1111-111111111111",
                "email": email,
                "username": "admin",
                "role": "admin",
                "first_name": None,
                "last_name": None,
                "department": None,
                "display_name": "Admin Local",
            },
        ),
    )
    monkeypatch.setattr(
        auth_dependencies,
        "refresh_authenticated_session",
        lambda refresh_token: (_ for _ in ()).throw(
            AuthenticationError("No se pudo renovar la sesión", status_code=401)
        ),
    )

    login_response = client.post(
        "/api/auth/login",
        json={"email": "admin@atom.local", "password": "Admin123!"},
    )
    assert login_response.status_code == 200

    session_response = client.get("/api/auth/session")
    assert session_response.status_code == 200
    assert session_response.json() == {"authenticated": False, "user": None}


def test_session_refreshes_when_access_token_has_expired(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import auth as auth_routes
    from backend.app.dependencies import auth as auth_dependencies
    from backend.app.services import auth as auth_service

    initial_access_token = _build_access_token(
        secret="test-jwt-secret",
        sub="11111111-1111-1111-1111-111111111111",
        exp_offset_seconds=-3600,
    )
    refreshed_access_token = _build_access_token(
        secret="test-jwt-secret",
        sub="11111111-1111-1111-1111-111111111111",
        exp_offset_seconds=3600,
    )
    refresh_calls: list[str] = []

    monkeypatch.setattr(
        auth_routes,
        "authenticate_email_password",
        lambda email, password: AuthenticatedSession(
            access_token=initial_access_token,
            refresh_token="refresh-token-1",
            user={
                "id": "11111111-1111-1111-1111-111111111111",
                "email": email,
                "username": "admin",
                "role": "admin",
                "first_name": None,
                "last_name": None,
                "department": None,
                "display_name": "Admin Local",
            },
        ),
    )
    monkeypatch.setattr(
        auth_service,
        "get_session_user_by_id",
        lambda user_id: {
            "id": user_id,
            "email": "admin@atom.local",
            "username": "admin",
            "role": "admin",
            "first_name": None,
            "last_name": None,
            "department": None,
            "display_name": "Admin Local",
        },
    )
    monkeypatch.setattr(
        auth_dependencies,
        "refresh_authenticated_session",
        lambda refresh_token: (
            refresh_calls.append(refresh_token),
            AuthenticatedSession(
                access_token=refreshed_access_token,
                refresh_token="refresh-token-2",
                user={
                    "id": "11111111-1111-1111-1111-111111111111",
                    "email": "admin@atom.local",
                    "username": "admin",
                    "role": "admin",
                    "first_name": None,
                    "last_name": None,
                    "department": None,
                    "display_name": "Admin Local",
                },
            ),
        )[1],
    )

    login_response = client.post(
        "/api/auth/login",
        json={"email": "admin@atom.local", "password": "Admin123!"},
    )
    assert login_response.status_code == 200

    session_response = client.get("/api/auth/session")
    assert session_response.status_code == 200
    assert session_response.json()["authenticated"] is True
    assert session_response.json()["user"]["username"] == "admin"
    assert refresh_calls == ["refresh-token-1"]
