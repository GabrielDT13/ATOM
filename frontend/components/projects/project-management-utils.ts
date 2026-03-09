import type { ProjectDetails, ProjectMapResponse } from "@/types/api";

export type ProjectStatus = "results" | "configured" | "empty";
export type ProjectStatusFilter = "all" | ProjectStatus;
export type ProjectOwnerFilter = "all" | string;

export type ProjectRecord = ProjectDetails & {
  additionalFiles: string[];
  htmlFiles: string[];
  id: string;
  status: ProjectStatus;
  templateFile: string | null;
};

const TEMPLATE_EXTENSIONS = new Set([".xls", ".xlsx"]);
const REPORT_EXTENSIONS = new Set([".html", ".htm"]);

function getFileExtension(filename: string) {
  const segments = filename.toLowerCase().split(".");
  return segments.length > 1 ? `.${segments.at(-1)}` : "";
}

function isTemplateFile(filename: string) {
  const lowerFilename = filename.toLowerCase();
  return lowerFilename === "template.xlsx" || TEMPLATE_EXTENSIONS.has(getFileExtension(filename));
}

function isReportFile(filename: string) {
  return REPORT_EXTENSIONS.has(getFileExtension(filename));
}

export function buildProjectDetailsMap(detailsList: ProjectDetails[]) {
  return new Map(detailsList.map((details) => [`${details.owner}::${details.name}`, details]));
}

export function buildProjectRecords(
  projectMap: ProjectMapResponse["projects"],
  detailsList: ProjectDetails[],
) {
  const detailsMap = buildProjectDetailsMap(detailsList);

  return Object.entries(projectMap)
    .flatMap(([owner, projectNames]) =>
      projectNames.map((projectName) => {
        const fallbackDetails: ProjectDetails = {
          files: [],
          name: projectName,
          owner,
        };
        const details = detailsMap.get(`${owner}::${projectName}`) ?? fallbackDetails;
        const templateFile = details.files.find(isTemplateFile) ?? null;
        const htmlFiles = details.files.filter(isReportFile);
        const additionalFiles = details.files.filter(
          (file) => file !== templateFile && !isReportFile(file),
        );

        let status: ProjectStatus = "empty";
        if (htmlFiles.length > 0) {
          status = "results";
        } else if (details.files.length > 0) {
          status = "configured";
        }

        return {
          ...details,
          additionalFiles,
          htmlFiles,
          id: `${owner}::${details.name}`,
          status,
          templateFile,
        } satisfies ProjectRecord;
      }),
    )
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

export function getProjectStatusMeta(status: ProjectStatus) {
  switch (status) {
    case "results":
      return {
        accentClassName: "bg-emerald-100 text-emerald-700",
        badgeClassName:
          "border border-emerald-200 bg-emerald-50 text-emerald-700",
        description: "El proyecto ya tiene entregables HTML listos para revisar.",
        label: "Resultados listos",
      };
    case "configured":
      return {
        accentClassName: "bg-sky-100 text-sky-700",
        badgeClassName: "border border-sky-200 bg-sky-50 text-sky-700",
        description: "El proyecto tiene archivos cargados, pero aún no hay resultados HTML.",
        label: "Pendiente de análisis",
      };
    default:
      return {
        accentClassName: "bg-slate-100 text-slate-700",
        badgeClassName: "border border-slate-200 bg-slate-50 text-slate-600",
        description: "Todavía no hay archivos disponibles en el inventario del proyecto.",
        label: "Sin archivos",
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
