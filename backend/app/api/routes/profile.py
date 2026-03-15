from __future__ import annotations

from backend.app.dependencies.auth import get_current_user, get_request_access_token
from backend.app.schemas.profile import (
    ProfileMutationResponse,
    ProfilePasswordChangeRequest,
    ProfileResponse,
    ProfileUpdateRequest,
)
from backend.app.services.auth import get_session_user_by_id
from backend.app.services.profile import change_my_password, delete_my_account, get_my_profile, update_my_profile
from fastapi import APIRouter, HTTPException, Request, status

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile_route(request: Request) -> ProfileResponse:
    current_user = get_current_user(request)
    return ProfileResponse(**get_my_profile(str(current_user["id"])))


@router.put("/me", response_model=ProfileMutationResponse)
async def update_my_profile_route(
    payload: ProfileUpdateRequest,
    request: Request,
) -> ProfileMutationResponse:
    current_user = get_current_user(request)
    access_token = get_request_access_token(request)
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autorizado")

    success, message, profile = update_my_profile(
        user_id=str(current_user["id"]),
        access_token=access_token,
        username=payload.username,
        email=payload.email,
        display_name=payload.display_name,
        department=payload.department,
        bio=payload.bio,
        preferences=payload.preferences.model_dump(),
    )

    if success:
        request.session["user"] = get_session_user_by_id(str(current_user["id"]))

    return ProfileMutationResponse(
        success=success,
        message=message,
        profile=ProfileResponse(**profile) if profile else None,
    )


@router.post("/me/password", response_model=ProfileMutationResponse)
async def change_my_password_route(
    payload: ProfilePasswordChangeRequest,
    request: Request,
) -> ProfileMutationResponse:
    get_current_user(request)
    access_token = get_request_access_token(request)
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autorizado")

    success, message = change_my_password(
        access_token=access_token,
        current_password=payload.current_password,
        new_password=payload.new_password,
    )
    return ProfileMutationResponse(success=success, message=message, profile=None)


@router.delete("/me", response_model=ProfileMutationResponse)
async def delete_my_account_route(request: Request) -> ProfileMutationResponse:
    current_user = get_current_user(request)
    access_token = get_request_access_token(request)
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autorizado")

    success, message = delete_my_account(
        access_token=access_token,
        username=str(current_user["username"]),
    )
    if success:
        request.session.pop("auth", None)
        request.session.pop("user", None)

    return ProfileMutationResponse(success=success, message=message, profile=None)
