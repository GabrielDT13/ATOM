from __future__ import annotations

from typing import Annotated

from backend.app.dependencies.auth import get_current_user, require_admin_or_owner
from backend.app.schemas.projects import FileContentResponse, MutationResponse, ProjectCollectionResponse, ProjectResponse
from backend.app.services.projects import (
    create_project,
    delete_project,
    get_download_path,
    get_project_details,
    list_projects_for_user,
    read_project_file,
    update_project,
)
from fastapi import APIRouter, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=ProjectCollectionResponse)
async def get_projects(request: Request) -> ProjectCollectionResponse:
    current_user = get_current_user(request)
    return ProjectCollectionResponse(
        projects=list_projects_for_user(current_user["username"], current_user["role"])
    )


@router.get("/{owner}/{project_name}", response_model=ProjectResponse)
async def get_project(owner: str, project_name: str, request: Request) -> ProjectResponse:
    require_admin_or_owner(request, owner)
    try:
        return ProjectResponse(**get_project_details(owner, project_name))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("", response_model=MutationResponse)
async def post_project(
    request: Request,
    project_name: str = Form(...),
    template_file: UploadFile = File(...),
    additional_files: Annotated[list[UploadFile] | None, File()] = None,
) -> MutationResponse:
    current_user = get_current_user(request)
    success, message = await create_project(
        current_user["username"],
        project_name,
        template_file,
        additional_files or [],
    )
    return MutationResponse(success=success, message=message)


@router.put("/{owner}/{project_name}", response_model=MutationResponse)
async def put_project(
    owner: str,
    project_name: str,
    request: Request,
    new_name: str | None = Form(default=None),
    excel_file: UploadFile | None = File(default=None),
    additional_files: Annotated[list[UploadFile] | None, File()] = None,
) -> MutationResponse:
    require_admin_or_owner(request, owner)
    success, message, _ = await update_project(
        owner,
        project_name,
        new_name,
        excel_file,
        additional_files or [],
    )
    return MutationResponse(success=success, message=message)


@router.delete("/{owner}/{project_name}", response_model=MutationResponse)
async def remove_project(owner: str, project_name: str, request: Request) -> MutationResponse:
    require_admin_or_owner(request, owner)
    success, message = delete_project(owner, project_name)
    return MutationResponse(success=success, message=message)


@router.get("/{owner}/files/{file_path:path}", response_model=FileContentResponse)
async def get_project_file(
    owner: str,
    file_path: str,
    request: Request,
    max_lines: int | None = Query(default=None, ge=1, le=500),
) -> FileContentResponse:
    require_admin_or_owner(request, owner)
    try:
        content = read_project_file(owner, file_path, max_lines)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return FileContentResponse(**content)


@router.get("/{owner}/download/{file_path:path}")
async def download_project_file(owner: str, file_path: str, request: Request) -> FileResponse:
    require_admin_or_owner(request, owner)
    try:
        target_path = get_download_path(owner, file_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return FileResponse(path=target_path, filename=target_path.name)
