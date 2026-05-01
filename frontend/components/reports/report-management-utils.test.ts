import { describe, expect, it } from "vitest";

import { buildProjectRecords } from "@/components/projects/project-management-utils";
import {
  buildReportRecords,
  filterReports,
  pickPrimaryReportPath,
} from "@/components/reports/report-management-utils";
import type { ProjectSummary } from "@/types/api";

function buildProjectSummary(overrides: Partial<ProjectSummary>): ProjectSummary {
  return {
    access_role: "owner",
    active_run: null,
    additional_files: [],
    created_at: "2026-04-01T08:00:00.000Z",
    entity_id: null,
    entity_name: null,
    entity_slug: null,
    file_count: 0,
    files: [],
    html_files: [],
    id: "project-1",
    name: "Proyecto demo",
    owner: "gabriel",
    slug: "proyecto-demo",
    status: "configured",
    template_file: null,
    updated_at: "2026-04-02T08:00:00.000Z",
    visibility: "private",
    ...overrides,
  };
}

describe("report management utils", () => {
  it("prioritizes shallower html paths when selecting primary report", () => {
    expect(
      pickPrimaryReportPath([
        "results/run-b/report.html",
        "summary.html",
        "results/run-a/index.html",
      ]),
    ).toBe("summary.html");
  });

  it("builds report records only for projects with html outputs", () => {
    const reports = buildReportRecords(buildProjectRecords([
      buildProjectSummary({
        file_count: 3,
        files: ["summary.html", "counts.tsv", "template.xlsx"],
        html_files: ["summary.html"],
        template_file: "template.xlsx",
        status: "results",
      }),
      buildProjectSummary({
        id: "project-2",
        name: "Proyecto sin informe",
        slug: "proyecto-sin-informe",
      }),
    ]));

    expect(reports).toHaveLength(1);
    expect(reports[0]?.primaryReportPath).toBe("summary.html");
    expect(reports[0]?.primaryReportHref).toBe(
      "/dashboard/project-report/proyecto-demo?path=summary.html",
    );
  });

  it("filters by owner, entity and report filename", () => {
    const reports = buildReportRecords(buildProjectRecords([
      buildProjectSummary({
        entity_name: "ULL",
        file_count: 2,
        files: ["results/final-report.html", "template.xlsx"],
        html_files: ["results/final-report.html"],
        status: "results",
        template_file: "template.xlsx",
      }),
      buildProjectSummary({
        id: "project-2",
        name: "Proteoma",
        owner: "ana",
        entity_name: "ITB",
        file_count: 1,
        files: ["proteoma.html"],
        html_files: ["proteoma.html"],
        slug: "proteoma",
        status: "results",
      }),
    ]));

    expect(filterReports(reports, "final-report", "all", "all")).toHaveLength(1);
    expect(filterReports(reports, "", "ana", "all")).toHaveLength(1);
    expect(filterReports(reports, "", "all", "ULL")).toHaveLength(1);
  });
});
