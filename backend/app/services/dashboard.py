from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from backend.app.core.config import get_settings
from backend.app.services.projects import (
    _build_project_payload,
    list_projects_for_user,
)
from backend.app.services.supabase import SupabaseError

WORKFLOW_CATALOG: tuple[dict[str, object], ...] = (
    {
        "description": "Análisis de expresión diferencial y exploración de matrices de conteos.",
        "image_path": "/images/RNA-seq_icon.png",
        "key": "rna-seq",
        "keywords": ("rna-seq", "rna_seq", "expression"),
        "script_name": "rna-seq.Rmd",
        "title": "RNA-seq",
    },
    {
        "description": "Revisión de accesibilidad cromatínica para comparar regiones abiertas entre condiciones.",
        "image_path": "/images/ATAC-seq_icon.png",
        "key": "atac-seq",
        "keywords": ("atac-seq", "atac_seq", "accessibility"),
        "script_name": "atac-seq.Rmd",
        "title": "ATAC-seq",
    },
    {
        "description": "Seguimiento de picos, enriquecimiento y regiones reguladoras en experimentos de unión.",
        "image_path": "/images/ChIP-seq_icon.png",
        "key": "chip-seq",
        "keywords": ("chip-seq", "chip_seq", "peak", "peaks"),
        "script_name": "chip-seq.Rmd",
        "title": "ChIP-seq",
    },
    {
        "description": "Análisis de célula única para clustering, anotación y comparación de poblaciones.",
        "image_path": "/images/scRNA-seq_icon.png",
        "key": "scrna-seq",
        "keywords": ("scrna-seq", "scrna_seq", "single-cell", "single_cell", "scrna"),
        "script_name": "scrna-seq.Rmd",
        "title": "scRNA-seq",
    },
)

STATUS_LABELS = {
    "configured": "Pendientes de análisis",
    "empty": "Sin archivos",
    "results": "Resultados listos",
}

MONTH_LABELS = (
    "",
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
)


def _parse_timestamp(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None

    normalized = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _list_local_projects(session_username: str, role: str) -> list[dict[str, object]]:
    settings = get_settings()
    projects_root = settings.projects_dir
    projects_root.mkdir(parents=True, exist_ok=True)

    owners = (
        sorted(directory.name for directory in projects_root.iterdir() if directory.is_dir())
        if role == "admin"
        else [session_username]
    )

    items: list[dict[str, object]] = []
    for owner in owners:
        owner_dir = projects_root / owner
        if not owner_dir.exists():
            continue

        project_dirs = sorted(
            [directory for directory in owner_dir.iterdir() if directory.is_dir()],
            key=lambda directory: directory.name.lower(),
        )
        for project_dir in project_dirs:
            payload = _build_project_payload(owner, project_dir)
            payload["access_role"] = "owner" if owner == session_username else "viewer"
            items.append(payload)

    return items


def _list_dashboard_projects(
    session_user_id: str,
    session_username: str,
    role: str,
) -> list[dict[str, object]]:
    try:
        payload = list_projects_for_user(session_user_id, session_username, role)
        items = payload.get("items", [])
        return [item for item in items if isinstance(item, dict)]
    except SupabaseError:
        return _list_local_projects(session_username, role)


def _month_window(window_size: int) -> list[tuple[int, int, str]]:
    now = datetime.now(timezone.utc)
    current_index = now.year * 12 + (now.month - 1)
    window: list[tuple[int, int, str]] = []

    for offset in range(window_size - 1, -1, -1):
        absolute_index = current_index - offset
        year = absolute_index // 12
        month = (absolute_index % 12) + 1
        window.append((year, month, MONTH_LABELS[month]))

    return window


def _build_activity_timeline(projects: list[dict[str, object]]) -> list[dict[str, object]]:
    buckets = {
        (year, month): {
            "label": label,
            "results_ready": 0,
            "total_projects": 0,
        }
        for year, month, label in _month_window(6)
    }

    for project in projects:
        updated_at = _parse_timestamp(project.get("updated_at"))
        if not updated_at:
            continue

        bucket = buckets.get((updated_at.year, updated_at.month))
        if bucket is None:
            continue

        bucket["total_projects"] += 1
        if project.get("status") == "results":
            bucket["results_ready"] += 1

    return list(buckets.values())


def _build_status_breakdown(projects: list[dict[str, object]]) -> list[dict[str, object]]:
    counts = {"configured": 0, "empty": 0, "results": 0}

    for project in projects:
        status = str(project.get("status") or "").strip().lower()
        if status in counts:
            counts[status] += 1

    return [
        {
            "label": STATUS_LABELS[status],
            "status": status,
            "value": counts[status],
        }
        for status in ("results", "configured", "empty")
    ]


def _build_featured_projects(projects: list[dict[str, object]]) -> list[dict[str, object]]:
    status_rank = {"results": 0, "configured": 1, "empty": 2}

    def sort_key(project: dict[str, object]) -> tuple[int, float, int]:
        updated_at = _parse_timestamp(project.get("updated_at"))
        return (
            status_rank.get(str(project.get("status") or "empty"), 3),
            -(updated_at.timestamp() if updated_at else 0.0),
            -int(project.get("file_count") or 0),
        )

    items: list[dict[str, object]] = []
    for project in sorted(projects, key=sort_key)[:4]:
        files = [str(file_name) for file_name in project.get("files", []) if isinstance(file_name, str)]
        html_files = [str(file_name) for file_name in project.get("html_files", []) if isinstance(file_name, str)]
        highlight_files = (html_files + files)[:3]

        items.append(
            {
                "access_role": project.get("access_role"),
                "file_count": int(project.get("file_count") or 0),
                "highlight_files": highlight_files,
                "name": str(project.get("name") or ""),
                "owner": str(project.get("owner") or ""),
                "result_count": len(html_files),
                "status": str(project.get("status") or "empty"),
                "template_file": project.get("template_file"),
                "updated_at": str(project.get("updated_at") or ""),
            }
        )

    return items


def _build_project_activity(project: dict[str, object]) -> dict[str, object]:
    name = str(project.get("name") or "Proyecto")
    owner = str(project.get("owner") or "")
    file_count = int(project.get("file_count") or 0)
    result_count = len([item for item in project.get("html_files", []) if isinstance(item, str)])
    created_at = str(project.get("updated_at") or datetime.now(timezone.utc).isoformat())
    status = str(project.get("status") or "empty")

    if status == "results":
        title = f"{name} listo para revisar"
        description = (
            f"{owner} dispone de {result_count} informe(s) HTML y {file_count} archivo(s) asociados."
            if owner
            else f"Hay {result_count} informe(s) HTML y {file_count} archivo(s) asociados."
        )
        kind = "result"
    elif file_count > 0:
        title = f"{name} preparado para ejecutar"
        description = (
            f"El proyecto de {owner} ya tiene plantilla y archivos de entrada cargados."
            if owner
            else "El proyecto ya tiene plantilla y archivos de entrada cargados."
        )
        kind = "project"
    else:
        title = f"{name} creado"
        description = (
            f"El espacio de trabajo de {owner} ya puede recibir nuevos datos."
            if owner
            else "El espacio de trabajo ya puede recibir nuevos datos."
        )
        kind = "project"

    return {
        "created_at": created_at,
        "description": description,
        "kind": kind,
        "title": title,
    }


def _classify_sample_file(file_path: Path) -> str:
    name = file_path.name.lower()
    if name.endswith((".xls", ".xlsx")):
        return "template"
    if "count" in name:
        return "counts"
    return "other"


def _list_sample_library() -> list[dict[str, object]]:
    settings = get_settings()
    sample_dir = settings.project_root / "samples"
    if not sample_dir.exists():
        return []

    files = sorted(
        [path for path in sample_dir.rglob("*") if path.is_file()],
        key=lambda path: path.relative_to(sample_dir).as_posix().lower(),
    )

    items: list[dict[str, object]] = []
    for file_path in files:
        relative_path = file_path.relative_to(sample_dir).as_posix()
        items.append(
            {
                "kind": _classify_sample_file(file_path),
                "name": file_path.name,
                "relative_path": relative_path,
                "size_bytes": file_path.stat().st_size,
                "updated_at": datetime.fromtimestamp(
                    file_path.stat().st_mtime,
                    timezone.utc,
                ).isoformat(),
            }
        )

    return items


def _count_workflow_matches(projects: list[dict[str, object]], keywords: tuple[str, ...]) -> int:
    matches = 0
    for project in projects:
        search_index = " ".join(
            [
                str(project.get("name") or ""),
                str(project.get("template_file") or ""),
                *[str(file_name) for file_name in project.get("files", []) if isinstance(file_name, str)],
            ]
        ).lower()
        if any(keyword in search_index for keyword in keywords):
            matches += 1
    return matches


def _build_workflows(projects: list[dict[str, object]]) -> list[dict[str, object]]:
    scripts_dir = get_settings().r_scripts_dir

    items: list[dict[str, object]] = []
    for workflow in WORKFLOW_CATALOG:
        script_name = str(workflow["script_name"])
        if not (scripts_dir / script_name).exists():
            continue

        keywords = tuple(str(keyword) for keyword in workflow["keywords"])
        items.append(
            {
                "description": workflow["description"],
                "image_path": workflow["image_path"],
                "key": workflow["key"],
                "project_matches": _count_workflow_matches(projects, keywords),
                "script_name": script_name,
                "title": workflow["title"],
            }
        )

    return items


def _build_recent_activity(
    projects: list[dict[str, object]],
    sample_library: list[dict[str, object]],
) -> list[dict[str, object]]:
    project_activity = [
        _build_project_activity(project)
        for project in sorted(
            projects,
            key=lambda item: _parse_timestamp(item.get("updated_at")) or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )
    ]

    sample_activity = [
        {
            "created_at": str(sample.get("updated_at") or datetime.now(timezone.utc).isoformat()),
            "description": f"Muestra disponible: {sample['name']}",
            "kind": "sample",
            "title": "Biblioteca de ejemplos actual",
        }
        for sample in sorted(
            sample_library,
            key=lambda item: _parse_timestamp(item.get("updated_at")) or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )
    ]

    activity = project_activity + sample_activity
    activity.sort(
        key=lambda item: _parse_timestamp(item.get("created_at")) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    return activity[:5]


def _build_file_breakdown(projects: list[dict[str, object]]) -> dict[str, int]:
    templates = 0
    results = 0
    additional = 0

    for project in projects:
        template_file = project.get("template_file")
        if isinstance(template_file, str) and template_file.strip():
            templates += 1

        results += len(
            [item for item in project.get("html_files", []) if isinstance(item, str)]
        )
        additional += len(
            [item for item in project.get("additional_files", []) if isinstance(item, str)]
        )

    return {
        "additional": additional,
        "results": results,
        "templates": templates,
    }


def _build_access_summary(
    projects: list[dict[str, object]],
    session_username: str,
) -> dict[str, int]:
    owned_projects = 0
    shared_projects = 0
    editable_projects = 0

    for project in projects:
        owner = str(project.get("owner") or "").strip()
        access_role = str(project.get("access_role") or "").strip().lower()

        if owner == session_username or access_role == "owner":
            owned_projects += 1
        else:
            shared_projects += 1

        if access_role in {"owner", "editor"}:
            editable_projects += 1

    return {
        "editable_projects": editable_projects,
        "owned_projects": owned_projects,
        "shared_projects": shared_projects,
    }


def _build_quick_start_steps() -> list[dict[str, object]]:
    fallback_steps = [
        {
            "description": "Sube una de las plantillas de ejemplo al proyecto usando el nombre template.xlsx.",
            "step": 1,
            "title": "Cargar plantilla base",
        },
        {
            "description": "Añade el archivo de counts o los recursos asociados según la metadata de la plantilla.",
            "step": 2,
            "title": "Adjuntar datos de entrada",
        },
        {
            "description": "Ejecuta el proyecto y revisa el HTML generado desde el panel lateral de archivos.",
            "step": 3,
            "title": "Lanzar y revisar resultados",
        },
    ]

    readme_path = get_settings().project_root / "samples" / "README.md"
    if not readme_path.exists():
        return fallback_steps

    lines = readme_path.read_text(encoding="utf-8").splitlines()
    parsed_descriptions = [
        line.split(".", 1)[1].strip()
        for line in lines
        if line.strip().startswith(("1.", "2.", "3."))
    ]
    if len(parsed_descriptions) < 3:
        return fallback_steps

    titles = [
        "Cargar plantilla base",
        "Adjuntar datos de entrada",
        "Lanzar y revisar resultados",
    ]
    return [
        {
            "description": description,
            "step": index + 1,
            "title": titles[index],
        }
        for index, description in enumerate(parsed_descriptions[:3])
    ]


def get_dashboard_overview(
    session_user_id: str,
    session_username: str,
    role: str,
) -> dict[str, object]:
    projects = _list_dashboard_projects(session_user_id, session_username, role)
    sample_library = _list_sample_library()
    workflows = _build_workflows(projects)

    total_projects = len(projects)
    results_ready = len([project for project in projects if project.get("status") == "results"])
    pending_analysis = len([project for project in projects if project.get("status") == "configured"])
    empty_projects = len([project for project in projects if project.get("status") == "empty"])
    total_files = sum(int(project.get("file_count") or 0) for project in projects)
    distinct_owners = len(
        {
            str(project.get("owner") or "").strip()
            for project in projects
            if str(project.get("owner") or "").strip()
        }
    )
    completion_rate = round((results_ready / total_projects) * 100) if total_projects else 0

    return {
        "access_summary": _build_access_summary(projects, session_username),
        "activity_timeline": _build_activity_timeline(projects),
        "featured_projects": _build_featured_projects(projects),
        "file_breakdown": _build_file_breakdown(projects),
        "recent_activity": _build_recent_activity(projects, sample_library),
        "quick_start_steps": _build_quick_start_steps(),
        "sample_library": sample_library,
        "status_breakdown": _build_status_breakdown(projects),
        "summary": {
            "completion_rate": completion_rate,
            "distinct_owners": distinct_owners,
            "empty_projects": empty_projects,
            "pending_analysis": pending_analysis,
            "results_ready": results_ready,
            "sample_files": len(sample_library),
            "total_files": total_files,
            "total_projects": total_projects,
            "workflow_count": len(workflows),
        },
        "workflows": workflows,
    }
