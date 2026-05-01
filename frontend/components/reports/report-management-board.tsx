"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { buildProjectDetailHref } from "@/lib/projects";
import { formatDate } from "@/components/projects/detail/project-detail-helpers";
import {
  EyeIcon,
  ProjectStackIcon,
  ReportSparkIcon,
} from "@/components/projects/project-management-icons";
import { BoardHeroArt } from "@/components/ui/board-hero-art";
import { buttonStyles } from "@/components/ui/button";
import { RowActionsMenu, type RowActionItem } from "@/components/ui/row-actions-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getReportPreviewFiles,
  type ReportRecord,
} from "@/components/reports/report-management-utils";

type ReportManagementBoardProps = {
  loading: boolean;
  onOpenProject: (report: ReportRecord) => void;
  onOpenReport: (report: ReportRecord) => void;
  reports: ReportRecord[];
};

const REPORT_BOARD_SKELETON_COUNT = 6;
const REPORT_BOARD_HERO_IMAGE = "/images/report-hero-lines.jpg";

function ReportPreviewPills({ report }: { report: ReportRecord }) {
  const previewFiles = getReportPreviewFiles(report, 3);

  return (
    <div className="flex flex-wrap gap-2">
      {previewFiles.map((file) => (
        <span
          className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
          key={file}
        >
          <span className="truncate">{file}</span>
        </span>
      ))}
      {report.reportCount > previewFiles.length ? (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          +{report.reportCount - previewFiles.length}
        </span>
      ) : null}
    </div>
  );
}

function ReportMetricChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ReportBoardSkeleton() {
  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="space-y-5 p-5">
        <Skeleton className="h-48 rounded-[24px]" />

        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3" key={index}>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-2 h-4 w-20" />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-32 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <Skeleton className="h-11 w-36 rounded-full" />
          <Skeleton className="h-11 w-32 rounded-full" />
        </div>
      </div>
    </article>
  );
}

export function ReportManagementBoard({
  loading,
  onOpenProject,
  onOpenReport,
  reports,
}: ReportManagementBoardProps) {
  if (loading) {
    return (
      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: REPORT_BOARD_SKELETON_COUNT }, (_, index) => (
            <ReportBoardSkeleton key={index} />
          ))}
        </div>
        <p className="text-center text-sm text-slate-400">Cargando informes...</p>
      </section>
    );
  }

  if (reports.length === 0) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-10 shadow-sm">
        <div className="mx-auto max-w-md text-center">
          <p className="text-base font-semibold text-slate-900">
            No hay informes que coincidan con los filtros.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Ajusta la búsqueda o entra en proyectos para generar nuevos resultados.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {reports.map((report) => {
        const actions: RowActionItem[] = [
          {
            icon: <ReportSparkIcon className="h-4 w-4" />,
            label: "Abrir informe",
            onSelect: () => onOpenReport(report),
          },
          {
            icon: <EyeIcon className="h-4 w-4" />,
            label: "Ver proyecto",
            onSelect: () => onOpenProject(report),
          },
        ];

        return (
          <article
            className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_24px_60px_-32px_rgba(15,23,42,0.35)]"
            key={report.id}
          >
            <div className="flex flex-col gap-5 p-5">
              <BoardHeroArt
                accentClassName="bg-gradient-to-br from-emerald-100 via-white to-sky-50"
                eyebrow={`${report.reportCount} informe${report.reportCount === 1 ? "" : "s"} listo${report.reportCount === 1 ? "" : "s"}`}
                imagePath={REPORT_BOARD_HERO_IMAGE}
                subtitle={`@${report.owner}${report.entity_name ? ` · ${report.entity_name}` : ""}`}
                title={report.name}
              />

              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                      Actualizado {formatDate(report.updated_at)}
                    </span>
                    <span className="max-w-full truncate rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                      Principal: {report.primaryReportName}
                    </span>
                  </div>
                </div>

                <RowActionsMenu actions={actions} ariaLabel={`Abrir acciones para ${report.name}`} />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <ReportMetricChip label="Informes" value={String(report.reportCount)} />
                <ReportMetricChip label="Archivos" value={String(report.files.length)} />
                <ReportMetricChip label="Ruta" value={report.routeRef} />
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Entregables HTML
                </p>
                <ReportPreviewPills report={report} />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  className={buttonStyles({ size: "sm", variant: "primary" })}
                  href={report.primaryReportHref}
                >
                  <ReportSparkIcon className="h-4 w-4" />
                  Abrir informe
                </Link>
                <button
                  className={cn(buttonStyles({ size: "sm", variant: "ghost" }), "border border-slate-200")}
                  onClick={() => onOpenProject(report)}
                  type="button"
                >
                  <ProjectStackIcon className="h-4 w-4" />
                  Ver proyecto
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
