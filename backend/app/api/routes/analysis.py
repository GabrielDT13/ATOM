from __future__ import annotations

import json

from backend.app.schemas.analysis import (
    AnalysisRunCollectionResponse,
    AnalysisRunEventCollectionResponse,
    AnalysisRunEventResponse,
    AnalysisRunMutationResponse,
    AnalysisRunRequest,
    AnalysisRunResponse,
)
from backend.app.dependencies.auth import get_current_user
from backend.app.services.analysis_runs import (
    build_analysis_stream_event,
    create_or_reuse_analysis_run,
    get_analysis_run,
    list_analysis_run_events,
    list_analysis_runs_for_project,
)
from backend.app.services.analysis import stream_analysis
from backend.app.services.projects import (
    get_project_details,
    resolve_project_reference,
)
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


def _resolve_project_target(payload: AnalysisRunRequest) -> dict[str, object]:
    if payload.project_ref:
        project = resolve_project_reference(payload.project_ref)
        if not project:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        return project

    try:
        project = get_project_details(str(payload.owner), str(payload.project_name))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "id": project.get("id"),
        "name": project.get("name"),
        "owner_username": project.get("owner"),
    }


def _require_run_access(request: Request, run_id: str) -> dict[str, object]:
    current_user = get_current_user(request)
    run = get_analysis_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Ejecución no encontrada")

    owner_username = str(run.get("project_owner_username") or "").strip()
    if current_user.get("role") != "admin" and current_user.get("username") != owner_username:
        raise HTTPException(status_code=403, detail="No autorizado")
    return run


@router.post("/runs", response_model=AnalysisRunMutationResponse)
async def create_analysis_run_route(
    payload: AnalysisRunRequest,
    request: Request,
) -> AnalysisRunMutationResponse:
    current_user = get_current_user(request)
    project = _resolve_project_target(payload)
    owner_username = str(
        project.get("owner_username")
        or project.get("owner")
        or ""
    ).strip()

    if current_user.get("role") != "admin" and current_user.get("username") != owner_username:
        raise HTTPException(status_code=403, detail="No autorizado")

    project_id = str(project.get("id") or "").strip()
    if not project_id:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    try:
        run, created = create_or_reuse_analysis_run(
            project_id=project_id,
            requested_by_user_id=str(current_user["id"]),
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return AnalysisRunMutationResponse(
        created=created,
        run=AnalysisRunResponse(**run),
    )


@router.get("/runs/{run_id}", response_model=AnalysisRunResponse)
async def get_analysis_run_route(run_id: str, request: Request) -> AnalysisRunResponse:
    run = _require_run_access(request, run_id)
    return AnalysisRunResponse(**run)


@router.get("/runs/{run_id}/logs", response_model=AnalysisRunEventCollectionResponse)
async def get_analysis_run_logs_route(
    run_id: str,
    request: Request,
    limit: int = Query(default=500, ge=1, le=1000),
) -> AnalysisRunEventCollectionResponse:
    _require_run_access(request, run_id)
    return AnalysisRunEventCollectionResponse(
        items=[AnalysisRunEventResponse(**item) for item in list_analysis_run_events(run_id, limit=limit)]
    )


@router.get("/runs/{run_id}/stream")
async def stream_analysis_run_route(run_id: str, request: Request) -> StreamingResponse:
    _require_run_access(request, run_id)

    def _iter_events():
        for event in list_analysis_run_events(run_id, limit=1000):
            yield f"data:{json.dumps(build_analysis_stream_event(event), ensure_ascii=False)}\n\n"

    return StreamingResponse(
        _iter_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/projects/{project_ref}/runs", response_model=AnalysisRunCollectionResponse)
async def get_project_analysis_runs_route(
    project_ref: str,
    request: Request,
    limit: int = Query(default=20, ge=1, le=100),
) -> AnalysisRunCollectionResponse:
    project = resolve_project_reference(project_ref)
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    owner_username = str(project.get("owner_username") or "").strip()
    current_user = get_current_user(request)
    if current_user.get("role") != "admin" and current_user.get("username") != owner_username:
        raise HTTPException(status_code=403, detail="No autorizado")

    project_id = str(project.get("id") or "").strip()
    return AnalysisRunCollectionResponse(
        items=[AnalysisRunResponse(**item) for item in list_analysis_runs_for_project(project_id, limit=limit)]
    )


@router.get("/run")
async def run_analysis(
    request: Request,
    project_name: str = Query(..., min_length=1),
) -> StreamingResponse:
    current_user = get_current_user(request)
    return StreamingResponse(
        stream_analysis(current_user["username"], project_name),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
