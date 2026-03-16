import { ProjectDetailPage } from "@/components/projects/project-detail-page";

type ProjectDetailRouteProps = {
  params: Promise<{
    owner: string;
    projectName: string;
  }>;
};

export default async function ProjectDetailRoute({ params }: ProjectDetailRouteProps) {
  const { owner, projectName } = await params;

  return (
    <ProjectDetailPage
      owner={decodeURIComponent(owner)}
      projectName={decodeURIComponent(projectName)}
    />
  );
}
