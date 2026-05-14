from __future__ import annotations

from backend.app.services import notifications as notifications_service


def test_create_notification_skips_storage_when_notifications_disabled(monkeypatch) -> None:
    executed_queries: list[tuple[str, tuple[object, ...]]] = []

    monkeypatch.setattr(
        notifications_service,
        "_fetch_preferences",
        lambda user_id: {"email_notifications": False},
    )
    monkeypatch.setattr(
        notifications_service,
        "execute",
        lambda query, params=(): executed_queries.append((query, params)),
    )

    notifications_service.create_notification(
        user_id="user-1",
        notification_type="project_shared",
        title="Proyecto compartido",
        message="Nuevo acceso",
    )

    assert executed_queries == []


def test_create_notification_persists_when_notifications_enabled(monkeypatch) -> None:
    executed_queries: list[tuple[str, tuple[object, ...]]] = []

    monkeypatch.setattr(
        notifications_service,
        "_fetch_preferences",
        lambda user_id: {"email_notifications": True},
    )
    monkeypatch.setattr(
        notifications_service,
        "execute",
        lambda query, params=(): executed_queries.append((query, params)),
    )

    notifications_service.create_notification(
        user_id="user-1",
        notification_type="project_shared",
        title="Proyecto compartido",
        message="Nuevo acceso",
    )

    assert len(executed_queries) == 1
