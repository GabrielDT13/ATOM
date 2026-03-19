import { notFound } from "next/navigation";

import { ProjectReportView } from "@/components/projects/project-report-view";

type ProjectReportRouteProps = {
  params: Promise<{
    projectPath: string[];
  }>;
  searchParams: Promise<{
    path?: string;
  }>;
};

export default async function ProjectReportRoute({
  params,
  searchParams,
}: ProjectReportRouteProps) {
  const { projectPath } = await params;
  const { path } = await searchParams;

  if (projectPath.length === 1) {
    return (
      <ProjectReportView
        projectRef={decodeURIComponent(projectPath[0])}
        reportPath={path ? decodeURIComponent(path) : null}
      />
    );
  }

  if (projectPath.length === 2) {
    return (
      <ProjectReportView
        owner={decodeURIComponent(projectPath[0])}
        projectName={decodeURIComponent(projectPath[1])}
        reportPath={path ? decodeURIComponent(path) : null}
      />
    );
  }

  notFound();
}
