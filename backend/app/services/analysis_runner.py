from __future__ import annotations

from backend.app.services.analysis import (
    iter_analysis_events,
    parse_analysis_variant_from_trigger_source,
)
from backend.app.services.analysis_runs import (
    append_analysis_run_event,
    get_analysis_run,
    mark_analysis_run_finished,
    update_analysis_run_progress,
)
from backend.app.services.notifications import notify_analysis_run_finished


def _should_notify_for_run(run: dict[str, object]) -> bool:
    trigger_source = str(run.get("trigger_source") or "").strip().lower()
    if not trigger_source:
        return True

    parts = [part.strip() for part in trigger_source.split(":") if part.strip()]
    for part in parts[2:]:
        if part == "notify=0":
            return False
        if part == "notify=1":
            return True
    return True


def execute_analysis_run(run_id: str) -> None:
    run = get_analysis_run(run_id)
    if not run:
        raise FileNotFoundError("Ejecución no encontrada")

    project_owner_username = str(run.get("project_owner_username") or "").strip()
    project_name = str(run.get("project_name") or "").strip()
    actor_username = str(run.get("requested_by_username") or "").strip() or project_owner_username
    preferred_variant = parse_analysis_variant_from_trigger_source(
        str(run.get("trigger_source") or "").strip() or None
    )

    successful_designs = int(run.get("successful_designs") or 0)
    failed_designs = int(run.get("failed_designs") or 0)
    processed_designs = int(run.get("processed_designs") or 0)

    try:
        iter_kwargs = {"actor_username": actor_username}
        if preferred_variant:
            iter_kwargs["preferred_variant"] = preferred_variant

        for event in iter_analysis_events(
            project_owner_username,
            project_name,
            **iter_kwargs,
        ):
            append_analysis_run_event(run_id, event)

            event_type = str(event.get("type") or "log").strip().lower()
            total_designs = int(event.get("total_designs") or 0) if event.get("total_designs") is not None else None

            if event_type == "run_started":
                update_analysis_run_progress(run_id, total_designs=total_designs or 0)
                continue

            if event_type == "design_started":
                update_analysis_run_progress(
                    run_id,
                    current_analysis_type=str(event.get("analysis_type") or "").strip() or None,
                    current_design_id=str(event.get("design_id") or "").strip() or None,
                    total_designs=total_designs,
                )
                continue

            if event_type == "design_completed":
                processed_designs += 1
                successful_designs += 1
                update_analysis_run_progress(
                    run_id,
                    current_analysis_type=str(event.get("analysis_type") or "").strip() or None,
                    current_design_id=str(event.get("design_id") or "").strip() or None,
                    processed_designs=processed_designs,
                    successful_designs=successful_designs,
                    total_designs=total_designs,
                )
                continue

            if event_type == "design_failed":
                processed_designs += 1
                failed_designs += 1
                update_analysis_run_progress(
                    run_id,
                    current_analysis_type=str(event.get("analysis_type") or "").strip() or None,
                    current_design_id=str(event.get("design_id") or "").strip() or None,
                    failed_designs=failed_designs,
                    processed_designs=processed_designs,
                    total_designs=total_designs,
                )
                continue

            if event_type == "run_completed":
                update_analysis_run_progress(
                    run_id,
                    failed_designs=failed_designs,
                    processed_designs=processed_designs,
                    successful_designs=successful_designs,
                    total_designs=total_designs,
                )
                mark_analysis_run_finished(run_id, status="completed")
                completed_run = get_analysis_run(run_id)
                if completed_run and _should_notify_for_run(completed_run):
                    notify_analysis_run_finished(completed_run, status="completed")
                return

            if event_type == "run_failed":
                update_analysis_run_progress(
                    run_id,
                    error_message=str(event.get("message") or "").strip() or None,
                    failed_designs=failed_designs,
                    processed_designs=processed_designs,
                    successful_designs=successful_designs,
                    total_designs=total_designs,
                )
                mark_analysis_run_finished(
                    run_id,
                    error_message=str(event.get("message") or "").strip() or None,
                    status="failed",
                )
                failed_run = get_analysis_run(run_id)
                if failed_run and _should_notify_for_run(failed_run):
                    notify_analysis_run_finished(failed_run, status="failed")
                return

        mark_analysis_run_finished(run_id, status="completed")
        completed_run = get_analysis_run(run_id)
        if completed_run and _should_notify_for_run(completed_run):
            notify_analysis_run_finished(completed_run, status="completed")
    except Exception as exc:
        payload = {
            "type": "run_failed",
            "level": "error",
            "message": f"Fallo inesperado del worker: {exc}",
        }
        append_analysis_run_event(run_id, payload)
        mark_analysis_run_finished(run_id, error_message=str(exc), status="failed")
        failed_run = get_analysis_run(run_id)
        if failed_run and _should_notify_for_run(failed_run):
            notify_analysis_run_finished(failed_run, status="failed")
