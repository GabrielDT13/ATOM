from __future__ import annotations

from typing import Annotated

from backend.app.dependencies.auth import get_current_user, require_admin_or_owner
from backend.app.schemas.projects import (
    FileContentResponse,
    ProjectCollectionResponse,
    ProjectMemberMutationRequest,
    ProjectMemberMutationResponse,
    ProjectMembersResponse,
    ProjectMutationResponse,
    ProjectResponse,
    ProjectShareCandidatesResponse,
)
from backend.app.services.projects import (
    add_project_member,
    create_project,
    delete_project,
    get_download_path,
    get_project_details,
    get_project_members,
    list_projects_for_user,
    read_project_file,
    remove_project_member,
    search_project_share_candidates,
    transfer_project_ownership,
    update_project,
    user_can_edit_project,
    user_can_view_project,
)
from backend.app.services.supabase import SupabaseError
from fastapi import APIRouter, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _require_project_owner(request: Request, owner: str) -> dict[str, object]:
    user = get_current_user(request)
    if user.get("username") != owner:
        raise HTTPException(status_code=403, detail="No autorizado")
    return user


def _require_project_view_access(request: Request, owner: str, project_name: str) -> dict[str, object]:
    user = get_current_user(request)
    if user_can_view_project(str(user["id"]), str(user["username"]), str(user["role"]), owner, project_name):
        return user
    raise HTTPException(status_code=403, detail="No autorizado")


def _require_project_edit_access(request: Request, owner: str, project_name: str) -> dict[str, object]:
    user = get_current_user(request)
    if user_can_edit_project(str(user["id"]), str(user["username"]), str(user["role"]), owner, project_name):
        return user
    raise HTTPException(status_code=403, detail="No autorizado")


@router.get("", response_model=ProjectCollectionResponse)
async def get_projects(request: Request) -> ProjectCollectionResponse:
    current_user = get_current_user(request)
    return ProjectCollectionResponse(
        **list_projects_for_user(str(current_user["id"]), str(current_user["username"]), str(current_user["role"]))
    )


@router.get("/{owner}/{project_name}", response_model=ProjectResponse)
async def get_project(owner: str, project_name: str, request: Request) -> ProjectResponse:
    _require_project_view_access(request, owner, project_name)
    try:
        return ProjectResponse(**get_project_details(owner, project_name))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("", response_model=ProjectMutationResponse)
async def post_project(
    request: Request,
    project_name: str = Form(...),
    template_file: UploadFile = File(...),
    additional_files: Annotated[list[UploadFile] | None, File()] = None,
) -> ProjectMutationResponse:
    current_user = get_current_user(request)
    success, message = await create_project(
        str(current_user["id"]),
        current_user["username"],
        project_name,
        template_file,
        additional_files or [],
    )
    project = None
    if success:
        project = ProjectResponse(**get_project_details(current_user["username"], project_name))
    return ProjectMutationResponse(success=success, message=message, project=project)


@router.put("/{owner}/{project_name}", response_model=ProjectMutationResponse)
async def put_project(
    owner: str,
    project_name: str,
    request: Request,
    new_name: str | None = Form(default=None),
    excel_file: UploadFile | None = File(default=None),
    additional_files: Annotated[list[UploadFile] | None, File()] = None,
) -> ProjectMutationResponse:
    current_user = _require_project_edit_access(request, owner, project_name) or get_current_user(request)
    success, message, effective_name = await update_project(
        str(current_user["id"]),
        str(current_user["username"]),
        owner,
        project_name,
        new_name,
        excel_file,
        additional_files or [],
    )
    project = None
    if success:
        project = ProjectResponse(**get_project_details(owner, effective_name))
    return ProjectMutationResponse(success=success, message=message, project=project)


@router.delete("/{owner}/{project_name}", response_model=ProjectMutationResponse)
async def remove_project(owner: str, project_name: str, request: Request) -> ProjectMutationResponse:
    current_user = require_admin_or_owner(request, owner)
    success, message = delete_project(
        str(current_user["id"]),
        str(current_user["username"]),
        owner,
        project_name,
    )
    return ProjectMutationResponse(success=success, message=message, project=None)


@router.get("/{owner}/{project_name}/members", response_model=ProjectMembersResponse)
async def get_project_members_route(
    owner: str,
    project_name: str,
    request: Request,
) -> ProjectMembersResponse:
    _require_project_view_access(request, owner, project_name)
    try:
        return ProjectMembersResponse(members=get_project_members(owner, project_name))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{owner}/{project_name}/share-candidates", response_model=ProjectShareCandidatesResponse)
async def get_project_share_candidates(
    owner: str,
    project_name: str,
    request: Request,
    q: str = Query(default="", max_length=80),
    limit: int = Query(default=8, ge=1, le=20),
) -> ProjectShareCandidatesResponse:
    _require_project_owner(request, owner)
    try:
        return ProjectShareCandidatesResponse(
            users=search_project_share_candidates(owner, project_name, q, limit)
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.put("/{owner}/{project_name}/members/{username}", response_model=ProjectMemberMutationResponse)
async def put_project_member(
    owner: str,
    project_name: str,
    username: str,
    payload: ProjectMemberMutationRequest,
    request: Request,
) -> ProjectMemberMutationResponse:
    _require_project_owner(request, owner)
    try:
        success, message = add_project_member(owner, project_name, username, payload.member_role)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    member = None
    if success:
        try:
            member = next(
                (member for member in get_project_members(owner, project_name) if member["username"] == username),
                None,
            )
        except SupabaseError:
            member = None
    return ProjectMemberMutationResponse(success=success, message=message, member=member)


@router.post("/{owner}/{project_name}/transfer/{username}", response_model=ProjectMutationResponse)
async def post_transfer_project_ownership(
    owner: str,
    project_name: str,
    username: str,
    request: Request,
) -> ProjectMutationResponse:
    _require_project_owner(request, owner)
    try:
        success, message, next_owner = transfer_project_ownership(owner, project_name, username)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    project = None
    if success:
        project = ProjectResponse(**get_project_details(next_owner, project_name))
    return ProjectMutationResponse(success=success, message=message, project=project)


@router.delete("/{owner}/{project_name}/members/{username}", response_model=ProjectMemberMutationResponse)
async def delete_project_member(
    owner: str,
    project_name: str,
    username: str,
    request: Request,
) -> ProjectMemberMutationResponse:
    _require_project_owner(request, owner)
    try:
        success, message = remove_project_member(owner, project_name, username)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ProjectMemberMutationResponse(success=success, message=message, member=None)


@router.get("/{owner}/files/{file_path:path}", response_model=FileContentResponse)
async def get_project_file(
    owner: str,
    file_path: str,
    request: Request,
    max_lines: int | None = Query(default=None, ge=1, le=500),
) -> FileContentResponse:
    project_name = file_path.split("/", 1)[0] if file_path else ""
    _require_project_view_access(request, owner, project_name)
    try:
        content = read_project_file(owner, file_path, max_lines)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return FileContentResponse(**content)


@router.get("/{owner}/download/{file_path:path}")
async def download_project_file(owner: str, file_path: str, request: Request) -> FileResponse:
    project_name = file_path.split("/", 1)[0] if file_path else ""
    _require_project_view_access(request, owner, project_name)
    try:
        target_path = get_download_path(owner, file_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return FileResponse(path=target_path, filename=target_path.name)
