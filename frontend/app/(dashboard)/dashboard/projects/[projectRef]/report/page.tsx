import { ProjectReportView } from "@/components/projects/project-report-view";

type ProjectReportByRefRouteProps = {
  params: Promise<{
    projectRef: string;
  }>;
  searchParams: Promise<{
    path?: string;
  }>;
};

export default async function ProjectReportByRefRoute({
  params,
  searchParams,
}: ProjectReportByRefRouteProps) {
  const { projectRef } = await params;
  const { path } = await searchParams;

  return (
    <ProjectReportView
      projectRef={decodeURIComponent(projectRef)}
      reportPath={path ? decodeURIComponent(path) : null}
    />
  );
}
