from __future__ import annotations

from backend.app.dependencies.auth import get_current_user, require_admin
from backend.app.schemas.users import UserCreateRequest, UserMutationResponse, UserResponse, UserUpdateRequest
from backend.app.services.auth import (
    build_session_user,
    build_user_response,
    create_user,
    delete_user,
    list_users,
    update_user,
)
from fastapi import APIRouter, HTTPException, Request

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
async def get_users(request: Request) -> list[UserResponse]:
    current_user = get_current_user(request)
    users = list_users()
    if current_user["role"] != "admin":
        users = [user for user in users if user["username"] == current_user["username"]]
    return [UserResponse(**user) for user in users]


@router.post("", response_model=UserMutationResponse)
async def post_user(payload: UserCreateRequest, request: Request) -> UserMutationResponse:
    require_admin(request)
    success, message = create_user(payload.username, payload.password, payload.email)
    user = None
    if success:
        normalized_username = payload.username.strip()
        user = UserResponse(**build_user_response(normalized_username))
    return UserMutationResponse(success=success, message=message, user=user)


@router.put("/{username}", response_model=UserMutationResponse)
async def put_user(
    username: str,
    payload: UserUpdateRequest,
    request: Request,
) -> UserMutationResponse:
    current_user = get_current_user(request)
    if current_user["role"] != "admin" and current_user["username"] != username:
        raise HTTPException(status_code=403, detail="No autorizado")

    success, message, effective_username = update_user(
        username,
        payload.username,
        payload.email,
        payload.password,
    )

    if not success:
        return UserMutationResponse(success=False, message=message, user=None)

    if current_user["username"] == username:
        request.session["user"] = build_session_user(effective_username)

    return UserMutationResponse(
        success=True,
        message=message,
        user=UserResponse(**build_user_response(effective_username)),
    )


@router.delete("/{username}", response_model=UserMutationResponse)
async def remove_user(username: str, request: Request) -> UserMutationResponse:
    require_admin(request)
    success, message = delete_user(username)
    return UserMutationResponse(success=success, message=message, user=None)
