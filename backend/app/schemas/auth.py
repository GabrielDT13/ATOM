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


class PasswordResetRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized or "@" not in normalized:
            raise ValueError("El email no es válido")
        return normalized


class PasswordResetConfirmRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("token")
    @classmethod
    def validate_token(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("El token es obligatorio")
        return normalized

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
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


class AuthMessageResponse(BaseModel):
    success: bool
    message: str
