import { notFound } from "next/navigation";

import { ProjectDetailPage } from "@/components/projects/project-detail-page";

type ProjectDetailRouteProps = {
  params: Promise<{
    projectPath: string[];
  }>;
};

export default async function ProjectDetailRoute({ params }: ProjectDetailRouteProps) {
  const { projectPath } = await params;

  if (projectPath.length === 1) {
    return <ProjectDetailPage projectRef={decodeURIComponent(projectPath[0])} />;
  }

  if (projectPath.length === 2) {
    return (
      <ProjectDetailPage
        owner={decodeURIComponent(projectPath[0])}
        projectName={decodeURIComponent(projectPath[1])}
      />
    );
  }

  notFound();
}
