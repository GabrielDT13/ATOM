from __future__ import annotations

from pydantic import BaseModel


class MessageItem(BaseModel):
    id: int
    text: str


class SidebarItem(BaseModel):
    name: str
    url: str | None = None
    admin_only: bool | None = None


class SidebarTreeItem(BaseModel):
    name: str
    type: str
    path: str
    project_name: str | None = None
    username: str | None = None
    html_exists: bool | None = None
    children: list["SidebarTreeItem"] | None = None


class SidebarResponse(BaseModel):
    title: str
    items: list[SidebarItem | SidebarTreeItem]


SidebarTreeItem.model_rebuild()
