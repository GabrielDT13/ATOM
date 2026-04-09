from __future__ import annotations

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    action_label: str | None = None
    action_url: str | None = None
    actor_display_name: str | None = None
    actor_user_id: str | None = None
    actor_username: str | None = None
    created_at: str | None = None
    id: int
    is_read: bool
    message: str
    project_id: str | None = None
    project_name: str | None = None
    project_owner_username: str | None = None
    project_slug: str | None = None
    read_at: str | None = None
    title: str
    type: str
    user_id: str


class NotificationCollectionResponse(BaseModel):
    items: list[NotificationResponse]
    unread_count: int


class NotificationMutationResponse(BaseModel):
    success: bool = True
    unread_count: int
    updated_count: int = 0
