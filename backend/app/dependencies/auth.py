from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Request, status


def get_current_user(request: Request) -> dict[str, Any]:
    session_user = request.session.get("user")
    if not session_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autorizado",
        )
    return session_user


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
