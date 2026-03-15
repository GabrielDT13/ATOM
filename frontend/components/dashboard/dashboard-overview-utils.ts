import type {
  DashboardProjectHighlight,
  DashboardSampleFile,
  ProjectStatus,
} from "@/types/api";

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

export function getSampleKindMeta(sample: DashboardSampleFile) {
  switch (sample.kind) {
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
