from __future__ import annotations

from datetime import datetime, timedelta, timezone


def test_authenticate_email_password_uses_postgres_provider(monkeypatch) -> None:
    from backend.app.core.config import get_settings
    from backend.app.services import auth as auth_service

    monkeypatch.setenv("JWT_SECRET", "test-jwt-secret")
    monkeypatch.setenv("JWT_AUDIENCE", "authenticated")
    get_settings.cache_clear()

    stored_statements: list[tuple[str, tuple[object, ...]]] = []

    monkeypatch.setattr(
        auth_service,
        "fetch_one",
        lambda query, params=(): {
            "id": "11111111-1111-1111-1111-111111111111",
            "is_active": True,
            "profile_is_active": True,
            "password_valid": True,
        },
    )
    monkeypatch.setattr(
        auth_service,
        "execute",
        lambda query, params=(): stored_statements.append((query, params)),
    )
    monkeypatch.setattr(auth_service.secrets, "token_urlsafe", lambda _: "refresh-token-1")
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

    session = auth_service.authenticate_email_password("admin@atom.local", "Admin123!")

    assert session.refresh_token == "refresh-token-1"
    assert session.user["username"] == "admin"
    assert session.access_token
    assert stored_statements
    assert "INSERT INTO auth.refresh_tokens" in stored_statements[0][0]

    get_settings.cache_clear()


def test_refresh_authenticated_session_rotates_refresh_token_in_postgres_mode(monkeypatch) -> None:
    from backend.app.core.config import get_settings
    from backend.app.services import auth as auth_service

    monkeypatch.setenv("JWT_SECRET", "test-jwt-secret")
    monkeypatch.setenv("JWT_AUDIENCE", "authenticated")
    get_settings.cache_clear()

    execute_calls: list[tuple[str, tuple[object, ...]]] = []

    monkeypatch.setattr(
        auth_service,
        "fetch_one",
        lambda query, params=(): {
            "user_id": "11111111-1111-1111-1111-111111111111",
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            "revoked_at": None,
        },
    )
    monkeypatch.setattr(
        auth_service,
        "execute",
        lambda query, params=(): execute_calls.append((query, params)),
    )
    monkeypatch.setattr(auth_service.secrets, "token_urlsafe", lambda _: "refresh-token-2")
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

    session = auth_service.refresh_authenticated_session("refresh-token-1")

    assert session.refresh_token == "refresh-token-2"
    assert len(execute_calls) == 2
    assert "UPDATE auth.refresh_tokens" in execute_calls[0][0]
    assert "INSERT INTO auth.refresh_tokens" in execute_calls[1][0]

    get_settings.cache_clear()
