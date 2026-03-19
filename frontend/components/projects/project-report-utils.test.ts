import { describe, expect, it } from "vitest";

import { parseProjectReportHtml } from "@/components/projects/project-report-utils";

describe("parseProjectReportHtml", () => {
  it("extrae imágenes, título y secciones relevantes del informe", () => {
    const report = parseProjectReportHtml(`
      <!doctype html>
      <html>
        <head>
          <title>Informe RNA-seq</title>
        </head>
        <body>
          <h1>Resumen general</h1>
          <p>La comparación entre condiciones muestra un patrón claro de activación en la ruta inflamatoria con soporte estadístico consistente.</p>
          <img alt="Volcano plot" src="data:image/png;base64,abc123" />
          <h2>Resultados diferenciales</h2>
          <p>Se detectan genes sobreexpresados y un subconjunto con cambios consistentes entre réplicas biológicas.</p>
        </body>
      </html>
    `);

    expect(report.title).toBe("Informe RNA-seq");
    expect(report.images).toHaveLength(1);
    expect(report.images[0]?.alt).toBe("Volcano plot");
    expect(report.sections).toHaveLength(2);
    expect(report.highlights[0]).toContain("patrón claro de activación");
  });
});

