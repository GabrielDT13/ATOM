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
                "dark_mode_auto": False,
                "interface_language": "es",
                "interface_language_auto": False,
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
        "dark_mode_auto": False,
        "interface_language": "es",
        "interface_language_auto": False,
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
        "dark_mode_auto": True,
        "interface_language": "es",
        "interface_language_auto": True,
    }
    assert payload["summary"] == {
        "active_projects": 0,
        "collaborations": 0,
        "pending_reviews": 0,
    }
    assert payload["activity"] == []


def test_get_public_profile_returns_only_public_data(monkeypatch) -> None:
    monkeypatch.setattr(
        profile_service,
        "_fetch_profile_by_username",
        lambda username: {
            "id": "11111111-1111-1111-1111-111111111111",
            "username": username,
            "full_name": "Dra. Ada",
            "department": "Bioinformática",
            "bio": "Perfil público",
            "is_active": True,
            "created_at": "2026-03-01T10:00:00+00:00",
            "updated_at": "2026-03-10T12:00:00+00:00",
            "roles": ["user"],
        },
    )
    monkeypatch.setattr(
        profile_service,
        "_fetch_public_owned_projects",
        lambda user_id: [
            {
                "id": "project-1",
                "name": "Atlas",
                "slug": "doctor-atlas",
                "status": "results",
                "updated_at": "2026-03-12T08:00:00+00:00",
                "member_count": 3,
            },
            {
                "id": "project-2",
                "name": "Draft",
                "slug": "doctor-draft",
                "status": "configured",
                "updated_at": "2026-03-11T08:00:00+00:00",
                "member_count": 1,
            },
        ],
    )
    monkeypatch.setattr(
        profile_service,
        "_fetch_profile_activity",
        lambda user_id, limit=6: [
            {
                "activity_type": "profile_updated",
                "title": "Perfil actualizado",
                "description": "Se actualizó la biografía.",
                "created_at": "2026-03-13T09:00:00+00:00",
            },
            {
                "activity_type": "password_changed",
                "title": "Cambio de contraseña",
                "description": "No debe aparecer.",
                "created_at": "2026-03-14T09:00:00+00:00",
            },
        ],
    )

    payload = profile_service.get_public_profile("doctor")

    assert payload["username"] == "doctor"
    assert payload["display_name"] == "Dra. Ada"
    assert payload["summary"] == {
        "public_projects": 2,
        "results_ready": 1,
        "member_connections": 2,
    }
    assert payload["public_projects"] == [
        {
            "id": "project-1",
            "name": "Atlas",
            "slug": "doctor-atlas",
            "status": "results",
            "updated_at": "2026-03-12T08:00:00+00:00",
            "member_count": 3,
        },
        {
            "id": "project-2",
            "name": "Draft",
            "slug": "doctor-draft",
            "status": "configured",
            "updated_at": "2026-03-11T08:00:00+00:00",
            "member_count": 1,
        },
    ]
    assert payload["activity"][0]["title"] == "Perfil actualizado"
    assert all(item["kind"] != "password_changed" for item in payload["activity"])


def test_update_my_profile_updates_profile_preferences_and_activity(monkeypatch) -> None:
    executed_updates: list[tuple[str, tuple[object, ...]]] = []
    saved_preferences: dict[str, object] = {}
    logged_activity: dict[str, str] = {}

    monkeypatch.setattr(profile_service, "_fetch_profile_by_username", lambda username: None)
    monkeypatch.setattr(profile_service, "_fetch_profile_by_email", lambda email: None)
    monkeypatch.setattr(profile_service, "_update_auth_user_profile", lambda *args, **kwargs: None)

    monkeypatch.setattr(
        profile_service,
        "execute_returning",
        lambda query, params=(): executed_updates.append((query, params))
        or [{"id": "11111111-1111-1111-1111-111111111111"}],
    )
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
                "dark_mode_auto": False,
                "interface_language": "es",
                "interface_language_auto": False,
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
            "dark_mode_auto": False,
            "interface_language": "es",
            "interface_language_auto": False,
        },
    )

    assert success is True
    assert message == "Perfil actualizado correctamente"
    assert payload is not None
    assert len(executed_updates) == 1
    assert "UPDATE internal.profiles" in executed_updates[0][0]
    assert saved_preferences == {
        "user_id": "11111111-1111-1111-1111-111111111111",
        "email_notifications": False,
        "security_alerts": True,
        "dark_mode": True,
        "dark_mode_auto": False,
        "interface_language": "es",
        "interface_language_auto": False,
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
            "dark_mode_auto": True,
            "interface_language": "fr",
            "interface_language_auto": True,
        },
    )

    assert success is False
    assert message == "El idioma de la interfaz no es válido"
    assert payload is None


def test_change_my_password_updates_postgres_credentials(monkeypatch) -> None:
    executed_queries: list[tuple[str, tuple[object, ...]]] = []

    monkeypatch.setattr(
        "backend.app.services.auth.validate_access_token",
        lambda access_token: {"sub": "11111111-1111-1111-1111-111111111111"},
    )
    monkeypatch.setattr(
        profile_service,
        "fetch_one",
        lambda query, params=(): (
            {"encrypted_password": "hashed-password"}
            if "FROM auth.users" in query
            else {"password_valid": True}
        ),
    )
    monkeypatch.setattr(
        profile_service,
        "execute",
        lambda query, params=(): executed_queries.append((query, params)),
    )
    monkeypatch.setattr(profile_service, "_set_must_change_password", lambda user_id, value: None)
    monkeypatch.setattr(profile_service, "_log_profile_activity", lambda *args, **kwargs: None)

    success, message = profile_service.change_my_password(
        access_token="access-token",
        current_password="actual123",
        new_password="nueva123",
    )

    assert success is True
    assert message == "Contraseña actualizada correctamente"
    assert len(executed_queries) == 1
    assert "UPDATE auth.users" in executed_queries[0][0]


def test_change_my_password_returns_validation_error(monkeypatch) -> None:
    monkeypatch.setattr(
        "backend.app.services.auth.validate_access_token",
        lambda access_token: {"sub": "11111111-1111-1111-1111-111111111111"},
    )
    monkeypatch.setattr(
        profile_service,
        "fetch_one",
        lambda query, params=(): (
            {"encrypted_password": "hashed-password"}
            if "FROM auth.users" in query
            else {"password_valid": False}
        ),
    )
    monkeypatch.setattr(profile_service, "_set_must_change_password", lambda user_id, value: None)

    success, message = profile_service.change_my_password(
        access_token="access-token",
        current_password="incorrecta123",
        new_password="nueva123",
    )

    assert success is False
    assert message == "Email o contraseña incorrectos"


def test_complete_required_password_change_updates_credentials(monkeypatch) -> None:
    executed_queries: list[tuple[str, tuple[object, ...]]] = []
    logged_activity: dict[str, str] = {}
    password_flags: list[tuple[str, bool]] = []

    monkeypatch.setattr(
        "backend.app.services.auth.validate_access_token",
        lambda access_token: {"sub": "11111111-1111-1111-1111-111111111111"},
    )
    monkeypatch.setattr(
        profile_service,
        "execute",
        lambda query, params=(): executed_queries.append((query, params)),
    )
    monkeypatch.setattr(
        profile_service,
        "_set_must_change_password",
        lambda user_id, value: password_flags.append((user_id, value)),
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

    success, message = profile_service.complete_required_password_change(
        access_token="access-token",
        new_password="NuevaSegura123",
    )

    assert success is True
    assert message == "Contraseña actualizada correctamente"
    assert len(executed_queries) == 1
    assert "UPDATE auth.users" in executed_queries[0][0]
    assert password_flags == [("11111111-1111-1111-1111-111111111111", False)]
    assert logged_activity == {
        "user_id": "11111111-1111-1111-1111-111111111111",
        "activity_type": "password_changed",
        "title": "Cambio de contraseña",
        "description": "Se actualizó la contraseña inicial de la cuenta.",
    }


def test_delete_my_account_deletes_local_directory_after_postgres_delete(monkeypatch) -> None:
    executed_queries: list[tuple[str, tuple[object, ...]]] = []
    deleted_dirs: list[str] = []

    monkeypatch.setattr(
        "backend.app.services.auth.validate_access_token",
        lambda access_token: {"sub": "11111111-1111-1111-1111-111111111111"},
    )
    monkeypatch.setattr(profile_service, "fetch_one", lambda query, params=(): None)
    monkeypatch.setattr(
        profile_service,
        "execute_returning",
        lambda query, params=(): executed_queries.append((query, params))
        or [{"id": "11111111-1111-1111-1111-111111111111"}],
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
    assert len(executed_queries) == 1
    assert "DELETE FROM auth.users" in executed_queries[0][0]
    assert deleted_dirs == ["doctor"]


def test_delete_my_account_does_not_delete_local_directory_when_delete_fails(monkeypatch) -> None:
    deleted_dirs: list[str] = []

    monkeypatch.setattr(
        "backend.app.services.auth.validate_access_token",
        lambda access_token: {"sub": "11111111-1111-1111-1111-111111111111"},
    )
    monkeypatch.setattr(profile_service, "fetch_one", lambda query, params=(): None)
    monkeypatch.setattr(
        profile_service,
        "execute_returning",
        lambda *args, **kwargs: [],
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
