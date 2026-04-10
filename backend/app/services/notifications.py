from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from backend.app.services.database import execute, execute_rowcount, fetch_all, fetch_one, fetch_value
from backend.app.services.emailing import (
    build_absolute_frontend_url,
    get_email_user_context,
    send_notification_email,
)
from psycopg.errors import UndefinedTable

NotificationType = Literal[
    "analysis_completed",
    "analysis_failed",
    "project_access_changed",
    "project_ownership_transferred",
    "project_shared",
]

READ_NOTIFICATION_RETENTION_DAYS = 30


def _serialize_datetime(value: Any) -> str | None:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _normalize_notification(row: dict[str, Any]) -> dict[str, object]:
    return {
        "action_label": str(row.get("action_label") or "").strip() or None,
        "action_url": str(row.get("action_url") or "").strip() or None,
        "actor_display_name": str(row.get("actor_display_name") or "").strip() or None,
        "actor_user_id": str(row.get("actor_user_id") or "").strip() or None,
        "actor_username": str(row.get("actor_username") or "").strip() or None,
        "created_at": _serialize_datetime(row.get("created_at")),
        "id": int(row.get("id") or 0),
        "is_read": bool(row.get("is_read")),
        "message": str(row.get("message") or "").strip(),
        "project_id": str(row.get("project_id") or "").strip() or None,
        "project_name": str(row.get("project_name") or "").strip() or None,
        "project_owner_username": str(row.get("project_owner_username") or "").strip() or None,
        "project_slug": str(row.get("project_slug") or "").strip() or None,
        "read_at": _serialize_datetime(row.get("read_at")),
        "title": str(row.get("title") or "").strip(),
        "type": str(row.get("notification_type") or "").strip() or "project_shared",
        "user_id": str(row.get("user_id") or "").strip(),
    }


def list_notifications_for_user(user_id: str, limit: int = 20) -> list[dict[str, object]]:
    try:
        rows = fetch_all(
            """
            SELECT
              id,
              user_id,
              actor_user_id,
              actor_username,
              actor_display_name,
              project_id,
              project_name,
              project_slug,
              project_owner_username,
              notification_type,
              title,
              message,
              action_label,
              action_url,
              is_read,
              read_at,
              created_at
            FROM public.vw_notifications
            WHERE user_id = %s
            ORDER BY created_at DESC, id DESC
            LIMIT %s
            """,
            (user_id, limit),
        )
    except UndefinedTable:
        return []
    return [_normalize_notification(row) for row in rows]


def cleanup_stale_read_notifications(
    user_id: str,
    *,
    retention_days: int = READ_NOTIFICATION_RETENTION_DAYS,
) -> int:
    safe_retention_days = max(retention_days, 1)
    try:
        return execute_rowcount(
            """
            DELETE FROM internal.notifications
            WHERE user_id = %s
              AND is_read = true
              AND read_at IS NOT NULL
              AND read_at < now() - (%s * interval '1 day')
            """,
            (user_id, safe_retention_days),
        )
    except UndefinedTable:
        return 0


def get_unread_notification_count(user_id: str) -> int:
    try:
        unread_count = fetch_value(
            """
            SELECT count(*)
            FROM internal.notifications
            WHERE user_id = %s
              AND is_read = false
            """,
            (user_id,),
        )
    except UndefinedTable:
        return 0
    return int(unread_count or 0)


def mark_notification_read(user_id: str, notification_id: int) -> int:
    try:
        return execute_rowcount(
            """
            UPDATE internal.notifications
            SET
              is_read = true,
              read_at = COALESCE(read_at, now())
            WHERE id = %s
              AND user_id = %s
              AND is_read = false
            """,
            (notification_id, user_id),
        )
    except UndefinedTable:
        return 0


def mark_all_notifications_read(user_id: str) -> int:
    try:
        return execute_rowcount(
            """
            UPDATE internal.notifications
            SET
              is_read = true,
              read_at = COALESCE(read_at, now())
            WHERE user_id = %s
              AND is_read = false
            """,
            (user_id,),
        )
    except UndefinedTable:
        return 0


def create_notification(
    *,
    user_id: str,
    notification_type: NotificationType,
    title: str,
    message: str,
    action_label: str | None = None,
    action_url: str | None = None,
    actor_user_id: str | None = None,
    project_id: str | None = None,
) -> None:
    try:
        execute(
            """
            INSERT INTO internal.notifications (
              user_id,
              actor_user_id,
              project_id,
              notification_type,
              title,
              message,
              action_label,
              action_url
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user_id,
                actor_user_id,
                project_id,
                notification_type,
                title.strip(),
                message.strip(),
                action_label.strip() if action_label else None,
                action_url.strip() if action_url else None,
            ),
        )
    except UndefinedTable:
        return


def _build_project_action_url(project_slug: str | None, project_id: str | None) -> str | None:
    route_ref = (project_slug or "").strip() or (project_id or "").strip()
    if not route_ref:
        return None
    return f"/dashboard/projects/{route_ref}"


def _send_email_for_notification(
    *,
    user_id: str,
    title: str,
    message: str,
    action_label: str | None,
    action_url: str | None,
) -> None:
    recipient = get_email_user_context(user_id)
    if not recipient or not recipient.email_notifications:
        return

    send_notification_email(
        to_email=recipient.email,
        recipient_name=recipient.display_name,
        subject=f"ATOM · {title}",
        title=title,
        message=message,
        action_label=action_label,
        action_url=build_absolute_frontend_url(action_url) if action_url else None,
    )


def notify_project_shared(
    *,
    actor_user_id: str | None,
    actor_username: str,
    member_role: str,
    project_id: str | None,
    project_name: str,
    project_owner_username: str,
    project_slug: str | None,
    recipient_user_id: str,
    updated_existing_access: bool,
) -> None:
    role_label = {
        "editor": "editor",
        "viewer": "viewer",
    }.get(member_role.strip().lower(), "viewer")
    project_label = project_name.strip()
    notification_type: NotificationType = (
        "project_access_changed" if updated_existing_access else "project_shared"
    )
    title = (
        f"Permisos actualizados en {project_label}"
        if updated_existing_access
        else f"Proyecto compartido: {project_label}"
    )
    message = (
        f"{actor_username.strip()} ha actualizado tu acceso a {project_label} como {role_label}."
        if updated_existing_access
        else f"{actor_username.strip()} ha compartido contigo {project_label} como {role_label}."
    )
    action_label = "Abrir proyecto"
    action_url = _build_project_action_url(project_slug, project_id)
    create_notification(
        user_id=recipient_user_id,
        actor_user_id=actor_user_id,
        action_label=action_label,
        action_url=action_url,
        message=message,
        notification_type=notification_type,
        project_id=project_id,
        title=title,
    )
    _send_email_for_notification(
        user_id=recipient_user_id,
        title=title,
        message=message,
        action_label=action_label,
        action_url=action_url,
    )


def notify_project_ownership_transferred(
    *,
    actor_user_id: str | None,
    actor_username: str,
    project_id: str | None,
    project_name: str,
    project_slug: str | None,
    recipient_user_id: str,
) -> None:
    project_label = project_name.strip()
    title = f"Nueva propiedad sobre {project_label}"
    message = f"{actor_username.strip()} te ha transferido la propiedad de {project_label}."
    action_label = "Abrir proyecto"
    action_url = _build_project_action_url(project_slug, project_id)
    create_notification(
        user_id=recipient_user_id,
        actor_user_id=actor_user_id,
        action_label=action_label,
        action_url=action_url,
        message=message,
        notification_type="project_ownership_transferred",
        project_id=project_id,
        title=title,
    )
    _send_email_for_notification(
        user_id=recipient_user_id,
        title=title,
        message=message,
        action_label=action_label,
        action_url=action_url,
    )


def _get_project_owner_snapshot(project_id: str) -> dict[str, str] | None:
    try:
        row = fetch_one(
            """
            SELECT
              owner_id,
              owner_username,
              slug
            FROM public.vw_projects
            WHERE id = %s
            LIMIT 1
            """,
            (project_id,),
        )
    except UndefinedTable:
        return None
    if not row:
        return None
    owner_id = str(row.get("owner_id") or "").strip()
    owner_username = str(row.get("owner_username") or "").strip()
    if not owner_id or not owner_username:
        return None
    return {
        "owner_id": owner_id,
        "owner_username": owner_username,
        "project_slug": str(row.get("slug") or "").strip() or "",
    }


def notify_analysis_run_finished(
    run: dict[str, object],
    *,
    status: Literal["completed", "failed"],
) -> None:
    project_id = str(run.get("project_id") or "").strip()
    project_name = str(run.get("project_name") or "").strip()
    requested_by_user_id = str(run.get("requested_by_user_id") or "").strip()
    requested_by_username = str(run.get("requested_by_username") or "").strip()
    if not project_id or not project_name:
        return

    project_snapshot = _get_project_owner_snapshot(project_id)
    if not project_snapshot:
        return

    project_slug = project_snapshot["project_slug"] or None
    owner_user_id = project_snapshot["owner_id"]
    recipients = {owner_user_id}
    if requested_by_user_id:
        recipients.add(requested_by_user_id)

    successful_designs = int(run.get("successful_designs") or 0)
    failed_designs = int(run.get("failed_designs") or 0)
    processed_designs = int(run.get("processed_designs") or 0)
    total_designs = int(run.get("total_designs") or 0)

    if status == "completed":
        title = f"Ejecución finalizada en {project_name}"
        message = (
            f"La ejecución lanzada por {requested_by_username or project_snapshot['owner_username']} "
            f"ha terminado en {project_name}. "
            f"Procesados {processed_designs}/{total_designs} diseños, "
            f"{successful_designs} correctos y {failed_designs} con incidencias."
        )
        notification_type: NotificationType = "analysis_completed"
    else:
        error_message = str(run.get("error_message") or "").strip()
        title = f"Ejecución fallida en {project_name}"
        message = (
            f"La ejecución lanzada por {requested_by_username or project_snapshot['owner_username']} "
            f"ha fallado en {project_name}."
        )
        if error_message:
            message = f"{message} Motivo: {error_message}"
        notification_type = "analysis_failed"

    for recipient_user_id in recipients:
        action_label = "Ver proyecto"
        action_url = _build_project_action_url(project_slug, project_id)
        create_notification(
            user_id=recipient_user_id,
            action_label=action_label,
            action_url=action_url,
            message=message,
            notification_type=notification_type,
            project_id=project_id,
            title=title,
        )
        _send_email_for_notification(
            user_id=recipient_user_id,
            title=title,
            message=message,
            action_label=action_label,
            action_url=action_url,
        )
