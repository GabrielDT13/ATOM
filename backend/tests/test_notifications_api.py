from __future__ import annotations

from fastapi.testclient import TestClient


def test_get_notifications_returns_items_and_unread_count(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import notifications as notification_routes

    cleaned_up: list[str] = []

    monkeypatch.setattr(
        notification_routes,
        "get_current_user",
        lambda request: {"id": "user-1", "username": "researcher", "role": "user"},
    )
    monkeypatch.setattr(
        notification_routes,
        "cleanup_stale_read_notifications",
        lambda user_id: cleaned_up.append(user_id) or 0,
    )
    monkeypatch.setattr(
        notification_routes,
        "list_notifications_for_user",
        lambda user_id, limit: [
            {
                "action_label": "Abrir proyecto",
                "action_url": "/dashboard/projects/researcher-rna-atlas",
                "actor_display_name": "Research Owner",
                "actor_user_id": "user-owner",
                "actor_username": "researcher",
                "created_at": "2026-04-09T10:30:00+00:00",
                "id": 7,
                "is_read": False,
                "message": "researcher ha compartido contigo RNA Atlas como viewer.",
                "project_id": "project-1",
                "project_name": "RNA Atlas",
                "project_owner_username": "researcher",
                "project_slug": "researcher-rna-atlas",
                "read_at": None,
                "title": "Proyecto compartido: RNA Atlas",
                "type": "project_shared",
                "user_id": user_id,
            }
        ],
    )
    monkeypatch.setattr(notification_routes, "get_unread_notification_count", lambda user_id: 1)

    response = client.get("/api/notifications?limit=10")

    assert response.status_code == 200
    assert response.json() == {
        "items": [
            {
                "action_label": "Abrir proyecto",
                "action_url": "/dashboard/projects/researcher-rna-atlas",
                "actor_display_name": "Research Owner",
                "actor_user_id": "user-owner",
                "actor_username": "researcher",
                "created_at": "2026-04-09T10:30:00+00:00",
                "id": 7,
                "is_read": False,
                "message": "researcher ha compartido contigo RNA Atlas como viewer.",
                "project_id": "project-1",
                "project_name": "RNA Atlas",
                "project_owner_username": "researcher",
                "project_slug": "researcher-rna-atlas",
                "read_at": None,
                "title": "Proyecto compartido: RNA Atlas",
                "type": "project_shared",
                "user_id": "user-1",
            }
        ],
        "unread_count": 1,
    }
    assert cleaned_up == ["user-1"]


def test_post_notification_read_marks_single_notification(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import notifications as notification_routes

    monkeypatch.setattr(
        notification_routes,
        "get_current_user",
        lambda request: {"id": "user-1", "username": "researcher", "role": "user"},
    )
    monkeypatch.setattr(
        notification_routes,
        "mark_notification_read",
        lambda user_id, notification_id: 1,
    )
    monkeypatch.setattr(notification_routes, "get_unread_notification_count", lambda user_id: 2)

    response = client.post("/api/notifications/7/read")

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "unread_count": 2,
        "updated_count": 1,
    }


def test_post_notifications_read_all_marks_everything(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import notifications as notification_routes

    monkeypatch.setattr(
        notification_routes,
        "get_current_user",
        lambda request: {"id": "user-1", "username": "researcher", "role": "user"},
    )
    monkeypatch.setattr(notification_routes, "mark_all_notifications_read", lambda user_id: 3)
    monkeypatch.setattr(notification_routes, "get_unread_notification_count", lambda user_id: 0)

    response = client.post("/api/notifications/read-all")

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "unread_count": 0,
        "updated_count": 3,
    }
