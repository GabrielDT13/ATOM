from __future__ import annotations

from typing import Any

from backend.app.services.auth import (
    AuthenticatedSession,
    AuthenticationError,
    get_session_user_from_access_token,
    refresh_authenticated_session,
)
from fastapi import HTTPException, Request, status


def _clear_request_auth(request: Request) -> None:
    request.session.pop("auth", None)
    request.session.pop("user", None)


def _store_authenticated_session(
    request: Request,
    session: AuthenticatedSession,
) -> dict[str, Any]:
    request.session["auth"] = {
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
    }
    request.session["user"] = session.user
    return session.user


def _get_session_auth_payload(request: Request) -> dict[str, Any] | None:
    session_auth = request.session.get("auth")
    if isinstance(session_auth, dict):
        return session_auth
    return None


def get_request_access_token(request: Request) -> str | None:
    authorization = request.headers.get("Authorization", "").strip()
    if authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()
        return token or None

    session_auth = _get_session_auth_payload(request)
    if session_auth:
        access_token = session_auth.get("access_token")
        if isinstance(access_token, str) and access_token.strip():
            return access_token.strip()

    return None


def _refresh_request_session(request: Request) -> dict[str, Any] | None:
    session_auth = _get_session_auth_payload(request)
    if not session_auth:
        _clear_request_auth(request)
        return None

    refresh_token = session_auth.get("refresh_token")
    if not isinstance(refresh_token, str) or not refresh_token.strip():
        _clear_request_auth(request)
        return None

    try:
        refreshed_session = refresh_authenticated_session(refresh_token)
    except AuthenticationError:
        _clear_request_auth(request)
        return None

    return _store_authenticated_session(request, refreshed_session)


def get_optional_current_user(request: Request) -> dict[str, Any] | None:
    authorization = request.headers.get("Authorization", "").strip()
    access_token = get_request_access_token(request)
    if not access_token:
        if authorization.lower().startswith("bearer "):
            return None
        return _refresh_request_session(request)

    try:
        user = get_session_user_from_access_token(access_token)
    except AuthenticationError:
        if authorization.lower().startswith("bearer "):
            return None
        return _refresh_request_session(request)

    request.session["user"] = user
    return user


def get_current_user(request: Request) -> dict[str, Any]:
    user = get_optional_current_user(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autorizado",
        )
    return user


def require_admin(request: Request) -> dict[str, Any]:
    user = get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado",
        )
    return user


def require_admin_or_owner(request: Request, owner: str) -> dict[str, Any]:
    user = get_current_user(request)
    if user.get("role") != "admin" and user.get("username") != owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado",
        )
    return user
