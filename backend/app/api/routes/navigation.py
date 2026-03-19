from __future__ import annotations

from backend.app.dependencies.auth import get_current_user
from backend.app.services.projects import list_sidebar_left, list_sidebar_projects_for_user
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/navigation", tags=["navigation"])

@router.get("/sidebar-left")
async def get_sidebar_left(request: Request) -> dict[str, object]:
    current_user = get_current_user(request)
    return list_sidebar_left(current_user["role"])


@router.get("/sidebar-right")
async def get_sidebar_right(request: Request) -> dict[str, object]:
    current_user = get_current_user(request)
    return list_sidebar_projects_for_user(
        str(current_user["id"]),
        str(current_user["username"]),
        str(current_user["role"]),
    )
