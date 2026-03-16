"use client";

import { useEffect, useMemo, useState } from "react";

import {
  buildProjectFilePreviewPath,
  buildProjectFileUrl,
} from "@/components/projects/detail/project-detail-helpers";
import { DownloadIcon, EyeIcon, ProjectStackIcon } from "@/components/projects/project-management-icons";
import { ButtonLink } from "@/components/ui/button-link";
import { buttonStyles } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { parseProjectReportHtml } from "@/components/projects/project-report-utils";
import type { FileContentResponse } from "@/types/api";

type ProjectReportViewProps = {
  owner: string;
  projectName: string;
  reportPath: string | null;
};

export function ProjectReportView({
  owner,
  projectName,
  reportPath,
}: ProjectReportViewProps) {
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reportPath) {
      setError("No se ha indicado ningún informe para abrir.");
      setLoading(false);
      return;
    }

    const currentReportPath = reportPath;
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);
      setReportHtml(null);

      try {
        const payload = await apiFetch<FileContentResponse>(
          buildProjectFilePreviewPath(owner, projectName, currentReportPath),
        );

        if (!cancelled) {
          setReportHtml(payload.content);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo abrir el informe seleccionado.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [owner, projectName, reportPath]);

  const reportTitle = useMemo(() => {
    if (!reportHtml) {
      return "Informe del análisis";
    }

    return parseProjectReportHtml(reportHtml).title ?? "Informe del análisis";
  }, [reportHtml]);

  return (
    <div className="flex flex-col gap-6">
      <section className="page-hero-surface overflow-hidden rounded-[32px] border border-white/10 p-6 sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="page-hero-badge gap-2 rounded-full px-3 py-1">
              <ProjectStackIcon />
              Informe del proyecto
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {reportTitle}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Visualiza el informe completo en una pantalla amplia y consulta todos sus detalles.
            </p>
            {reportPath ? (
              <p className="mt-4 text-sm text-slate-300">{reportPath}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <ButtonLink
              href={`/dashboard/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectName)}`}
              size="lg"
              tone="on-dark"
              variant="secondary"
            >
              Volver al proyecto
            </ButtonLink>
            {reportPath ? (
              <a
                className={buttonStyles({ size: "lg", tone: "on-dark", variant: "ghost" })}
                href={buildProjectFileUrl(owner, projectName, reportPath)}
                rel="noreferrer"
                target="_blank"
              >
                <DownloadIcon className="h-4 w-4" />
                Descargar HTML
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        {loading ? (
          <div className="flex min-h-[75vh] items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm leading-6 text-slate-500">
            Cargando informe...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="flex min-h-[75vh] flex-col items-center justify-center rounded-[24px] border border-rose-200 bg-rose-50 px-6 text-center">
            <EyeIcon className="h-8 w-8 text-rose-500" />
            <p className="mt-4 text-base font-semibold text-rose-800">
              No se pudo abrir el informe
            </p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-rose-700">{error}</p>
          </div>
        ) : null}

        {!loading && !error && reportHtml ? (
          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
            <iframe
              className="min-h-[75vh] w-full bg-white"
              srcDoc={reportHtml}
              title={reportTitle}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
