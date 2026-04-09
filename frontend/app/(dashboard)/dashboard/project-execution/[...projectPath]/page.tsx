import { notFound } from "next/navigation";

import { ProjectExecutionPage } from "@/components/projects/project-execution-page";

type ProjectExecutionRouteProps = {
  params: Promise<{
    projectPath: string[];
  }>;
  searchParams: Promise<{
    start?: string;
  }>;
};

export default async function ProjectExecutionRoute({
  params,
  searchParams,
}: ProjectExecutionRouteProps) {
  const { projectPath } = await params;
  const query = await searchParams;
  const autoStart = query.start === "1";

  if (projectPath.length === 1) {
    return <ProjectExecutionPage autoStart={autoStart} projectRef={decodeURIComponent(projectPath[0])} />;
  }

  if (projectPath.length === 2) {
    return (
      <ProjectExecutionPage
        autoStart={autoStart}
        owner={decodeURIComponent(projectPath[0])}
        projectName={decodeURIComponent(projectPath[1])}
      />
    );
  }

  notFound();
}
