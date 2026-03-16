from __future__ import annotations

import asyncio
from io import BytesIO
from pathlib import Path

from backend.app.services import projects as project_service
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
        "_upsert_project_record",
        lambda owner, project_name: {"id": "project-1", "name": project_name, "owner_username": owner},
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

    project_dir = isolated_app_env["projects_dir"] / "researcher" / "RNA Atlas"

    assert success is True
    assert message == "Proyecto 'RNA Atlas' creado correctamente."
    assert (project_dir / "template.xls").read_bytes() == b"excel-content"
    assert (project_dir / "notes.csv").read_bytes() == b"id,value\n1,2\n"


def test_get_project_details_returns_structured_inventory(
    isolated_app_env: dict[str, Path],
    monkeypatch,
) -> None:
    project_dir = isolated_app_env["projects_dir"] / "researcher" / "RNA Atlas"
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
    atlas_dir = isolated_app_env["projects_dir"] / "researcher" / "RNA Atlas"
    atlas_dir.mkdir(parents=True)
    (atlas_dir / "template.xlsx").write_text("template", encoding="utf-8")

    cell_dir = isolated_app_env["projects_dir"] / "principal" / "Cell Map"
    cell_dir.mkdir(parents=True)
    (cell_dir / "notes.csv").write_text("notes", encoding="utf-8")

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


def test_update_project_renames_and_replaces_inputs_without_deleting_results(
    isolated_app_env: dict[str, Path],
    monkeypatch,
) -> None:
    monkeypatch.setattr(project_service, "log_project_dashboard_event", lambda *args, **kwargs: None)
    project_dir = isolated_app_env["projects_dir"] / "researcher" / "RNA Atlas"
    results_dir = project_dir / "results"
    results_dir.mkdir(parents=True)
    (project_dir / "template.xlsx").write_text("old-template", encoding="utf-8")
    (project_dir / "old.csv").write_text("old", encoding="utf-8")
    (results_dir / "report.html").write_text("<html>ready</html>", encoding="utf-8")

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

    updated_dir = isolated_app_env["projects_dir"] / "researcher" / "RNA Atlas 2026"

    assert success is True
    assert message == "Proyecto actualizado correctamente"
    assert effective_name == "RNA Atlas 2026"
    assert not project_dir.exists()
    assert (updated_dir / "template.xlsx").read_bytes() == b"new-template"
    assert (updated_dir / "fresh.csv").read_bytes() == b"fresh-data"
    assert not (updated_dir / "old.csv").exists()
    assert (updated_dir / "results" / "report.html").read_text(encoding="utf-8") == "<html>ready</html>"


def test_add_project_member_inserts_viewer_permission(monkeypatch) -> None:
    captured: dict[str, object] = {}

    monkeypatch.setattr(
        project_service,
        "_upsert_project_record",
        lambda owner, project_name: {"id": "project-1", "name": project_name, "owner_username": owner},
    )
    monkeypatch.setattr(
        project_service,
        "_get_profile_by_username",
        lambda username: {"id": "user-2", "username": username},
    )
    monkeypatch.setattr(project_service, "_get_project_member", lambda project_id, user_id: None)

    def fake_call_rpc_with_service_role(function_name, *, json_body=None, schema=None):
        captured["function_name"] = function_name
        captured["json_body"] = json_body
        captured["schema"] = schema
        return None

    monkeypatch.setattr(project_service, "call_rpc_with_service_role", fake_call_rpc_with_service_role)

    success, message = project_service.add_project_member("researcher", "RNA Atlas", "viewer_user")

    assert success is True
    assert message == "Proyecto compartido correctamente"
    assert captured == {
        "function_name": "admin_set_project_member",
        "json_body": {
            "p_member_role": "viewer",
            "p_project_id": "project-1",
            "p_target_user_id": "user-2",
        },
        "schema": None,
    }


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


def test_get_project_members_returns_owner_fallback_when_supabase_fails(monkeypatch) -> None:
    monkeypatch.setattr(
        project_service,
        "_upsert_project_record",
        lambda owner, project_name: (_ for _ in ()).throw(project_service.SupabaseError("rpc missing")),
    )

    members = project_service.get_project_members("researcher", "RNA Atlas")

    assert members == [
        {
            "department": None,
            "display_name": "researcher",
            "email": None,
            "id": "local-owner::researcher",
            "is_owner": True,
            "member_role": "owner",
            "username": "researcher",
        }
    ]


def test_add_project_member_returns_controlled_error_when_supabase_fails(monkeypatch) -> None:
    monkeypatch.setattr(
        project_service,
        "_upsert_project_record",
        lambda owner, project_name: (_ for _ in ()).throw(project_service.SupabaseError("rpc missing")),
    )

    success, message = project_service.add_project_member("researcher", "RNA Atlas", "viewer_user")

    assert success is False
    assert message == "rpc missing"


def test_transfer_project_ownership_moves_directory_and_updates_supabase(
    isolated_app_env: dict[str, Path],
    monkeypatch,
) -> None:
    project_dir = isolated_app_env["projects_dir"] / "researcher" / "RNA Atlas"
    project_dir.mkdir(parents=True)
    (project_dir / "template.xlsx").write_text("template", encoding="utf-8")
    captured: dict[str, object] = {}

    monkeypatch.setattr(
        project_service,
        "_upsert_project_record",
        lambda owner, project_name: {"id": "project-1", "name": project_name, "owner_username": owner},
    )
    monkeypatch.setattr(
        project_service,
        "_get_profile_by_username",
        lambda username: {"id": "user-2", "username": username},
    )
    monkeypatch.setattr(
        project_service,
        "_get_project_member",
        lambda project_id, user_id: {"member_role": "editor", "member_id": user_id},
    )

    def fake_call_rpc_with_service_role(function_name, *, json_body=None, schema=None):
        captured["function_name"] = function_name
        captured["json_body"] = json_body
        captured["schema"] = schema
        return None

    monkeypatch.setattr(project_service, "call_rpc_with_service_role", fake_call_rpc_with_service_role)

    success, message, next_owner = project_service.transfer_project_ownership(
        "researcher",
        "RNA Atlas",
        "manager",
    )

    assert success is True
    assert message == "Propiedad del proyecto transferida correctamente"
    assert next_owner == "manager"
    assert not project_dir.exists()
    assert (isolated_app_env["projects_dir"] / "manager" / "RNA Atlas" / "template.xlsx").exists()
    assert captured == {
        "function_name": "admin_transfer_project_ownership",
        "json_body": {
            "p_new_owner_user_id": "user-2",
            "p_previous_owner_role": "editor",
            "p_project_id": "project-1",
        },
        "schema": None,
    }
