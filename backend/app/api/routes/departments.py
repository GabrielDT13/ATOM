from __future__ import annotations

from backend.app.dependencies.auth import require_admin
from backend.app.schemas.departments import DepartmentResponse
from backend.app.services.departments import list_departments
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/departments", tags=["departments"])


@router.get("", response_model=list[DepartmentResponse])
async def get_departments(request: Request) -> list[DepartmentResponse]:
    require_admin(request)
    return [DepartmentResponse(**department) for department in list_departments()]
