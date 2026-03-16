import { ProjectDetailPage } from "@/components/projects/project-detail-page";

type ProjectDetailByRefRouteProps = {
  params: Promise<{
    projectRef: string;
  }>;
};

export default async function ProjectDetailByRefRoute({
  params,
}: ProjectDetailByRefRouteProps) {
  const { projectRef } = await params;

  return <ProjectDetailPage projectRef={decodeURIComponent(projectRef)} />;
}
