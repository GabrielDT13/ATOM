from __future__ import annotations

from backend.app.dependencies.auth import get_current_user, require_admin
from backend.app.schemas.users import UserCreateRequest, UserMutationResponse, UserResponse, UserUpdateRequest
from backend.app.services.users import (
    create_user,
    delete_user,
    get_user_by_id,
    get_user_by_username,
    list_users,
    update_user,
)
from fastapi import APIRouter, Request

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
    current_user = require_admin(request)
    success, message, temporary_password = create_user(
        payload.username,
        payload.email,
        payload.role,
        payload.department,
        str(current_user["id"]),
    )
    user = None
    if success:
        user = UserResponse(**get_user_by_username(payload.username))
    return UserMutationResponse(
        success=success,
        message=message,
        user=user,
        temporary_password=temporary_password if success else None,
    )


@router.put("/{username}", response_model=UserMutationResponse)
async def put_user(
    username: str,
    payload: UserUpdateRequest,
    request: Request,
) -> UserMutationResponse:
    current_user = require_admin(request)

    success, message, effective_username = update_user(
        username,
        payload.username,
        payload.email,
        payload.password,
        payload.role,
        payload.department,
        str(current_user["id"]),
    )

    if not success:
        return UserMutationResponse(success=False, message=message, user=None)

    if current_user.get("username") == username:
        request.session["user"] = get_user_by_id(str(current_user["id"]))

    return UserMutationResponse(
        success=True,
        message=message,
        user=UserResponse(**get_user_by_username(effective_username)),
    )


@router.delete("/{username}", response_model=UserMutationResponse)
async def remove_user(username: str, request: Request) -> UserMutationResponse:
    require_admin(request)
    success, message = delete_user(username)
    return UserMutationResponse(success=success, message=message, user=None)
