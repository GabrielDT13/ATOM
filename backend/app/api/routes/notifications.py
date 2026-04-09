from __future__ import annotations

from backend.app.dependencies.auth import get_current_user
from backend.app.schemas.notifications import (
    NotificationCollectionResponse,
    NotificationMutationResponse,
    NotificationResponse,
)
from backend.app.services.notifications import (
    cleanup_stale_read_notifications,
    get_unread_notification_count,
    list_notifications_for_user,
    mark_all_notifications_read,
    mark_notification_read,
)
from fastapi import APIRouter, Query, Request

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=NotificationCollectionResponse)
async def get_notifications(
    request: Request,
    limit: int = Query(default=20, ge=1, le=50),
) -> NotificationCollectionResponse:
    current_user = get_current_user(request)
    user_id = str(current_user["id"])
    cleanup_stale_read_notifications(user_id)
    items = list_notifications_for_user(user_id, limit=limit)
    unread_count = get_unread_notification_count(user_id)
    return NotificationCollectionResponse(
        items=[NotificationResponse(**item) for item in items],
        unread_count=unread_count,
    )


@router.post("/read-all", response_model=NotificationMutationResponse)
async def post_notifications_read_all(request: Request) -> NotificationMutationResponse:
    current_user = get_current_user(request)
    user_id = str(current_user["id"])
    updated_count = mark_all_notifications_read(user_id)
    unread_count = get_unread_notification_count(user_id)
    return NotificationMutationResponse(
        success=True,
        unread_count=unread_count,
        updated_count=updated_count,
    )


@router.post("/{notification_id}/read", response_model=NotificationMutationResponse)
async def post_notification_read(notification_id: int, request: Request) -> NotificationMutationResponse:
    current_user = get_current_user(request)
    user_id = str(current_user["id"])
    updated_count = mark_notification_read(user_id, notification_id)
    unread_count = get_unread_notification_count(user_id)
    return NotificationMutationResponse(
        success=True,
        unread_count=unread_count,
        updated_count=updated_count,
    )
