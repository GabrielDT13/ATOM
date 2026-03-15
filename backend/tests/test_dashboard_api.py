from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient


def test_get_dashboard_overview_route_returns_structured_payload(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import dashboard as dashboard_routes

    monkeypatch.setattr(
        dashboard_routes,
        "get_current_user",
        lambda request: {"id": "user-1", "username": "researcher", "role": "admin"},
    )
    monkeypatch.setattr(
        dashboard_routes,
        "get_dashboard_overview",
        lambda session_user_id, session_username, role: {
            "access_summary": {
                "editable_projects": 2,
                "owned_projects": 1,
                "shared_projects": 1,
            },
            "summary": {
                "completion_rate": 50,
                "distinct_owners": 2,
                "empty_projects": 0,
                "pending_analysis": 1,
                "results_ready": 1,
                "sample_files": 4,
                "total_files": 9,
                "total_projects": 2,
                "workflow_count": 4,
            },
            "activity_timeline": [
                {"label": "Oct", "results_ready": 1, "total_projects": 2},
            ],
            "file_breakdown": {
                "additional": 4,
                "results": 1,
                "templates": 2,
            },
            "status_breakdown": [
                {"label": "Resultados listos", "status": "results", "value": 1},
                {"label": "Pendientes de análisis", "status": "configured", "value": 1},
                {"label": "Sin archivos", "status": "empty", "value": 0},
            ],
            "featured_projects": [
                {
                    "access_role": "owner",
                    "file_count": 5,
                    "highlight_files": ["report/index.html", "template.xlsx"],
                    "name": "RNA Atlas",
                    "owner": "researcher",
                    "result_count": 1,
                    "status": "results",
                    "template_file": "template.xlsx",
                    "updated_at": "2026-03-15T10:00:00+00:00",
                }
            ],
            "recent_activity": [
                {
                    "created_at": "2026-03-15T10:00:00+00:00",
                    "description": "researcher dispone de 1 informe(s) HTML y 5 archivo(s) asociados.",
                    "kind": "result",
                    "title": "RNA Atlas listo para revisar",
                }
            ],
            "quick_start_steps": [
                {
                    "description": "Sube una de las plantillas al proyecto.",
                    "step": 1,
                    "title": "Cargar plantilla base",
                }
            ],
            "workflows": [
                {
                    "description": "Análisis de expresión diferencial y exploración de matrices de conteos.",
                    "image_path": "/images/RNA-seq_icon.png",
                    "key": "rna-seq",
                    "project_matches": 1,
                    "script_name": "rna-seq.Rmd",
                    "title": "RNA-seq",
                }
            ],
            "sample_library": [
                {
                    "kind": "template",
                    "name": "template.xlsx",
                    "relative_path": "template.xlsx",
                    "size_bytes": 1024,
                    "updated_at": "2026-03-15T09:00:00+00:00",
                }
            ],
        },
    )

    response = client.get("/api/dashboard/overview")

    assert response.status_code == 200
    assert response.json()["summary"]["total_projects"] == 2
    assert response.json()["access_summary"]["editable_projects"] == 2
    assert response.json()["workflows"][0]["key"] == "rna-seq"
    assert response.json()["featured_projects"][0]["name"] == "RNA Atlas"


def test_get_dashboard_overview_aggregates_projects_samples_and_workflows(
    isolated_app_env: dict[str, Path],
    monkeypatch,
) -> None:
    from backend.app.services import dashboard as dashboard_service

    project_root = isolated_app_env["projects_dir"].parent
    samples_dir = project_root / "samples"
    samples_dir.mkdir()
    (samples_dir / "template.xlsx").write_bytes(b"template")
    (samples_dir / "counts_app_type_a.txt").write_text("gene\tcount\nA\t4\n")

    r_scripts_dir = project_root / "r_scripts"
    (r_scripts_dir / "rna-seq.Rmd").write_text("---\ntitle: RNA\n---\n")
    (r_scripts_dir / "chip-seq.Rmd").write_text("---\ntitle: ChIP\n---\n")

    monkeypatch.setattr(
        dashboard_service,
        "list_projects_for_user",
        lambda session_user_id, session_username, role: {
            "items": [
                {
                    "access_role": "owner",
                    "additional_files": ["counts_app_type_a.txt"],
                    "created_at": "2026-02-05T10:00:00+00:00",
                    "file_count": 3,
                    "files": [
                        "counts_app_type_a.txt",
                        "report/index.html",
                        "template.xlsx",
                    ],
                    "html_files": ["report/index.html"],
                    "name": "RNA Atlas",
                    "owner": "researcher",
                    "status": "results",
                    "template_file": "template.xlsx",
                    "updated_at": "2026-03-10T10:00:00+00:00",
                },
                {
                    "access_role": "viewer",
                    "additional_files": ["peaks.bed"],
                    "created_at": "2026-01-10T09:00:00+00:00",
                    "file_count": 2,
                    "files": ["peaks.bed", "template.xlsx"],
                    "html_files": [],
                    "name": "Chromatin",
                    "owner": "shared-lab",
                    "status": "configured",
                    "template_file": "template.xlsx",
                    "updated_at": "2026-02-18T09:00:00+00:00",
                },
            ]
        },
    )

    overview = dashboard_service.get_dashboard_overview(
        session_user_id="user-1",
        session_username="researcher",
        role="user",
    )

    assert overview["summary"] == {
        "completion_rate": 50,
        "distinct_owners": 2,
        "empty_projects": 0,
        "pending_analysis": 1,
        "results_ready": 1,
        "sample_files": 2,
        "total_files": 5,
        "total_projects": 2,
        "workflow_count": 2,
    }
    assert overview["access_summary"] == {
        "editable_projects": 1,
        "owned_projects": 1,
        "shared_projects": 1,
    }
    assert overview["file_breakdown"] == {
        "additional": 2,
        "results": 1,
        "templates": 2,
    }
    assert overview["status_breakdown"][0] == {
        "label": "Resultados listos",
        "status": "results",
        "value": 1,
    }
    assert overview["quick_start_steps"][0]["step"] == 1
    assert overview["featured_projects"][0]["name"] == "RNA Atlas"
    assert overview["featured_projects"][0]["result_count"] == 1
    assert overview["workflows"][0]["key"] == "rna-seq"
    assert overview["sample_library"][0]["name"] == "counts_app_type_a.txt"
    assert overview["recent_activity"][0]["kind"] in {"project", "result", "sample"}
