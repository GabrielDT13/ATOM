import { describe, expect, it } from "vitest";

import {
  buildDocxPreviewMarkup,
  buildOfficeFallbackPreview,
  buildWorkbookPreviewMarkup,
} from "@/components/projects/detail/project-detail-office-preview";

describe("project-detail-office-preview", () => {
  it("builds a fallback preview for unsupported office rendering", () => {
    expect(
      buildOfficeFallbackPreview(
        "results/design.docx",
        "/backend-api/file.docx",
      ),
    ).toEqual({
      actionHref: "/backend-api/file.docx",
      actionLabel: "Abrir archivo",
      description:
        "No se pudo generar una vista previa fiable para este archivo. Puedes abrirlo en una pestaña aparte o descargarlo.",
      label: "results/design.docx",
      mode: "notice",
    });
  });

  it("renders workbook previews as html", () => {
    const html = buildWorkbookPreviewMarkup("tables.xlsx", [
      {
        name: "Resumen",
        rows: [
          ["Muestra", "Valor"],
          ["A", "10"],
          ["B", "20"],
        ],
        truncatedColumns: false,
        truncatedRows: false,
      },
    ]);

    expect(html).toContain("Vista previa de Excel");
    expect(html).toContain("tables.xlsx");
    expect(html).toContain("Resumen");
    expect(html).toContain("Muestra");
    expect(html).toContain("Valor");
  });

  it("wraps docx html content with the preview shell", () => {
    const html = buildDocxPreviewMarkup(
      "report.docx",
      "<h1>Informe</h1><p>Contenido renderizado.</p>",
    );

    expect(html).toContain("Vista previa de documento");
    expect(html).toContain("report.docx");
    expect(html).toContain("<h1>Informe</h1>");
    expect(html).toContain("Contenido renderizado.");
  });
});
