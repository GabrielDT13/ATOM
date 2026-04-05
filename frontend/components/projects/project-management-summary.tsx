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
  projects,
}: ProjectManagementSummaryProps) {
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
        description="Proyectos detectados en la estructura actual del workspace."
        icon={<ProjectStackIcon />}
        title="Total de proyectos"
        value={String(metrics.totalProjects)}
      />
      <MetricCard
        accentClassName="bg-indigo-100 text-indigo-700"
        description="Usuarios o propietarios distintos con proyectos visibles."
        icon={<TemplateIcon />}
        title="Propietarios activos"
        value={String(metrics.owners)}
      />
      <MetricCard
        accentClassName="bg-emerald-100 text-emerald-700"
        description="Proyectos que ya incluyen al menos un resultado HTML."
        icon={<ReportSparkIcon />}
        title="Resultados listos"
        value={String(metrics.resultsReady)}
      />
      <MetricCard
        accentClassName="bg-amber-100 text-amber-700"
        description="Archivos inventariados entre plantillas, datos y entregables."
        icon={<UploadStackIcon />}
        title="Archivos cargados"
        value={String(metrics.totalFiles)}
      />
    </section>
  );
}
