from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status

from backend.app.schemas.auth import LoginRequest, SessionResponse, SessionUser
from backend.app.services.auth import authenticate_user, build_session_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=SessionResponse)
async def login(payload: LoginRequest, request: Request) -> SessionResponse:
    if not authenticate_user(payload.username, payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
        )

    user = build_session_user(payload.username)
    request.session["user"] = user
    return SessionResponse(authenticated=True, user=SessionUser(**user))


@router.post("/logout", response_model=SessionResponse)
async def logout(request: Request) -> SessionResponse:
    request.session.pop("user", None)
    return SessionResponse(authenticated=False, user=None)


@router.get("/session", response_model=SessionResponse)
async def get_session(request: Request) -> SessionResponse:
    session_user = request.session.get("user")
    if not session_user:
        return SessionResponse(authenticated=False, user=None)
    return SessionResponse(authenticated=True, user=SessionUser(**session_user))
