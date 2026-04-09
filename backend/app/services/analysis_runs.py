from __future__ import annotations

from datetime import datetime
from time import sleep
from typing import Any, Literal

from backend.app.services.database import (
    execute,
    execute_returning,
    fetch_all,
    fetch_one,
    get_db_connection,
)
from psycopg.errors import UndefinedTable

AnalysisRunStatus = Literal["queued", "running", "completed", "failed", "cancelled"]

ACTIVE_ANALYSIS_RUN_STATUSES: tuple[AnalysisRunStatus, ...] = ("queued", "running")


def _serialize_datetime(value: Any) -> str | None:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _normalize_analysis_run(row: dict[str, Any] | None) -> dict[str, object] | None:
    if not row:
        return None

    return {
        "created_at": _serialize_datetime(row.get("created_at")),
        "current_analysis_type": str(row.get("current_analysis_type") or "").strip() or None,
        "current_design_id": str(row.get("current_design_id") or "").strip() or None,
        "error_message": str(row.get("error_message") or "").strip() or None,
        "failed_designs": int(row.get("failed_designs") or 0),
        "finished_at": _serialize_datetime(row.get("finished_at")),
        "id": str(row.get("id") or "").strip(),
        "processed_designs": int(row.get("processed_designs") or 0),
        "project_id": str(row.get("project_id") or "").strip(),
        "project_name": str(row.get("project_name") or "").strip(),
        "project_owner_username": str(row.get("project_owner_username") or "").strip(),
        "requested_by_user_id": str(row.get("requested_by_user_id") or "").strip(),
        "requested_by_username": str(row.get("requested_by_username") or "").strip(),
        "started_at": _serialize_datetime(row.get("started_at")),
        "status": str(row.get("status") or "queued").strip().lower() or "queued",
        "successful_designs": int(row.get("successful_designs") or 0),
        "total_designs": int(row.get("total_designs") or 0),
        "trigger_source": str(row.get("trigger_source") or "manual").strip() or "manual",
        "updated_at": _serialize_datetime(row.get("updated_at")),
    }


def _normalize_analysis_run_event(row: dict[str, Any]) -> dict[str, object]:
    return {
        "analysis_type": str(row.get("analysis_type") or "").strip() or None,
        "created_at": _serialize_datetime(row.get("created_at")),
        "current_index": int(row.get("current_index")) if row.get("current_index") is not None else None,
        "design_id": str(row.get("design_id") or "").strip() or None,
        "duration_seconds": float(row.get("duration_seconds")) if row.get("duration_seconds") is not None else None,
        "event_type": str(row.get("event_type") or "").strip() or "log",
        "exit_code": int(row.get("exit_code")) if row.get("exit_code") is not None else None,
        "id": int(row.get("id") or 0),
        "level": str(row.get("level") or "info").strip().lower() or "info",
        "message": str(row.get("message") or "").strip(),
        "run_id": str(row.get("run_id") or "").strip(),
        "total_designs": int(row.get("total_designs")) if row.get("total_designs") is not None else None,
    }


def _fetch_analysis_run_query() -> str:
    return """
    SELECT
      ar.id,
      ar.project_id,
      p.name AS project_name,
      owner_profile.username AS project_owner_username,
      ar.requested_by_user_id,
      requester_profile.username AS requested_by_username,
      ar.status,
      ar.total_designs,
      ar.processed_designs,
      ar.successful_designs,
      ar.failed_designs,
      ar.current_design_id,
      ar.current_analysis_type,
      ar.error_message,
      ar.trigger_source,
      ar.started_at,
      ar.finished_at,
      ar.created_at,
      ar.updated_at
    FROM internal.analysis_runs ar
    JOIN internal.projects p
      ON p.id = ar.project_id
    JOIN internal.profiles owner_profile
      ON owner_profile.id = p.owner_id
    JOIN internal.profiles requester_profile
      ON requester_profile.id = ar.requested_by_user_id
    """


def get_analysis_run(run_id: str) -> dict[str, object] | None:
    try:
        row = fetch_one(
            _fetch_analysis_run_query() + """
            WHERE ar.id = %s
            LIMIT 1
            """,
            (run_id,),
        )
    except UndefinedTable:
        return None
    return _normalize_analysis_run(row)


def get_latest_active_analysis_run_for_project(project_id: str) -> dict[str, object] | None:
    try:
        row = fetch_one(
            _fetch_analysis_run_query() + """
            WHERE ar.project_id = %s
              AND ar.status = ANY(%s)
            ORDER BY ar.created_at DESC
            LIMIT 1
            """,
            (project_id, list(ACTIVE_ANALYSIS_RUN_STATUSES)),
        )
    except UndefinedTable:
        return None
    return _normalize_analysis_run(row)


def list_analysis_runs_for_project(project_id: str, limit: int = 20) -> list[dict[str, object]]:
    try:
        rows = fetch_all(
            _fetch_analysis_run_query() + """
            WHERE ar.project_id = %s
            ORDER BY ar.created_at DESC
            LIMIT %s
            """,
            (project_id, limit),
        )
    except UndefinedTable:
        return []
    return [normalized for row in rows if (normalized := _normalize_analysis_run(row))]


def list_active_analysis_runs_for_projects(project_ids: list[str]) -> dict[str, dict[str, object]]:
    normalized_ids = [project_id.strip() for project_id in project_ids if project_id and project_id.strip()]
    if not normalized_ids:
        return {}

    try:
        rows = fetch_all(
            _fetch_analysis_run_query() + """
            WHERE ar.project_id = ANY(%s)
              AND ar.status = ANY(%s)
            ORDER BY ar.created_at DESC
            """,
            (normalized_ids, list(ACTIVE_ANALYSIS_RUN_STATUSES)),
        )
    except UndefinedTable:
        return {}

    indexed: dict[str, dict[str, object]] = {}
    for row in rows:
        normalized = _normalize_analysis_run(row)
        if not normalized:
            continue
        project_id = str(normalized.get("project_id") or "").strip()
        if project_id and project_id not in indexed:
            indexed[project_id] = normalized
    return indexed


def create_or_reuse_analysis_run(
    *,
    project_id: str,
    requested_by_user_id: str,
    trigger_source: str = "manual",
) -> tuple[dict[str, object], bool]:
    active_run = get_latest_active_analysis_run_for_project(project_id)
    if active_run:
        return active_run, False

    try:
        rows = execute_returning(
            """
            INSERT INTO internal.analysis_runs (
              project_id,
              requested_by_user_id,
              status,
              trigger_source
            )
            VALUES (%s, %s, 'queued', %s)
            RETURNING id
            """,
            (project_id, requested_by_user_id, trigger_source),
        )
    except UndefinedTable as exc:
        raise RuntimeError(
            "La base de datos no tiene las tablas de ejecuciones asíncronas. "
            "Recrea o resetea la base local y vuelve a levantar el stack."
        ) from exc
    run_id = str((rows[0] if rows else {}).get("id") or "").strip()
    if not run_id:
        raise RuntimeError("No se pudo crear la ejecución")

    created = get_analysis_run(run_id)
    if not created:
        raise RuntimeError("No se pudo recuperar la ejecución creada")

    return created, True


def list_analysis_run_events(run_id: str, limit: int = 500) -> list[dict[str, object]]:
    try:
        rows = fetch_all(
            """
            SELECT
              id,
              run_id,
              event_type,
              level,
              message,
              analysis_type,
              design_id,
              current_index,
              total_designs,
              duration_seconds,
              exit_code,
              created_at
            FROM internal.analysis_run_logs
            WHERE run_id = %s
            ORDER BY created_at ASC, id ASC
            LIMIT %s
            """,
            (run_id, limit),
        )
    except UndefinedTable:
        return []
    return [_normalize_analysis_run_event(row) for row in rows]


def append_analysis_run_event(
    run_id: str,
    payload: dict[str, object],
) -> None:
    execute(
        """
        INSERT INTO internal.analysis_run_logs (
          run_id,
          event_type,
          level,
          message,
          analysis_type,
          design_id,
          current_index,
          total_designs,
          duration_seconds,
          exit_code
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            run_id,
            str(payload.get("type") or "log"),
            str(payload.get("level") or "info"),
            str(payload.get("message") or "").strip(),
            str(payload.get("analysis_type") or "").strip() or None,
            str(payload.get("design_id") or "").strip() or None,
            payload.get("current_index"),
            payload.get("total_designs"),
            payload.get("duration_seconds"),
            payload.get("exit_code"),
        ),
    )


def update_analysis_run_totals(run_id: str, *, total_designs: int) -> None:
    execute(
        """
        UPDATE internal.analysis_runs
        SET total_designs = %s
        WHERE id = %s
        """,
        (total_designs, run_id),
    )


def update_analysis_run_progress(
    run_id: str,
    *,
    current_analysis_type: str | None = None,
    current_design_id: str | None = None,
    error_message: str | None = None,
    failed_designs: int | None = None,
    processed_designs: int | None = None,
    status: AnalysisRunStatus | None = None,
    successful_designs: int | None = None,
    total_designs: int | None = None,
) -> None:
    assignments: list[str] = []
    params: list[Any] = []

    def add_assignment(column: str, value: Any) -> None:
        assignments.append(f"{column} = %s")
        params.append(value)

    if current_analysis_type is not None:
        add_assignment("current_analysis_type", current_analysis_type or None)
    if current_design_id is not None:
        add_assignment("current_design_id", current_design_id or None)
    if error_message is not None:
        add_assignment("error_message", error_message or None)
    if failed_designs is not None:
        add_assignment("failed_designs", failed_designs)
    if processed_designs is not None:
        add_assignment("processed_designs", processed_designs)
    if status is not None:
        add_assignment("status", status)
    if successful_designs is not None:
        add_assignment("successful_designs", successful_designs)
    if total_designs is not None:
        add_assignment("total_designs", total_designs)

    if not assignments:
        return

    params.append(run_id)
    execute(
        f"""
        UPDATE internal.analysis_runs
        SET {", ".join(assignments)}
        WHERE id = %s
        """,
        tuple(params),
    )


def mark_analysis_run_finished(
    run_id: str,
    *,
    error_message: str | None = None,
    status: Literal["completed", "failed", "cancelled"],
) -> None:
    execute(
        """
        UPDATE internal.analysis_runs
        SET
          status = %s,
          current_design_id = NULL,
          current_analysis_type = NULL,
          error_message = %s,
          finished_at = now()
        WHERE id = %s
        """,
        (status, error_message, run_id),
    )


def claim_next_analysis_run() -> dict[str, object] | None:
    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    WITH next_run AS (
                      SELECT ar.id
                      FROM internal.analysis_runs ar
                      WHERE ar.status = 'queued'
                      ORDER BY ar.created_at ASC
                      FOR UPDATE SKIP LOCKED
                      LIMIT 1
                    )
                    UPDATE internal.analysis_runs ar
                    SET
                      status = 'running',
                      started_at = COALESCE(ar.started_at, now()),
                      error_message = NULL
                    FROM next_run
                    WHERE ar.id = next_run.id
                    RETURNING ar.id
                    """
                )
                row = cursor.fetchone()
            connection.commit()
    except UndefinedTable:
        return None

    if not row:
        return None

    run_id = str(row.get("id") or "").strip()
    return get_analysis_run(run_id) if run_id else None


def build_analysis_stream_event(event: dict[str, object]) -> dict[str, object]:
    payload: dict[str, object] = {
        "timestamp": event.get("created_at"),
        "type": event.get("event_type") or "log",
    }

    for source, target in (
        ("analysis_type", "analysis_type"),
        ("current_index", "current_index"),
        ("design_id", "design_id"),
        ("duration_seconds", "duration_seconds"),
        ("exit_code", "exit_code"),
        ("level", "level"),
        ("message", "message"),
        ("total_designs", "total_designs"),
    ):
        value = event.get(source)
        if value is not None:
            payload[target] = value

    return payload


def wait_for_analysis_run(poll_seconds: float) -> dict[str, object]:
    while True:
        claimed = claim_next_analysis_run()
        if claimed:
            return claimed
        sleep(max(poll_seconds, 0.2))
