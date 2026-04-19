import { describe, expect, it } from "vitest";

import {
  canAttemptEmbeddedPreview,
  getProjectDeliverablesLayout,
  isPreviewableTextFile,
} from "@/components/projects/detail/project-detail-helpers";
import type { ProjectFileEntry } from "@/types/api";

function createFile(overrides: Partial<ProjectFileEntry>): ProjectFileEntry {
  return {
    extension: ".txt",
    kind: "additional",
    name: "file.txt",
    path: "project/file.txt",
    size_bytes: 100,
    ...overrides,
  };
}

describe("project-detail-helpers", () => {
  it("prioritises deliverables for the editorial layout", () => {
    const { featuredDeliverable, secondaryDeliverables, sortedDeliverables } =
      getProjectDeliverablesLayout([
        createFile({ extension: ".xlsx", name: "tables.xlsx" }),
        createFile({ extension: ".zip", name: "results.zip" }),
        createFile({ extension: ".html", name: "report.html" }),
        createFile({ extension: ".docx", name: "summary.docx" }),
      ]);

    expect(featuredDeliverable?.extension).toBe(".html");
    expect(sortedDeliverables.map((file) => file.extension)).toEqual([
      ".html",
      ".zip",
      ".xlsx",
      ".docx",
    ]);
    expect(secondaryDeliverables).toHaveLength(3);
  });

  it("recognises previewable text files", () => {
    expect(isPreviewableTextFile(createFile({ extension: ".csv" }))).toBe(true);
    expect(isPreviewableTextFile(createFile({ extension: ".rmd" }))).toBe(false);
    expect(isPreviewableTextFile(createFile({ extension: ".zip" }))).toBe(false);
  });

  it("recognises office files for embedded preview attempts", () => {
    expect(canAttemptEmbeddedPreview(createFile({ extension: ".xlsx" }))).toBe(true);
    expect(canAttemptEmbeddedPreview(createFile({ extension: ".docx" }))).toBe(true);
    expect(canAttemptEmbeddedPreview(createFile({ extension: ".pdf" }))).toBe(false);
  });
});
