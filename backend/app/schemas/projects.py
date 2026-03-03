from __future__ import annotations

from pydantic import BaseModel


class ProjectResponse(BaseModel):
    owner: str
    name: str
    files: list[str]


class ProjectCollectionResponse(BaseModel):
    projects: dict[str, list[str]]


class FileContentResponse(BaseModel):
    content: str
    truncated: bool = False


class MutationResponse(BaseModel):
    success: bool
    message: str
