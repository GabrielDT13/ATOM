"use client";

import { useEffect, useMemo, useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import {
  buildProjectFilePreviewPath,
  buildProjectFileUrl,
  injectHtmlBaseHref,
} from "@/components/projects/detail/project-detail-helpers";
import { DownloadIcon, EyeIcon, ProjectStackIcon } from "@/components/projects/project-management-icons";
import { ButtonLink } from "@/components/ui/button-link";
import { buttonStyles } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { buildProjectDetailHref, getProjectByRef } from "@/lib/projects";
import { parseProjectReportHtml } from "@/components/projects/project-report-utils";
import type { FileContentResponse } from "@/types/api";

type ProjectReportViewProps =
  | {
      owner: string;
      projectName: string;
      projectRef?: never;
      reportPath: string | null;
    }
  | {
      owner?: never;
      projectName?: never;
      projectRef: string;
      reportPath: string | null;
    };

export function ProjectReportView({
  owner,
  projectName,
  projectRef,
  reportPath,
}: ProjectReportViewProps) {
  const { locale } = useLocale();
  const t = locale === "es";
  const [projectIdentity, setProjectIdentity] = useState<{ name: string; owner: string } | null>(null);
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reportPath) {
      setError(t ? "No se ha indicado ningún informe para abrir." : "No report was specified to open.");
      setLoading(false);
      return;
    }

    const currentReportPath = reportPath;
    let cancelled = false;

    async function loadReport() {
      setLoading(true);
      setError(null);
      setReportHtml(null);
      setProjectIdentity(null);

      try {
        const resolvedProject =
          typeof projectRef === "string"
            ? await getProjectByRef(projectRef)
            : ({
                name: projectName,
                owner,
              } as const);

        if (cancelled) {
          return;
        }

        const payload = await apiFetch<FileContentResponse>(
          buildProjectFilePreviewPath(
            resolvedProject.owner,
            resolvedProject.name,
            currentReportPath,
          ),
        );

        if (!cancelled) {
          const downloadUrl = buildProjectFileUrl(
            resolvedProject.owner,
            resolvedProject.name,
            currentReportPath,
          );
          setProjectIdentity({
            name: resolvedProject.name,
            owner: resolvedProject.owner,
          });
          setReportHtml(injectHtmlBaseHref(payload.content, downloadUrl));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t ? "No se pudo abrir el informe seleccionado." : "Could not open selected report.",
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
  }, [owner, projectName, projectRef, reportPath, t]);

  const reportTitle = useMemo(() => {
    if (!reportHtml) {
      return t ? "Informe del análisis" : "Analysis report";
    }

    return parseProjectReportHtml(reportHtml).title ?? (t ? "Informe del análisis" : "Analysis report");
  }, [reportHtml, t]);

  return (
    <div className="flex flex-col gap-6">
      <section className="page-hero-surface overflow-hidden rounded-[32px] border border-white/10 p-6 sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="page-hero-badge gap-2 rounded-full px-3 py-1">
              <ProjectStackIcon />
              {t ? "Informe del proyecto" : "Project report"}
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {reportTitle}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              {t
                ? "Visualiza el informe completo en una pantalla amplia y consulta todos sus detalles."
                : "Open full report on a wide screen and review all details."}
            </p>
            {reportPath ? (
              <p className="mt-4 text-sm text-slate-300">{reportPath}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <ButtonLink
              href={
                typeof projectRef === "string"
                  ? buildProjectDetailHref(projectRef)
                  : `/dashboard/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectName)}`
              }
              size="lg"
              tone="on-dark"
              variant="secondary"
            >
              {t ? "Volver al proyecto" : "Back to project"}
            </ButtonLink>
            {reportPath && projectIdentity ? (
              <a
                className={buttonStyles({ size: "lg", tone: "on-dark", variant: "ghost" })}
                href={buildProjectFileUrl(projectIdentity.owner, projectIdentity.name, reportPath)}
                rel="noreferrer"
                target="_blank"
              >
                <DownloadIcon className="h-4 w-4" />
                {t ? "Descargar HTML" : "Download HTML"}
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        {loading ? (
          <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>
            <Skeleton className="h-[75vh] rounded-[20px] bg-white" />
          </div>
        ) : null}

        {!loading && error ? (
          <div className="flex min-h-[75vh] flex-col items-center justify-center rounded-[24px] border border-rose-200 bg-rose-50 px-6 text-center">
            <EyeIcon className="h-8 w-8 text-rose-500" />
            <p className="mt-4 text-base font-semibold text-rose-800">
              {t ? "No se pudo abrir el informe" : "Could not open report"}
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
