from __future__ import annotations

from backend.app.dependencies.auth import get_current_user
from backend.app.services.projects import build_project_tree, list_sidebar_left
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/navigation", tags=["navigation"])

@router.get("/sidebar-left")
async def get_sidebar_left(request: Request) -> dict[str, object]:
    current_user = get_current_user(request)
    return list_sidebar_left(current_user["role"])


@router.get("/sidebar-right")
async def get_sidebar_right(request: Request) -> dict[str, object]:
    current_user = get_current_user(request)
    return build_project_tree(current_user["username"])
