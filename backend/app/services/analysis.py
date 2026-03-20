from __future__ import annotations

import json
import shutil
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from typing import Iterator

from backend.app.core.config import get_settings
from backend.app.services.dashboard_activity import log_analysis_dashboard_event
from backend.app.services.projects import get_project_dir
from openpyxl import load_workbook


def _stream_event(payload: dict[str, object]) -> str:
    return f"data:{json.dumps(payload, ensure_ascii=False)}\n\n"


def _timestamp() -> str:
    return datetime.now(UTC).isoformat()


def _log_event(
    message: str,
    *,
    level: str = "info",
    design_id: str | None = None,
    analysis_type: str | None = None,
    current_index: int | None = None,
    total_designs: int | None = None,
) -> str:
    payload: dict[str, object] = {
        "type": "log",
        "message": message,
        "level": level,
        "timestamp": _timestamp(),
    }
    if design_id is not None:
        payload["design_id"] = design_id
    if analysis_type is not None:
        payload["analysis_type"] = analysis_type
    if current_index is not None:
        payload["current_index"] = current_index
    if total_designs is not None:
        payload["total_designs"] = total_designs
    return _stream_event(payload)


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
        yield _stream_event(
            {
                "type": "run_failed",
                "message": str(exc),
                "project_name": project_name,
                "timestamp": _timestamp(),
            }
        )
        yield "data:---FIN---\n\n"
        return

    if not project_dir.exists():
        yield _stream_event(
            {
                "type": "run_failed",
                "message": "Proyecto no encontrado",
                "project_name": project_name,
                "timestamp": _timestamp(),
            }
        )
        yield "data:---FIN---\n\n"
        return

    try:
        excel_file = resolve_template_file(project_dir)
    except FileNotFoundError:
        yield _stream_event(
            {
                "type": "run_failed",
                "message": "Archivo template.xlsx no encontrado",
                "project_name": project_name,
                "timestamp": _timestamp(),
            }
        )
        yield "data:---FIN---\n\n"
        return

    try:
        workbook = load_workbook(excel_file)
    except Exception as exc:
        yield _stream_event(
            {
                "type": "run_failed",
                "message": f"No se pudo leer el Excel del proyecto: {exc}",
                "project_name": project_name,
                "timestamp": _timestamp(),
            }
        )
        yield "data:---FIN---\n\n"
        return

    if "design" not in workbook.sheetnames:
        yield _stream_event(
            {
                "type": "run_failed",
                "message": "Hoja 'design' no encontrada en template.xlsx",
                "project_name": project_name,
                "timestamp": _timestamp(),
            }
        )
        yield "data:---FIN---\n\n"
        return

    sheet = workbook["design"]
    try:
        headers = [cell for cell in next(sheet.iter_rows(values_only=True))]
    except StopIteration:
        yield _stream_event(
            {
                "type": "run_failed",
                "message": "La hoja 'design' está vacía",
                "project_name": project_name,
                "timestamp": _timestamp(),
            }
        )
        yield "data:---FIN---\n\n"
        return
    rows = list(sheet.iter_rows(min_row=2, values_only=True))
    total_designs = sum(
        1
        for row in rows
        if dict(zip(headers, row)).get("designID") and dict(zip(headers, row)).get("analysis_type")
    )
    processed_designs = 0

    yield _stream_event(
        {
            "type": "run_started",
            "project_name": project_name,
            "timestamp": _timestamp(),
            "total_designs": total_designs,
        }
    )

    if total_designs == 0:
        yield _log_event(
            "No se encontraron filas válidas en la hoja 'design' para ejecutar el informe.",
            level="warning",
            total_designs=0,
        )
        yield _stream_event(
            {
                "type": "run_completed",
                "project_name": project_name,
                "timestamp": _timestamp(),
                "total_designs": 0,
                "processed_designs": 0,
            }
        )
        yield "data:---FIN---\n\n"
        return

    for row_index, row in enumerate(rows, start=1):
        record = dict(zip(headers, row))
        design_id = record.get("designID")
        analysis_type = record.get("analysis_type")

        if not design_id or not analysis_type:
            yield _log_event(
                "Se omite una fila de la hoja 'design' porque no incluye designID o analysis_type.",
                level="warning",
                current_index=row_index,
                total_designs=total_designs,
            )
            continue

        design_started_at = datetime.now(UTC)
        design_id_str = str(design_id)
        analysis_type_str = str(analysis_type)
        design_dir = project_dir / str(design_id)
        design_dir.mkdir(parents=True, exist_ok=True)

        rmd_file = settings.r_scripts_dir / f"{analysis_type}.Rmd"
        if not rmd_file.exists():
            yield _stream_event(
                {
                    "type": "design_failed",
                    "analysis_type": analysis_type_str,
                    "current_index": processed_designs + 1,
                    "design_id": design_id_str,
                    "message": f"Rmd file not found for analysis_type: {analysis_type}",
                    "timestamp": _timestamp(),
                    "total_designs": total_designs,
                }
            )
            processed_designs += 1
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
            analysis_type=analysis_type_str,
            description=f"Se ha iniciado la ejecución de {analysis_type}.Rmd para {design_id}.",
            design_id=design_id_str,
            project_name=project_name,
            title=f"Análisis iniciado en {project_name}",
        )
        yield _stream_event(
            {
                "type": "design_started",
                "analysis_type": analysis_type_str,
                "current_index": processed_designs + 1,
                "design_id": design_id_str,
                "message": f"Running analysis for designID {design_id} using {analysis_type}.Rmd",
                "timestamp": _timestamp(),
                "total_designs": total_designs,
            }
        )

        try:
            process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )
        except FileNotFoundError:
            yield _stream_event(
                {
                    "type": "design_failed",
                    "analysis_type": analysis_type_str,
                    "current_index": processed_designs + 1,
                    "design_id": design_id_str,
                    "message": "Rscript no está disponible en el entorno actual",
                    "timestamp": _timestamp(),
                    "total_designs": total_designs,
                }
            )
            processed_designs += 1
            continue
        except Exception as exc:
            yield _stream_event(
                {
                    "type": "design_failed",
                    "analysis_type": analysis_type_str,
                    "current_index": processed_designs + 1,
                    "design_id": design_id_str,
                    "message": f"No se pudo iniciar el análisis: {exc}",
                    "timestamp": _timestamp(),
                    "total_designs": total_designs,
                }
            )
            processed_designs += 1
            continue

        if process.stdout:
            for line in iter(process.stdout.readline, ""):
                if not line:
                    break
                yield _log_event(
                    line.strip(),
                    analysis_type=analysis_type_str,
                    current_index=processed_designs + 1,
                    design_id=design_id_str,
                    total_designs=total_designs,
                )

        process.wait()
        duration_seconds = max(
            0.0,
            (datetime.now(UTC) - design_started_at).total_seconds(),
        )
        if process.returncode == 0:
            _log_analysis_event(
                "analysis_completed",
                username=username,
                analysis_type=analysis_type_str,
                description=f"El análisis {analysis_type}.Rmd para {design_id} terminó correctamente.",
                design_id=design_id_str,
                project_name=project_name,
                title=f"Análisis completado en {project_name}",
            )
            yield _stream_event(
                {
                    "type": "design_completed",
                    "analysis_type": analysis_type_str,
                    "current_index": processed_designs + 1,
                    "design_id": design_id_str,
                    "duration_seconds": duration_seconds,
                    "message": f"Finished analysis for designID {design_id}",
                    "timestamp": _timestamp(),
                    "total_designs": total_designs,
                }
            )
        else:
            _log_analysis_event(
                "analysis_failed",
                username=username,
                analysis_type=analysis_type_str,
                description=f"El análisis {analysis_type}.Rmd para {design_id} terminó con código {process.returncode}.",
                design_id=design_id_str,
                project_name=project_name,
                title=f"Análisis con incidencias en {project_name}",
            )
            yield _stream_event(
                {
                    "type": "design_failed",
                    "analysis_type": analysis_type_str,
                    "current_index": processed_designs + 1,
                    "design_id": design_id_str,
                    "duration_seconds": duration_seconds,
                    "exit_code": process.returncode,
                    "message": f"El análisis de {design_id} terminó con código {process.returncode}",
                    "timestamp": _timestamp(),
                    "total_designs": total_designs,
                }
            )

        if design_dir.exists():
            try:
                clean_resultados(design_dir, str(design_id))
                yield _stream_event(
                    {
                        "type": "cleanup_completed",
                        "analysis_type": analysis_type_str,
                        "current_index": processed_designs + 1,
                        "design_id": design_id_str,
                        "message": f"Cleaned {design_id} folder, kept only HTML/ZIP/Excel",
                        "timestamp": _timestamp(),
                        "total_designs": total_designs,
                    }
                )
            except Exception as exc:
                yield _stream_event(
                    {
                        "type": "cleanup_failed",
                        "analysis_type": analysis_type_str,
                        "current_index": processed_designs + 1,
                        "design_id": design_id_str,
                        "message": f"WARNING: Could not clean Resultados folder: {exc}",
                        "timestamp": _timestamp(),
                        "total_designs": total_designs,
                    }
                )

        processed_designs += 1

    yield _stream_event(
        {
            "type": "run_completed",
            "project_name": project_name,
            "timestamp": _timestamp(),
            "total_designs": total_designs,
            "processed_designs": processed_designs,
        }
    )
    yield "data:---FIN---\n\n"
