from __future__ import annotations

from fastapi.testclient import TestClient


def test_get_departments_route_requires_admin_and_returns_departments(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import departments as department_routes

    monkeypatch.setattr(
        department_routes,
        "require_admin",
        lambda request: {"id": "11111111-1111-1111-1111-111111111111", "role": "admin"},
    )
    monkeypatch.setattr(
        department_routes,
        "list_departments",
        lambda: [
            {
                "id": "44444444-4444-4444-4444-444444444444",
                "name": "Bioinformática",
                "slug": "bioinformática",
            }
        ],
    )

    response = client.get("/api/departments")

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": "44444444-4444-4444-4444-444444444444",
            "name": "Bioinformática",
            "slug": "bioinformática",
        }
    ]
