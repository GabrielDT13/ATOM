from __future__ import annotations

from fastapi.testclient import TestClient


def test_get_entities_route_requires_authenticated_user_and_returns_entities(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import entities as entity_routes

    monkeypatch.setattr(
        entity_routes,
        "get_current_user",
        lambda request: {"id": "11111111-1111-1111-1111-111111111111", "role": "user"},
    )
    monkeypatch.setattr(
        entity_routes,
        "list_entities",
        lambda: [
            {
                "created_at": "2026-04-17T08:00:00+00:00",
                "id": "55555555-5555-5555-5555-555555555555",
                "name": "Universidad de Las Palmas de Gran Canaria",
                "project_count": 2,
                "slug": "universidad-de-las-palmas-de-gran-canaria",
                "team_count": 1,
                "user_count": 3,
            }
        ],
    )

    response = client.get("/api/entities")

    assert response.status_code == 200
    assert response.json() == [
        {
            "created_at": "2026-04-17T08:00:00+00:00",
            "id": "55555555-5555-5555-5555-555555555555",
            "name": "Universidad de Las Palmas de Gran Canaria",
            "project_count": 2,
            "slug": "universidad-de-las-palmas-de-gran-canaria",
            "team_count": 1,
            "user_count": 3,
        }
    ]


def test_post_entity_route_creates_entity_for_admin(client: TestClient, monkeypatch) -> None:
    from backend.app.api.routes import entities as entity_routes

    monkeypatch.setattr(
        entity_routes,
        "require_admin",
        lambda request: {"id": "admin-1", "role": "admin"},
    )
    monkeypatch.setattr(
        entity_routes,
        "create_entity",
        lambda name: (
            True,
            "Entidad creada correctamente",
            {
                "created_at": "2026-04-17T08:00:00+00:00",
                "id": "entity-1",
                "name": name,
                "project_count": 0,
                "slug": "universidad-de-la-laguna",
                "team_count": 0,
                "user_count": 0,
            },
        ),
    )

    response = client.post("/api/entities", json={"name": "Universidad de La Laguna"})

    assert response.status_code == 200
    assert response.json() == {
        "entity": {
            "created_at": "2026-04-17T08:00:00+00:00",
            "id": "entity-1",
            "name": "Universidad de La Laguna",
            "project_count": 0,
            "slug": "universidad-de-la-laguna",
            "team_count": 0,
            "user_count": 0,
        },
        "message": "Entidad creada correctamente",
        "success": True,
    }


def test_put_entity_route_updates_entity_for_admin(client: TestClient, monkeypatch) -> None:
    from backend.app.api.routes import entities as entity_routes

    monkeypatch.setattr(
        entity_routes,
        "require_admin",
        lambda request: {"id": "admin-1", "role": "admin"},
    )
    monkeypatch.setattr(
        entity_routes,
        "update_entity",
        lambda entity_id, name: (
            True,
            "Entidad actualizada correctamente",
            {
                "created_at": "2026-04-17T08:00:00+00:00",
                "id": entity_id,
                "name": name,
                "project_count": 1,
                "slug": "centro-nacional-de-genomica",
                "team_count": 1,
                "user_count": 2,
            },
        ),
    )

    response = client.put("/api/entities/entity-1", json={"name": "Centro Nacional de Genomica"})

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert response.json()["entity"]["id"] == "entity-1"
    assert response.json()["entity"]["name"] == "Centro Nacional de Genomica"


def test_delete_entity_route_removes_entity_for_admin(client: TestClient, monkeypatch) -> None:
    from backend.app.api.routes import entities as entity_routes

    monkeypatch.setattr(
        entity_routes,
        "require_admin",
        lambda request: {"id": "admin-1", "role": "admin"},
    )
    monkeypatch.setattr(
        entity_routes,
        "delete_entity",
        lambda entity_id: (True, "Entidad eliminada correctamente"),
    )

    response = client.delete("/api/entities/entity-1")

    assert response.status_code == 200
    assert response.json() == {
        "message": "Entidad eliminada correctamente",
        "success": True,
    }
