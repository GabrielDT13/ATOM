from __future__ import annotations

from pathlib import Path

from backend.app.services import auth as auth_service
from backend.app.services import notifications as notification_service
from backend.app.services import users as user_service
from backend.app.services.auth import AuthenticationError
from fastapi.testclient import TestClient


def test_forgot_password_route_returns_generic_message(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import auth as auth_routes

    captured: list[str] = []
    monkeypatch.setattr(auth_routes, "request_password_reset", lambda email: captured.append(email))

    response = client.post("/api/auth/forgot-password", json={"email": "user@example.com"})

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "message": (
            "Si existe una cuenta asociada a ese email, te hemos enviado "
            "las instrucciones para restablecer la contraseña."
        ),
    }
    assert captured == ["user@example.com"]


def test_reset_password_route_returns_validation_error(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import auth as auth_routes

    monkeypatch.setattr(
        auth_routes,
        "reset_password_with_token",
        lambda token, new_password: (_ for _ in ()).throw(
            AuthenticationError("El enlace ha caducado", status_code=400)
        ),
    )

    response = client.post(
        "/api/auth/reset-password",
        json={"token": "expired-token", "new_password": "NuevaPass123"},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "El enlace ha caducado"}


def test_request_password_reset_sends_email_for_existing_profile(monkeypatch) -> None:
    captured: dict[str, object] = {}

    monkeypatch.setattr(
        auth_service,
        "_get_profile_by_email",
        lambda email: {
            "id": "11111111-1111-1111-1111-111111111111",
            "email": email,
            "username": "ada",
            "is_active": True,
        },
    )
    monkeypatch.setattr(auth_service, "generate_password_action_token", lambda **kwargs: "reset-token")
    monkeypatch.setattr(
        auth_service,
        "send_password_reset_email",
        lambda **kwargs: captured.update(kwargs) or True,
    )

    auth_service.request_password_reset("ada@example.com")

    assert captured == {
        "to_email": "ada@example.com",
        "username": "ada",
        "reset_url": "http://localhost:3000/reset-password?token=reset-token",
        "expires_minutes": 60,
    }


def test_reset_password_with_token_updates_credentials_and_sends_confirmation(monkeypatch) -> None:
    executed_queries: list[tuple[str, tuple[object, ...]]] = []
    captured_email: dict[str, object] = {}

    monkeypatch.setattr(
        auth_service,
        "_decode_password_action_token",
        lambda token: {
            "sub": "11111111-1111-1111-1111-111111111111",
            "email": "ada@example.com",
            "username": "ada",
            "kind": "password-reset",
            "iat": 0,
        },
    )
    monkeypatch.setattr(
        auth_service,
        "_get_profile_by_user_id",
        lambda user_id: {
            "id": user_id,
            "email": "ada@example.com",
            "username": "ada",
            "is_active": True,
        },
    )
    monkeypatch.setattr(
        auth_service,
        "execute",
        lambda query, params=(): executed_queries.append((" ".join(query.split()), params)),
    )
    monkeypatch.setattr(
        auth_service,
        "send_password_changed_email",
        lambda **kwargs: captured_email.update(kwargs) or True,
    )
    monkeypatch.setattr(auth_service, "clear_must_change_password", lambda user_id: None)

    auth_service.reset_password_with_token("valid-token", "NuevaPass123")

    assert len(executed_queries) == 2
    assert "UPDATE auth.users SET encrypted_password = crypt(%s, gen_salt('bf')) WHERE id = %s" in executed_queries[0][0]
    assert executed_queries[0][1] == ("NuevaPass123", "11111111-1111-1111-1111-111111111111")
    assert "UPDATE auth.refresh_tokens SET revoked_at = now()" in executed_queries[1][0]
    assert captured_email == {
        "to_email": "ada@example.com",
        "username": "ada",
        "login_url": "http://localhost:3000/login",
    }


def test_create_user_sends_account_created_email(
    isolated_app_env: dict[str, Path],
    monkeypatch,
) -> None:
    captured_email: dict[str, object] = {}

    monkeypatch.setattr(user_service, "_get_profile_by_username", lambda username: None)
    monkeypatch.setattr(user_service, "_get_profile_by_email", lambda email: None)
    monkeypatch.setattr(user_service, "_generate_temporary_password", lambda: "RandPass2345")
    monkeypatch.setattr(
        user_service,
        "_create_auth_user",
        lambda username, password, email, department: "44444444-4444-4444-4444-444444444444",
    )
    monkeypatch.setattr(
        user_service,
        "_apply_user_role",
        lambda **kwargs: {"id": "44444444-4444-4444-4444-444444444444"},
    )
    monkeypatch.setattr(user_service, "_initialize_new_user_preferences", lambda user_id: None)
    monkeypatch.setattr(user_service, "generate_password_action_token", lambda **kwargs: "setup-token")
    monkeypatch.setattr(
        user_service,
        "send_account_created_email",
        lambda **kwargs: captured_email.update(kwargs) or True,
    )

    success, message, temporary_password = user_service.create_user(
        "researcher",
        "researcher@example.com",
        "admin",
        "Bioinformatica",
        "11111111-1111-1111-1111-111111111111",
    )

    assert success is True
    assert message == "Usuario registrado correctamente"
    assert temporary_password == "RandPass2345"
    assert captured_email == {
        "to_email": "researcher@example.com",
        "username": "researcher",
        "temporary_password": "RandPass2345",
        "login_url": "http://localhost:3000/login",
        "setup_url": "http://localhost:3000/reset-password?token=setup-token",
    }
    assert (isolated_app_env["projects_dir"] / "researcher").is_dir()


def test_notify_project_shared_sends_email_when_enabled(monkeypatch) -> None:
    notifications: list[dict[str, object]] = []
    emails: list[dict[str, object]] = []

    monkeypatch.setattr(
        notification_service,
        "create_notification",
        lambda **kwargs: notifications.append(kwargs),
    )
    monkeypatch.setattr(
        notification_service,
        "get_email_user_context",
        lambda user_id: type(
            "Recipient",
            (),
            {
                "display_name": "Ada Lovelace",
                "email": "ada@example.com",
                "email_notifications": True,
            },
        )(),
    )
    monkeypatch.setattr(
        notification_service,
        "send_notification_email",
        lambda **kwargs: emails.append(kwargs) or True,
    )

    notification_service.notify_project_shared(
        actor_user_id="owner-id",
        actor_username="owner",
        member_role="editor",
        project_id="project-1",
        project_name="RNA Atlas",
        project_owner_username="owner",
        project_slug="owner/rna-atlas",
        recipient_user_id="user-1",
        updated_existing_access=False,
    )

    assert notifications[0]["title"] == "Proyecto compartido: RNA Atlas"
    assert emails == [
        {
            "to_email": "ada@example.com",
            "recipient_name": "Ada Lovelace",
            "subject": "ATOM · Proyecto compartido: RNA Atlas",
            "title": "Proyecto compartido: RNA Atlas",
            "message": "owner ha compartido contigo RNA Atlas como editor.",
            "action_label": "Abrir proyecto",
            "action_url": "http://localhost:3000/dashboard/projects/owner/rna-atlas",
        }
    ]


def test_notify_analysis_run_finished_sends_emails_to_owner_and_requester(monkeypatch) -> None:
    emails: list[dict[str, object]] = []

    monkeypatch.setattr(notification_service, "create_notification", lambda **kwargs: None)
    monkeypatch.setattr(
        notification_service,
        "_get_project_owner_snapshot",
        lambda project_id: {
            "owner_id": "owner-id",
            "owner_username": "owner",
            "project_slug": "owner/rna-atlas",
        },
    )
    monkeypatch.setattr(
        notification_service,
        "_list_project_notification_recipient_ids",
        lambda project_id: {"owner-id", "collab-id"},
    )
    monkeypatch.setattr(
        notification_service,
        "get_email_user_context",
        lambda user_id: type(
            "Recipient",
            (),
            {
                "display_name": f"User {user_id}",
                "email": f"{user_id}@example.com",
                "email_notifications": True,
            },
        )(),
    )
    monkeypatch.setattr(
        notification_service,
        "send_notification_email",
        lambda **kwargs: emails.append(kwargs) or True,
    )

    notification_service.notify_analysis_run_finished(
        {
            "project_id": "project-1",
            "project_name": "RNA Atlas",
            "requested_by_user_id": "requester-id",
            "requested_by_username": "requester",
            "processed_designs": 8,
            "total_designs": 8,
            "successful_designs": 8,
            "failed_designs": 0,
        },
        status="completed",
    )

    assert len(emails) == 3
    assert all(email["subject"] == "ATOM · Informe listo en RNA Atlas" for email in emails)
    assert all(email["action_url"] == "http://localhost:3000/dashboard/projects/owner/rna-atlas" for email in emails)
