from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, field_validator

ProjectMemberRole = Literal["editor", "owner", "viewer"]
ProjectEditableMemberRole = Literal["editor", "viewer"]


class ProjectFileResponse(BaseModel):
    extension: str
    kind: str
    name: str
    path: str
    size_bytes: int


class ProjectSummaryResponse(BaseModel):
    access_role: ProjectMemberRole | None = None
    additional_files: list[str]
    created_at: str
    file_count: int
    files: list[str]
    html_files: list[str]
    owner: str
    name: str
    status: str
    template_file: str | None
    updated_at: str


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
    avatar_url: str | None = None
    bio: str | None = None
    department: str | None = None
    display_name: str
    email: str | None = None
    id: str
    is_owner: bool = False
    member_role: ProjectMemberRole
    username: str


class ProjectMembersResponse(BaseModel):
    members: list[ProjectMemberResponse]


class ProjectShareCandidateResponse(BaseModel):
    avatar_url: str | None = None
    bio: str | None = None
    department: str | None = None
    display_name: str
    email: str | None = None
    id: str
    username: str


class ProjectShareCandidatesResponse(BaseModel):
    users: list[ProjectShareCandidateResponse]


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
