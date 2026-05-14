from __future__ import annotations

from typing import Literal

from backend.app.schemas.analysis import AnalysisRunResponse
from pydantic import BaseModel, Field, field_validator

ProjectMemberRole = Literal["editor", "owner", "viewer"]
ProjectEditableMemberRole = Literal["editor", "viewer"]
ProjectVisibility = Literal["private", "public"]


class ProjectFileResponse(BaseModel):
    extension: str
    kind: str
    name: str
    path: str
    size_bytes: int


class ProjectSummaryResponse(BaseModel):
    access_role: ProjectMemberRole | None = None
    active_run: AnalysisRunResponse | None = None
    additional_files: list[str]
    created_at: str
    entity_id: str | None = None
    entity_logo_url: str | None = None
    entity_name: str | None = None
    entity_slug: str | None = None
    file_count: int
    files: list[str]
    html_files: list[str]
    id: str | None = None
    owner: str
    name: str
    slug: str | None = None
    status: str
    template_file: str | None
    updated_at: str
    visibility: ProjectVisibility = "private"


class ProjectResponse(ProjectSummaryResponse):
    file_entries: list[ProjectFileResponse]


class ProjectCollectionResponse(BaseModel):
    items: list[ProjectSummaryResponse]
    projects: dict[str, list[str]]


class FileContentResponse(BaseModel):
    content: str
    truncated: bool = False


class ProjectMutationResponse(BaseModel):
    success: bool
    message: str
    project: ProjectResponse | None = None


class ProjectMemberResponse(BaseModel):
    access_via_teams: list[str] = Field(default_factory=list)
    avatar_url: str | None = None
    bio: str | None = None
    department: str | None = None
    direct_member_role: ProjectMemberRole | None = None
    display_name: str
    email: str | None = None
    has_direct_access: bool = False
    id: str
    is_owner: bool = False
    member_role: ProjectMemberRole
    username: str


class ProjectMembersResponse(BaseModel):
    members: list[ProjectMemberResponse]


class ProjectShareCandidateResponse(BaseModel):
    access_via_teams: list[str] = Field(default_factory=list)
    avatar_url: str | None = None
    bio: str | None = None
    department: str | None = None
    direct_member_role: ProjectMemberRole | None = None
    display_name: str
    email: str | None = None
    has_direct_access: bool = False
    id: str
    member_role: ProjectMemberRole | None = None
    username: str


class ProjectShareCandidatesResponse(BaseModel):
    users: list[ProjectShareCandidateResponse]


class ProjectTeamResponse(BaseModel):
    direct_member_overlap_count: int = 0
    direct_member_overlap_usernames: list[str] = Field(default_factory=list)
    entity_name: str | None = None
    id: str
    linked_at: str
    member_count: int
    member_role: ProjectEditableMemberRole
    name: str
    owner_username: str
    slug: str


class ProjectTeamsResponse(BaseModel):
    teams: list[ProjectTeamResponse]


class ProjectTeamCandidatesResponse(BaseModel):
    teams: list[ProjectTeamResponse]


class ProjectMemberMutationRequest(BaseModel):
    member_role: ProjectEditableMemberRole = "viewer"

    @field_validator("member_role")
    @classmethod
    def validate_member_role(cls, value: str) -> ProjectEditableMemberRole:
        normalized = value.strip().lower()
        if normalized not in {"editor", "viewer"}:
            raise ValueError("El rol del proyecto no es válido")
        return normalized  # type: ignore[return-value]


class ProjectMemberMutationResponse(BaseModel):
    success: bool
    message: str
    member: ProjectMemberResponse | None = None


class ProjectTeamMutationRequest(BaseModel):
    member_role: ProjectEditableMemberRole = "viewer"

    @field_validator("member_role")
    @classmethod
    def validate_member_role(cls, value: str) -> ProjectEditableMemberRole:
        normalized = value.strip().lower()
        if normalized not in {"editor", "viewer"}:
            raise ValueError("El rol del equipo no es válido")
        return normalized  # type: ignore[return-value]


class ProjectTeamMutationResponse(BaseModel):
    success: bool
    message: str
    team: ProjectTeamResponse | None = None
