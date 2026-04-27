import { buildProjectReportHref } from "@/lib/projects";
import type { ProjectRecord } from "@/components/projects/project-management-utils";

export type ReportViewMode = "board" | "list";
export type ReportOwnerFilter = "all" | string;
export type ReportEntityFilter = "all" | string;

export type ReportRecord = ProjectRecord & {
  primaryReportHref: string;
  primaryReportName: string;
  primaryReportPath: string;
  reportCount: number;
};

function getFileName(path: string) {
  const segments = path.split("/");
  return segments[segments.length - 1] ?? path;
}

function compareReportPaths(left: string, right: string) {
  const depthDifference = left.split("/").length - right.split("/").length;
  if (depthDifference !== 0) {
    return depthDifference;
  }

  return left.localeCompare(right, "es", {
    numeric: true,
    sensitivity: "base",
  });
}

export function pickPrimaryReportPath(paths: string[]) {
  return [...paths].sort(compareReportPaths)[0] ?? null;
}

export function buildReportRecords(projects: ProjectRecord[]) {
  return projects
    .filter((project) => project.htmlFiles.length > 0)
    .map((project) => {
      const primaryReportPath = pickPrimaryReportPath(project.htmlFiles);

      if (!primaryReportPath) {
        return null;
      }

      return {
        ...project,
        primaryReportHref: buildProjectReportHref(project.routeRef, primaryReportPath),
        primaryReportName: getFileName(primaryReportPath),
        primaryReportPath,
        reportCount: project.htmlFiles.length,
      } satisfies ReportRecord;
    })
    .filter((project): project is ReportRecord => project !== null)
    .sort(
      (left, right) =>
        Date.parse(right.updated_at) - Date.parse(left.updated_at)
        || left.owner.localeCompare(right.owner, "es", { sensitivity: "base" })
        || left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
    );
}

export function filterReports(
  reports: ReportRecord[],
  search: string,
  ownerFilter: ReportOwnerFilter,
  entityFilter: ReportEntityFilter,
) {
  const normalizedSearch = search.trim().toLowerCase();

  return reports.filter((report) => {
    if (ownerFilter !== "all" && report.owner !== ownerFilter) {
      return false;
    }

    if (entityFilter !== "all" && (report.entity_name ?? "") !== entityFilter) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const searchIndex = [
      report.name,
      report.owner,
      report.entity_name ?? "",
      report.primaryReportName,
      report.primaryReportPath,
      ...report.htmlFiles,
    ]
      .join(" ")
      .toLowerCase();

    return searchIndex.includes(normalizedSearch);
  });
}

export function getReportOwners(reports: ReportRecord[]) {
  return [...new Set(reports.map((report) => report.owner))].sort((left, right) =>
    left.localeCompare(right, "es", { sensitivity: "base" }),
  );
}

export function getReportEntities(reports: ReportRecord[]) {
  return [
    ...new Set(
      reports
        .map((report) => report.entity_name)
        .filter((entityName): entityName is string => Boolean(entityName)),
    ),
  ].sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" }));
}

export function getReportSummaryMetrics(reports: ReportRecord[]) {
  const totalReports = reports.reduce((total, report) => total + report.reportCount, 0);
  const owners = getReportOwners(reports).length;
  const entities = getReportEntities(reports).length;

  return {
    entities,
    owners,
    totalProjects: reports.length,
    totalReports,
  };
}

export function getReportPreviewFiles(report: ReportRecord, limit = 3) {
  return report.htmlFiles.slice(0, limit);
}
