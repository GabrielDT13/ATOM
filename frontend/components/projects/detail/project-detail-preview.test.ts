import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildProjectFileUrl } from "@/components/projects/detail/project-detail-helpers";
import {
  buildProjectPreviewState,
  getPreferredExecutionGroup,
  getPreferredPrimaryPreviewFile,
} from "@/components/projects/detail/project-detail-preview";
import type { ProjectExecutionGroup } from "@/components/projects/project-detail-utils";
import { apiFetch } from "@/lib/api";
import type { ProjectFileEntry } from "@/types/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();

  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

vi.mock("@/components/projects/detail/project-detail-office-preview", () => ({
  parseOfficePreview: vi.fn().mockResolvedValue({
    content: "<html><body>office</body></html>",
    label: "results/template.xlsx",
    mode: "html",
  }),
}));

function createFile(overrides: Partial<ProjectFileEntry>): ProjectFileEntry {
  return {
    extension: ".txt",
    kind: "additional",
    name: "file.txt",
    path: "results/file.txt",
    size_bytes: 100,
    ...overrides,
  };
}

function createExecutionGroup(overrides: Partial<ProjectExecutionGroup>): ProjectExecutionGroup {
  const htmlFile = createFile({
    extension: ".html",
    name: "report.html",
    path: "results/report.html",
  });

  return {
    directory: "results",
    files: [htmlFile],
    htmlFile,
    label: "results",
    ...overrides,
  };
}

describe("project-detail-preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefers executions with html reports", () => {
    const archiveGroup = createExecutionGroup({
      directory: "archive",
      files: [createFile({ extension: ".zip", name: "archive.zip", path: "archive/archive.zip" })],
      htmlFile: null,
      label: "archive",
    });
    const reportGroup = createExecutionGroup({
      directory: "report",
      label: "report",
    });

    expect(getPreferredExecutionGroup([archiveGroup, reportGroup])?.directory).toBe("report");
  });

  it("prefers html preview files before docx and other files", () => {
    const group = createExecutionGroup({
      files: [
        createFile({ extension: ".docx", name: "summary.docx", path: "results/summary.docx" }),
        createFile({ extension: ".xlsx", name: "table.xlsx", path: "results/table.xlsx" }),
        createFile({ extension: ".html", name: "report.html", path: "results/report.html" }),
      ],
      htmlFile: createFile({ extension: ".html", name: "report.html", path: "results/report.html" }),
    });

    expect(getPreferredPrimaryPreviewFile(group)?.path).toBe("results/report.html");
  });

  it("builds html previews through the file-content endpoint", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      content: "<html><body>report</body></html>",
      truncated: false,
    });

    const preview = await buildProjectPreviewState({
      file: createFile({ extension: ".html", name: "report.html", path: "results/report.html" }),
      owner: "demo",
      projectName: "project",
    });

    expect(preview).toEqual({
      content: "<html><body>report</body></html>",
      label: "results/report.html",
      mode: "html",
    });
  });

  it("builds text previews with truncation markers when needed", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      content: "line 1",
      truncated: true,
    });

    const preview = await buildProjectPreviewState({
      file: createFile({ extension: ".txt", name: "notes.txt", path: "results/notes.txt" }),
      owner: "demo",
      projectName: "project",
    });

    expect(preview).toEqual({
      content: "line 1\n...",
      label: "results/notes.txt",
      mode: "text",
    });
  });

  it("falls back to a notice preview for unsupported files", async () => {
    const preview = await buildProjectPreviewState({
      file: createFile({ extension: ".zip", name: "bundle.zip", path: "results/bundle.zip" }),
      owner: "demo",
      projectName: "project",
    });

    expect(preview).toEqual({
      actionHref: buildProjectFileUrl("demo", "project", "results/bundle.zip"),
      actionLabel: "Abrir archivo",
      description: "Este archivo no tiene una vista rápida embebida disponible.",
      label: "results/bundle.zip",
      mode: "notice",
    });
  });
});
