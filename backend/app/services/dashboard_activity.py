from __future__ import annotations

from typing import Any, Literal

from backend.app.services.database import execute, fetch_all, fetch_one
from backend.app.services.errors import ServiceError

DashboardEventKind = Literal[
    "analysis_completed",
    "analysis_failed",
    "analysis_started",
    "project_created",
    "project_deleted",
    "project_updated",
]

ProjectDashboardEventKind = Literal[
    "project_created",
    "project_deleted",
    "project_updated",
]

AnalysisDashboardEventKind = Literal[
    "analysis_completed",
    "analysis_failed",
    "analysis_started",
]


def _get_profile_id_by_username(username: str) -> str | None:
    profile = fetch_one(
        """
        SELECT id, username
        FROM public.vw_profiles
        WHERE username = %s
        LIMIT 1
        """,
        (username,),
    )
    if not profile:
        return None

    profile_id = str(profile.get("id") or "").strip()
    return profile_id or None


def log_dashboard_event(
    kind: DashboardEventKind,
    *,
    actor_user_id: str | None,
    actor_username: str,
    description: str,
    project_name: str,
    project_owner_username: str,
    title: str,
    analysis_type: str | None = None,
    created_at: str | None = None,
    design_id: str | None = None,
) -> None:
    try:
        resolved_user_id = actor_user_id or _get_profile_id_by_username(actor_username)
        if not resolved_user_id:
            return

        payload = {
            "activity_type": kind,
            "description": description.strip(),
            "project_name": project_name.strip(),
            "project_owner_username": project_owner_username.strip(),
            "title": title.strip(),
            "user_id": resolved_user_id,
        }
        if analysis_type:
            payload["analysis_type"] = analysis_type
        if created_at:
            payload["created_at"] = created_at
        if design_id:
            payload["design_id"] = design_id

        execute(
            """
            INSERT INTO internal.dashboard_activity (
              user_id,
              activity_type,
              title,
              description,
              project_owner_username,
              project_name,
              analysis_type,
              design_id,
              created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, COALESCE(%s, now()))
            """,
            (
                payload["user_id"],
                payload["activity_type"],
                payload["title"],
                payload["description"],
                payload["project_owner_username"],
                payload["project_name"],
                payload.get("analysis_type"),
                payload.get("design_id"),
                payload.get("created_at"),
            ),
        )
    except ServiceError:
        # El dashboard conserva degradación sin bloquear el flujo principal.
        return


def list_dashboard_events(limit: int = 100) -> list[dict[str, Any]]:
    try:
        payload = fetch_all(
            """
            SELECT
              id,
              user_id,
              activity_type,
              title,
              description,
              project_owner_username,
              project_name,
              analysis_type,
              design_id,
              created_at
            FROM public.vw_dashboard_activity
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (limit,),
        )
    except ServiceError:
        return []

    if not isinstance(payload, list):
        return []
    return [item for item in payload if isinstance(item, dict)]


def log_project_dashboard_event(
    kind: ProjectDashboardEventKind,
    *,
    actor_user_id: str | None,
    actor_username: str,
    description: str,
    project_name: str,
    project_owner_username: str,
    title: str,
) -> None:
    log_dashboard_event(
        kind,
        actor_user_id=actor_user_id,
        actor_username=actor_username,
        description=description,
        project_name=project_name,
        project_owner_username=project_owner_username,
        title=title,
    )


def log_analysis_dashboard_event(
    kind: AnalysisDashboardEventKind,
    *,
    actor_username: str,
    analysis_type: str,
    description: str,
    design_id: str,
    project_name: str,
    project_owner_username: str,
    title: str,
) -> None:
    log_dashboard_event(
        kind,
        actor_user_id=None,
        actor_username=actor_username,
        analysis_type=analysis_type,
        description=description,
        design_id=design_id,
        project_name=project_name,
        project_owner_username=project_owner_username,
        title=title,
    )
