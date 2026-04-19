from __future__ import annotations

from backend.app.dependencies.auth import get_current_user
from backend.app.schemas.teams import (
    TeamCollectionResponse,
    TeamMemberCandidatesResponse,
    TeamMutationRequest,
    TeamMutationResponse,
    TeamResponse,
)
from backend.app.services.teams import (
    create_team,
    delete_team,
    get_team_details,
    list_teams_for_user,
    search_team_member_candidates,
    update_team,
)
from fastapi import APIRouter, HTTPException, Query, Request

router = APIRouter(prefix="/api/teams", tags=["teams"])


@router.get("", response_model=TeamCollectionResponse, response_model_exclude_none=True)
async def get_teams(request: Request) -> TeamCollectionResponse:
    current_user = get_current_user(request)
    return TeamCollectionResponse(
        items=list_teams_for_user(
            str(current_user["id"]),
            str(current_user["username"]),
            str(current_user["role"]),
        )
    )


@router.get("/member-candidates", response_model=TeamMemberCandidatesResponse, response_model_exclude_none=True)
async def get_team_member_candidates(
    request: Request,
    q: str = Query(default="", max_length=80),
    limit: int = Query(default=8, ge=1, le=20),
    exclude_usernames: list[str] = Query(default=[]),
) -> TeamMemberCandidatesResponse:
    current_user = get_current_user(request)
    return TeamMemberCandidatesResponse(
        users=search_team_member_candidates(
            session_user_id=str(current_user["id"]),
            query=q,
            limit=limit,
            exclude_usernames=exclude_usernames,
        )
    )


@router.get("/{team_id}", response_model=TeamResponse, response_model_exclude_none=True)
async def get_team(team_id: str, request: Request) -> TeamResponse:
    current_user = get_current_user(request)
    try:
        return TeamResponse(
            **get_team_details(
                team_id,
                str(current_user["id"]),
                str(current_user["username"]),
                str(current_user["role"]),
            )
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("", response_model=TeamMutationResponse, response_model_exclude_none=True)
async def post_team(payload: TeamMutationRequest, request: Request) -> TeamMutationResponse:
    current_user = get_current_user(request)
    success, message, team_id = create_team(
        actor_user_id=str(current_user["id"]),
        actor_username=str(current_user["username"]),
        name=payload.name,
        entity_name=payload.entity_name,
        member_usernames=payload.member_usernames,
    )
    team = None
    if success and team_id:
        team = TeamResponse(
            **get_team_details(
                team_id,
                str(current_user["id"]),
                str(current_user["username"]),
                str(current_user["role"]),
            )
        )
    return TeamMutationResponse(success=success, message=message, team=team)


@router.put("/{team_id}", response_model=TeamMutationResponse, response_model_exclude_none=True)
async def put_team(team_id: str, payload: TeamMutationRequest, request: Request) -> TeamMutationResponse:
    current_user = get_current_user(request)
    success, message = update_team(
        team_id=team_id,
        actor_user_id=str(current_user["id"]),
        actor_username=str(current_user["username"]),
        role=str(current_user["role"]),
        name=payload.name,
        entity_name=payload.entity_name,
        member_usernames=payload.member_usernames,
    )
    team = None
    if success:
        team = TeamResponse(
            **get_team_details(
                team_id,
                str(current_user["id"]),
                str(current_user["username"]),
                str(current_user["role"]),
            )
        )
    return TeamMutationResponse(success=success, message=message, team=team)


@router.delete("/{team_id}", response_model=TeamMutationResponse, response_model_exclude_none=True)
async def remove_team(team_id: str, request: Request) -> TeamMutationResponse:
    current_user = get_current_user(request)
    success, message = delete_team(
        team_id=team_id,
        actor_user_id=str(current_user["id"]),
        actor_username=str(current_user["username"]),
        role=str(current_user["role"]),
    )
    return TeamMutationResponse(success=success, message=message, team=None)
