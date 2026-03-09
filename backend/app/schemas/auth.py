from __future__ import annotations

from pydantic import BaseModel, field_validator


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized or "@" not in normalized:
            raise ValueError("El email no es válido")
        return normalized


class SessionUser(BaseModel):
    id: str
    email: str
    username: str
    role: str
    first_name: str | None = None
    last_name: str | None = None
    department: str | None = None
    display_name: str | None = None


class SessionResponse(BaseModel):
    authenticated: bool
    user: SessionUser | None = None
