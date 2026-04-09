from __future__ import annotations

from backend.app.services import analysis_runner


def test_execute_analysis_run_notifies_on_completion(monkeypatch) -> None:
    appended_events: list[dict[str, object]] = []
    notifications: list[tuple[dict[str, object], str]] = []

    monkeypatch.setattr(
        analysis_runner,
        "get_analysis_run",
        lambda run_id: {
            "id": run_id,
            "project_id": "project-1",
            "project_name": "RNA Atlas",
            "project_owner_username": "researcher",
            "requested_by_user_id": "user-1",
            "requested_by_username": "researcher",
            "successful_designs": 1,
            "failed_designs": 0,
            "processed_designs": 1,
            "total_designs": 1,
        },
    )
    monkeypatch.setattr(
        analysis_runner,
        "iter_analysis_events",
        lambda project_owner_username, project_name, actor_username: iter(
            [
                {"type": "run_started", "total_designs": 1},
                {
                    "type": "design_completed",
                    "analysis_type": "rna-seq",
                    "design_id": "D-1",
                    "total_designs": 1,
                },
                {"type": "run_completed", "total_designs": 1},
            ]
        ),
    )
    monkeypatch.setattr(analysis_runner, "append_analysis_run_event", lambda run_id, payload: appended_events.append(payload))
    monkeypatch.setattr(analysis_runner, "update_analysis_run_progress", lambda *args, **kwargs: None)
    monkeypatch.setattr(analysis_runner, "mark_analysis_run_finished", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        analysis_runner,
        "notify_analysis_run_finished",
        lambda run, status: notifications.append((run, status)),
    )

    analysis_runner.execute_analysis_run("run-1")

    assert appended_events[-1]["type"] == "run_completed"
    assert notifications == [
        (
            {
                "id": "run-1",
                "project_id": "project-1",
                "project_name": "RNA Atlas",
                "project_owner_username": "researcher",
                "requested_by_user_id": "user-1",
                "requested_by_username": "researcher",
                "successful_designs": 1,
                "failed_designs": 0,
                "processed_designs": 1,
                "total_designs": 1,
            },
            "completed",
        )
    ]


def test_execute_analysis_run_notifies_on_failure(monkeypatch) -> None:
    notifications: list[tuple[dict[str, object], str]] = []

    monkeypatch.setattr(
        analysis_runner,
        "get_analysis_run",
        lambda run_id: {
            "id": run_id,
            "project_id": "project-1",
            "project_name": "RNA Atlas",
            "project_owner_username": "researcher",
            "requested_by_user_id": "user-1",
            "requested_by_username": "researcher",
            "successful_designs": 0,
            "failed_designs": 1,
            "processed_designs": 1,
            "total_designs": 1,
            "error_message": "template missing",
        },
    )
    monkeypatch.setattr(
        analysis_runner,
        "iter_analysis_events",
        lambda project_owner_username, project_name, actor_username: iter(
            [
                {"type": "run_started", "total_designs": 1},
                {"type": "run_failed", "message": "template missing", "total_designs": 1},
            ]
        ),
    )
    monkeypatch.setattr(analysis_runner, "append_analysis_run_event", lambda *args, **kwargs: None)
    monkeypatch.setattr(analysis_runner, "update_analysis_run_progress", lambda *args, **kwargs: None)
    monkeypatch.setattr(analysis_runner, "mark_analysis_run_finished", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        analysis_runner,
        "notify_analysis_run_finished",
        lambda run, status: notifications.append((run, status)),
    )

    analysis_runner.execute_analysis_run("run-1")

    assert notifications == [
        (
            {
                "id": "run-1",
                "project_id": "project-1",
                "project_name": "RNA Atlas",
                "project_owner_username": "researcher",
                "requested_by_user_id": "user-1",
                "requested_by_username": "researcher",
                "successful_designs": 0,
                "failed_designs": 1,
                "processed_designs": 1,
                "total_designs": 1,
                "error_message": "template missing",
            },
            "failed",
        )
    ]
