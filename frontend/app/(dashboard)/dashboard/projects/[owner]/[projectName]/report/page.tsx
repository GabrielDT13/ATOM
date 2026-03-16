import { ProjectReportView } from "@/components/projects/project-report-view";

type ProjectReportRouteProps = {
  params: Promise<{
    owner: string;
    projectName: string;
  }>;
  searchParams: Promise<{
    path?: string;
  }>;
};

export default async function ProjectReportRoute({
  params,
  searchParams,
}: ProjectReportRouteProps) {
  const { owner, projectName } = await params;
  const { path } = await searchParams;

  return (
    <ProjectReportView
      owner={decodeURIComponent(owner)}
      projectName={decodeURIComponent(projectName)}
      reportPath={path ? decodeURIComponent(path) : null}
    />
  );
}
