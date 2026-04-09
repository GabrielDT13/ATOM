from __future__ import annotations

from fastapi.testclient import TestClient


def test_create_analysis_run_route_creates_or_reuses_run(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import analysis as analysis_routes

    monkeypatch.setattr(
        analysis_routes,
        "get_current_user",
        lambda request: {"id": "user-1", "username": "researcher", "role": "user"},
    )
    monkeypatch.setattr(
        analysis_routes,
        "resolve_project_reference",
        lambda project_ref: {
            "id": "project-1",
            "name": "RNA Atlas",
            "owner_username": "researcher",
        },
    )

    def fake_create_or_reuse_analysis_run(
        *,
        project_id: str,
        requested_by_user_id: str,
        trigger_source: str = "manual",
    ):
        return (
            {
                "id": "run-1",
                "project_id": project_id,
                "project_name": "RNA Atlas",
                "project_owner_username": "researcher",
                "requested_by_user_id": requested_by_user_id,
                "requested_by_username": "researcher",
                "status": "queued",
                "total_designs": 0,
                "processed_designs": 0,
                "successful_designs": 0,
                "failed_designs": 0,
                "current_design_id": None,
                "current_analysis_type": None,
                "error_message": None,
                "trigger_source": trigger_source,
                "started_at": None,
                "finished_at": None,
                "created_at": "2026-04-05T10:00:00+00:00",
                "updated_at": "2026-04-05T10:00:00+00:00",
            },
            True,
        )

    monkeypatch.setattr(
        analysis_routes,
        "create_or_reuse_analysis_run",
        fake_create_or_reuse_analysis_run,
    )

    response = client.post("/api/analysis/runs", json={"project_ref": "researcher-rna-atlas"})

    assert response.status_code == 200
    assert response.json() == {
        "created": True,
        "run": {
            "id": "run-1",
            "project_id": "project-1",
            "project_name": "RNA Atlas",
            "project_owner_username": "researcher",
            "requested_by_user_id": "user-1",
            "requested_by_username": "researcher",
            "status": "queued",
            "total_designs": 0,
            "processed_designs": 0,
            "successful_designs": 0,
            "failed_designs": 0,
            "current_design_id": None,
            "current_analysis_type": None,
            "error_message": None,
            "trigger_source": "manual",
            "started_at": None,
            "finished_at": None,
            "created_at": "2026-04-05T10:00:00+00:00",
            "updated_at": "2026-04-05T10:00:00+00:00",
        },
    }


def test_get_analysis_run_logs_route_returns_persisted_events(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import analysis as analysis_routes

    monkeypatch.setattr(
        analysis_routes,
        "get_current_user",
        lambda request: {"id": "user-1", "username": "researcher", "role": "user"},
    )
    monkeypatch.setattr(
        analysis_routes,
        "get_analysis_run",
        lambda run_id: {
            "id": run_id,
            "project_id": "project-1",
            "project_name": "RNA Atlas",
            "project_owner_username": "researcher",
            "requested_by_user_id": "user-1",
            "requested_by_username": "researcher",
            "status": "running",
            "total_designs": 2,
            "processed_designs": 1,
            "successful_designs": 1,
            "failed_designs": 0,
            "current_design_id": "D-002",
            "current_analysis_type": "rna-seq",
            "error_message": None,
            "trigger_source": "manual",
            "started_at": "2026-04-05T10:00:00+00:00",
            "finished_at": None,
            "created_at": "2026-04-05T10:00:00+00:00",
            "updated_at": "2026-04-05T10:01:00+00:00",
        },
    )
    monkeypatch.setattr(
        analysis_routes,
        "list_analysis_run_events",
        lambda run_id, limit=500: [
            {
                "id": 1,
                "run_id": run_id,
                "event_type": "design_started",
                "level": "info",
                "message": "Running analysis for designID D-002 using rna-seq.Rmd",
                "analysis_type": "rna-seq",
                "design_id": "D-002",
                "current_index": 2,
                "total_designs": 2,
                "duration_seconds": None,
                "exit_code": None,
                "created_at": "2026-04-05T10:01:00+00:00",
            }
        ],
    )

    response = client.get("/api/analysis/runs/run-1/logs")

    assert response.status_code == 200
    assert response.json() == {
        "items": [
            {
                "id": 1,
                "run_id": "run-1",
                "event_type": "design_started",
                "level": "info",
                "message": "Running analysis for designID D-002 using rna-seq.Rmd",
                "analysis_type": "rna-seq",
                "design_id": "D-002",
                "current_index": 2,
                "total_designs": 2,
                "duration_seconds": None,
                "exit_code": None,
                "created_at": "2026-04-05T10:01:00+00:00",
            }
        ]
    }
