from __future__ import annotations

from backend.app.dependencies.auth import get_current_user
from backend.app.services.analysis import stream_analysis
from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


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
