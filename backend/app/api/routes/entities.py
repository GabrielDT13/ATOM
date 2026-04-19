from __future__ import annotations

from backend.app.dependencies.auth import get_current_user, require_admin
from backend.app.schemas.entities import (
    EntityMutationRequest,
    EntityMutationResponse,
    EntityResponse,
)
from backend.app.services.entities import create_entity, delete_entity, list_entities, update_entity
from backend.app.services.errors import ServiceError
from fastapi import APIRouter, HTTPException, Request

router = APIRouter(prefix="/api/entities", tags=["entities"])


@router.get("", response_model=list[EntityResponse])
async def get_entities(request: Request) -> list[EntityResponse]:
    get_current_user(request)
    return [EntityResponse(**entity) for entity in list_entities()]


@router.post("", response_model=EntityMutationResponse, response_model_exclude_none=True)
async def post_entity(payload: EntityMutationRequest, request: Request) -> EntityMutationResponse:
    require_admin(request)
    try:
        success, message, entity = create_entity(payload.name)
    except ServiceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return EntityMutationResponse(
        success=success,
        message=message,
        entity=EntityResponse(**entity) if entity else None,
    )


@router.put("/{entity_id}", response_model=EntityMutationResponse, response_model_exclude_none=True)
async def put_entity(
    entity_id: str,
    payload: EntityMutationRequest,
    request: Request,
) -> EntityMutationResponse:
    require_admin(request)
    try:
        success, message, entity = update_entity(entity_id, payload.name)
    except ServiceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return EntityMutationResponse(
        success=success,
        message=message,
        entity=EntityResponse(**entity) if entity else None,
    )


@router.delete("/{entity_id}", response_model=EntityMutationResponse, response_model_exclude_none=True)
async def remove_entity(entity_id: str, request: Request) -> EntityMutationResponse:
    require_admin(request)
    try:
        success, message = delete_entity(entity_id)
    except ServiceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return EntityMutationResponse(success=success, message=message, entity=None)
