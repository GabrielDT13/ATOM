from __future__ import annotations

from pydantic import BaseModel, field_validator


class UserCreateRequest(BaseModel):
    username: str
    password: str
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized or "@" not in normalized:
            raise ValueError("El email no es válido")
        return normalized


class UserUpdateRequest(BaseModel):
    username: str
    email: str
    password: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized or "@" not in normalized:
            raise ValueError("El email no es válido")
        return normalized


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    first_name: str | None = None
    last_name: str | None = None
    department: str | None = None
    display_name: str | None = None


class UserMutationResponse(BaseModel):
    success: bool
    message: str
    user: UserResponse | None = None
