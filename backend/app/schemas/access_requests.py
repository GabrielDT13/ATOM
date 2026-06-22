from __future__ import annotations

from pydantic import BaseModel, field_validator


class AccessRequestCreateRequest(BaseModel):
    full_name: str
    email: str

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        normalized = " ".join(value.strip().split())
        if len(normalized) < 3:
            raise ValueError("El nombre es obligatorio")
        return normalized

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not normalized or "@" not in normalized:
            raise ValueError("El email no es válido")
        return normalized


class AccessRequestApproveRequest(BaseModel):
    username: str
    department: str | None = None
    entity_name: str | None = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 3:
            raise ValueError("El nombre de usuario debe tener al menos 3 caracteres")
        return normalized

    @field_validator("department")
    @classmethod
    def validate_department(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("entity_name")
    @classmethod
    def validate_entity_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class AccessRequestResponse(BaseModel):
    id: int
    full_name: str
    email: str
    status: str
    reviewed_by_user_id: str | None = None
    reviewed_by_username: str | None = None
    reviewed_by_display_name: str | None = None
    approved_user_id: str | None = None
    approved_username: str | None = None
    approved_display_name: str | None = None
    reviewed_at: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class AccessRequestMutationResponse(BaseModel):
    success: bool
    message: str
    request: AccessRequestResponse | None = None
    temporary_password: str | None = None
