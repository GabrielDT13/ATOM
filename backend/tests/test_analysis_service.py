from __future__ import annotations

import io
from pathlib import Path

from backend.app.core.config import get_settings
from backend.app.services import analysis as analysis_service
from backend.app.services.project_inventory import write_project_analysis_profile
from openpyxl import Workbook


def _write_design_workbook(target_path: Path) -> None:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "design"
    sheet.append(["designID", "analysis_type"])
    sheet.append(["D-001", "rna-seq"])
    workbook.save(target_path)


class _FakeProcess:
    def __init__(self, command: list[str]) -> None:
        self.command = command
        self.returncode = 0
        self.stdout = io.StringIO("rendering\n")

    def wait(self) -> int:
        return self.returncode


def test_iter_analysis_events_uses_enhanced_rna_seq_script_when_project_profile_requests_it(
    isolated_app_env: dict[str, Path],
    monkeypatch,
) -> None:
    settings = get_settings()
    project_dir = isolated_app_env["projects_dir"] / "researcher" / "RNA Atlas"
    project_dir.mkdir(parents=True)
    _write_design_workbook(project_dir / "template.xlsx")
    write_project_analysis_profile(project_dir, "enhanced")

    (settings.r_scripts_dir / "rna-seq.Rmd").write_text("---\ntitle: basic\n---\n", encoding="utf-8")
    (settings.r_scripts_dir / "rna-seq-pro.Rmd").write_text("---\ntitle: pro\n---\n", encoding="utf-8")

    commands: list[list[str]] = []

    def fake_popen(command, **_kwargs):
        commands.append(command)
        return _FakeProcess(command)

    monkeypatch.setattr(analysis_service, "log_analysis_dashboard_event", lambda *args, **kwargs: None)
    monkeypatch.setattr(analysis_service.subprocess, "Popen", fake_popen)
    monkeypatch.setattr(analysis_service, "clean_resultados", lambda output_dir, design_id: None)

    events = list(analysis_service.iter_analysis_events("researcher", "RNA Atlas"))

    assert any(event.get("analysis_type") == "rna-seq-pro" for event in events)
    assert commands
    assert "rna-seq-pro.Rmd" in commands[0][2]


def test_resolve_analysis_script_key_defaults_to_basic_profile(tmp_path: Path) -> None:
    project_dir = tmp_path / "project"
    project_dir.mkdir()

    assert analysis_service.resolve_analysis_script_key(project_dir, "rna-seq") == "rna-seq"
    assert analysis_service.resolve_analysis_script_key(project_dir, "chip-seq") == "chip-seq"
