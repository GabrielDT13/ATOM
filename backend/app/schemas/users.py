from __future__ import annotations

from pydantic import BaseModel, EmailStr


class UserCreateRequest(BaseModel):
    username: str
    password: str
    email: EmailStr


class UserUpdateRequest(BaseModel):
    username: str
    email: EmailStr
    password: str | None = None


class UserResponse(BaseModel):
    username: str
    email: EmailStr
    role: str
    first_name: str | None = None
    last_name: str | None = None
    department: str | None = None
    display_name: str | None = None


class UserMutationResponse(BaseModel):
    success: bool
    message: str
    user: UserResponse | None = None
