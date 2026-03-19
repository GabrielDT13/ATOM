from __future__ import annotations

from fastapi.testclient import TestClient


def test_get_sidebar_right_returns_project_shortcuts(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import navigation as navigation_routes

    monkeypatch.setattr(
        navigation_routes,
        "get_current_user",
        lambda request: {"id": "user-1", "username": "researcher", "role": "admin"},
    )
    monkeypatch.setattr(
        navigation_routes,
        "list_sidebar_projects_for_user",
        lambda session_user_id, session_username, role: {
            "items": [
                {
                    "access_role": "owner",
                    "can_run": True,
                    "file_count": 4,
                    "html_count": 1,
                    "id": "project-1",
                    "name": "RNA Atlas",
                    "owner": "researcher",
                    "route_ref": "researcher-rna-atlas",
                    "slug": "researcher-rna-atlas",
                    "status": "results",
                    "updated_at": "2026-03-16T09:00:00+00:00",
                }
            ],
            "title": "Proyectos",
        },
    )

    response = client.get("/api/navigation/sidebar-right")

    assert response.status_code == 200
    assert response.json() == {
        "items": [
            {
                "access_role": "owner",
                "can_run": True,
                "file_count": 4,
                "html_count": 1,
                "id": "project-1",
                "name": "RNA Atlas",
                "owner": "researcher",
                "route_ref": "researcher-rna-atlas",
                "slug": "researcher-rna-atlas",
                "status": "results",
                "updated_at": "2026-03-16T09:00:00+00:00",
            }
        ],
        "title": "Proyectos",
    }
