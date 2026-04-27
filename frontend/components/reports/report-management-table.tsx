import Link from "next/link";

import { buildProjectDetailHref } from "@/lib/projects";
import type { DataTableColumn } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import { RowActionsMenu, type RowActionItem } from "@/components/ui/row-actions-menu";
import { formatDate } from "@/components/projects/detail/project-detail-helpers";
import {
  EyeIcon,
  ReportSparkIcon,
} from "@/components/projects/project-management-icons";
import type { ReportRecord } from "@/components/reports/report-management-utils";

type ReportManagementTableProps = {
  loading: boolean;
  onOpenProject: (report: ReportRecord) => void;
  onOpenReport: (report: ReportRecord) => void;
  reports: ReportRecord[];
};

function ReportCatalogCell({ report }: { report: ReportRecord }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-slate-900">
        {report.reportCount} informe{report.reportCount === 1 ? "" : "s"}
      </p>
      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
          {report.htmlFiles.length} HTML
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
          {report.files.length} archivo{report.files.length === 1 ? "" : "s"}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
          {report.templateFile ? "Plantilla lista" : "Sin plantilla"}
        </span>
      </div>
    </div>
  );
}

export function ReportManagementTable({
  loading,
  onOpenProject,
  onOpenReport,
  reports,
}: ReportManagementTableProps) {
  const columns: DataTableColumn<ReportRecord>[] = [
    {
      cell: (report) => (
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ReportSparkIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <Link
              className="truncate text-sm font-semibold text-slate-900 transition hover:text-primary"
              href={buildProjectDetailHref(report.routeRef)}
            >
              {report.name}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                @{report.owner}
              </span>
              {report.entity_name ? (
                <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">
                  {report.entity_name}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ),
      header: "Proyecto",
      id: "project",
      sortValue: (report) => `${report.owner} ${report.name}`.toLowerCase(),
    },
    {
      cell: (report) => (
        <div className="space-y-1">
          <Link
            className="inline-flex max-w-[18rem] rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:text-emerald-800"
            href={report.primaryReportHref}
          >
            <span className="truncate">{report.primaryReportName}</span>
          </Link>
          <p className="max-w-[22rem] truncate text-xs text-slate-500">{report.primaryReportPath}</p>
        </div>
      ),
      header: "Informe principal",
      id: "primary-report",
      sortValue: (report) => report.primaryReportPath.toLowerCase(),
    },
    {
      cell: (report) => <ReportCatalogCell report={report} />,
      header: "Catálogo",
      id: "catalog",
      sortValue: (report) => report.reportCount,
    },
    {
      cell: (report) => (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">{formatDate(report.updated_at)}</p>
          <p className="text-xs text-slate-500">Última sincronización visible</p>
        </div>
      ),
      header: "Actualizado",
      id: "updated-at",
      sortValue: (report) => Date.parse(report.updated_at),
    },
    {
      cell: (report) => {
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
          <div className="flex justify-end">
            <RowActionsMenu actions={actions} ariaLabel={`Abrir acciones para ${report.name}`} />
          </div>
        );
      },
      cellClassName: "w-[1%] whitespace-nowrap text-right",
      header: "Acciones",
      headerClassName: "text-right",
      id: "actions",
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={reports}
      emptyState={
        <div className="mx-auto max-w-md text-center">
          <p className="text-base font-semibold text-slate-900">
            No hay informes que coincidan con los filtros.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Ajusta la búsqueda o entra en proyectos para publicar nuevos resultados.
          </p>
        </div>
      }
      getRowKey={(report) => report.id}
      initialSort={{ columnId: "updated-at", direction: "desc" }}
      loading={loading}
      loadingLabel="Cargando informes..."
    />
  );
}
