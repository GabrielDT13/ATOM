from __future__ import annotations

from fastapi.testclient import TestClient


def test_get_projects_route_returns_project_map_and_items(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import projects as project_routes

    monkeypatch.setattr(
        project_routes,
        "get_current_user",
        lambda request: {"id": "user-1", "username": "researcher", "role": "admin"},
    )
    monkeypatch.setattr(
        project_routes,
        "list_projects_for_user",
        lambda user_id, username, role: {
            "projects": {"researcher": ["RNA Atlas"]},
            "items": [
                {
                    "access_role": "owner",
                    "additional_files": ["notes.csv"],
                    "created_at": "2026-03-09T17:00:00+00:00",
                    "file_count": 3,
                    "files": ["notes.csv", "report/index.html", "template.xlsx"],
                    "html_files": ["report/index.html"],
                    "name": "RNA Atlas",
                    "owner": "researcher",
                    "status": "results",
                    "template_file": "template.xlsx",
                    "updated_at": "2026-03-09T17:30:00+00:00",
                }
            ],
        },
    )

    response = client.get("/api/projects")

    assert response.status_code == 200
    assert response.json() == {
        "items": [
            {
                "access_role": "owner",
                "additional_files": ["notes.csv"],
                "created_at": "2026-03-09T17:00:00+00:00",
                "file_count": 3,
                "files": ["notes.csv", "report/index.html", "template.xlsx"],
                "html_files": ["report/index.html"],
                "name": "RNA Atlas",
                "owner": "researcher",
                "status": "results",
                "template_file": "template.xlsx",
                "updated_at": "2026-03-09T17:30:00+00:00",
            }
        ],
        "projects": {"researcher": ["RNA Atlas"]},
    }


def test_get_project_route_returns_structured_project_details(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import projects as project_routes

    monkeypatch.setattr(project_routes, "_require_project_view_access", lambda request, owner, project_name: None)
    monkeypatch.setattr(
        project_routes,
        "get_project_details",
            lambda owner, project_name: {
                "access_role": "owner",
                "additional_files": ["notes.csv"],
                "created_at": "2026-03-09T17:00:00+00:00",
            "file_count": 3,
            "file_entries": [
                {
                    "extension": ".xlsx",
                    "kind": "template",
                    "name": "template.xlsx",
                    "path": "template.xlsx",
                    "size_bytes": 1024,
                }
            ],
            "files": ["notes.csv", "report/index.html", "template.xlsx"],
            "html_files": ["report/index.html"],
            "name": project_name,
            "owner": owner,
            "status": "results",
            "template_file": "template.xlsx",
            "updated_at": "2026-03-09T17:30:00+00:00",
        },
    )

    response = client.get("/api/projects/researcher/RNA%20Atlas")

    assert response.status_code == 200
    assert response.json()["name"] == "RNA Atlas"
    assert response.json()["file_entries"] == [
        {
            "extension": ".xlsx",
            "kind": "template",
            "name": "template.xlsx",
            "path": "template.xlsx",
            "size_bytes": 1024,
        }
    ]


def test_post_project_route_uses_authenticated_user_and_forwards_uploads(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import projects as project_routes

    captured: dict[str, object] = {}

    monkeypatch.setattr(
        project_routes,
        "get_current_user",
        lambda request: {"id": "user-1", "username": "researcher", "role": "user"},
    )

    async def fake_create_project(actor_user_id, username, project_name, template_file, additional_files):
        captured["actor_user_id"] = actor_user_id
        captured["username"] = username
        captured["project_name"] = project_name
        captured["template_file"] = template_file.filename
        captured["additional_files"] = [upload.filename for upload in additional_files]
        return True, "Proyecto creado correctamente"

    monkeypatch.setattr(project_routes, "create_project", fake_create_project)
    monkeypatch.setattr(
        project_routes,
        "get_project_details",
        lambda owner, project_name: {
            "additional_files": ["notes.csv"],
            "access_role": "owner",
            "created_at": "2026-03-09T17:00:00+00:00",
            "file_count": 2,
            "file_entries": [
                {
                    "extension": ".xlsx",
                    "kind": "template",
                    "name": "template.xlsx",
                    "path": "template.xlsx",
                    "size_bytes": 128,
                }
            ],
            "files": ["notes.csv", "template.xlsx"],
            "html_files": [],
            "name": project_name,
            "owner": owner,
            "status": "configured",
            "template_file": "template.xlsx",
            "updated_at": "2026-03-09T17:30:00+00:00",
        },
    )

    response = client.post(
        "/api/projects",
        data={"project_name": "RNA Atlas"},
        files=[
            (
                "template_file",
                (
                    "template.xlsx",
                    b"excel-content",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ),
            ),
            ("additional_files", ("notes.csv", b"id,value\n1,2\n", "text/csv")),
        ],
    )

    assert response.status_code == 200
    assert response.json() == {
        "message": "Proyecto creado correctamente",
        "project": {
            "additional_files": ["notes.csv"],
            "access_role": "owner",
            "created_at": "2026-03-09T17:00:00+00:00",
            "file_count": 2,
            "file_entries": [
                {
                    "extension": ".xlsx",
                    "kind": "template",
                    "name": "template.xlsx",
                    "path": "template.xlsx",
                    "size_bytes": 128,
                }
            ],
            "files": ["notes.csv", "template.xlsx"],
            "html_files": [],
            "name": "RNA Atlas",
            "owner": "researcher",
            "status": "configured",
            "template_file": "template.xlsx",
            "updated_at": "2026-03-09T17:30:00+00:00",
        },
        "success": True,
    }
    assert captured == {
        "actor_user_id": "user-1",
        "username": "researcher",
        "project_name": "RNA Atlas",
        "template_file": "template.xlsx",
        "additional_files": ["notes.csv"],
    }


def test_put_project_route_forwards_name_and_uploaded_files(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import projects as project_routes

    captured: dict[str, object] = {}

    monkeypatch.setattr(
        project_routes,
        "_require_project_edit_access",
        lambda request, owner, project_name: None,
    )

    monkeypatch.setattr(
        project_routes,
        "get_current_user",
        lambda request: {"id": "user-1", "username": "researcher", "role": "user"},
    )

    async def fake_update_project(actor_user_id, actor_username, owner, project_name, new_name, excel_file, additional_files):
        captured["actor_user_id"] = actor_user_id
        captured["actor_username"] = actor_username
        captured["owner"] = owner
        captured["project_name"] = project_name
        captured["new_name"] = new_name
        captured["excel_file"] = excel_file.filename if excel_file else None
        captured["additional_files"] = [upload.filename for upload in additional_files]
        return True, "Proyecto actualizado correctamente", new_name or project_name

    monkeypatch.setattr(project_routes, "update_project", fake_update_project)
    monkeypatch.setattr(
        project_routes,
        "get_project_details",
            lambda owner, project_name: {
                "access_role": "owner",
                "additional_files": ["fresh.csv"],
                "created_at": "2026-03-09T17:00:00+00:00",
            "file_count": 2,
            "file_entries": [
                {
                    "extension": ".xlsx",
                    "kind": "template",
                    "name": "template.xlsx",
                    "path": "template.xlsx",
                    "size_bytes": 256,
                }
            ],
            "files": ["fresh.csv", "template.xlsx"],
            "html_files": [],
            "name": project_name,
            "owner": owner,
            "status": "configured",
            "template_file": "template.xlsx",
            "updated_at": "2026-03-09T18:00:00+00:00",
        },
    )

    response = client.put(
        "/api/projects/researcher/RNA%20Atlas",
        data={"new_name": "RNA Atlas 2026"},
        files=[
            (
                "excel_file",
                (
                    "template.xlsx",
                    b"excel-content",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ),
            ),
            ("additional_files", ("fresh.csv", b"fresh-data", "text/csv")),
        ],
    )

    assert response.status_code == 200
    assert response.json() == {
        "message": "Proyecto actualizado correctamente",
        "project": {
            "additional_files": ["fresh.csv"],
            "access_role": "owner",
            "created_at": "2026-03-09T17:00:00+00:00",
            "file_count": 2,
            "file_entries": [
                {
                    "extension": ".xlsx",
                    "kind": "template",
                    "name": "template.xlsx",
                    "path": "template.xlsx",
                    "size_bytes": 256,
                }
            ],
            "files": ["fresh.csv", "template.xlsx"],
            "html_files": [],
            "name": "RNA Atlas 2026",
            "owner": "researcher",
            "status": "configured",
            "template_file": "template.xlsx",
            "updated_at": "2026-03-09T18:00:00+00:00",
        },
        "success": True,
    }
    assert captured["actor_user_id"] == "user-1"
    assert captured["actor_username"] == "researcher"
    assert captured == {
        "actor_user_id": "user-1",
        "actor_username": "researcher",
        "owner": "researcher",
        "project_name": "RNA Atlas",
        "new_name": "RNA Atlas 2026",
        "excel_file": "template.xlsx",
        "additional_files": ["fresh.csv"],
    }


def test_get_project_members_route_returns_members(client: TestClient, monkeypatch) -> None:
    from backend.app.api.routes import projects as project_routes

    monkeypatch.setattr(project_routes, "_require_project_view_access", lambda request, owner, project_name: None)
    monkeypatch.setattr(
        project_routes,
        "get_project_members",
        lambda owner, project_name: [
            {
                "avatar_url": "https://example.com/owner.png",
                "bio": "Dirige el proyecto RNA Atlas.",
                "department": "Bioinformatica",
                "display_name": "Research Owner",
                "email": "owner@example.com",
                "id": "user-1",
                "is_owner": True,
                "member_role": "owner",
                "username": "researcher",
            }
        ],
    )

    response = client.get("/api/projects/researcher/RNA%20Atlas/members")

    assert response.status_code == 200
    assert response.json() == {
        "members": [
            {
                "avatar_url": "https://example.com/owner.png",
                "bio": "Dirige el proyecto RNA Atlas.",
                "department": "Bioinformatica",
                "display_name": "Research Owner",
                "email": "owner@example.com",
                "id": "user-1",
                "is_owner": True,
                "member_role": "owner",
                "username": "researcher",
            }
        ]
    }


def test_put_project_member_route_adds_member(client: TestClient, monkeypatch) -> None:
    from backend.app.api.routes import projects as project_routes

    monkeypatch.setattr(project_routes, "_require_project_owner", lambda request, owner: None)
    monkeypatch.setattr(
        project_routes,
        "add_project_member",
        lambda owner, project_name, username, member_role: (True, "Proyecto compartido correctamente"),
    )
    monkeypatch.setattr(
        project_routes,
        "get_project_members",
        lambda owner, project_name: [
            {
                "avatar_url": None,
                "bio": "Visualiza resultados y valida informes.",
                "department": None,
                "display_name": "Shared Viewer",
                "email": "viewer@example.com",
                "id": "user-2",
                "is_owner": False,
                "member_role": "viewer",
                "username": "viewer_user",
            }
        ],
    )

    response = client.put(
        "/api/projects/researcher/RNA%20Atlas/members/viewer_user",
        json={"member_role": "viewer"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "member": {
            "avatar_url": None,
            "bio": "Visualiza resultados y valida informes.",
            "department": None,
            "display_name": "Shared Viewer",
            "email": "viewer@example.com",
            "id": "user-2",
            "is_owner": False,
            "member_role": "viewer",
            "username": "viewer_user",
        },
        "message": "Proyecto compartido correctamente",
        "success": True,
    }


def test_post_transfer_project_ownership_route_returns_updated_project(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import projects as project_routes

    monkeypatch.setattr(project_routes, "_require_project_owner", lambda request, owner: None)
    monkeypatch.setattr(
        project_routes,
        "transfer_project_ownership",
        lambda owner, project_name, username: (
            True,
            "Propiedad del proyecto transferida correctamente",
            "manager",
        ),
    )
    monkeypatch.setattr(
        project_routes,
        "get_project_details",
        lambda owner, project_name: {
            "access_role": "owner",
            "additional_files": ["notes.csv"],
            "created_at": "2026-03-09T17:00:00+00:00",
            "file_count": 2,
            "file_entries": [
                {
                    "extension": ".xlsx",
                    "kind": "template",
                    "name": "template.xlsx",
                    "path": "template.xlsx",
                    "size_bytes": 128,
                }
            ],
            "files": ["notes.csv", "template.xlsx"],
            "html_files": [],
            "name": project_name,
            "owner": owner,
            "status": "configured",
            "template_file": "template.xlsx",
            "updated_at": "2026-03-09T17:30:00+00:00",
        },
    )

    response = client.post("/api/projects/researcher/RNA%20Atlas/transfer/manager")

    assert response.status_code == 200
    assert response.json() == {
        "message": "Propiedad del proyecto transferida correctamente",
        "project": {
            "access_role": "owner",
            "additional_files": ["notes.csv"],
            "created_at": "2026-03-09T17:00:00+00:00",
            "file_count": 2,
            "file_entries": [
                {
                    "extension": ".xlsx",
                    "kind": "template",
                    "name": "template.xlsx",
                    "path": "template.xlsx",
                    "size_bytes": 128,
                }
            ],
            "files": ["notes.csv", "template.xlsx"],
            "html_files": [],
            "name": "RNA Atlas",
            "owner": "manager",
            "status": "configured",
            "template_file": "template.xlsx",
            "updated_at": "2026-03-09T17:30:00+00:00",
        },
        "success": True,
    }
