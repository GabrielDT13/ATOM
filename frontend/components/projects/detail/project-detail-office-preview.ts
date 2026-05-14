import type { PreviewState } from "@/components/projects/detail/project-detail-types";

type Locale = "en" | "es";

type WorksheetPreview = {
  name: string;
  rows: string[][];
  truncatedColumns: boolean;
  truncatedRows: boolean;
};

const MAX_PREVIEW_COLUMNS = 10;
const MAX_PREVIEW_ROWS = 18;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeCellValue(value: unknown, locale: Locale) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toLocaleString(locale === "es" ? "es-ES" : "en-US");
  }

  return String(value);
}

export function buildOfficeFallbackPreview(
  filePath: string,
  downloadUrl: string,
  message?: string,
  locale: Locale = "es",
): PreviewState {
  const t = locale === "es";
  return {
    actionHref: downloadUrl,
    actionLabel: t ? "Abrir archivo" : "Open file",
    description:
      message ??
      (t
        ? "No se pudo generar una vista previa fiable para este archivo. Puedes abrirlo en una pestaña aparte o descargarlo."
        : "Could not generate a reliable preview for this file. You can open it in a separate tab or download it."),
    label: filePath,
    mode: "notice",
  };
}

export function buildWorkbookPreviewMarkup(fileName: string, worksheets: WorksheetPreview[], locale: Locale = "es") {
  const t = locale === "es";
  const sections = worksheets
    .map((sheet) => {
      const hasRows = sheet.rows.length > 0;
      const [headerRow, ...bodyRows] = hasRows ? sheet.rows : [];
      const headerCells = headerRow ?? [];
      const body = bodyRows.length > 0 ? bodyRows : hasRows ? [] : [];

      return `
        <section class="sheet-card">
          <div class="sheet-header">
            <div>
              <p class="sheet-eyebrow">${t ? "Hoja" : "Sheet"}</p>
              <h2>${escapeHtml(sheet.name)}</h2>
            </div>
            <div class="sheet-meta">
              <span>${sheet.rows.length} ${t ? "fila(s)" : "row(s)"}</span>
              ${sheet.truncatedRows ? `<span>${t ? "Vista resumida" : "Condensed view"}</span>` : ""}
              ${sheet.truncatedColumns ? `<span>${t ? "Columnas recortadas" : "Trimmed columns"}</span>` : ""}
            </div>
          </div>
          ${
            hasRows
              ? `
                <div class="table-shell">
                  <table>
                    <thead>
                      <tr>
                        ${headerCells.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}
                      </tr>
                    </thead>
                    <tbody>
                      ${body
                        .map(
                          (row) => `
                            <tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>
                          `,
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>
              `
              : `<p class="empty-copy">${t ? "Esta hoja no contiene datos visibles para previsualizar." : "This sheet does not contain visible data to preview."}</p>`
          }
        </section>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="${locale}">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(fileName)}</title>
        <style>
          :root {
            color-scheme: light;
            font-family: Inter, system-ui, sans-serif;
          }
          body {
            margin: 0;
            background:
              radial-gradient(circle at top left, rgba(56, 189, 248, 0.16), transparent 28%),
              linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%);
            color: #0f172a;
          }
          .page {
            padding: 24px;
          }
          .hero {
            border: 1px solid rgba(148, 163, 184, 0.22);
            border-radius: 28px;
            background:
              radial-gradient(circle at top left, rgba(56, 189, 248, 0.24), transparent 30%),
              linear-gradient(135deg, #0f172a 0%, #111827 52%, #0f4c81 100%);
            color: white;
            padding: 24px;
            box-shadow: 0 24px 64px -40px rgba(15, 23, 42, 0.45);
          }
          .hero p {
            margin: 0;
            opacity: 0.82;
            font-size: 13px;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            font-weight: 700;
          }
          .hero h1 {
            margin: 12px 0 0;
            font-size: 28px;
            line-height: 1.2;
          }
          .grid {
            display: grid;
            gap: 18px;
            margin-top: 20px;
          }
          .sheet-card {
            border: 1px solid rgba(148, 163, 184, 0.22);
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.88);
            backdrop-filter: blur(12px);
            padding: 18px;
            box-shadow: 0 20px 50px -42px rgba(15, 23, 42, 0.35);
          }
          .sheet-header {
            display: flex;
            gap: 12px;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 14px;
          }
          .sheet-eyebrow {
            margin: 0;
            color: #64748b;
            font-size: 11px;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            font-weight: 700;
          }
          .sheet-header h2 {
            margin: 6px 0 0;
            font-size: 18px;
          }
          .sheet-meta {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            gap: 8px;
          }
          .sheet-meta span {
            border-radius: 999px;
            border: 1px solid rgba(148, 163, 184, 0.24);
            background: #f8fafc;
            padding: 6px 10px;
            font-size: 12px;
            color: #475569;
            font-weight: 600;
          }
          .table-shell {
            overflow: auto;
            border-radius: 18px;
            border: 1px solid rgba(226, 232, 240, 0.9);
            background: white;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            min-width: 36rem;
          }
          th, td {
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
            text-align: left;
            vertical-align: top;
            font-size: 13px;
          }
          th {
            position: sticky;
            top: 0;
            background: #eff6ff;
            color: #0f172a;
            font-weight: 700;
          }
          tbody tr:nth-child(even) td {
            background: #f8fafc;
          }
          .empty-copy {
            margin: 0;
            color: #64748b;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <main class="page">
          <section class="hero">
            <p>${t ? "Vista previa de Excel" : "Excel preview"}</p>
            <h1>${escapeHtml(fileName)}</h1>
          </section>
          <div class="grid">
            ${sections}
          </div>
        </main>
      </body>
    </html>
  `;
}

export function buildDocxPreviewMarkup(fileName: string, contentHtml: string, locale: Locale = "es") {
  const t = locale === "es";
  return `
    <!DOCTYPE html>
    <html lang="${locale}">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(fileName)}</title>
        <style>
          :root {
            color-scheme: light;
            font-family: Inter, system-ui, sans-serif;
          }
          body {
            margin: 0;
            background:
              radial-gradient(circle at top left, rgba(56, 189, 248, 0.16), transparent 28%),
              linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%);
            color: #0f172a;
          }
          .page {
            padding: 24px;
          }
          .hero {
            border: 1px solid rgba(148, 163, 184, 0.22);
            border-radius: 28px;
            background:
              radial-gradient(circle at top left, rgba(56, 189, 248, 0.24), transparent 30%),
              linear-gradient(135deg, #0f172a 0%, #111827 52%, #0f4c81 100%);
            color: white;
            padding: 24px;
            box-shadow: 0 24px 64px -40px rgba(15, 23, 42, 0.45);
          }
          .hero p {
            margin: 0;
            opacity: 0.82;
            font-size: 13px;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            font-weight: 700;
          }
          .hero h1 {
            margin: 12px 0 0;
            font-size: 28px;
            line-height: 1.2;
          }
          .content {
            margin-top: 20px;
            border: 1px solid rgba(148, 163, 184, 0.22);
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.92);
            padding: 28px;
            box-shadow: 0 20px 50px -42px rgba(15, 23, 42, 0.35);
          }
          .content :first-child {
            margin-top: 0;
          }
          .content :last-child {
            margin-bottom: 0;
          }
          .content h1, .content h2, .content h3 {
            color: #0f172a;
            line-height: 1.3;
          }
          .content p, .content li {
            color: #334155;
            line-height: 1.7;
            font-size: 15px;
          }
          .content table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
          }
          .content th, .content td {
            border: 1px solid #e2e8f0;
            padding: 10px 12px;
            text-align: left;
            vertical-align: top;
          }
          .content th {
            background: #eff6ff;
          }
        </style>
      </head>
      <body>
        <main class="page">
          <section class="hero">
            <p>${t ? "Vista previa de documento" : "Document preview"}</p>
            <h1>${escapeHtml(fileName)}</h1>
          </section>
          <article class="content">
            ${contentHtml}
          </article>
        </main>
      </body>
    </html>
  `;
}

export async function parseOfficePreview(
  file: {
    extension: string;
    name: string;
    path: string;
  },
  blob: Blob,
  downloadUrl: string,
  locale: Locale = "es",
): Promise<PreviewState> {
  const normalizedExtension = file.extension.toLowerCase();

  try {
    if (normalizedExtension === ".docx") {
      const [{ convertToHtml }] = await Promise.all([import("mammoth")]);
      const arrayBuffer = await blob.arrayBuffer();
      const result = await convertToHtml({ arrayBuffer });

      return {
        content: buildDocxPreviewMarkup(file.name, result.value, locale),
        label: file.path,
        mode: "html",
      };
    }

    if (normalizedExtension === ".xlsx" || normalizedExtension === ".xls") {
      const XLSX = await import("xlsx");
      const arrayBuffer = await blob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const worksheets: WorksheetPreview[] = workbook.SheetNames.slice(0, 4).map((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const rows = (XLSX.utils.sheet_to_json(worksheet, {
          blankrows: false,
          defval: "",
          header: 1,
        }) as unknown[][]).slice(0, MAX_PREVIEW_ROWS + 1);
        const truncatedRows = rows.length > MAX_PREVIEW_ROWS;
        const normalizedRows = rows.slice(0, MAX_PREVIEW_ROWS).map((row) => {
          return row.slice(0, MAX_PREVIEW_COLUMNS).map((value) => normalizeCellValue(value, locale));
        });
        const truncatedColumns = rows.some((row) => row.length > MAX_PREVIEW_COLUMNS);

        return {
          name: sheetName,
          rows: normalizedRows,
          truncatedColumns,
          truncatedRows,
        };
      });

      return {
        content: buildWorkbookPreviewMarkup(file.name, worksheets, locale),
        label: file.path,
        mode: "html",
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : null;
    return buildOfficeFallbackPreview(
      file.path,
      downloadUrl,
      message
        ? locale === "es"
          ? `No se pudo generar la vista previa de este archivo: ${message}. Puedes abrirlo en una pestaña aparte o descargarlo.`
          : `Could not generate preview for this file: ${message}. You can open it in a separate tab or download it.`
        : undefined,
      locale,
    );
  }

  return buildOfficeFallbackPreview(file.path, downloadUrl, undefined, locale);
}
