import { MetricCard } from "@/components/ui/metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppLocale } from "@/lib/locale";
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
  locale: AppLocale;
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
  locale,
  reports,
}: ReportManagementSummaryProps) {
  const t = locale === "es";
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
        description={t ? "Informes HTML detectados y disponibles para abrir desde ATOM." : "HTML reports detected and ready to open from ATOM."}
        icon={<ReportSparkIcon />}
        title={t ? "Informes listos" : "Reports ready"}
        value={String(metrics.totalReports)}
      />
      <MetricCard
        accentClassName="bg-sky-100 text-sky-700"
        description={t ? "Proyectos que ya publican al menos un resultado navegable." : "Projects already publishing at least one browsable result."}
        icon={<ProjectStackIcon />}
        title={t ? "Proyectos con salida" : "Projects with output"}
        value={String(metrics.totalProjects)}
      />
      <MetricCard
        accentClassName="bg-violet-100 text-violet-700"
        description={t ? "Propietarios distintos dentro catálogo visible de informes." : "Distinct owners inside the visible report catalog."}
        icon={<TemplateIcon />}
        title={t ? "Propietarios activos" : "Active owners"}
        value={String(metrics.owners)}
      />
      <MetricCard
        accentClassName="bg-amber-100 text-amber-700"
        description={t ? "Entidades con resultados accesibles desde esta librería." : "Entities with results accessible from this library."}
        icon={<DataFilesIcon />}
        title={t ? "Entidades cubiertas" : "Covered entities"}
        value={String(metrics.entities)}
      />
    </section>
  );
}
