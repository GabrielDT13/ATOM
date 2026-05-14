from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from backend.app.core.config import get_settings
from backend.app.services.dashboard_activity import list_dashboard_events
from backend.app.services.dashboard_examples import load_public_examples_catalog
from backend.app.services.errors import ServiceError
from backend.app.services.project_storage import list_legacy_owner_names, list_legacy_project_dirs
from backend.app.services.projects import (
    _build_project_payload,
    list_projects_for_user,
)

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

ACTIVITY_TIMELINE_DAYS = 180


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
    get_settings().projects_dir.mkdir(parents=True, exist_ok=True)
    owners = list_legacy_owner_names() if role == "admin" else [session_username]

    items: list[dict[str, object]] = []
    for owner in owners:
        for project_dir in list_legacy_project_dirs(owner):
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
    except ServiceError:
        return _list_local_projects(session_username, role)


def _day_window(window_size: int) -> list[date]:
    today = datetime.now(timezone.utc).date()
    return [today - timedelta(days=offset) for offset in range(window_size - 1, -1, -1)]


def _format_day_label(day: date) -> str:
    return f"{day.day} {MONTH_LABELS[day.month]}"


def _build_activity_timeline(
    events: list[dict[str, object]],
    visible_project_keys: set[tuple[str, str]],
) -> list[dict[str, object]]:
    timeline_days = _day_window(ACTIVITY_TIMELINE_DAYS)
    buckets = {
        day.isoformat(): {
            "bucket_start": day.isoformat(),
            "completed_analyses": 0,
            "label": _format_day_label(day),
            "total_events": 0,
        }
        for day in timeline_days
    }

    for event in events:
        owner = str(event.get("project_owner_username") or "").strip()
        project_name = str(event.get("project_name") or "").strip()
        if (owner, project_name) not in visible_project_keys:
            continue

        created_at = _parse_timestamp(event.get("created_at"))
        if not created_at:
            continue

        bucket = buckets.get(created_at.date().isoformat())
        if bucket is None:
            continue

        bucket["total_events"] += 1
        if event.get("activity_type") == "analysis_completed":
            bucket["completed_analyses"] += 1

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
                "active_run": project.get("active_run"),
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


def _event_ui_kind(activity_type: str) -> str:
    if activity_type == "analysis_completed":
        return "result"
    if activity_type.startswith("analysis_"):
        return "analysis"
    return "project"


def _event_status(activity_type: str) -> str:
    if activity_type == "analysis_completed":
        return "success"
    if activity_type == "analysis_failed":
        return "warning"
    if activity_type == "analysis_started":
        return "running"
    return "info"


def _filter_visible_events(
    events: list[dict[str, object]],
    visible_project_keys: set[tuple[str, str]],
) -> list[dict[str, object]]:
    items: list[dict[str, object]] = []
    for event in events:
        owner = str(event.get("project_owner_username") or "").strip()
        project_name = str(event.get("project_name") or "").strip()
        if (owner, project_name) not in visible_project_keys:
            continue
        items.append(event)
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
    events: list[dict[str, object]],
    visible_project_keys: set[tuple[str, str]],
) -> list[dict[str, object]]:
    visible_events = _filter_visible_events(events, visible_project_keys)
    activity_items: list[dict[str, object]] = []
    for event in visible_events:
        kind = str(event.get("activity_type") or "").strip().lower()
        activity_items.append(
            {
                "analysis_type": str(event.get("analysis_type") or "").strip() or None,
                "created_at": str(event.get("created_at") or datetime.now(timezone.utc).isoformat()),
                "description": str(event.get("description") or "").strip(),
                "design_id": str(event.get("design_id") or "").strip() or None,
                "kind": _event_ui_kind(kind),
                "owner": str(event.get("project_owner_username") or "").strip() or None,
                "project_name": str(event.get("project_name") or "").strip() or None,
                "status": _event_status(kind),
                "title": str(event.get("title") or "").strip() or "Actividad registrada",
            }
        )
        if len(activity_items) >= 5:
            break

    return activity_items


def _build_activity_summary(
    events: list[dict[str, object]],
    visible_project_keys: set[tuple[str, str]],
) -> dict[str, object]:
    visible_events = _filter_visible_events(events, visible_project_keys)
    summary = {
        "analyses_completed": 0,
        "analyses_failed": 0,
        "analyses_started": 0,
        "last_event_at": None,
        "project_events": 0,
        "total_events": len(visible_events),
    }

    latest_timestamp: datetime | None = None
    for event in visible_events:
        activity_type = str(event.get("activity_type") or "").strip().lower()
        created_at = _parse_timestamp(event.get("created_at"))
        if created_at and (latest_timestamp is None or created_at > latest_timestamp):
            latest_timestamp = created_at

        if activity_type == "analysis_started":
            summary["analyses_started"] += 1
        elif activity_type == "analysis_completed":
            summary["analyses_completed"] += 1
        elif activity_type == "analysis_failed":
            summary["analyses_failed"] += 1
        else:
            summary["project_events"] += 1

    summary["last_event_at"] = latest_timestamp.isoformat() if latest_timestamp else None
    return summary


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


def get_dashboard_overview(
    session_user_id: str,
    session_username: str,
    role: str,
) -> dict[str, object]:
    projects = _list_dashboard_projects(session_user_id, session_username, role)
    dashboard_events = list_dashboard_events()
    visible_project_keys = {
        (
            str(project.get("owner") or "").strip(),
            str(project.get("name") or "").strip(),
        )
        for project in projects
        if str(project.get("owner") or "").strip() and str(project.get("name") or "").strip()
    }
    public_examples = load_public_examples_catalog()
    example_library = public_examples["example_library"]
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
        "activity_summary": _build_activity_summary(
            dashboard_events,
            visible_project_keys,
        ),
        "activity_timeline": _build_activity_timeline(
            dashboard_events,
            visible_project_keys,
        ),
        "featured_projects": _build_featured_projects(projects),
        "file_breakdown": _build_file_breakdown(projects),
        "recent_activity": _build_recent_activity(
            dashboard_events,
            visible_project_keys,
        ),
        "quick_start_steps": public_examples["quick_start_steps"],
        "example_library": example_library,
        "status_breakdown": _build_status_breakdown(projects),
        "summary": {
            "completion_rate": completion_rate,
            "distinct_owners": distinct_owners,
            "empty_projects": empty_projects,
            "example_files": len(example_library),
            "pending_analysis": pending_analysis,
            "results_ready": results_ready,
            "total_files": total_files,
            "total_projects": total_projects,
            "workflow_count": len(workflows),
        },
        "workflows": workflows,
    }
