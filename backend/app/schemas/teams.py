from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

TeamMemberRole = Literal["member", "owner"]


class TeamMemberResponse(BaseModel):
    avatar_url: str | None = None
    department: str | None = None
    display_name: str
    email: str | None = None
    entity_name: str | None = None
    id: str
    is_owner: bool = False
    member_role: TeamMemberRole
    username: str


class TeamSummaryResponse(BaseModel):
    created_at: str
    entity_id: str | None = None
    entity_name: str | None = None
    entity_slug: str | None = None
    id: str
    member_count: int
    membership_role: TeamMemberRole | None = None
    name: str
    owner_id: str
    owner_username: str
    slug: str
    updated_at: str


class TeamResponse(TeamSummaryResponse):
    members: list[TeamMemberResponse]


class TeamCollectionResponse(BaseModel):
    items: list[TeamSummaryResponse]


class TeamMutationRequest(BaseModel):
    entity_name: str | None = None
    member_usernames: list[str] = Field(default_factory=list)
    name: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("El nombre del equipo es obligatorio")
        return normalized

    @field_validator("entity_name")
    @classmethod
    def validate_entity_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("member_usernames")
    @classmethod
    def validate_member_usernames(cls, value: list[str]) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        for item in value:
            username = item.strip()
            if not username or username in seen:
                continue
            seen.add(username)
            normalized.append(username)
        return normalized


class TeamMutationResponse(BaseModel):
    success: bool
    message: str
    team: TeamResponse | None = None


class TeamMemberCandidateResponse(BaseModel):
    avatar_url: str | None = None
    department: str | None = None
    display_name: str
    email: str | None = None
    entity_name: str | None = None
    id: str
    username: str


class TeamMemberCandidatesResponse(BaseModel):
    users: list[TeamMemberCandidateResponse]
