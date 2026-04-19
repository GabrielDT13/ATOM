import { resolveProjectRouteRef } from "@/lib/projects";
import type {
  AnalysisRun,
  ProjectMemberRole,
  ProjectStatus,
  ProjectSummary,
} from "@/types/api";

export type ProjectStatusFilter = "all" | ProjectStatus;
export type ProjectOwnerFilter = "all" | string;

export type ProjectRecord = ProjectSummary & {
  additionalFiles: string[];
  accessRole: ProjectMemberRole;
  activeRun: AnalysisRun | null;
  htmlFiles: string[];
  id: string;
  routeRef: string;
  slug: string | null;
  templateFile: string | null;
};

export function buildProjectRecords(projects: ProjectSummary[]) {
  return projects
    .map((project) => ({
      ...project,
      additionalFiles: project.additional_files,
      accessRole: project.access_role ?? "owner",
      activeRun: project.active_run ?? null,
      htmlFiles: project.html_files,
      id: project.id?.trim() || `${project.owner}::${project.name}`,
      routeRef: resolveProjectRouteRef(project) ?? `${project.owner}::${project.name}`,
      slug: project.slug?.trim() || null,
      templateFile: project.template_file,
    }))
    .sort(
      (left, right) =>
        left.owner.localeCompare(right.owner, "es", { sensitivity: "base" }) ||
        left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
    );
}

export function filterProjects(
  projects: ProjectRecord[],
  search: string,
  statusFilter: ProjectStatusFilter,
  ownerFilter: ProjectOwnerFilter,
) {
  const normalizedSearch = search.trim().toLowerCase();

  return projects.filter((project) => {
    if (statusFilter !== "all" && project.status !== statusFilter) {
      return false;
    }

    if (ownerFilter !== "all" && project.owner !== ownerFilter) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const searchIndex = [
      project.name,
      project.owner,
      project.entity_name ?? "",
      project.templateFile ?? "",
      ...project.additionalFiles,
      ...project.htmlFiles,
    ]
      .join(" ")
      .toLowerCase();

    return searchIndex.includes(normalizedSearch);
  });
}

export function getProjectOwners(projects: ProjectRecord[]) {
  return [...new Set(projects.map((project) => project.owner))].sort((left, right) =>
    left.localeCompare(right, "es", { sensitivity: "base" }),
  );
}

export function getProjectStatusMeta(status: ProjectStatus, activeRun?: AnalysisRun | null) {
  if (activeRun?.status === "queued") {
    return {
      accentClassName: "bg-amber-100 text-amber-700",
      badgeClassName: "border border-amber-200 bg-amber-50 text-amber-700",
      description: "El proyecto está en cola y se ejecutará en segundo plano en cuanto el worker lo recoja.",
      label: "En cola",
      panelClassName: "from-amber-100 via-white to-amber-50",
    };
  }

  if (activeRun?.status === "running") {
    return {
      accentClassName: "bg-violet-100 text-violet-700",
      badgeClassName: "border border-violet-200 bg-violet-50 text-violet-700",
      description: "El proyecto se está procesando en segundo plano y seguirá avanzando aunque salgas de esta vista.",
      label: "Procesando",
      panelClassName: "from-violet-100 via-white to-violet-50",
    };
  }

  switch (status) {
    case "results":
      return {
        accentClassName: "bg-emerald-100 text-emerald-700",
        badgeClassName:
          "border border-emerald-200 bg-emerald-50 text-emerald-700",
        description: "El proyecto ya tiene entregables HTML listos para revisar.",
        label: "Resultados listos",
        panelClassName: "from-emerald-100 via-white to-emerald-50",
      };
    case "configured":
      return {
        accentClassName: "bg-sky-100 text-sky-700",
        badgeClassName: "border border-sky-200 bg-sky-50 text-sky-700",
        description: "El proyecto tiene archivos cargados, pero aún no hay resultados HTML.",
        label: "Pendiente de análisis",
        panelClassName: "from-sky-100 via-white to-sky-50",
      };
    default:
      return {
        accentClassName: "bg-slate-100 text-slate-700",
        badgeClassName: "border border-slate-200 bg-slate-50 text-slate-600",
        description: "Todavía no hay archivos disponibles en el inventario del proyecto.",
        label: "Sin archivos",
        panelClassName: "from-slate-100 via-white to-slate-50",
      };
  }
}

export function getProjectSummaryMetrics(projects: ProjectRecord[]) {
  const totalFiles = projects.reduce((total, project) => total + project.files.length, 0);
  const resultsReady = projects.filter((project) => project.status === "results").length;
  const owners = getProjectOwners(projects).length;

  return {
    owners,
    resultsReady,
    totalFiles,
    totalProjects: projects.length,
  };
}

export function getProjectPreviewFiles(project: ProjectRecord, limit = 2) {
  return project.files.slice(0, limit);
}
