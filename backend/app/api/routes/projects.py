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
    ProjectTeamCandidatesResponse,
    ProjectTeamMutationRequest,
    ProjectTeamMutationResponse,
    ProjectTeamsResponse,
)
from backend.app.services.errors import ServiceError
from backend.app.services.projects import (
    add_project_member,
    add_project_team,
    create_project,
    delete_project,
    get_download_path,
    get_project_details,
    get_project_details_by_ref,
    get_project_members,
    get_project_members_by_ref,
    list_project_teams,
    list_public_projects_for_user,
    list_projects_for_user,
    read_project_file,
    remove_project_member,
    remove_project_team,
    resolve_project_reference,
    search_project_share_candidates,
    search_project_team_candidates,
    transfer_project_ownership,
    update_project,
    user_can_edit_project,
    user_can_view_project,
)
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


def _resolve_project_for_ref(project_ref: str) -> dict[str, object]:
    project = resolve_project_reference(project_ref)
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return project


@router.get("", response_model=ProjectCollectionResponse, response_model_exclude_none=True)
async def get_projects(request: Request) -> ProjectCollectionResponse:
    current_user = get_current_user(request)
    return ProjectCollectionResponse(
        **list_projects_for_user(str(current_user["id"]), str(current_user["username"]), str(current_user["role"]))
    )


@router.get("/public", response_model=ProjectCollectionResponse, response_model_exclude_none=True)
async def get_public_projects(request: Request) -> ProjectCollectionResponse:
    current_user = get_current_user(request)
    return ProjectCollectionResponse(
        **list_public_projects_for_user(
            str(current_user["id"]),
            str(current_user["username"]),
            str(current_user["role"]),
        )
    )


@router.get("/by-ref/{project_ref}", response_model=ProjectResponse, response_model_exclude_none=True)
async def get_project_by_ref(project_ref: str, request: Request) -> ProjectResponse:
    project = _resolve_project_for_ref(project_ref)
    owner = str(project.get("owner_username") or "").strip()
    project_name = str(project.get("name") or "").strip()
    _require_project_view_access(request, owner, project_name)
    try:
        return ProjectResponse(**get_project_details_by_ref(project_ref))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{owner}/{project_name}", response_model=ProjectResponse, response_model_exclude_none=True)
async def get_project(owner: str, project_name: str, request: Request) -> ProjectResponse:
    _require_project_view_access(request, owner, project_name)
    try:
        return ProjectResponse(**get_project_details(owner, project_name))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("", response_model=ProjectMutationResponse, response_model_exclude_none=True)
async def post_project(
    request: Request,
    project_name: str = Form(...),
    entity_name: str | None = Form(default=None),
    team_id: str | None = Form(default=None),
    visibility: str = Form(default="private"),
    template_file: UploadFile = File(...),
    additional_files: Annotated[list[UploadFile] | None, File()] = None,
) -> ProjectMutationResponse:
    current_user = get_current_user(request)
    success, message = await create_project(
        str(current_user["id"]),
        str(current_user["username"]),
        project_name,
        template_file,
        additional_files or [],
        entity_name=entity_name,
        team_id=team_id,
        visibility=visibility,
        actor_role=str(current_user["role"]),
    )
    project = None
    if success:
        project = ProjectResponse(**get_project_details(current_user["username"], project_name))
    return ProjectMutationResponse(success=success, message=message, project=project)


@router.put("/{owner}/{project_name}", response_model=ProjectMutationResponse, response_model_exclude_none=True)
async def put_project(
    owner: str,
    project_name: str,
    request: Request,
    new_name: str | None = Form(default=None),
    entity_name: str | None = Form(default=None),
    visibility: str | None = Form(default=None),
    excel_file: UploadFile | None = File(default=None),
    additional_files: Annotated[list[UploadFile] | None, File()] = None,
) -> ProjectMutationResponse:
    current_user = _require_project_edit_access(request, owner, project_name) or get_current_user(request)
    if (
        visibility is not None
        and str(current_user.get("role") or "").strip() != "admin"
        and str(current_user.get("username") or "").strip() != owner
    ):
        raise HTTPException(status_code=403, detail="Solo el propietario puede cambiar la visibilidad del proyecto")
    if entity_name is None:
        success, message, effective_name = await update_project(
            str(current_user["id"]),
            str(current_user["username"]),
            owner,
            project_name,
            new_name,
            excel_file,
            additional_files or [],
            visibility=visibility,
        )
    else:
        success, message, effective_name = await update_project(
            str(current_user["id"]),
            str(current_user["username"]),
            owner,
            project_name,
            new_name,
            excel_file,
            additional_files or [],
            entity_name,
            visibility,
        )
    project = None
    if success:
        project = ProjectResponse(**get_project_details(owner, effective_name))
    return ProjectMutationResponse(success=success, message=message, project=project)


@router.delete("/{owner}/{project_name}", response_model=ProjectMutationResponse, response_model_exclude_none=True)
async def remove_project(owner: str, project_name: str, request: Request) -> ProjectMutationResponse:
    current_user = require_admin_or_owner(request, owner)
    success, message = delete_project(
        str(current_user["id"]),
        str(current_user["username"]),
        owner,
        project_name,
    )
    return ProjectMutationResponse(success=success, message=message, project=None)


@router.get("/by-ref/{project_ref}/members", response_model=ProjectMembersResponse)
async def get_project_members_by_ref_route(
    project_ref: str,
    request: Request,
) -> ProjectMembersResponse:
    project = _resolve_project_for_ref(project_ref)
    owner = str(project.get("owner_username") or "").strip()
    project_name = str(project.get("name") or "").strip()
    _require_project_view_access(request, owner, project_name)
    try:
        return ProjectMembersResponse(members=get_project_members_by_ref(project_ref))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


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


@router.get("/{owner}/{project_name}/teams", response_model=ProjectTeamsResponse)
async def get_project_teams_route(
    owner: str,
    project_name: str,
    request: Request,
) -> ProjectTeamsResponse:
    _require_project_view_access(request, owner, project_name)
    try:
        return ProjectTeamsResponse(teams=list_project_teams(owner, project_name))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{owner}/{project_name}/team-candidates", response_model=ProjectTeamCandidatesResponse)
async def get_project_team_candidates(
    owner: str,
    project_name: str,
    request: Request,
    q: str = Query(default="", max_length=80),
    limit: int = Query(default=8, ge=1, le=20),
) -> ProjectTeamCandidatesResponse:
    current_user = _require_project_owner(request, owner)
    try:
        return ProjectTeamCandidatesResponse(
            teams=search_project_team_candidates(
                owner,
                project_name,
                session_user_id=str(current_user["id"]),
                session_username=str(current_user["username"]),
                role=str(current_user["role"]),
                query=q,
                limit=limit,
            )
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
        except ServiceError:
            member = None
    return ProjectMemberMutationResponse(success=success, message=message, member=member)


@router.put("/{owner}/{project_name}/teams/{team_id}", response_model=ProjectTeamMutationResponse)
async def put_project_team(
    owner: str,
    project_name: str,
    team_id: str,
    payload: ProjectTeamMutationRequest,
    request: Request,
) -> ProjectTeamMutationResponse:
    current_user = _require_project_owner(request, owner)
    try:
        success, message = add_project_team(
            owner,
            project_name,
            team_id,
            session_user_id=str(current_user["id"]),
            session_username=str(current_user["username"]),
            role=str(current_user["role"]),
            member_role=payload.member_role,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    team = None
    if success:
        try:
            team = next(
                (item for item in list_project_teams(owner, project_name) if item["id"] == team_id),
                None,
            )
        except ServiceError:
            team = None
    return ProjectTeamMutationResponse(success=success, message=message, team=team)


@router.post(
    "/{owner}/{project_name}/transfer/{username}",
    response_model=ProjectMutationResponse,
    response_model_exclude_none=True,
)
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


@router.delete("/{owner}/{project_name}/teams/{team_id}", response_model=ProjectTeamMutationResponse)
async def delete_project_team(
    owner: str,
    project_name: str,
    team_id: str,
    request: Request,
) -> ProjectTeamMutationResponse:
    _require_project_owner(request, owner)
    try:
        success, message = remove_project_team(owner, project_name, team_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ProjectTeamMutationResponse(success=success, message=message, team=None)


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
