from __future__ import annotations

from backend.app.services import profile as profile_service


def test_get_my_profile_builds_response_from_profile_preferences_and_activity(monkeypatch) -> None:
    monkeypatch.setattr(
        profile_service,
        "_fetch_profile_by_user_id",
        lambda user_id: {
            "id": user_id,
            "email": "doctor@example.com",
            "username": "doctor",
            "full_name": "Dra. Ada",
            "department": "Bioinformática",
            "bio": "Especialista en transcriptómica",
            "created_at": "2026-03-01T10:00:00+00:00",
            "updated_at": "2026-03-10T12:00:00+00:00",
            "roles": ["admin"],
        },
    )
    monkeypatch.setattr(
        profile_service,
        "_collect_profile_data",
        lambda user_id: profile_service.ProfileCollections(
            owned_projects=[
                {
                    "id": "project-1",
                    "name": "Atlas",
                    "status": "active",
                    "updated_at": "2026-03-12T08:00:00+00:00",
                    "member_count": 3,
                },
                {
                    "id": "project-2",
                    "name": "Draft",
                    "status": "draft",
                    "updated_at": "2026-03-11T08:00:00+00:00",
                    "member_count": 1,
                },
            ],
            collaborations=[
                {
                    "project_id": "project-3",
                    "project_name": "Colaboración",
                    "project_status": "active",
                    "member_role": "editor",
                    "member_created_at": "2026-03-09T08:00:00+00:00",
                }
            ],
            preferences={
                "email_notifications": True,
                "security_alerts": False,
                "dark_mode": True,
                "interface_language": "es",
            },
            activity=[
                {
                    "activity_type": "profile_updated",
                    "title": "Perfil actualizado",
                    "description": "Se actualizó la biografía.",
                    "created_at": "2026-03-13T09:00:00+00:00",
                }
            ],
        ),
    )

    payload = profile_service.get_my_profile("11111111-1111-1111-1111-111111111111")

    assert payload["display_name"] == "Dra. Ada"
    assert payload["role"] == "admin"
    assert payload["department"] == "Bioinformática"
    assert payload["preferences"] == {
        "email_notifications": True,
        "security_alerts": False,
        "dark_mode": True,
        "interface_language": "es",
    }
    assert payload["summary"] == {
        "active_projects": 3,
        "collaborations": 1,
        "pending_reviews": 2,
    }
    assert payload["activity"][0]["title"] == "Perfil actualizado"
    assert len(payload["activity"]) == 4
    assert payload["projects_preview"] == {
        "owned": [
            {
                "id": "project-1",
                "name": "Atlas",
                "status": "active",
                "updated_at": "2026-03-12T08:00:00+00:00",
                "member_count": 3,
            },
            {
                "id": "project-2",
                "name": "Draft",
                "status": "draft",
                "updated_at": "2026-03-11T08:00:00+00:00",
                "member_count": 1,
            },
        ],
        "collaborations": [
            {
                "project_id": "project-3",
                "project_name": "Colaboración",
                "project_status": "active",
                "member_role": "editor",
                "member_created_at": "2026-03-09T08:00:00+00:00",
            }
        ],
    }


def test_get_my_profile_uses_defaults_when_preferences_are_missing(monkeypatch) -> None:
    monkeypatch.setattr(
        profile_service,
        "_fetch_profile_by_user_id",
        lambda user_id: {
            "id": user_id,
            "email": "doctor@example.com",
            "username": "doctor",
            "full_name": "Dra. Ada",
            "department": None,
            "bio": None,
            "created_at": "2026-03-01T10:00:00+00:00",
            "updated_at": "2026-03-10T12:00:00+00:00",
            "roles": ["user"],
        },
    )
    monkeypatch.setattr(
        profile_service,
        "_collect_profile_data",
        lambda user_id: profile_service.ProfileCollections(
            owned_projects=[],
            collaborations=[],
            preferences={},
            activity=[],
        ),
    )

    payload = profile_service.get_my_profile("11111111-1111-1111-1111-111111111111")

    assert payload["preferences"] == {
        "email_notifications": True,
        "security_alerts": True,
        "dark_mode": False,
        "interface_language": "es",
    }
    assert payload["summary"] == {
        "active_projects": 0,
        "collaborations": 0,
        "pending_reviews": 0,
    }
    assert payload["activity"] == []


def test_update_my_profile_updates_auth_rpc_preferences_and_activity(monkeypatch) -> None:
    captured_rpc: dict[str, object] = {}
    saved_preferences: dict[str, object] = {}
    logged_activity: dict[str, str] = {}

    monkeypatch.setattr(profile_service, "_fetch_profile_by_username", lambda username: None)
    monkeypatch.setattr(profile_service, "_fetch_profile_by_email", lambda email: None)
    monkeypatch.setattr(profile_service, "_update_auth_user_profile", lambda *args, **kwargs: None)

    def fake_request_with_anon_key(method: str, path: str, *, bearer_token: str | None = None, json_body=None):
        captured_rpc["method"] = method
        captured_rpc["path"] = path
        captured_rpc["bearer_token"] = bearer_token
        captured_rpc["json_body"] = json_body
        return [{"id": "11111111-1111-1111-1111-111111111111"}]

    monkeypatch.setattr(profile_service, "request_with_anon_key", fake_request_with_anon_key)
    monkeypatch.setattr(
        profile_service,
        "_save_preferences",
        lambda user_id, **kwargs: saved_preferences.update({"user_id": user_id, **kwargs}),
    )
    monkeypatch.setattr(
        profile_service,
        "_log_profile_activity",
        lambda user_id, *, activity_type, title, description: logged_activity.update(
            {
                "user_id": user_id,
                "activity_type": activity_type,
                "title": title,
                "description": description,
            }
        ),
    )
    monkeypatch.setattr(
        profile_service,
        "get_my_profile",
        lambda user_id: {
            "id": user_id,
            "email": "doctor@example.com",
            "username": "doctor",
            "display_name": "Dra. Ada",
            "role": "user",
            "department": "Genómica",
            "bio": "Bio",
            "joined_at": "2026-03-01T10:00:00+00:00",
            "updated_at": "2026-03-13T10:00:00+00:00",
            "preferences": {
                "email_notifications": False,
                "security_alerts": True,
                "dark_mode": True,
                "interface_language": "es",
            },
            "summary": {
                "active_projects": 2,
                "collaborations": 1,
                "pending_reviews": 1,
            },
            "activity": [],
            "projects_preview": {
                "owned": [],
                "collaborations": [],
            },
        },
    )

    success, message, payload = profile_service.update_my_profile(
        user_id="11111111-1111-1111-1111-111111111111",
        access_token="access-token",
        username="doctor",
        email="doctor@example.com",
        display_name="Dra. Ada",
        department="Genómica",
        bio="Nueva biografía",
        preferences={
            "email_notifications": False,
            "security_alerts": True,
            "dark_mode": True,
            "interface_language": "es",
        },
    )

    assert success is True
    assert message == "Perfil actualizado correctamente"
    assert payload is not None
    assert captured_rpc == {
        "method": "POST",
        "path": "/rest/v1/rpc/update_my_profile",
        "bearer_token": "access-token",
        "json_body": {
            "p_username": "doctor",
            "p_full_name": "Dra. Ada",
            "p_avatar_url": None,
            "p_department": "Genómica",
            "p_bio": "Nueva biografía",
        },
    }
    assert saved_preferences == {
        "user_id": "11111111-1111-1111-1111-111111111111",
        "email_notifications": False,
        "security_alerts": True,
        "dark_mode": True,
        "interface_language": "es",
    }
    assert logged_activity == {
        "user_id": "11111111-1111-1111-1111-111111111111",
        "activity_type": "profile_updated",
        "title": "Perfil actualizado",
        "description": "Se actualizó la información principal del perfil.",
    }


def test_update_my_profile_rejects_invalid_interface_language(monkeypatch) -> None:
    monkeypatch.setattr(profile_service, "_fetch_profile_by_username", lambda username: None)
    monkeypatch.setattr(profile_service, "_fetch_profile_by_email", lambda email: None)

    success, message, payload = profile_service.update_my_profile(
        user_id="11111111-1111-1111-1111-111111111111",
        access_token="access-token",
        username="doctor",
        email="doctor@example.com",
        display_name="Dra. Ada",
        department="Genómica",
        bio="Nueva biografía",
        preferences={
            "email_notifications": True,
            "security_alerts": True,
            "dark_mode": False,
            "interface_language": "fr",
        },
    )

    assert success is False
    assert message == "El idioma de la interfaz no es válido"
    assert payload is None


def test_change_my_password_calls_rpc(monkeypatch) -> None:
    captured_request: dict[str, object] = {}

    def fake_request_with_anon_key(method: str, path: str, *, bearer_token: str | None = None, json_body=None, schema=None):
        captured_request["method"] = method
        captured_request["path"] = path
        captured_request["bearer_token"] = bearer_token
        captured_request["json_body"] = json_body
        captured_request["schema"] = schema
        return True

    monkeypatch.setattr(profile_service, "request_with_anon_key", fake_request_with_anon_key)

    success, message = profile_service.change_my_password(
        access_token="access-token",
        current_password="actual123",
        new_password="nueva123",
    )

    assert success is True
    assert message == "Contraseña actualizada correctamente"
    assert captured_request == {
        "method": "POST",
        "path": "/rest/v1/rpc/change_my_password",
        "bearer_token": "access-token",
        "json_body": {
            "p_current_password": "actual123",
            "p_new_password": "nueva123",
        },
        "schema": None,
    }


def test_change_my_password_returns_rpc_error(monkeypatch) -> None:
    monkeypatch.setattr(
        profile_service,
        "request_with_anon_key",
        lambda *args, **kwargs: (_ for _ in ()).throw(
            profile_service.SupabaseError("Email o contraseña incorrectos"),
        ),
    )

    success, message = profile_service.change_my_password(
        access_token="access-token",
        current_password="incorrecta123",
        new_password="nueva123",
    )

    assert success is False
    assert message == "Email o contraseña incorrectos"


def test_delete_my_account_calls_rpc_and_deletes_local_directory(monkeypatch) -> None:
    captured_request: dict[str, object] = {}
    deleted_dirs: list[str] = []

    monkeypatch.setattr(
        profile_service,
        "request_with_anon_key",
        lambda method, path, *, bearer_token=None, json_body=None, schema=None: captured_request.update(
            {
                "method": method,
                "path": path,
                "bearer_token": bearer_token,
                "json_body": json_body,
                "schema": schema,
            }
        ) or True,
    )
    monkeypatch.setattr(
        profile_service,
        "_delete_user_projects_dir",
        lambda username: deleted_dirs.append(username),
    )

    success, message = profile_service.delete_my_account(
        access_token="access-token",
        username="doctor",
    )

    assert success is True
    assert message == "Cuenta eliminada correctamente"
    assert captured_request == {
        "method": "POST",
        "path": "/rest/v1/rpc/delete_my_account",
        "bearer_token": "access-token",
        "json_body": None,
        "schema": None,
    }
    assert deleted_dirs == ["doctor"]


def test_delete_my_account_does_not_delete_local_directory_when_rpc_fails(monkeypatch) -> None:
    deleted_dirs: list[str] = []

    monkeypatch.setattr(
        profile_service,
        "request_with_anon_key",
        lambda *args, **kwargs: (_ for _ in ()).throw(
            profile_service.SupabaseError("No se pudo eliminar la cuenta"),
        ),
    )
    monkeypatch.setattr(
        profile_service,
        "_delete_user_projects_dir",
        lambda username: deleted_dirs.append(username),
    )

    success, message = profile_service.delete_my_account(
        access_token="access-token",
        username="doctor",
    )

    assert success is False
    assert message == "No se pudo eliminar la cuenta"
    assert deleted_dirs == []
