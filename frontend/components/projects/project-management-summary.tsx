import { MetricCard } from "@/components/ui/metric-card";
import {
  ProjectStackIcon,
  ReportSparkIcon,
  TemplateIcon,
  UploadStackIcon,
} from "@/components/projects/project-management-icons";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectRecord } from "@/components/projects/project-management-utils";
import { getProjectSummaryMetrics } from "@/components/projects/project-management-utils";

type ProjectManagementSummaryProps = {
  loading?: boolean;
  locale: "en" | "es";
  projects: ProjectRecord[];
};

function ProjectSummarySkeletonCard() {
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

export function ProjectManagementSummary({
  loading = false,
  locale,
  projects,
}: ProjectManagementSummaryProps) {
  const t = locale === "es";
  if (loading) {
    return (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <ProjectSummarySkeletonCard key={index} />
        ))}
      </section>
    );
  }

  const metrics = getProjectSummaryMetrics(projects);

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        accentClassName="bg-sky-100 text-sky-700"
        description={t ? "Proyectos detectados en la estructura actual del workspace." : "Projects detected in the current workspace structure."}
        icon={<ProjectStackIcon />}
        title={t ? "Total de proyectos" : "Total projects"}
        value={String(metrics.totalProjects)}
      />
      <MetricCard
        accentClassName="bg-indigo-100 text-indigo-700"
        description={t ? "Usuarios o propietarios distintos con proyectos visibles." : "Distinct users or owners with visible projects."}
        icon={<TemplateIcon />}
        title={t ? "Propietarios activos" : "Active owners"}
        value={String(metrics.owners)}
      />
      <MetricCard
        accentClassName="bg-emerald-100 text-emerald-700"
        description={t ? "Proyectos que ya incluyen al menos un resultado HTML." : "Projects that already include at least one HTML result."}
        icon={<ReportSparkIcon />}
        title={t ? "Resultados listos" : "Results ready"}
        value={String(metrics.resultsReady)}
      />
      <MetricCard
        accentClassName="bg-amber-100 text-amber-700"
        description={t ? "Archivos inventariados entre plantillas, datos y entregables." : "Inventoried files across templates, data and deliverables."}
        icon={<UploadStackIcon />}
        title={t ? "Archivos cargados" : "Uploaded files"}
        value={String(metrics.totalFiles)}
      />
    </section>
  );
}
