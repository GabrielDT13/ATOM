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
                "example_files": 4,
                "pending_analysis": 1,
                "results_ready": 1,
                "total_files": 9,
                "total_projects": 2,
                "workflow_count": 4,
            },
            "activity_timeline": [
                {"completed_analyses": 1, "label": "Oct", "total_events": 2},
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
            "example_library": [
                {
                    "description": "Excel base para crear proyectos.",
                    "kind": "template",
                    "name": "template.xlsx",
                    "public_url": "/examples/template.xlsx",
                    "relative_path": "template.xlsx",
                    "size_bytes": 1024,
                    "title": "Plantilla pública",
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


def test_get_dashboard_overview_aggregates_projects_examples_and_workflows(
    isolated_app_env: dict[str, Path],
    monkeypatch,
) -> None:
    from backend.app.services import dashboard as dashboard_service

    project_root = isolated_app_env["projects_dir"].parent
    examples_dir = isolated_app_env["examples_dir"]
    (examples_dir / "manifest.json").write_text(
        """
{
  "quick_start_steps": [
    {
      "step": 1,
      "title": "Cargar plantilla base",
      "description": "Descarga la plantilla pública."
    },
    {
      "step": 2,
      "title": "Añadir datos de entrada",
      "description": "Sube el fichero de conteos."
    },
    {
      "step": 3,
      "title": "Ejecutar y revisar",
      "description": "Lanza el flujo y revisa el HTML."
    }
  ],
  "resources": [
    {
      "relative_path": "template.xlsx",
      "kind": "template",
      "title": "Plantilla pública",
      "description": "Excel base para configurar el proyecto."
    },
    {
      "relative_path": "counts_app_type_a.txt",
      "kind": "counts",
      "title": "Conteos públicos",
      "description": "Matriz de conteos pública."
    }
  ]
}
        """.strip(),
        encoding="utf-8",
    )
    (examples_dir / "template.xlsx").write_bytes(b"template")
    (examples_dir / "counts_app_type_a.txt").write_text("gene\tcount\nA\t4\n")

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

    monkeypatch.setattr(
        dashboard_service,
        "list_dashboard_events",
        lambda limit=100: [
            {
                "activity_type": "analysis_completed",
                "analysis_type": "rna-seq",
                "created_at": "2026-03-10T12:00:00+00:00",
                "description": "El análisis rna-seq.Rmd para D-001 terminó correctamente.",
                "design_id": "D-001",
                "project_name": "RNA Atlas",
                "project_owner_username": "researcher",
                "title": "Análisis completado en RNA Atlas",
            },
            {
                "activity_type": "analysis_started",
                "analysis_type": "rna-seq",
                "created_at": "2026-03-09T10:00:00+00:00",
                "description": "Se ha iniciado la ejecución de rna-seq.Rmd para D-001.",
                "design_id": "D-001",
                "project_name": "RNA Atlas",
                "project_owner_username": "researcher",
                "title": "Análisis iniciado en RNA Atlas",
            },
            {
                "activity_type": "project_created",
                "created_at": "2026-02-02T10:00:00+00:00",
                "description": "Se creó el proyecto RNA Atlas.",
                "design_id": None,
                "project_name": "RNA Atlas",
                "project_owner_username": "researcher",
                "title": "Proyecto creado: RNA Atlas",
            },
        ],
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
        "example_files": 2,
        "pending_analysis": 1,
        "results_ready": 1,
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
    march_point = next(point for point in overview["activity_timeline"] if point["label"] == "Mar")
    assert march_point == {
        "completed_analyses": 1,
        "label": "Mar",
        "total_events": 2,
    }
    assert overview["quick_start_steps"][0] == {
        "description": "Descarga la plantilla pública.",
        "step": 1,
        "title": "Cargar plantilla base",
    }
    assert overview["featured_projects"][0]["name"] == "RNA Atlas"
    assert overview["featured_projects"][0]["result_count"] == 1
    assert overview["workflows"][0]["key"] == "rna-seq"
    assert overview["example_library"][0]["title"] == "Plantilla pública"
    assert overview["example_library"][0]["description"] == "Excel base para configurar el proyecto."
    assert overview["example_library"][1]["name"] == "counts_app_type_a.txt"
    assert overview["example_library"][1]["public_url"] == "/examples/counts_app_type_a.txt"
    assert overview["recent_activity"][0]["kind"] == "analysis"
    assert overview["recent_activity"][0]["title"] == "Análisis completado en RNA Atlas"


def test_public_examples_catalog_uses_manifest_and_filters_missing_files(
    isolated_app_env: dict[str, Path],
) -> None:
    from backend.app.services.dashboard_examples import load_public_examples_catalog

    examples_dir = isolated_app_env["examples_dir"]
    (examples_dir / "manifest.json").write_text(
        """
{
  "quick_start_steps": [
    {
      "step": 1,
      "title": "Cargar plantilla",
      "description": "Usa la plantilla pública."
    }
  ],
  "resources": [
    {
      "relative_path": "template_publico.xlsx",
      "kind": "template",
      "title": "Plantilla visible",
      "description": "Archivo disponible."
    },
    {
      "relative_path": "missing.txt",
      "kind": "other",
      "title": "No visible",
      "description": "No debería salir."
    }
  ]
}
        """.strip(),
        encoding="utf-8",
    )
    (examples_dir / "template_publico.xlsx").write_bytes(b"template")

    catalog = load_public_examples_catalog()

    assert catalog["quick_start_steps"] == [
        {
            "description": "Usa la plantilla pública.",
            "step": 1,
            "title": "Cargar plantilla",
        }
    ]
    assert catalog["example_library"] == [
        {
            "description": "Archivo disponible.",
            "kind": "template",
            "name": "template_publico.xlsx",
            "public_url": "/examples/template_publico.xlsx",
            "relative_path": "template_publico.xlsx",
            "size_bytes": 8,
            "title": "Plantilla visible",
            "updated_at": catalog["example_library"][0]["updated_at"],
        }
    ]


def test_dashboard_activity_log_persists_and_orders_events(
    monkeypatch,
) -> None:
    from backend.app.services.dashboard_activity import list_dashboard_events, log_dashboard_event

    captured_events: list[dict[str, object]] = []

    def fake_request_with_service_role(method: str, path: str, *, json_body=None, schema=None):
        if method == "POST":
            captured_events.append(dict(json_body))
            return None

        return sorted(
            [
                {
                    "activity_type": item["activity_type"],
                    "analysis_type": item.get("analysis_type"),
                    "created_at": item["created_at"],
                    "description": item["description"],
                    "design_id": item.get("design_id"),
                    "id": index + 1,
                    "project_name": item["project_name"],
                    "project_owner_username": item["project_owner_username"],
                    "title": item["title"],
                    "user_id": item["user_id"],
                }
                for index, item in enumerate(captured_events)
            ],
            key=lambda item: item["created_at"],
            reverse=True,
        )

    monkeypatch.setattr(
        "backend.app.services.dashboard_activity.request_with_service_role",
        fake_request_with_service_role,
    )
    monkeypatch.setattr(
        "backend.app.services.dashboard_activity._get_profile_id_by_username",
        lambda username: "user-1",
    )

    log_dashboard_event(
        "project_created",
        actor_user_id="user-1",
        actor_username="researcher",
        created_at="2026-03-01T09:00:00+00:00",
        description="Se creó un proyecto.",
        project_name="Proyecto A",
        project_owner_username="researcher",
        title="Proyecto creado: Proyecto A",
    )
    log_dashboard_event(
        "analysis_completed",
        actor_user_id="user-1",
        actor_username="researcher",
        analysis_type="rna-seq",
        created_at="2026-03-02T10:00:00+00:00",
        description="El análisis terminó correctamente.",
        design_id="D-002",
        project_name="Proyecto A",
        project_owner_username="researcher",
        title="Análisis completado en Proyecto A",
    )

    events = list_dashboard_events()

    assert [event["activity_type"] for event in events] == [
        "analysis_completed",
        "project_created",
    ]
    assert events[0]["analysis_type"] == "rna-seq"
    assert events[0]["design_id"] == "D-002"
