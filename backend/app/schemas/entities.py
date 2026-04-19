from __future__ import annotations

from pydantic import BaseModel, field_validator


class EntityResponse(BaseModel):
    created_at: str | None = None
    id: str
    name: str
    project_count: int = 0
    slug: str
    team_count: int = 0
    user_count: int = 0


class EntityMutationRequest(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("El nombre de la entidad es obligatorio")
        return normalized


class EntityMutationResponse(BaseModel):
    success: bool
    message: str
    entity: EntityResponse | None = None
