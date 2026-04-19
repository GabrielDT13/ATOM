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
                    "id": "project-1",
                    "name": "RNA Atlas",
                    "owner": "researcher",
                    "slug": "researcher-rna-atlas",
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
                "id": "project-1",
                "name": "RNA Atlas",
                "owner": "researcher",
                "slug": "researcher-rna-atlas",
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
            "id": "project-1",
            "name": project_name,
            "owner": owner,
            "slug": "researcher-rna-atlas",
            "status": "results",
            "template_file": "template.xlsx",
            "updated_at": "2026-03-09T17:30:00+00:00",
        },
    )

    response = client.get("/api/projects/researcher/RNA%20Atlas")

    assert response.status_code == 200
    assert response.json()["name"] == "RNA Atlas"
    assert response.json()["id"] == "project-1"
    assert response.json()["slug"] == "researcher-rna-atlas"
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

    async def fake_create_project(
        actor_user_id,
        username,
        project_name,
        template_file,
        additional_files,
        *,
        entity_name=None,
        team_id=None,
        actor_role="user",
    ):
        captured["actor_user_id"] = actor_user_id
        captured["username"] = username
        captured["project_name"] = project_name
        captured["template_file"] = template_file.filename
        captured["additional_files"] = [upload.filename for upload in additional_files]
        captured["entity_name"] = entity_name
        captured["team_id"] = team_id
        captured["actor_role"] = actor_role
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
            "id": "project-1",
            "name": project_name,
            "owner": owner,
            "slug": "researcher-rna-atlas",
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
            "id": "project-1",
            "name": "RNA Atlas",
            "owner": "researcher",
            "slug": "researcher-rna-atlas",
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
        "entity_name": None,
        "team_id": None,
        "actor_role": "user",
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
            "id": "project-1",
            "name": project_name,
            "owner": owner,
            "slug": "researcher-rna-atlas-2026",
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
            "id": "project-1",
            "name": "RNA Atlas 2026",
            "owner": "researcher",
            "slug": "researcher-rna-atlas-2026",
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
                "access_via_teams": [],
                "avatar_url": "https://example.com/owner.png",
                "bio": "Dirige el proyecto RNA Atlas.",
                "department": "Bioinformatica",
                "direct_member_role": "owner",
                "display_name": "Research Owner",
                "email": "owner@example.com",
                "has_direct_access": True,
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
                "access_via_teams": [],
                "avatar_url": "https://example.com/owner.png",
                "bio": "Dirige el proyecto RNA Atlas.",
                "department": "Bioinformatica",
                "direct_member_role": "owner",
                "display_name": "Research Owner",
                "email": "owner@example.com",
                "has_direct_access": True,
                "id": "user-1",
                "is_owner": True,
                "member_role": "owner",
                "username": "researcher",
            }
        ]
    }


def test_get_project_by_ref_route_resolves_slug_and_returns_project(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import projects as project_routes

    monkeypatch.setattr(
        project_routes,
        "resolve_project_reference",
        lambda project_ref: {
            "id": "project-1",
            "name": "RNA Atlas",
            "owner_username": "researcher",
            "slug": project_ref,
        },
    )
    monkeypatch.setattr(project_routes, "_require_project_view_access", lambda request, owner, project_name: None)
    monkeypatch.setattr(
        project_routes,
        "get_project_details_by_ref",
        lambda project_ref: {
            "access_role": "owner",
            "additional_files": ["notes.csv"],
            "created_at": "2026-03-09T17:00:00+00:00",
            "file_count": 3,
            "file_entries": [],
            "files": ["notes.csv", "report/index.html", "template.xlsx"],
            "html_files": ["report/index.html"],
            "id": "project-1",
            "name": "RNA Atlas",
            "owner": "researcher",
            "slug": project_ref,
            "status": "results",
            "template_file": "template.xlsx",
            "updated_at": "2026-03-09T17:30:00+00:00",
        },
    )

    response = client.get("/api/projects/by-ref/researcher-rna-atlas")

    assert response.status_code == 200
    assert response.json()["id"] == "project-1"
    assert response.json()["slug"] == "researcher-rna-atlas"
    assert response.json()["name"] == "RNA Atlas"


def test_get_project_members_by_ref_route_returns_members(
    client: TestClient,
    monkeypatch,
) -> None:
    from backend.app.api.routes import projects as project_routes

    monkeypatch.setattr(
        project_routes,
        "resolve_project_reference",
        lambda project_ref: {
            "id": "project-1",
            "name": "RNA Atlas",
            "owner_username": "researcher",
            "slug": project_ref,
        },
    )
    monkeypatch.setattr(project_routes, "_require_project_view_access", lambda request, owner, project_name: None)
    monkeypatch.setattr(
        project_routes,
        "get_project_members_by_ref",
        lambda project_ref: [
            {
                "access_via_teams": [],
                "avatar_url": None,
                "bio": None,
                "department": "Bioinformatica",
                "direct_member_role": "owner",
                "display_name": "Research Owner",
                "email": "owner@example.com",
                "has_direct_access": True,
                "id": "user-1",
                "is_owner": True,
                "member_role": "owner",
                "username": "researcher",
            }
        ],
    )

    response = client.get("/api/projects/by-ref/researcher-rna-atlas/members")

    assert response.status_code == 200
    assert response.json()["members"][0]["id"] == "user-1"
    assert response.json()["members"][0]["username"] == "researcher"


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
                "access_via_teams": [],
                "avatar_url": None,
                "bio": "Visualiza resultados y valida informes.",
                "department": None,
                "direct_member_role": "viewer",
                "display_name": "Shared Viewer",
                "email": "viewer@example.com",
                "has_direct_access": True,
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
            "access_via_teams": [],
            "avatar_url": None,
            "bio": "Visualiza resultados y valida informes.",
            "department": None,
            "direct_member_role": "viewer",
            "display_name": "Shared Viewer",
            "email": "viewer@example.com",
            "has_direct_access": True,
            "id": "user-2",
            "is_owner": False,
            "member_role": "viewer",
            "username": "viewer_user",
        },
        "message": "Proyecto compartido correctamente",
        "success": True,
    }


def test_get_project_teams_route_returns_linked_teams(client: TestClient, monkeypatch) -> None:
    from backend.app.api.routes import projects as project_routes

    monkeypatch.setattr(project_routes, "_require_project_view_access", lambda request, owner, project_name: None)
    monkeypatch.setattr(
        project_routes,
        "list_project_teams",
        lambda owner, project_name: [
            {
                "entity_name": "Universidad de Las Palmas de Gran Canaria",
                "id": "team-1",
                "linked_at": "2026-04-14T10:00:00+00:00",
                "member_count": 3,
                "member_role": "editor",
                "name": "Equipo Alpha",
                "owner_username": "researcher",
                "slug": "researcher-equipo-alpha",
            }
        ],
    )

    response = client.get("/api/projects/researcher/RNA%20Atlas/teams")

    assert response.status_code == 200
    assert response.json() == {
        "teams": [
            {
                "entity_name": "Universidad de Las Palmas de Gran Canaria",
                "id": "team-1",
                "linked_at": "2026-04-14T10:00:00+00:00",
                "member_count": 3,
                "member_role": "editor",
                "name": "Equipo Alpha",
                "owner_username": "researcher",
                "slug": "researcher-equipo-alpha",
            }
        ]
    }


def test_put_project_team_route_adds_team(client: TestClient, monkeypatch) -> None:
    from backend.app.api.routes import projects as project_routes

    monkeypatch.setattr(
        project_routes,
        "_require_project_owner",
        lambda request, owner: {"id": "user-1", "username": owner, "role": "user"},
    )
    monkeypatch.setattr(
        project_routes,
        "add_project_team",
        lambda owner, project_name, team_id, session_user_id, session_username, role, member_role: (
            True,
            "Proyecto compartido con el equipo correctamente",
        ),
    )
    monkeypatch.setattr(
        project_routes,
        "list_project_teams",
        lambda owner, project_name: [
            {
                "entity_name": None,
                "id": "team-1",
                "linked_at": "2026-04-14T10:00:00+00:00",
                "member_count": 2,
                "member_role": "viewer",
                "name": "Equipo Alpha",
                "owner_username": owner,
                "slug": "researcher-equipo-alpha",
            }
        ],
    )

    response = client.put(
        "/api/projects/researcher/RNA%20Atlas/teams/team-1",
        json={"member_role": "viewer"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "message": "Proyecto compartido con el equipo correctamente",
        "success": True,
        "team": {
            "entity_name": None,
            "id": "team-1",
            "linked_at": "2026-04-14T10:00:00+00:00",
            "member_count": 2,
            "member_role": "viewer",
            "name": "Equipo Alpha",
            "owner_username": "researcher",
            "slug": "researcher-equipo-alpha",
        },
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
            "id": "project-1",
            "name": project_name,
            "owner": owner,
            "slug": "manager-rna-atlas",
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
            "id": "project-1",
            "name": "RNA Atlas",
            "owner": "manager",
            "slug": "manager-rna-atlas",
            "status": "configured",
            "template_file": "template.xlsx",
            "updated_at": "2026-03-09T17:30:00+00:00",
        },
        "success": True,
    }
