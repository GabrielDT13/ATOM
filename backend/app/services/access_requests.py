from __future__ import annotations

from datetime import datetime
from typing import Any

from backend.app.services.database import execute, fetch_all, fetch_one
from backend.app.services.emailing import send_access_request_denied_email
from backend.app.services.notifications import notify_access_request_created
from backend.app.services.users import create_user, get_user_by_username
from psycopg.errors import UndefinedTable


def _serialize_datetime(value: Any) -> str | None:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _normalize_full_name(value: str) -> str:
    normalized = " ".join(value.strip().split())
    if len(normalized) < 3:
        raise ValueError("El nombre es obligatorio")
    return normalized


def _normalize_email(value: str) -> str:
    normalized = value.strip().lower()
    if not normalized or "@" not in normalized:
        raise ValueError("El email no es válido")
    return normalized


def _normalize_optional_text(value: Any) -> str | None:
    normalized = str(value or "").strip()
    return normalized or None


def _normalize_access_request(row: dict[str, Any]) -> dict[str, object]:
    return {
        "approved_display_name": _normalize_optional_text(row.get("approved_display_name")),
        "approved_user_id": _normalize_optional_text(row.get("approved_user_id")),
        "approved_username": _normalize_optional_text(row.get("approved_username")),
        "created_at": _serialize_datetime(row.get("created_at")),
        "email": str(row.get("email") or "").strip().lower(),
        "full_name": str(row.get("full_name") or "").strip(),
        "id": int(row.get("id") or 0),
        "reviewed_at": _serialize_datetime(row.get("reviewed_at")),
        "reviewed_by_display_name": _normalize_optional_text(row.get("reviewed_by_display_name")),
        "reviewed_by_user_id": _normalize_optional_text(row.get("reviewed_by_user_id")),
        "reviewed_by_username": _normalize_optional_text(row.get("reviewed_by_username")),
        "status": str(row.get("status") or "pending").strip(),
        "updated_at": _serialize_datetime(row.get("updated_at")),
    }


def _get_access_request_by_id(request_id: int) -> dict[str, object] | None:
    try:
        row = fetch_one(
            """
            SELECT *
            FROM public.vw_access_requests
            WHERE id = %s
            LIMIT 1
            """,
            (request_id,),
        )
    except UndefinedTable:
        return None

    if not row:
        return None
    return _normalize_access_request(row)


def _email_belongs_to_existing_user(email: str) -> bool:
    row = fetch_one(
        """
        SELECT 1
        FROM public.vw_profiles
        WHERE lower(email) = lower(%s)
        LIMIT 1
        """,
        (email,),
    )
    return row is not None


def _list_admin_user_ids() -> list[str]:
    rows = fetch_all(
        """
        SELECT p.id
        FROM internal.user_roles ur
        JOIN internal.profiles p
          ON p.id = ur.user_id
        WHERE ur.role_id = 'admin'
          AND COALESCE(p.is_active, true) = true
        ORDER BY p.created_at ASC
        """,
    )
    return [
        str(row.get("id") or "").strip()
        for row in rows
        if isinstance(row, dict) and str(row.get("id") or "").strip()
    ]


def list_access_requests() -> list[dict[str, object]]:
    try:
        rows = fetch_all(
            """
            SELECT *
            FROM public.vw_access_requests
            WHERE status IN ('pending', 'denied')
            ORDER BY
              CASE status
                WHEN 'pending' THEN 0
                ELSE 1
              END,
              created_at DESC,
              id DESC
            """,
        )
    except UndefinedTable:
        return []
    return [_normalize_access_request(row) for row in rows]


def create_access_request(full_name: str, email: str) -> tuple[bool, str, dict[str, object] | None]:
    try:
        normalized_full_name = _normalize_full_name(full_name)
        normalized_email = _normalize_email(email)
    except ValueError as exc:
        return False, str(exc), None

    if _email_belongs_to_existing_user(normalized_email):
        return False, "Ya existe una cuenta asociada a ese email", None

    existing_pending = fetch_one(
        """
        SELECT 1
        FROM internal.access_requests
        WHERE lower(email) = lower(%s)
          AND status = 'pending'
        LIMIT 1
        """,
        (normalized_email,),
    )
    if existing_pending:
        return False, "Ya existe una solicitud pendiente con ese email", None

    row = fetch_one(
        """
        INSERT INTO internal.access_requests (
          full_name,
          email
        )
        VALUES (%s, %s)
        RETURNING id
        """,
        (normalized_full_name, normalized_email),
    )
    if not row:
        return False, "No se pudo registrar la solicitud", None

    request_id = int(row.get("id") or 0)
    created_request = _get_access_request_by_id(request_id)
    if not created_request:
        return False, "No se pudo registrar la solicitud", None

    for admin_user_id in _list_admin_user_ids():
        notify_access_request_created(
            recipient_user_id=admin_user_id,
            request_email=normalized_email,
            request_id=request_id,
            requester_name=normalized_full_name,
        )

    return (
        True,
        "Solicitud enviada correctamente. Revisaremos tu acceso y te responderemos por correo.",
        created_request,
    )


def approve_access_request(
    request_id: int,
    *,
    actor_user_id: str,
    username: str,
    department: str | None = None,
    entity_name: str | None = None,
) -> tuple[bool, str, dict[str, object] | None, str | None]:
    access_request = _get_access_request_by_id(request_id)
    if not access_request:
        return False, "Solicitud no encontrada", None, None

    if access_request["status"] != "pending":
        return False, "La solicitud ya ha sido revisada", access_request, None

    success, message, temporary_password = create_user(
        username,
        str(access_request["email"]),
        "user",
        department,
        actor_user_id,
        entity_name=entity_name,
    )
    if not success:
        return False, message, access_request, None

    approved_user = get_user_by_username(username)
    execute(
        """
        UPDATE internal.access_requests
        SET
          status = 'approved',
          reviewed_by_user_id = %s,
          approved_user_id = %s,
          reviewed_at = now()
        WHERE id = %s
        """,
        (actor_user_id, approved_user["id"], request_id),
    )

    updated_request = _get_access_request_by_id(request_id)
    return True, "Solicitud aprobada y usuario creado correctamente", updated_request, temporary_password


def deny_access_request(
    request_id: int,
    *,
    actor_user_id: str,
) -> tuple[bool, str, dict[str, object] | None]:
    access_request = _get_access_request_by_id(request_id)
    if not access_request:
        return False, "Solicitud no encontrada", None

    if access_request["status"] != "pending":
        return False, "La solicitud ya ha sido revisada", access_request

    execute(
        """
        UPDATE internal.access_requests
        SET
          status = 'denied',
          reviewed_by_user_id = %s,
          reviewed_at = now()
        WHERE id = %s
        """,
        (actor_user_id, request_id),
    )

    send_access_request_denied_email(
        full_name=str(access_request["full_name"]),
        to_email=str(access_request["email"]),
    )

    updated_request = _get_access_request_by_id(request_id)
    return True, "Solicitud denegada correctamente", updated_request
