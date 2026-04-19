from __future__ import annotations

from uuid import UUID


def test_list_entities_normalizes_postgres_uuid_values(monkeypatch) -> None:
    from backend.app.services import entities as entities_service

    monkeypatch.setattr(
        entities_service,
        "fetch_all",
        lambda query, params=(): [
            {
                "created_at": "2026-04-17T08:00:00+00:00",
                "id": UUID("55555555-5555-5555-5555-555555555555"),
                "name": "Universidad de Las Palmas de Gran Canaria",
                "project_count": 2,
                "slug": "universidad-de-las-palmas-de-gran-canaria",
                "team_count": 1,
                "user_count": 3,
            }
        ],
    )

    payload = entities_service.list_entities()

    assert payload == [
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


def test_create_entity_inserts_new_row(monkeypatch) -> None:
    from backend.app.services import entities as entities_service

    executed: list[tuple[str, tuple[object, ...]]] = []
    lookups = iter(
        [
            None,
            {
                "id": "entity-1",
                "name": "Universidad de La Laguna",
                "slug": "universidad-de-la-laguna",
            },
        ]
    )

    monkeypatch.setattr(
        entities_service,
        "_generate_entity_slug",
        lambda name, current_entity_id=None: "universidad-de-la-laguna",
    )
    monkeypatch.setattr(
        entities_service,
        "execute",
        lambda query, params=(): executed.append((query, params)),
    )
    monkeypatch.setattr(
        entities_service,
        "_find_entity_by_name",
        lambda name: next(lookups),
    )
    monkeypatch.setattr(
        entities_service,
        "_get_entity_record",
        lambda entity_id: {
            "created_at": "2026-04-17T08:00:00+00:00",
            "id": entity_id,
            "name": "Universidad de La Laguna",
            "project_count": 0,
            "slug": "universidad-de-la-laguna",
            "team_count": 0,
            "user_count": 0,
        },
    )

    success, message, entity = entities_service.create_entity("Universidad de La Laguna")

    assert success is True
    assert message == "Entidad creada correctamente"
    assert entity is not None
    assert entity["id"] == "entity-1"
    assert len(executed) == 1
    assert "INSERT INTO internal.entities" in executed[0][0]


def test_update_entity_updates_name_and_slug(monkeypatch) -> None:
    from backend.app.services import entities as entities_service

    executed: list[tuple[str, tuple[object, ...]]] = []
    records = iter(
        [
            {
                "id": "entity-1",
                "name": "Entidad Antigua",
                "slug": "entidad-antigua",
            },
            {
                "created_at": "2026-04-17T08:00:00+00:00",
                "id": "entity-1",
                "name": "Entidad Nueva",
                "project_count": 1,
                "slug": "entidad-nueva",
                "team_count": 0,
                "user_count": 2,
            },
        ]
    )

    monkeypatch.setattr(
        entities_service,
        "_get_entity_record",
        lambda entity_id: next(records),
    )
    monkeypatch.setattr(entities_service, "_find_entity_by_name", lambda name: None)
    monkeypatch.setattr(
        entities_service,
        "_generate_entity_slug",
        lambda name, current_entity_id=None: "entidad-nueva",
    )
    monkeypatch.setattr(
        entities_service,
        "execute",
        lambda query, params=(): executed.append((query, params)),
    )
    success, message, entity = entities_service.update_entity("entity-1", "Entidad Nueva")

    assert success is True
    assert message == "Entidad actualizada correctamente"
    assert entity is not None
    assert entity["slug"] == "entidad-nueva"
    assert len(executed) == 1
    assert "UPDATE internal.entities" in executed[0][0]


def test_delete_entity_removes_existing_row(monkeypatch) -> None:
    from backend.app.services import entities as entities_service

    executed: list[tuple[str, tuple[object, ...]]] = []

    monkeypatch.setattr(
        entities_service,
        "_get_entity_record",
        lambda entity_id: {"id": entity_id, "name": "Entidad"},
    )
    monkeypatch.setattr(
        entities_service,
        "execute",
        lambda query, params=(): executed.append((query, params)),
    )

    success, message = entities_service.delete_entity("entity-1")

    assert success is True
    assert message == "Entidad eliminada correctamente"
    assert len(executed) == 1
    assert "DELETE FROM internal.entities" in executed[0][0]
