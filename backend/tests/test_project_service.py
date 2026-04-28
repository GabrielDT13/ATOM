from __future__ import annotations

import asyncio
from io import BytesIO
from pathlib import Path

from backend.app.services import project_inventory as project_inventory_service
from backend.app.services import projects as project_service
from backend.app.services.project_storage import get_project_storage_dir
from fastapi import UploadFile


def _make_upload(filename: str, content: bytes) -> UploadFile:
    return UploadFile(filename=filename, file=BytesIO(content))


def test_create_project_saves_template_and_additional_files(
    isolated_app_env: dict[str, Path],
    monkeypatch,
) -> None:
    monkeypatch.setattr(project_service, "log_project_dashboard_event", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        project_service,
        "_create_project_record",
        lambda owner, project_name, entity_name=None: {
            "id": "project-1",
            "name": project_name,
            "owner_username": owner,
        },
    )
    success, message = asyncio.run(
        project_service.create_project(
            "user-1",
            "researcher",
            "RNA Atlas",
            _make_upload("study.xls", b"excel-content"),
            [_make_upload("notes.csv", b"id,value\n1,2\n")],
        )
    )

    project_dir = get_project_storage_dir("project-1")
    legacy_project_dir = isolated_app_env["projects_dir"] / "researcher" / "RNA Atlas"

    assert success is True
    assert message == "Proyecto 'RNA Atlas' creado correctamente."
    assert project_dir == isolated_app_env["projects_dir"] / "by-id" / "pr" / "project-1"
    assert not legacy_project_dir.exists()
    assert (project_dir / "template.xls").read_bytes() == b"excel-content"
    assert (project_dir / "notes.csv").read_bytes() == b"id,value\n1,2\n"


def test_get_project_dir_migrates_legacy_folder_to_canonical_storage(
    isolated_app_env: dict[str, Path],
    monkeypatch,
) -> None:
    legacy_project_dir = isolated_app_env["projects_dir"] / "researcher" / "RNA Atlas"
    legacy_project_dir.mkdir(parents=True)
    (legacy_project_dir / "template.xlsx").write_text("template", encoding="utf-8")

    monkeypatch.setattr(
        project_inventory_service,
        "fetch_one",
        lambda query, params=(): {
            "id": "project-1",
            "owner_username": "researcher",
            "name": "RNA Atlas",
        },
    )

    project_dir = project_service.get_project_dir("researcher", "RNA Atlas")

    assert project_dir == get_project_storage_dir("project-1")
    assert project_dir.exists()
    assert (project_dir / "template.xlsx").read_text(encoding="utf-8") == "template"
    assert not legacy_project_dir.exists()
    assert not (isolated_app_env["projects_dir"] / "researcher").exists()


def test_create_project_can_link_a_managed_team(
    isolated_app_env: dict[str, Path],
    monkeypatch,
) -> None:
    linked_teams: list[tuple[str, str, str, str, str]] = []

    monkeypatch.setattr(project_service, "log_project_dashboard_event", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        project_service,
        "_create_project_record",
        lambda owner, project_name, entity_name=None: {
            "id": "project-1",
            "name": project_name,
            "owner_username": owner,
        },
    )
    monkeypatch.setattr(
        project_service,
        "add_project_team",
        lambda owner, project_name, team_id, *, session_user_id, session_username, role, member_role="viewer": (
            linked_teams.append((owner, project_name, team_id, role, member_role)) or True,
            "Proyecto compartido con el equipo correctamente",
        ),
    )

    success, message = asyncio.run(
        project_service.create_project(
            "user-1",
            "researcher",
            "RNA Atlas",
            _make_upload("study.xls", b"excel-content"),
            [],
            team_id="team-1",
            actor_role="user",
        )
    )

    assert success is True
    assert message == "Proyecto 'RNA Atlas' creado correctamente."
    assert linked_teams == [("researcher", "RNA Atlas", "team-1", "user", "editor")]


def test_get_project_details_returns_structured_inventory(
    isolated_app_env: dict[str, Path],
    monkeypatch,
) -> None:
    project_dir = project_service.get_project_dir("researcher", "RNA Atlas")
    reports_dir = project_dir / "results"
    reports_dir.mkdir(parents=True)
    (project_dir / "template.xlsx").write_text("template", encoding="utf-8")
    (project_dir / "inputs.tsv").write_text("sample\tvalue\nA\t1\n", encoding="utf-8")
    (reports_dir / "index.html").write_text("<html></html>", encoding="utf-8")

    monkeypatch.setattr(project_service, "_get_project_record", lambda owner, project_name: None)

    payload = project_service.get_project_details("researcher", "RNA Atlas")

    assert payload["owner"] == "researcher"
    assert payload["name"] == "RNA Atlas"
    assert payload["template_file"] == "template.xlsx"
    assert payload["additional_files"] == ["inputs.tsv"]
    assert payload["html_files"] == ["results/index.html"]
    assert payload["file_count"] == 3
    assert payload["status"] == "results"
    assert payload["files"] == ["inputs.tsv", "results/index.html", "template.xlsx"]
    assert payload["file_entries"] == [
        {
            "extension": ".tsv",
            "kind": "additional",
            "name": "inputs.tsv",
            "path": "inputs.tsv",
            "size_bytes": len("sample\tvalue\nA\t1\n".encode("utf-8")),
        },
        {
            "extension": ".html",
            "kind": "result",
            "name": "index.html",
            "path": "results/index.html",
            "size_bytes": len("<html></html>".encode("utf-8")),
        },
        {
            "extension": ".xlsx",
            "kind": "template",
            "name": "template.xlsx",
            "path": "template.xlsx",
            "size_bytes": len("template".encode("utf-8")),
        },
    ]
    assert isinstance(payload["created_at"], str)
    assert isinstance(payload["updated_at"], str)


def test_list_projects_for_admin_returns_project_map_and_items(
    isolated_app_env: dict[str, Path],
    monkeypatch,
) -> None:
    atlas_dir = project_service.get_project_dir("researcher", "RNA Atlas")
    atlas_dir.mkdir(parents=True)
    (atlas_dir / "template.xlsx").write_text("template", encoding="utf-8")

    cell_dir = project_service.get_project_dir("principal", "Cell Map")
    cell_dir.mkdir(parents=True)
    (cell_dir / "notes.csv").write_text("notes", encoding="utf-8")

    monkeypatch.setattr(project_service, "_list_all_project_records", lambda: [])
    monkeypatch.setattr(project_service, "_list_shared_project_records", lambda user_id: [])

    payload = project_service.list_projects_for_user(
        "11111111-1111-1111-1111-111111111111",
        "researcher",
        "admin",
    )

    assert payload["projects"] == {
        "principal": ["Cell Map"],
        "researcher": ["RNA Atlas"],
    }
    assert [item["owner"] for item in payload["items"]] == ["principal", "researcher"]
    assert [item["name"] for item in payload["items"]] == ["Cell Map", "RNA Atlas"]
    assert [item["access_role"] for item in payload["items"]] == ["viewer", "owner"]
    assert payload["items"][0]["status"] == "configured"
    assert payload["items"][1]["template_file"] == "template.xlsx"


def test_list_projects_for_admin_includes_repository_records_without_local_folder(
    isolated_app_env: dict[str, Path],
    monkeypatch,
) -> None:
    atlas_dir = project_service.get_project_dir("researcher", "RNA Atlas")
    atlas_dir.mkdir(parents=True)
    (atlas_dir / "template.xlsx").write_text("template", encoding="utf-8")

    monkeypatch.setattr(project_service, "_list_shared_project_records", lambda user_id: [])
    monkeypatch.setattr(
        project_service,
        "_list_all_project_records",
        lambda: [
            {
                "created_at": "2026-03-01T10:00:00+00:00",
                "name": "Admin Seed Project",
                "owner_username": "admin",
                "updated_at": "2026-03-02T10:00:00+00:00",
            }
        ],
    )

    payload = project_service.list_projects_for_user(
        "11111111-1111-1111-1111-111111111111",
        "researcher",
        "admin",
    )

    assert payload["projects"]["admin"] == ["Admin Seed Project"]
    seeded_project = next(
        item for item in payload["items"] if item["name"] == "Admin Seed Project"
    )
    assert seeded_project["owner"] == "admin"
    assert seeded_project["access_role"] == "editor"
    assert seeded_project["file_count"] == 0
    assert seeded_project["created_at"] == "2026-03-01T10:00:00+00:00"


def test_list_projects_for_admin_falls_back_to_filesystem_timestamps_when_metadata_is_null(
    isolated_app_env: dict[str, Path],
    monkeypatch,
) -> None:
    seeded_dir = project_service.get_project_dir("admin", "Admin Seed Project")
    seeded_dir.mkdir(parents=True)

    monkeypatch.setattr(project_service, "_list_shared_project_records", lambda user_id: [])
    monkeypatch.setattr(
        project_service,
        "_list_all_project_records",
        lambda: [
            {
                "created_at": None,
                "name": "Admin Seed Project",
                "owner_username": "admin",
                "updated_at": None,
            }
        ],
    )

    payload = project_service.list_projects_for_user(
        "11111111-1111-1111-1111-111111111111",
        "researcher",
        "admin",
    )

    seeded_project = next(
        item for item in payload["items"] if item["name"] == "Admin Seed Project"
    )
    assert isinstance(seeded_project["created_at"], str)
    assert seeded_project["created_at"]
    assert isinstance(seeded_project["updated_at"], str)
    assert seeded_project["updated_at"]


def test_list_projects_for_user_includes_owned_repository_records_without_local_folder(
    monkeypatch,
) -> None:
    monkeypatch.setattr(project_service, "_list_shared_project_records", lambda user_id: [])
    monkeypatch.setattr(
        project_service,
        "_list_owned_project_records",
        lambda username: [
            {
                "created_at": "2026-03-04T10:00:00+00:00",
                "name": "Workspace Seed",
                "owner_username": username,
                "updated_at": "2026-03-05T10:00:00+00:00",
            }
        ],
    )

    payload = project_service.list_projects_for_user(
        "33333333-3333-3333-3333-333333333333",
        "userdemo",
        "user",
    )

    assert payload["projects"]["userdemo"] == ["Workspace Seed"]
    seeded_project = next(item for item in payload["items"] if item["name"] == "Workspace Seed")
    assert seeded_project["owner"] == "userdemo"
    assert seeded_project["access_role"] == "owner"
    assert seeded_project["file_count"] == 0


def test_list_sidebar_projects_for_user_builds_project_links(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        project_service,
        "list_projects_for_user",
        lambda session_user_id, session_username, role: {
            "items": [
                {
                    "access_role": "owner",
                    "file_count": 4,
                    "html_files": ["results/report.html"],
                    "id": "project-1",
                    "name": "RNA Atlas",
                    "owner": "researcher",
                    "slug": "researcher-rna-atlas",
                    "status": "results",
                    "updated_at": "2026-03-05T10:00:00+00:00",
                },
                {
                    "access_role": "viewer",
                    "file_count": 1,
                    "html_files": [],
                    "id": "project-2",
                    "name": "Shared Project",
                    "owner": "shared-lab",
                    "slug": None,
                    "status": "configured",
                    "updated_at": "2026-03-06T10:00:00+00:00",
                },
            ]
        },
    )

    payload = project_service.list_sidebar_projects_for_user(
        "user-1",
        "researcher",
        "user",
    )

    assert payload == {
        "items": [
            {
                "access_role": "owner",
                "can_run": True,
                "file_count": 4,
                "html_count": 1,
                "id": "project-1",
                "name": "RNA Atlas",
                "owner": "researcher",
                "route_ref": "researcher-rna-atlas",
                "slug": "researcher-rna-atlas",
                "status": "results",
                "updated_at": "2026-03-05T10:00:00+00:00",
            },
            {
                "access_role": "viewer",
                "can_run": False,
                "file_count": 1,
                "html_count": 0,
                "id": "project-2",
                "name": "Shared Project",
                "owner": "shared-lab",
                "route_ref": "project-2",
                "slug": None,
                "status": "configured",
                "updated_at": "2026-03-06T10:00:00+00:00",
            },
        ],
        "title": "Proyectos",
    }


def test_get_project_details_by_ref_uses_repository_metadata(
    isolated_app_env: dict[str, Path],
    monkeypatch,
) -> None:
    project_dir = project_service.get_project_dir("researcher", "RNA Atlas")
    project_dir.mkdir(parents=True)
    (project_dir / "template.xlsx").write_text("template", encoding="utf-8")

    monkeypatch.setattr(
        project_service,
        "_get_project_record_by_ref",
        lambda project_ref: {
            "id": "project-1",
            "name": "RNA Atlas",
            "owner_username": "researcher",
            "slug": project_ref,
            "created_at": "2026-03-04T09:00:00+00:00",
            "updated_at": "2026-03-05T09:00:00+00:00",
        },
    )

    payload = project_service.get_project_details_by_ref("researcher-rna-atlas")

    assert payload["id"] == "project-1"
    assert payload["slug"] == "researcher-rna-atlas"
    assert payload["owner"] == "researcher"
    assert payload["name"] == "RNA Atlas"


def test_get_project_members_by_ref_resolves_owner_and_name(monkeypatch) -> None:
    monkeypatch.setattr(
        project_service,
        "_get_project_record_by_ref",
        lambda project_ref: {
            "id": "project-1",
            "name": "RNA Atlas",
            "owner_username": "researcher",
            "slug": project_ref,
        },
    )
    monkeypatch.setattr(
        project_service,
        "get_project_members",
        lambda owner, project_name: [{"id": "user-1", "username": owner, "is_owner": True}],
    )

    members = project_service.get_project_members_by_ref("researcher-rna-atlas")

    assert members == [{"id": "user-1", "username": "researcher", "is_owner": True}]


def test_update_project_keeps_stable_storage_and_replaces_inputs_without_deleting_results(
    isolated_app_env: dict[str, Path],
    monkeypatch,
) -> None:
    monkeypatch.setattr(project_service, "log_project_dashboard_event", lambda *args, **kwargs: None)
    project_dir = project_service.get_project_dir("researcher", "RNA Atlas")
    results_dir = project_dir / "results"
    results_dir.mkdir(parents=True)
    (project_dir / "template.xlsx").write_text("old-template", encoding="utf-8")
    (project_dir / "old.csv").write_text("old", encoding="utf-8")
    (results_dir / "report.html").write_text("<html>ready</html>", encoding="utf-8")

    monkeypatch.setattr(
        project_service,
        "_upsert_project_record",
        lambda owner, project_name: {
            "id": "project-1",
            "name": project_name,
            "owner_username": owner,
        },
    )
    monkeypatch.setattr(project_service, "_get_project_record", lambda owner, project_name: None)
    monkeypatch.setattr(project_service, "_rename_project_record", lambda owner, current_name, new_name: None)

    success, message, effective_name = asyncio.run(
        project_service.update_project(
            "user-1",
            "researcher",
            "researcher",
            "RNA Atlas",
            "RNA Atlas 2026",
            _make_upload("fresh.xlsx", b"new-template"),
            [_make_upload("fresh.csv", b"fresh-data")],
        )
    )

    updated_dir = get_project_storage_dir("project-1")

    assert success is True
    assert message == "Proyecto actualizado correctamente"
    assert effective_name == "RNA Atlas 2026"
    assert not project_dir.exists()
    assert updated_dir.exists()
    assert (updated_dir / "template.xlsx").read_bytes() == b"new-template"
    assert (updated_dir / "fresh.csv").read_bytes() == b"fresh-data"
    assert not (updated_dir / "old.csv").exists()
    assert (updated_dir / "results" / "report.html").read_text(encoding="utf-8") == "<html>ready</html>"


def test_add_project_member_inserts_viewer_permission(monkeypatch) -> None:
    executed: list[tuple[str, tuple[object, ...]]] = []
    notifications: list[dict[str, object]] = []

    monkeypatch.setattr(
        project_service,
        "_upsert_project_record",
        lambda owner, project_name: {
            "id": "project-1",
            "name": project_name,
            "owner_username": owner,
            "slug": "researcher-rna-atlas",
        },
    )
    monkeypatch.setattr(
        project_service,
        "_get_profile_by_username",
        lambda username: (
            {"id": "user-owner", "username": username}
            if username == "researcher"
            else {"id": "user-2", "username": username}
        ),
    )
    monkeypatch.setattr(project_service, "_get_project_member", lambda project_id, user_id: None)
    monkeypatch.setattr(project_service, "_list_project_members_by_project_id", lambda project_id: [])
    monkeypatch.setattr(project_service, "_list_project_team_members_by_project_id", lambda project_id: [])
    monkeypatch.setattr(
        project_service,
        "notify_project_shared",
        lambda **kwargs: notifications.append(kwargs),
    )

    monkeypatch.setattr(
        project_service,
        "execute",
        lambda query, params=(): executed.append((query, params)),
    )

    success, message = project_service.add_project_member("researcher", "RNA Atlas", "viewer_user")

    assert success is True
    assert message == "Proyecto compartido correctamente"
    assert len(executed) == 1
    assert "INSERT INTO internal.project_members" in executed[0][0]
    assert notifications == [
        {
            "actor_user_id": "user-owner",
            "actor_username": "researcher",
            "member_role": "viewer",
            "project_id": "project-1",
            "project_name": "RNA Atlas",
            "project_owner_username": "researcher",
            "project_slug": "researcher-rna-atlas",
            "recipient_user_id": "user-2",
            "updated_existing_access": False,
        }
    ]


def test_remove_project_member_blocks_owner(monkeypatch) -> None:
    monkeypatch.setattr(
        project_service,
        "_upsert_project_record",
        lambda owner, project_name: {"id": "project-1", "name": project_name, "owner_username": owner},
    )
    monkeypatch.setattr(
        project_service,
        "_get_profile_by_username",
        lambda username: {"id": "user-owner", "username": username},
    )

    success, message = project_service.remove_project_member("researcher", "RNA Atlas", "researcher")

    assert success is False
    assert message == "No puedes quitar el acceso del propietario"


def test_get_project_members_returns_owner_fallback_when_repository_fails(monkeypatch) -> None:
    monkeypatch.setattr(
        project_service,
        "_upsert_project_record",
        lambda owner, project_name: (_ for _ in ()).throw(project_service.ServiceError("db missing")),
    )

    members = project_service.get_project_members("researcher", "RNA Atlas")

    assert members == [
        {
            "access_via_teams": [],
            "avatar_url": None,
            "bio": None,
            "department": None,
            "direct_member_role": "owner",
            "display_name": "researcher",
            "email": None,
            "has_direct_access": True,
            "id": "local-owner::researcher",
            "is_owner": True,
            "member_role": "owner",
            "username": "researcher",
        }
    ]


def test_get_project_members_merges_direct_and_team_access(monkeypatch) -> None:
    monkeypatch.setattr(
        project_service,
        "_upsert_project_record",
        lambda owner, project_name: {"id": "project-1", "name": project_name, "owner_username": owner},
    )
    monkeypatch.setattr(
        project_service,
        "_list_project_members_by_project_id",
        lambda project_id: [
            {
                "member_id": "user-owner",
                "member_role": "owner",
                "member_username": "researcher",
            },
            {
                "member_id": "user-direct",
                "member_role": "viewer",
                "member_username": "analyst",
            },
        ],
    )
    monkeypatch.setattr(
        project_service,
        "_list_project_team_members_by_project_id",
        lambda project_id: [
            {
                "member_id": "user-direct",
                "member_username": "analyst",
                "project_member_role": "editor",
                "team_name": "Equipo Alpha",
            },
            {
                "member_id": "user-team",
                "member_username": "collab",
                "project_member_role": "viewer",
                "team_name": "Equipo Beta",
            },
        ],
    )
    monkeypatch.setattr(
        project_service,
        "_fetch_profiles",
        lambda: [
            {"id": "user-owner", "username": "researcher", "full_name": "Research Owner"},
            {"id": "user-direct", "username": "analyst", "full_name": "Direct Analyst"},
            {"id": "user-team", "username": "collab", "full_name": "Team Collaborator"},
        ],
    )

    members = project_service.get_project_members("researcher", "RNA Atlas")

    assert members == [
        {
            "access_via_teams": [],
            "avatar_url": None,
            "bio": None,
            "department": None,
            "direct_member_role": "owner",
            "display_name": "Research Owner",
            "email": None,
            "has_direct_access": True,
            "id": "user-owner",
            "is_owner": True,
            "member_role": "owner",
            "username": "researcher",
        },
        {
            "access_via_teams": ["Equipo Alpha"],
            "avatar_url": None,
            "bio": None,
            "department": None,
            "direct_member_role": "viewer",
            "display_name": "Direct Analyst",
            "email": None,
            "has_direct_access": True,
            "id": "user-direct",
            "is_owner": False,
            "member_role": "editor",
            "username": "analyst",
        },
        {
            "access_via_teams": ["Equipo Beta"],
            "avatar_url": None,
            "bio": None,
            "department": None,
            "direct_member_role": None,
            "display_name": "Team Collaborator",
            "email": None,
            "has_direct_access": False,
            "id": "user-team",
            "is_owner": False,
            "member_role": "viewer",
            "username": "collab",
        },
    ]


def test_search_project_share_candidates_marks_direct_and_team_access(monkeypatch) -> None:
    monkeypatch.setattr(
        project_service,
        "_upsert_project_record",
        lambda owner, project_name: {"id": "project-1", "name": project_name, "owner_username": owner},
    )
    monkeypatch.setattr(
        project_service,
        "_list_project_members_by_project_id",
        lambda project_id: [
            {
                "member_id": "user-owner",
                "member_role": "owner",
                "member_username": "researcher",
            },
            {
                "member_id": "user-direct",
                "member_role": "viewer",
                "member_username": "analyst",
            },
        ],
    )
    monkeypatch.setattr(
        project_service,
        "_list_project_team_members_by_project_id",
        lambda project_id: [
            {
                "member_id": "user-direct",
                "member_username": "analyst",
                "project_member_role": "editor",
                "team_id": "team-2",
                "team_name": "Equipo Beta",
            },
            {
                "member_id": "user-team",
                "member_username": "collab",
                "project_member_role": "viewer",
                "team_id": "team-1",
                "team_name": "Equipo Alpha",
            },
        ],
    )
    monkeypatch.setattr(
        project_service,
        "_fetch_profiles",
        lambda: [
            {"id": "user-owner", "username": "researcher", "full_name": "Research Owner", "email": "owner@example.com"},
            {"id": "user-direct", "username": "analyst", "full_name": "Direct Analyst", "email": "analyst@example.com"},
            {"id": "user-team", "username": "collab", "full_name": "Team Collaborator", "email": "collab@example.com"},
            {"id": "user-free", "username": "guest", "full_name": "Guest User", "email": "guest@example.com"},
        ],
    )

    candidates = project_service.search_project_share_candidates("researcher", "RNA Atlas", "", limit=8)

    assert candidates == [
        {
            "access_via_teams": [],
            "avatar_url": None,
            "bio": None,
            "department": None,
            "direct_member_role": None,
            "display_name": "Guest User",
            "email": "guest@example.com",
            "has_direct_access": False,
            "id": "user-free",
            "member_role": None,
            "username": "guest",
        },
        {
            "access_via_teams": ["Equipo Alpha"],
            "avatar_url": None,
            "bio": None,
            "department": None,
            "direct_member_role": None,
            "display_name": "Team Collaborator",
            "email": "collab@example.com",
            "has_direct_access": False,
            "id": "user-team",
            "member_role": "viewer",
            "username": "collab",
        },
        {
            "access_via_teams": ["Equipo Beta"],
            "avatar_url": None,
            "bio": None,
            "department": None,
            "direct_member_role": "viewer",
            "display_name": "Direct Analyst",
            "email": "analyst@example.com",
            "has_direct_access": True,
            "id": "user-direct",
            "member_role": "editor",
            "username": "analyst",
        },
    ]


def test_list_project_teams_reports_direct_member_overlaps(monkeypatch) -> None:
    monkeypatch.setattr(
        project_service,
        "_upsert_project_record",
        lambda owner, project_name: {"id": "project-1", "name": project_name, "owner_username": owner},
    )
    monkeypatch.setattr(
        project_service,
        "_list_project_members_by_project_id",
        lambda project_id: [
            {
                "member_id": "user-owner",
                "member_role": "owner",
                "member_username": "researcher",
            },
            {
                "member_id": "user-direct",
                "member_role": "viewer",
                "member_username": "analyst",
            },
        ],
    )
    monkeypatch.setattr(
        project_service,
        "_list_project_team_members_by_project_id",
        lambda project_id: [
            {
                "member_id": "user-direct",
                "member_username": "analyst",
                "project_member_role": "viewer",
                "team_id": "team-1",
                "team_name": "Equipo Alpha",
            },
            {
                "member_id": "user-team",
                "member_username": "collab",
                "project_member_role": "viewer",
                "team_id": "team-1",
                "team_name": "Equipo Alpha",
            },
        ],
    )
    monkeypatch.setattr(
        project_service,
        "_list_project_teams_by_project_id",
        lambda project_id: [
            {
                "linked_at": "2026-04-14T10:00:00+00:00",
                "member_role": "viewer",
                "team_entity_name": "ULPGC",
                "team_id": "team-1",
                "team_member_count": 2,
                "team_name": "Equipo Alpha",
                "team_owner_username": "researcher",
                "team_slug": "researcher-equipo-alpha",
            }
        ],
    )

    teams = project_service.list_project_teams("researcher", "RNA Atlas")

    assert teams == [
        {
            "direct_member_overlap_count": 1,
            "direct_member_overlap_usernames": ["analyst"],
            "entity_name": "ULPGC",
            "id": "team-1",
            "linked_at": "2026-04-14T10:00:00+00:00",
            "member_count": 2,
            "member_role": "viewer",
            "name": "Equipo Alpha",
            "owner_username": "researcher",
            "slug": "researcher-equipo-alpha",
        }
    ]


def test_search_project_team_candidates_reports_direct_member_overlaps(monkeypatch) -> None:
    monkeypatch.setattr(
        project_service,
        "_upsert_project_record",
        lambda owner, project_name: {"id": "project-1", "name": project_name, "owner_username": owner},
    )
    monkeypatch.setattr(project_service, "_list_project_teams_by_project_id", lambda project_id: [])
    monkeypatch.setattr(
        project_service,
        "_list_project_members_by_project_id",
        lambda project_id: [
            {
                "member_id": "user-owner",
                "member_role": "owner",
                "member_username": "researcher",
            },
            {
                "member_id": "user-direct",
                "member_role": "viewer",
                "member_username": "analyst",
            },
        ],
    )
    monkeypatch.setattr(project_service, "_list_project_team_members_by_project_id", lambda project_id: [])
    monkeypatch.setattr(
        project_service,
        "list_teams_for_user",
        lambda session_user_id, session_username, role: [
            {
                "entity_name": "ULPGC",
                "id": "team-1",
                "member_count": 3,
                "name": "Equipo Alpha",
                "owner_username": session_username,
                "slug": "researcher-equipo-alpha",
            }
        ],
    )
    monkeypatch.setattr(
        project_service,
        "get_team_details",
        lambda team_id, session_user_id, session_username, role: {
            "members": [
                {"id": "user-direct", "username": "analyst"},
                {"id": "user-team", "username": "collab"},
            ]
        },
    )

    candidates = project_service.search_project_team_candidates(
        "researcher",
        "RNA Atlas",
        session_user_id="user-owner",
        session_username="researcher",
        role="user",
        query="",
    )

    assert candidates == [
        {
            "direct_member_overlap_count": 1,
            "direct_member_overlap_usernames": ["analyst"],
            "entity_name": "ULPGC",
            "id": "team-1",
            "linked_at": "",
            "member_count": 3,
            "member_role": "viewer",
            "name": "Equipo Alpha",
            "owner_username": "researcher",
            "slug": "researcher-equipo-alpha",
        }
    ]


def test_add_project_member_returns_controlled_error_when_repository_fails(monkeypatch) -> None:
    monkeypatch.setattr(
        project_service,
        "_upsert_project_record",
        lambda owner, project_name: (_ for _ in ()).throw(project_service.ServiceError("db missing")),
    )

    success, message = project_service.add_project_member("researcher", "RNA Atlas", "viewer_user")

    assert success is False
    assert message == "db missing"


def test_add_project_team_inserts_viewer_permission(monkeypatch) -> None:
    executed: list[tuple[str, tuple[object, ...]]] = []

    monkeypatch.setattr(
        project_service,
        "_upsert_project_record",
        lambda owner, project_name: {"id": "project-1", "name": project_name, "owner_username": owner},
    )
    monkeypatch.setattr(project_service, "_get_project_team", lambda project_id, team_id: None)
    monkeypatch.setattr(project_service, "_list_project_members_by_project_id", lambda project_id: [])
    monkeypatch.setattr(project_service, "_list_project_team_members_by_project_id", lambda project_id: [])
    monkeypatch.setattr(
        project_service,
        "list_teams_for_user",
        lambda session_user_id, session_username, role: [
            {
                "id": "team-1",
                "name": "Equipo Alpha",
                "owner_username": session_username,
            }
        ],
    )
    monkeypatch.setattr(
        project_service,
        "get_team_details",
        lambda team_id, session_user_id, session_username, role: {"members": []},
    )
    monkeypatch.setattr(
        project_service,
        "execute",
        lambda query, params=(): executed.append((query, params)),
    )

    success, message = project_service.add_project_team(
        "researcher",
        "RNA Atlas",
        "team-1",
        session_user_id="user-1",
        session_username="researcher",
        role="user",
    )

    assert success is True
    assert message == "Proyecto compartido con el equipo correctamente"
    assert len(executed) == 1
    assert "INSERT INTO internal.project_teams" in executed[0][0]
    assert executed[0][1] == ("project-1", "team-1", "viewer")


def test_transfer_project_ownership_updates_repository_without_moving_storage(
    isolated_app_env: dict[str, Path],
    monkeypatch,
) -> None:
    project_dir = project_service.get_project_dir("researcher", "RNA Atlas")
    project_dir.mkdir(parents=True)
    (project_dir / "template.xlsx").write_text("template", encoding="utf-8")
    executed: list[tuple[str, tuple[object, ...]]] = []
    notifications: list[dict[str, object]] = []

    monkeypatch.setattr(
        project_service,
        "_upsert_project_record",
        lambda owner, project_name: {
            "id": "project-1",
            "name": project_name,
            "slug": "researcher-rna-atlas",
            "owner_username": owner,
            "owner_id": "user-owner",
        },
    )
    monkeypatch.setattr(
        project_service,
        "_get_profile_by_username",
        lambda username: (
            {"id": "user-owner", "username": username}
            if username == "researcher"
            else {"id": "user-2", "username": username}
        ),
    )
    monkeypatch.setattr(
        project_service,
        "_get_project_member",
        lambda project_id, user_id: {"member_role": "editor", "member_id": user_id},
    )
    monkeypatch.setattr(project_service, "_get_project_record", lambda owner, project_name: None)

    monkeypatch.setattr(
        project_service,
        "execute",
        lambda query, params=(): executed.append((query, params)),
    )
    monkeypatch.setattr(
        project_service,
        "notify_project_ownership_transferred",
        lambda **kwargs: notifications.append(kwargs),
    )

    success, message, next_owner = project_service.transfer_project_ownership(
        "researcher",
        "RNA Atlas",
        "manager",
    )

    assert success is True
    assert message == "Propiedad del proyecto transferida correctamente"
    assert next_owner == "manager"
    assert project_dir.exists()
    assert notifications == [
        {
            "actor_user_id": "user-owner",
            "actor_username": "researcher",
            "project_id": "project-1",
            "project_name": "RNA Atlas",
            "project_slug": "researcher-rna-atlas",
            "recipient_user_id": "user-2",
        }
    ]
    assert (project_dir / "template.xlsx").exists()
    assert len(executed) == 3
    assert "UPDATE internal.projects" in executed[0][0]
    assert "INSERT INTO internal.project_members" in executed[1][0]
    assert "INSERT INTO internal.project_members" in executed[2][0]


def test_project_scripts_are_not_available_from_the_interface() -> None:
    try:
        project_service.read_project_file("researcher", "RNA Atlas/design_app_a/design_app_a.Rmd")
    except ValueError as exc:
        assert str(exc) == "Los scripts internos del análisis no están disponibles desde la interfaz."
    else:
        raise AssertionError("Se esperaba bloquear la lectura del script interno")

    try:
        project_service.get_download_path("researcher", "RNA Atlas/design_app_a/design_app_a.R")
    except ValueError as exc:
        assert str(exc) == "Los scripts internos del análisis no están disponibles desde la interfaz."
    else:
        raise AssertionError("Se esperaba bloquear la descarga del script interno")
