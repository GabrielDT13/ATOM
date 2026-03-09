from __future__ import annotations

from pydantic import BaseModel, field_validator


class UserCreateRequest(BaseModel):
    username: str
    password: str
    email: str
    role: str = "user"
    department: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized or "@" not in normalized:
            raise ValueError("El email no es válido")
        return normalized

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"admin", "user"}:
            raise ValueError("El rol no es válido")
        return normalized

    @field_validator("department")
    @classmethod
    def validate_department(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class UserUpdateRequest(BaseModel):
    username: str
    email: str
    password: str | None = None
    role: str = "user"
    department: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized or "@" not in normalized:
            raise ValueError("El email no es válido")
        return normalized

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"admin", "user"}:
            raise ValueError("El rol no es válido")
        return normalized

    @field_validator("department")
    @classmethod
    def validate_department(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


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
