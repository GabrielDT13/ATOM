from __future__ import annotations

from backend.app.dependencies.auth import require_admin
from backend.app.schemas.access_requests import (
    AccessRequestApproveRequest,
    AccessRequestCreateRequest,
    AccessRequestMutationResponse,
    AccessRequestResponse,
)
from backend.app.services.access_requests import (
    approve_access_request,
    create_access_request,
    deny_access_request,
    list_access_requests,
)
from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/access-requests", tags=["access-requests"])


@router.get("", response_model=list[AccessRequestResponse], response_model_exclude_none=True)
async def get_access_requests(request: Request) -> list[AccessRequestResponse]:
    require_admin(request)
    return [AccessRequestResponse(**item) for item in list_access_requests()]


@router.post("", response_model=AccessRequestMutationResponse, response_model_exclude_none=True)
async def post_access_request(payload: AccessRequestCreateRequest) -> AccessRequestMutationResponse:
    success, message, access_request = create_access_request(payload.full_name, payload.email)
    return AccessRequestMutationResponse(
        success=success,
        message=message,
        request=AccessRequestResponse(**access_request) if access_request else None,
    )


@router.post(
    "/{request_id}/approve",
    response_model=AccessRequestMutationResponse,
    response_model_exclude_none=True,
)
async def post_access_request_approve(
    request_id: int,
    payload: AccessRequestApproveRequest,
    request: Request,
) -> AccessRequestMutationResponse:
    current_user = require_admin(request)
    success, message, access_request, temporary_password = approve_access_request(
        request_id,
        actor_user_id=str(current_user["id"]),
        username=payload.username,
        department=payload.department,
        entity_name=payload.entity_name,
    )
    return AccessRequestMutationResponse(
        success=success,
        message=message,
        request=AccessRequestResponse(**access_request) if access_request else None,
        temporary_password=temporary_password,
    )


@router.post(
    "/{request_id}/deny",
    response_model=AccessRequestMutationResponse,
    response_model_exclude_none=True,
)
async def post_access_request_deny(
    request_id: int,
    request: Request,
) -> AccessRequestMutationResponse:
    current_user = require_admin(request)
    success, message, access_request = deny_access_request(
        request_id,
        actor_user_id=str(current_user["id"]),
    )
    return AccessRequestMutationResponse(
        success=success,
        message=message,
        request=AccessRequestResponse(**access_request) if access_request else None,
    )
