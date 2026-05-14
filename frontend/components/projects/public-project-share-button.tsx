"use client";

import { PublicProjectShareDialog } from "@/components/projects/public-project-share-dialog";
import type { ProjectSummary } from "@/types/api";

export function PublicProjectShareButton({
  className,
  project,
  projectRef,
  tone = "default",
  variant = "secondary",
}: {
  className?: string;
  project: Pick<ProjectSummary, "name" | "owner" | "visibility">;
  projectRef: string | null;
  tone?: "default" | "on-dark";
  variant?: "ghost" | "primary" | "secondary";
}) {
  if (!projectRef || project.visibility !== "public") {
    return null;
  }

  return (
    <PublicProjectShareDialog
      owner={project.owner}
      projectName={project.name}
      projectRef={projectRef}
      triggerClassName={className}
      triggerTone={tone}
      triggerVariant={variant}
    />
  );
}
