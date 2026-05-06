from __future__ import annotations

from backend.app.dependencies.auth import get_current_user, require_admin
from backend.app.schemas.entities import (
    EntityMutationResponse,
    EntityResponse,
)
from backend.app.services.entities import (
    create_entity,
    delete_entity,
    get_entity_logo_path,
    list_entities,
    update_entity,
    update_entity_logo,
)
from backend.app.services.errors import ServiceError
from fastapi import APIRouter, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/entities", tags=["entities"])


@router.get("", response_model=list[EntityResponse], response_model_exclude_none=True)
async def get_entities(request: Request) -> list[EntityResponse]:
    get_current_user(request)
    return [EntityResponse(**entity) for entity in list_entities()]


def _normalize_entity_name(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise HTTPException(status_code=422, detail="El nombre de la entidad es obligatorio")
    return normalized


async def _read_logo_file(logo_file: UploadFile | None) -> bytes | None:
    if logo_file is None:
        return None

    content_type = str(logo_file.content_type or "").strip().lower()
    if content_type not in {"image/jpeg", "image/jpg", "image/png", "image/webp"}:
        raise HTTPException(status_code=400, detail="El logo debe ser PNG, JPG o WEBP")

    payload = await logo_file.read()
    if not payload:
        return None

    if len(payload) > 1024 * 1024:
        raise HTTPException(status_code=400, detail="El logo supera el tamaño máximo permitido")

    return payload


def _coerce_form_bool(value: object) -> bool:
    normalized = str(value or "").strip().lower()
    return normalized in {"1", "on", "si", "sí", "true", "yes"}


async def _read_entity_payload(request: Request) -> tuple[str, UploadFile | None, bool]:
    content_type = str(request.headers.get("content-type") or "").lower()

    if content_type.startswith("application/json"):
        payload = await request.json()
        if not isinstance(payload, dict):
            raise HTTPException(status_code=422, detail="El cuerpo JSON no es válido")
        return (
            _normalize_entity_name(str(payload.get("name") or "")),
            None,
            bool(payload.get("remove_logo", False)),
        )

    form_data = await request.form()
    logo_file = form_data.get("logo_file")
    return (
        _normalize_entity_name(str(form_data.get("name") or "")),
        logo_file if isinstance(logo_file, UploadFile) else None,
        _coerce_form_bool(form_data.get("remove_logo")),
    )


@router.post("", response_model=EntityMutationResponse, response_model_exclude_none=True)
async def post_entity(request: Request) -> EntityMutationResponse:
    require_admin(request)
    name, logo_file, _ = await _read_entity_payload(request)
    try:
        success, message, entity = create_entity(name)
        if success and entity and logo_file is not None:
            entity = update_entity_logo(str(entity["id"]), await _read_logo_file(logo_file))
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
    request: Request,
) -> EntityMutationResponse:
    require_admin(request)
    name, logo_file, remove_logo = await _read_entity_payload(request)
    try:
        success, message, entity = update_entity(entity_id, name)
        if success and entity:
            if remove_logo:
                entity = update_entity_logo(entity_id, None)
            elif logo_file is not None:
                entity = update_entity_logo(entity_id, await _read_logo_file(logo_file))
    except ServiceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return EntityMutationResponse(
        success=success,
        message=message,
        entity=EntityResponse(**entity) if entity else None,
    )


@router.get("/{entity_id}/logo")
async def get_entity_logo(entity_id: str, request: Request) -> FileResponse:
    get_current_user(request)
    logo_path = get_entity_logo_path(entity_id)
    if not logo_path.exists() or not logo_path.is_file():
        raise HTTPException(status_code=404, detail="Logo no encontrado")

    return FileResponse(
        path=logo_path,
        media_type="image/webp",
        headers={"Cache-Control": "no-store"},
    )


@router.delete("/{entity_id}", response_model=EntityMutationResponse, response_model_exclude_none=True)
async def remove_entity(entity_id: str, request: Request) -> EntityMutationResponse:
    require_admin(request)
    try:
        success, message = delete_entity(entity_id)
    except ServiceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return EntityMutationResponse(success=success, message=message, entity=None)
