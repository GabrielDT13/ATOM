from __future__ import annotations

from backend.app.dependencies.auth import get_current_user
from backend.app.schemas.dashboard import DashboardOverviewResponse
from backend.app.services.dashboard import get_dashboard_overview
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/overview", response_model=DashboardOverviewResponse)
async def get_dashboard_overview_route(request: Request) -> DashboardOverviewResponse:
    current_user = get_current_user(request)
    return DashboardOverviewResponse(
        **get_dashboard_overview(
            session_user_id=str(current_user["id"]),
            session_username=str(current_user["username"]),
            role=str(current_user["role"]),
        )
    )
