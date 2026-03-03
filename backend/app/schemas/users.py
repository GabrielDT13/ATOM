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


class UserMutationResponse(BaseModel):
    success: bool
    message: str
    user: UserResponse | None = None
