import { describe, expect, it } from "vitest";

import { buildProjectDetailModel } from "@/components/projects/project-detail-utils";
import type { ProjectDetails } from "@/types/api";

function createProjectDetails(fileEntries: ProjectDetails["file_entries"]): ProjectDetails {
  return {
    access_role: "owner",
    additional_files: [
      "counts_app_type_a.txt",
      "design_app_a/design_app_a.Rmd",
      "design_app_a/design_app_a.docx",
      "design_app_a/design_app_a.xlsx",
      "design_app_a/design_app_a.zip",
    ],
    created_at: "2026-03-16T10:00:00Z",
    file_count: fileEntries.length,
    file_entries: fileEntries,
    files: fileEntries.map((entry) => entry.path),
    html_files: fileEntries.filter((entry) => entry.kind === "result").map((entry) => entry.path),
    name: "Proyecto 1",
    owner: "admin",
    status: "results",
    template_file: "template.xlsx",
    updated_at: "2026-03-16T10:00:00Z",
  };
}

describe("buildProjectDetailModel", () => {
  it("agrupa los artefactos generados por carpeta de ejecución", () => {
    const payload = createProjectDetails([
      {
        extension: ".txt",
        kind: "additional",
        name: "counts_app_type_a.txt",
        path: "counts_app_type_a.txt",
        size_bytes: 200,
      },
      {
        extension: ".xlsx",
        kind: "template",
        name: "template.xlsx",
        path: "template.xlsx",
        size_bytes: 100,
      },
      {
        extension: ".docx",
        kind: "additional",
        name: "design_app_a.docx",
        path: "design_app_a/design_app_a.docx",
        size_bytes: 120,
      },
      {
        extension: ".Rmd",
        kind: "additional",
        name: "design_app_a.Rmd",
        path: "design_app_a/design_app_a.Rmd",
        size_bytes: 90,
      },
      {
        extension: ".html",
        kind: "result",
        name: "design_app_a.html",
        path: "design_app_a/design_app_a.html",
        size_bytes: 130,
      },
      {
        extension: ".zip",
        kind: "additional",
        name: "design_app_a.zip",
        path: "design_app_a/design_app_a.zip",
        size_bytes: 110,
      },
    ]);

    const model = buildProjectDetailModel(payload);

    expect(model.templateFile?.path).toBe("template.xlsx");
    expect(model.supportFiles.map((entry) => entry.path)).toEqual(["counts_app_type_a.txt"]);
    expect(model.executionGroups).toHaveLength(1);
    expect(model.executionGroups[0]?.directory).toBe("design_app_a");
    expect(model.executionGroups[0]?.htmlFile?.path).toBe("design_app_a/design_app_a.html");
    expect(model.executionGroups[0]?.files.map((entry) => entry.path)).toEqual([
      "design_app_a/design_app_a.docx",
      "design_app_a/design_app_a.html",
      "design_app_a/design_app_a.Rmd",
      "design_app_a/design_app_a.zip",
    ]);
  });

  it("trata un html en raíz como ejecución independiente", () => {
    const payload = createProjectDetails([
      {
        extension: ".xlsx",
        kind: "template",
        name: "template.xlsx",
        path: "template.xlsx",
        size_bytes: 100,
      },
      {
        extension: ".html",
        kind: "result",
        name: "summary.html",
        path: "summary.html",
        size_bytes: 220,
      },
      {
        extension: ".csv",
        kind: "additional",
        name: "matrix.csv",
        path: "matrix.csv",
        size_bytes: 140,
      },
    ]);

    const model = buildProjectDetailModel(payload);

    expect(model.executionGroups).toHaveLength(1);
    expect(model.executionGroups[0]?.directory).toBe("summary.html");
    expect(model.executionGroups[0]?.label).toBe("summary");
    expect(model.supportFiles.map((entry) => entry.path)).toEqual(["matrix.csv"]);
  });
});

