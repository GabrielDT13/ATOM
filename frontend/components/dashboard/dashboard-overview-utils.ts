import type {
  DashboardActivityItem,
  DashboardOverview,
  DashboardExampleFile,
  DashboardProjectHighlight,
  DashboardTimelinePoint,
  ProjectStatus,
} from "@/types/api";

function createEmptyActivityTimeline(days = 180) {
  const points: DashboardTimelinePoint[] = [];
  const today = new Date();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const bucketDate = new Date(today);
    bucketDate.setDate(today.getDate() - offset);

    points.push({
      bucket_start: bucketDate.toISOString().slice(0, 10),
      completed_analyses: 0,
      label: new Intl.DateTimeFormat("es-ES", {
        day: "numeric",
        month: "short",
      }).format(bucketDate),
      total_events: 0,
    });
  }

  return points;
}

export function createEmptyDashboardOverview(): DashboardOverview {
  return {
    access_summary: {
      editable_projects: 0,
      owned_projects: 0,
      shared_projects: 0,
    },
    activity_summary: {
      total_events: 0,
      analyses_started: 0,
      analyses_completed: 0,
      analyses_failed: 0,
      project_events: 0,
      last_event_at: null,
    },
    activity_timeline: createEmptyActivityTimeline(),
    featured_projects: [],
    file_breakdown: {
      additional: 0,
      results: 0,
      templates: 0,
    },
    quick_start_steps: [],
    recent_activity: [],
    example_library: [],
    status_breakdown: [
      { label: "Resultados listos", status: "results", value: 0 },
      { label: "Pendientes de análisis", status: "configured", value: 0 },
      { label: "Sin archivos", status: "empty", value: 0 },
    ],
    summary: {
      completion_rate: 0,
      distinct_owners: 0,
      empty_projects: 0,
      example_files: 0,
      pending_analysis: 0,
      results_ready: 0,
      total_files: 0,
      total_projects: 0,
      workflow_count: 0,
    },
    workflows: [],
  };
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("es-ES").format(value);
}

export function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatDateLong(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatBytes(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = sizeBytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}

export function getStatusMeta(status: ProjectStatus) {
  switch (status) {
    case "results":
      return {
        badgeClassName:
          "border border-emerald-200 bg-emerald-50 text-emerald-700",
        label: "Resultados listos",
        panelClassName: "from-emerald-100 via-white to-emerald-50",
      };
    case "configured":
      return {
        badgeClassName: "border border-sky-200 bg-sky-50 text-sky-700",
        label: "Pendiente de análisis",
        panelClassName: "from-sky-100 via-white to-sky-50",
      };
    default:
      return {
        badgeClassName: "border border-slate-200 bg-slate-50 text-slate-600",
        label: "Sin archivos",
        panelClassName: "from-slate-100 via-white to-slate-50",
      };
  }
}

export function getExampleKindMeta(exampleFile: DashboardExampleFile) {
  switch (exampleFile.kind) {
    case "template":
      return {
        badgeClassName: "bg-sky-100 text-sky-700",
        label: "Plantilla",
      };
    case "counts":
      return {
        badgeClassName: "bg-amber-100 text-amber-700",
        label: "Conteos",
      };
    default:
      return {
        badgeClassName: "bg-slate-100 text-slate-700",
        label: "Recurso",
      };
  }
}

export function getProjectSupportingText(project: DashboardProjectHighlight) {
  if (project.status === "results") {
    return `${project.result_count} informe(s) HTML listos para revisar.`;
  }

  if (project.file_count > 0) {
    return `${project.file_count} archivo(s) listos para lanzar el flujo.`;
  }

  return "Todavía no hay archivos cargados en este proyecto.";
}

export function getDashboardActivityMeta(item: DashboardActivityItem) {
  if (item.status === "running") {
    return {
      badgeClassName: "bg-violet-100 text-violet-700",
      label: "En curso",
    };
  }

  if (item.status === "success") {
    return {
      badgeClassName: "bg-emerald-100 text-emerald-700",
      label: "Completado",
    };
  }

  if (item.status === "warning") {
    return {
      badgeClassName: "bg-amber-100 text-amber-700",
      label: "Con incidencias",
    };
  }

  return {
    badgeClassName: "bg-sky-100 text-sky-700",
    label: "Proyecto",
  };
}
