import type {
  AnalysisRun,
  DashboardActivityItem,
  DashboardOverview,
  DashboardExampleFile,
  DashboardProjectHighlight,
  DashboardTimelinePoint,
  ProjectStatus,
} from "@/types/api";

type Locale = "en" | "es";

function createEmptyActivityTimeline(days = 180) {
  return createEmptyActivityTimelineForLocale(days, "es");
}

function createEmptyActivityTimelineForLocale(days: number, locale: Locale) {
  const points: DashboardTimelinePoint[] = [];
  const today = new Date();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const bucketDate = new Date(today);
    bucketDate.setDate(today.getDate() - offset);

    points.push({
      bucket_start: bucketDate.toISOString().slice(0, 10),
      completed_analyses: 0,
      label: new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
        day: "numeric",
        month: "short",
      }).format(bucketDate),
      total_events: 0,
    });
  }

  return points;
}

export function createEmptyDashboardOverview(): DashboardOverview {
  return createEmptyDashboardOverviewForLocale("es");
}

export function createEmptyDashboardOverviewForLocale(locale: Locale): DashboardOverview {
  const t = locale === "es";
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
    activity_timeline: createEmptyActivityTimelineForLocale(180, locale),
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
      { label: t ? "Resultados listos" : "Results ready", status: "results", value: 0 },
      { label: t ? "Pendientes de análisis" : "Pending analysis", status: "configured", value: 0 },
      { label: t ? "Sin archivos" : "No files", status: "empty", value: 0 },
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

export function formatNumber(value: number, locale: Locale = "es") {
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US").format(value);
}

export function formatDate(value: string, locale: Locale = "es") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return locale === "es" ? "Sin fecha" : "No date";
  }

  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatDateLong(value: string, locale: Locale = "es") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return locale === "es" ? "Sin fecha" : "No date";
  }

  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string, locale: Locale = "es") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return locale === "es" ? "Sin fecha" : "No date";
  }

  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
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

export function getStatusMeta(
  status: ProjectStatus,
  activeRun?: AnalysisRun | null,
  locale: Locale = "es",
) {
  const t = locale === "es";
  if (activeRun?.status === "queued") {
    return {
      badgeClassName: "border border-amber-200 bg-amber-50 text-amber-700",
      label: t ? "En cola" : "Queued",
      panelClassName: "from-amber-100 via-white to-amber-50",
    };
  }

  if (activeRun?.status === "running") {
    return {
      badgeClassName: "border border-violet-200 bg-violet-50 text-violet-700",
      label: t ? "Procesando" : "Processing",
      panelClassName: "from-violet-100 via-white to-violet-50",
    };
  }

  switch (status) {
    case "results":
      return {
        badgeClassName:
          "border border-emerald-200 bg-emerald-50 text-emerald-700",
        label: t ? "Resultados listos" : "Results ready",
        panelClassName: "from-emerald-100 via-white to-emerald-50",
      };
    case "configured":
      return {
        badgeClassName: "border border-sky-200 bg-sky-50 text-sky-700",
        label: t ? "Pendiente de análisis" : "Pending analysis",
        panelClassName: "from-sky-100 via-white to-sky-50",
      };
    default:
      return {
        badgeClassName: "border border-slate-200 bg-slate-50 text-slate-600",
        label: t ? "Sin archivos" : "No files",
        panelClassName: "from-slate-100 via-white to-slate-50",
      };
  }
}

export function getExampleKindMeta(exampleFile: DashboardExampleFile, locale: Locale = "es") {
  const t = locale === "es";
  switch (exampleFile.kind) {
    case "template":
      return {
        badgeClassName: "bg-sky-100 text-sky-700",
        label: t ? "Plantilla" : "Template",
      };
    case "counts":
      return {
        badgeClassName: "bg-amber-100 text-amber-700",
        label: t ? "Conteos" : "Counts",
      };
    default:
      return {
        badgeClassName: "bg-slate-100 text-slate-700",
        label: t ? "Recurso" : "Resource",
      };
  }
}

export function getProjectSupportingText(project: DashboardProjectHighlight, locale: Locale = "es") {
  const t = locale === "es";
  if (project.active_run?.status === "queued") {
    return t ? "La ejecución está en cola y arrancará automáticamente." : "Execution is queued and will start automatically.";
  }

  if (project.active_run?.status === "running") {
    return t ? "El proyecto se está procesando en segundo plano." : "Project is processing in background.";
  }

  if (project.status === "results") {
    return t
      ? `${project.result_count} informe(s) HTML listos para revisar.`
      : `${project.result_count} HTML report(s) ready to review.`;
  }

  if (project.file_count > 0) {
    return t
      ? `${project.file_count} archivo(s) listos para lanzar el flujo.`
      : `${project.file_count} file(s) ready to run workflow.`;
  }

  return t ? "Todavía no hay archivos cargados en este proyecto." : "There are no uploaded files in this project yet.";
}

export function getDashboardActivityMeta(item: DashboardActivityItem, locale: Locale = "es") {
  const t = locale === "es";
  if (item.status === "running") {
    return {
      badgeClassName: "bg-violet-100 text-violet-700",
      label: t ? "En curso" : "In progress",
    };
  }

  if (item.status === "success") {
    return {
      badgeClassName: "bg-emerald-100 text-emerald-700",
      label: t ? "Completado" : "Completed",
    };
  }

  if (item.status === "warning") {
    return {
      badgeClassName: "bg-amber-100 text-amber-700",
      label: t ? "Con incidencias" : "With issues",
    };
  }

  return {
    badgeClassName: "bg-sky-100 text-sky-700",
    label: t ? "Proyecto" : "Project",
  };
}
