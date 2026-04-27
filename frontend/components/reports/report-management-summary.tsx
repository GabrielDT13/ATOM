import { MetricCard } from "@/components/ui/metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DataFilesIcon,
  ProjectStackIcon,
  ReportSparkIcon,
  TemplateIcon,
} from "@/components/projects/project-management-icons";
import type { ReportRecord } from "@/components/reports/report-management-utils";
import { getReportSummaryMetrics } from "@/components/reports/report-management-utils";

type ReportManagementSummaryProps = {
  loading?: boolean;
  reports: ReportRecord[];
};

function ReportSummarySkeletonCard() {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <Skeleton className="mb-4 h-12 w-12 rounded-2xl" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-9 w-20" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </article>
  );
}

export function ReportManagementSummary({
  loading = false,
  reports,
}: ReportManagementSummaryProps) {
  if (loading) {
    return (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <ReportSummarySkeletonCard key={index} />
        ))}
      </section>
    );
  }

  const metrics = getReportSummaryMetrics(reports);

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        accentClassName="bg-emerald-100 text-emerald-700"
        description="Informes HTML detectados y disponibles para abrir desde ATOM."
        icon={<ReportSparkIcon />}
        title="Informes listos"
        value={String(metrics.totalReports)}
      />
      <MetricCard
        accentClassName="bg-sky-100 text-sky-700"
        description="Proyectos que ya publican al menos un resultado navegable."
        icon={<ProjectStackIcon />}
        title="Proyectos con salida"
        value={String(metrics.totalProjects)}
      />
      <MetricCard
        accentClassName="bg-violet-100 text-violet-700"
        description="Propietarios distintos dentro catálogo visible de informes."
        icon={<TemplateIcon />}
        title="Propietarios activos"
        value={String(metrics.owners)}
      />
      <MetricCard
        accentClassName="bg-amber-100 text-amber-700"
        description="Entidades con resultados accesibles desde esta librería."
        icon={<DataFilesIcon />}
        title="Entidades cubiertas"
        value={String(metrics.entities)}
      />
    </section>
  );
}
