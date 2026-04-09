from __future__ import annotations

from backend.app.dependencies.auth import get_optional_current_user, get_request_access_token
from backend.app.schemas.auth import (
    AuthMessageResponse,
    LoginRequest,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    SessionResponse,
    SessionUser,
)
from backend.app.services.auth import (
    AuthenticationError,
    authenticate_email_password,
    logout_session,
    request_password_reset,
    reset_password_with_token,
    refresh_authenticated_session,
    validate_access_token,
)
from fastapi import APIRouter, HTTPException, Request

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=SessionResponse)
async def login(payload: LoginRequest, request: Request) -> SessionResponse:
    try:
        session = authenticate_email_password(payload.email, payload.password)
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=str(exc),
        ) from exc

    request.session["auth"] = {
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
    }
    request.session["user"] = session.user
    return SessionResponse(authenticated=True, user=SessionUser(**session.user))


@router.post("/forgot-password", response_model=AuthMessageResponse)
async def forgot_password(payload: PasswordResetRequest) -> AuthMessageResponse:
    request_password_reset(payload.email)
    return AuthMessageResponse(
        success=True,
        message=(
            "Si existe una cuenta asociada a ese email, te hemos enviado "
            "las instrucciones para restablecer la contraseña."
        ),
    )


@router.post("/reset-password", response_model=AuthMessageResponse)
async def reset_password(payload: PasswordResetConfirmRequest) -> AuthMessageResponse:
    try:
        reset_password_with_token(payload.token, payload.new_password)
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail=str(exc),
        ) from exc
    return AuthMessageResponse(
        success=True,
        message="La contraseña se ha actualizado correctamente.",
    )


@router.post("/logout", response_model=SessionResponse)
async def logout(request: Request) -> SessionResponse:
    access_token = get_request_access_token(request)
    if access_token:
        try:
            validate_access_token(access_token)
        except AuthenticationError:
            access_token = None

    if not access_token:
        session_auth = request.session.get("auth")
        refresh_token = session_auth.get("refresh_token") if isinstance(session_auth, dict) else None
        if isinstance(refresh_token, str) and refresh_token.strip():
            try:
                refreshed_session = refresh_authenticated_session(refresh_token)
                access_token = refreshed_session.access_token
            except AuthenticationError:
                access_token = None

    if access_token:
        logout_session(access_token, scope="local")

    request.session.pop("auth", None)
    request.session.pop("user", None)
    return SessionResponse(authenticated=False, user=None)


@router.get("/session", response_model=SessionResponse)
async def get_session(request: Request) -> SessionResponse:
    session_user = get_optional_current_user(request)
    if not session_user:
        return SessionResponse(authenticated=False, user=None)
    return SessionResponse(authenticated=True, user=SessionUser(**session_user))
