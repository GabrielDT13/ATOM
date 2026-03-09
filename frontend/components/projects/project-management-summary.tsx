import { MetricCard } from "@/components/ui/metric-card";
import {
  ProjectStackIcon,
  ReportSparkIcon,
  TemplateIcon,
  UploadStackIcon,
} from "@/components/projects/project-management-icons";
import type { ProjectRecord } from "@/components/projects/project-management-utils";
import { getProjectSummaryMetrics } from "@/components/projects/project-management-utils";

type ProjectManagementSummaryProps = {
  projects: ProjectRecord[];
};

export function ProjectManagementSummary({ projects }: ProjectManagementSummaryProps) {
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
