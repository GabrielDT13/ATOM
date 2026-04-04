from __future__ import annotations

from uuid import UUID


def test_list_departments_normalizes_postgres_uuid_values(monkeypatch) -> None:
    from backend.app.core.config import get_settings
    from backend.app.services import departments as departments_service

    get_settings.cache_clear()

    monkeypatch.setattr(
        departments_service,
        "fetch_all",
        lambda query, params=(): [
            {
                "id": UUID("44444444-4444-4444-4444-444444444444"),
                "name": "Bioinformatica",
                "slug": "bioinformatica",
            }
        ],
    )

    payload = departments_service.list_departments()

    assert payload == [
        {
            "id": "44444444-4444-4444-4444-444444444444",
            "name": "Bioinformatica",
            "slug": "bioinformatica",
        }
    ]

    get_settings.cache_clear()
