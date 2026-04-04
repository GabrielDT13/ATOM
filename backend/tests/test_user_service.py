from __future__ import annotations

from pathlib import Path
from uuid import UUID

from backend.app.services import users as user_service
from backend.app.services.errors import ServiceError


def test_create_user_persists_user_role_department_and_project_dir(
    isolated_app_env: dict[str, Path],
    monkeypatch,
) -> None:
    created_payload: dict[str, str | None] = {}
    role_payload: dict[str, str] = {}

    monkeypatch.setattr(user_service, "_get_profile_by_username", lambda username: None)
    monkeypatch.setattr(user_service, "_get_profile_by_email", lambda email: None)
    monkeypatch.setattr(user_service, "_generate_temporary_password", lambda: "RandPass2345")

    def fake_create_auth_user(
        username: str,
        password: str,
        email: str,
        department: str | None,
    ) -> str:
        created_payload["username"] = username
        created_payload["password"] = password
        created_payload["email"] = email
        created_payload["department"] = department
        return "44444444-4444-4444-4444-444444444444"

    def fake_apply_user_role(*, actor_user_id: str, target_user_id: str, role: str) -> dict[str, object]:
        role_payload["actor_user_id"] = actor_user_id
        role_payload["target_user_id"] = target_user_id
        role_payload["role"] = role
        return {"id": target_user_id}

    monkeypatch.setattr(user_service, "_create_auth_user", fake_create_auth_user)
    monkeypatch.setattr(user_service, "_apply_user_role", fake_apply_user_role)

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
    assert created_payload == {
        "username": "researcher",
        "password": "RandPass2345",
        "email": "researcher@example.com",
        "department": "Bioinformatica",
    }
    assert role_payload == {
        "actor_user_id": "11111111-1111-1111-1111-111111111111",
        "target_user_id": "44444444-4444-4444-4444-444444444444",
        "role": "admin",
    }
    assert (isolated_app_env["projects_dir"] / "researcher").is_dir()


def test_create_user_rolls_back_auth_user_when_role_sync_fails(
    isolated_app_env: dict[str, Path],
    monkeypatch,
) -> None:
    deleted_user_ids: list[str] = []

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
        lambda **kwargs: (_ for _ in ()).throw(ServiceError("No se pudo asignar el rol")),
    )
    monkeypatch.setattr(
        user_service,
        "_delete_auth_user",
        lambda user_id: deleted_user_ids.append(user_id),
    )

    success, message, temporary_password = user_service.create_user(
        "researcher",
        "researcher@example.com",
        "admin",
        "Bioinformatica",
        "11111111-1111-1111-1111-111111111111",
    )

    assert success is False
    assert message == "No se pudo asignar el rol"
    assert temporary_password is None
    assert deleted_user_ids == ["44444444-4444-4444-4444-444444444444"]
    assert not (isolated_app_env["projects_dir"] / "researcher").exists()


def test_create_auth_user_accepts_uuid_returned_by_postgres(monkeypatch) -> None:
    monkeypatch.setattr(
        user_service,
        "execute_returning",
        lambda query, params: [{"id": UUID("44444444-4444-4444-4444-444444444444")}],
    )

    user_id = user_service._create_auth_user(
        "researcher",
        "RandPass2345",
        "researcher@example.com",
        None,
    )

    assert user_id == "44444444-4444-4444-4444-444444444444"


def test_update_user_syncs_auth_role_department_and_project_dir(
    isolated_app_env: dict[str, Path],
    monkeypatch,
) -> None:
    updated_payload: dict[str, str | None] = {}
    role_payload: dict[str, str] = {}
    old_dir = isolated_app_env["projects_dir"] / "researcher"
    old_dir.mkdir()

    monkeypatch.setattr(
        user_service,
        "_get_profile_by_username",
        lambda username: {
            "id": "44444444-4444-4444-4444-444444444444",
            "username": "researcher",
            "email": "researcher@example.com",
            "full_name": "Researcher",
            "avatar_url": None,
            "department": "Bioinformatica",
            "roles": ["user"],
        }
        if username == "researcher"
        else None,
    )
    monkeypatch.setattr(user_service, "_get_profile_by_email", lambda email: None)

    def fake_update_auth_user(
        user_id: str,
        *,
        username: str,
        email: str,
        password: str | None,
        full_name: str | None,
        avatar_url: str | None,
        department: str | None,
    ) -> None:
        updated_payload["user_id"] = user_id
        updated_payload["username"] = username
        updated_payload["email"] = email
        updated_payload["password"] = password
        updated_payload["full_name"] = full_name
        updated_payload["avatar_url"] = avatar_url
        updated_payload["department"] = department

    def fake_apply_user_role(*, actor_user_id: str, target_user_id: str, role: str) -> dict[str, object]:
        role_payload["actor_user_id"] = actor_user_id
        role_payload["target_user_id"] = target_user_id
        role_payload["role"] = role
        return {"id": target_user_id}

    monkeypatch.setattr(user_service, "_update_auth_user", fake_update_auth_user)
    monkeypatch.setattr(user_service, "_apply_user_role", fake_apply_user_role)

    success, message, effective_username = user_service.update_user(
        "researcher",
        "principal",
        "principal@example.com",
        None,
        "admin",
        "Genomica clinica",
        "11111111-1111-1111-1111-111111111111",
    )

    assert success is True
    assert message == "Usuario principal actualizado correctamente"
    assert effective_username == "principal"
    assert updated_payload == {
        "user_id": "44444444-4444-4444-4444-444444444444",
        "username": "principal",
        "email": "principal@example.com",
        "password": None,
        "full_name": "Researcher",
        "avatar_url": None,
        "department": "Genomica clinica",
    }
    assert role_payload == {
        "actor_user_id": "11111111-1111-1111-1111-111111111111",
        "target_user_id": "44444444-4444-4444-4444-444444444444",
        "role": "admin",
    }
    assert not old_dir.exists()
    assert (isolated_app_env["projects_dir"] / "principal").is_dir()


def test_delete_user_is_blocked_when_user_owns_projects(monkeypatch) -> None:
    deleted_user_ids: list[str] = []

    monkeypatch.setattr(
        user_service,
        "_get_profile_by_username",
        lambda username: {
            "id": "44444444-4444-4444-4444-444444444444",
            "username": "researcher",
            "email": "researcher@example.com",
        },
    )
    monkeypatch.setattr(
        user_service,
        "_list_owned_projects",
        lambda user_id, limit=3: [
            {"id": "project-1", "name": "RNA Atlas"},
            {"id": "project-2", "name": "Cell Map"},
        ],
    )
    monkeypatch.setattr(
        user_service,
        "_delete_auth_user",
        lambda user_id: deleted_user_ids.append(user_id),
    )

    success, message = user_service.delete_user("researcher")

    assert success is False
    assert message == (
        "No se puede eliminar el usuario porque todavía es propietario de proyectos "
        "(RNA Atlas, Cell Map). Reasigna o elimina esos proyectos primero."
    )
    assert deleted_user_ids == []


def test_delete_user_deletes_auth_user_and_projects_dir_when_no_owned_projects(
    isolated_app_env: dict[str, Path],
    monkeypatch,
) -> None:
    deleted_user_ids: list[str] = []
    user_dir = isolated_app_env["projects_dir"] / "researcher"
    user_dir.mkdir()

    monkeypatch.setattr(
        user_service,
        "_get_profile_by_username",
        lambda username: {
            "id": "44444444-4444-4444-4444-444444444444",
            "username": "researcher",
            "email": "researcher@example.com",
        },
    )
    monkeypatch.setattr(user_service, "_list_owned_projects", lambda user_id, limit=3: [])
    monkeypatch.setattr(
        user_service,
        "_delete_auth_user",
        lambda user_id: deleted_user_ids.append(user_id),
    )

    success, message = user_service.delete_user("researcher")

    assert success is True
    assert message == "Usuario researcher y su carpeta de proyectos eliminados correctamente."
    assert deleted_user_ids == ["44444444-4444-4444-4444-444444444444"]
    assert not user_dir.exists()
