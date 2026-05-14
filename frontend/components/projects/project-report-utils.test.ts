import { describe, expect, it } from "vitest";

import {
  isReportAssetPassthroughPath,
  parseProjectReportHtml,
  resolveRelativeReportAssetPath,
} from "@/components/projects/project-report-utils";

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

  it("descarta logos decorativos y resuelve assets relativos del informe", () => {
    const report = parseProjectReportHtml(
      `
        <!doctype html>
        <html>
          <body>
            <figure>
              <img alt="ATOM logo" src="atom-logo.png" />
            </figure>
            <h2>PCA global</h2>
            <p>La separación entre condiciones es clara y consistente entre réplicas.</p>
            <figure>
              <img data-src="design_app_a_files/figure-html/pca-plot-1.png" />
              <figcaption>PCA plot principal</figcaption>
            </figure>
          </body>
        </html>
      `,
      {
        resolveImageSrc: (src) => `resolved://${src}`,
      },
    );

    expect(report.images).toHaveLength(1);
    expect(report.images[0]).toEqual({
      alt: "PCA plot principal",
      kind: "PCA",
      src: "resolved://design_app_a_files/figure-html/pca-plot-1.png",
    });
  });

  it("mantiene intactas las imágenes embebidas en data uri", () => {
    const source = "data:image/png;base64,abc123";

    expect(isReportAssetPassthroughPath(source)).toBe(true);
    expect(resolveRelativeReportAssetPath("design1/report.html", source)).toBe(source);
  });
});
