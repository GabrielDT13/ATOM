from __future__ import annotations

import shutil
import subprocess
from pathlib import Path
from typing import Iterator

from backend.app.core.config import get_settings
from backend.app.services.dashboard_activity import log_analysis_dashboard_event
from backend.app.services.projects import get_project_dir
from openpyxl import load_workbook


def clean_resultados(output_dir: Path, design_id: str) -> None:
    keep_ext = {".html", ".zip", ".xlsx", ".docx", ".Rmd"}
    keep_files = {
        output_dir / f"{design_id}.html",
        output_dir / f"{design_id}.zip",
        output_dir / f"{design_id}.xlsx",
        output_dir / f"{design_id}.docx",
        output_dir / f"{design_id}.Rmd",
    }

    for item in output_dir.iterdir():
        if item in keep_files or item.suffix in keep_ext:
            continue
        if item.is_dir():
            shutil.rmtree(item)
        else:
            item.unlink()


def resolve_template_file(project_dir: Path) -> Path:
    preferred = project_dir / "template.xlsx"
    if preferred.exists():
        return preferred

    for candidate in sorted(project_dir.iterdir()):
        if candidate.is_file() and candidate.suffix.lower() in {".xlsx", ".xls"}:
            return candidate
    raise FileNotFoundError("Archivo template.xlsx no encontrado")


def _log_analysis_event(
    kind: str,
    *,
    username: str,
    analysis_type: str,
    design_id: str,
    project_name: str,
    title: str,
    description: str,
) -> None:
    log_analysis_dashboard_event(
        kind,
        actor_username=username,
        analysis_type=analysis_type,
        description=description,
        design_id=design_id,
        project_name=project_name,
        project_owner_username=username,
        title=title,
    )


def stream_analysis(username: str, project_name: str) -> Iterator[str]:
    settings = get_settings()
    try:
        project_dir = get_project_dir(username, project_name)
    except ValueError as exc:
        yield f"data:{exc}\n\n"
        yield "data:---FIN---\n\n"
        return

    if not project_dir.exists():
        yield "data:Proyecto no encontrado\n\n"
        yield "data:---FIN---\n\n"
        return

    try:
        excel_file = resolve_template_file(project_dir)
    except FileNotFoundError:
        yield "data:Archivo template.xlsx no encontrado\n\n"
        yield "data:---FIN---\n\n"
        return

    try:
        workbook = load_workbook(excel_file)
    except Exception as exc:
        yield f"data:No se pudo leer el Excel del proyecto: {exc}\n\n"
        yield "data:---FIN---\n\n"
        return

    if "design" not in workbook.sheetnames:
        yield "data:Hoja 'design' no encontrada en template.xlsx\n\n"
        yield "data:---FIN---\n\n"
        return

    sheet = workbook["design"]
    try:
        headers = [cell for cell in next(sheet.iter_rows(values_only=True))]
    except StopIteration:
        yield "data:La hoja 'design' está vacía\n\n"
        yield "data:---FIN---\n\n"
        return
    rows = list(sheet.iter_rows(min_row=2, values_only=True))

    for row in rows:
        record = dict(zip(headers, row))
        design_id = record.get("designID")
        analysis_type = record.get("analysis_type")

        if not design_id or not analysis_type:
            yield "data:Skipping row with missing designID or analysis_type\n\n"
            continue

        design_dir = project_dir / str(design_id)
        design_dir.mkdir(parents=True, exist_ok=True)

        rmd_file = settings.r_scripts_dir / f"{analysis_type}.Rmd"
        if not rmd_file.exists():
            yield f"data:Rmd file not found for analysis_type: {analysis_type}\n\n"
            continue

        output_file = design_dir / f"{design_id}.html"
        command = [
            "Rscript",
            "-e",
            (
                f'rmarkdown::render("{rmd_file}", '
                f'output_file="{output_file}", '
                f'params=list(designID="{design_id}", '
                f'base_dir="{settings.project_root}", '
                f'project_dir="{project_dir}", '
                f'design_dir="{design_dir}"))'
            ),
        ]

        _log_analysis_event(
            "analysis_started",
            username=username,
            analysis_type=str(analysis_type),
            description=f"Se ha iniciado la ejecución de {analysis_type}.Rmd para {design_id}.",
            design_id=str(design_id),
            project_name=project_name,
            title=f"Análisis iniciado en {project_name}",
        )
        yield f"data:Running analysis for designID {design_id} using {analysis_type}.Rmd\n\n"

        try:
            process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )
        except FileNotFoundError:
            yield "data:Rscript no está disponible en el entorno actual\n\n"
            continue
        except Exception as exc:
            yield f"data:No se pudo iniciar el análisis: {exc}\n\n"
            continue

        if process.stdout:
            for line in iter(process.stdout.readline, ""):
                if not line:
                    break
                yield f"data:{line.strip()}\n\n"

        process.wait()
        if process.returncode == 0:
            _log_analysis_event(
                "analysis_completed",
                username=username,
                analysis_type=str(analysis_type),
                description=f"El análisis {analysis_type}.Rmd para {design_id} terminó correctamente.",
                design_id=str(design_id),
                project_name=project_name,
                title=f"Análisis completado en {project_name}",
            )
            yield f"data:Finished analysis for designID {design_id}\n\n"
        else:
            _log_analysis_event(
                "analysis_failed",
                username=username,
                analysis_type=str(analysis_type),
                description=f"El análisis {analysis_type}.Rmd para {design_id} terminó con código {process.returncode}.",
                design_id=str(design_id),
                project_name=project_name,
                title=f"Análisis con incidencias en {project_name}",
            )
            yield (
                f"data:El análisis de {design_id} terminó con código {process.returncode}\n\n"
            )

        if design_dir.exists():
            try:
                clean_resultados(design_dir, str(design_id))
                yield f"data:Cleaned {design_id} folder, kept only HTML/ZIP/Excel\n\n"
            except Exception as exc:
                yield f"data:WARNING: Could not clean Resultados folder: {exc}\n\n"

    yield "data:---FIN---\n\n"
