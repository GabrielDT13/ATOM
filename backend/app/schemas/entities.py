from __future__ import annotations

from pydantic import BaseModel


class EntityResponse(BaseModel):
    created_at: str | None = None
    id: str
    logo_url: str | None = None
    name: str
    project_count: int = 0
    slug: str
    team_count: int = 0
    user_count: int = 0


class EntityMutationResponse(BaseModel):
    success: bool
    message: str
    entity: EntityResponse | None = None
