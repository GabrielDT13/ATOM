import { notFound } from "next/navigation";

import { ProjectExecutionPage } from "@/components/projects/project-execution-page";

type ProjectExecutionRouteProps = {
  params: Promise<{
    projectPath: string[];
  }>;
};

export default async function ProjectExecutionRoute({
  params,
}: ProjectExecutionRouteProps) {
  const { projectPath } = await params;

  if (projectPath.length === 1) {
    return <ProjectExecutionPage projectRef={decodeURIComponent(projectPath[0])} />;
  }

  if (projectPath.length === 2) {
    return (
      <ProjectExecutionPage
        owner={decodeURIComponent(projectPath[0])}
        projectName={decodeURIComponent(projectPath[1])}
      />
    );
  }

  notFound();
}
