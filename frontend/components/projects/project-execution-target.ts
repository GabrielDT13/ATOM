export type ProjectExecutionTarget =
  | {
      autoStart?: boolean;
      owner: string;
      projectName: string;
      projectRef?: never;
      runId?: string | null;
    }
  | {
      autoStart?: boolean;
      owner?: never;
      projectName?: never;
      projectRef: string;
      runId?: string | null;
    };

type ProjectExecutionTargetProject = {
  active_run?: {
    id?: string | null;
  } | null;
  name: string;
  owner: string;
};

function normalizeRunId(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function buildProjectExecutionTarget({
  autoStart,
  boundRunId,
  project,
  resolvedProjectRef,
}: {
  autoStart: boolean;
  boundRunId: string | null;
  project: ProjectExecutionTargetProject | null;
  resolvedProjectRef: string | null;
}): ProjectExecutionTarget | null {
  if (!project) {
    return null;
  }

  const runId = normalizeRunId(boundRunId) ?? normalizeRunId(project.active_run?.id);
  const shouldAutoStart = autoStart && !runId;

  if (resolvedProjectRef) {
    return {
      autoStart: shouldAutoStart,
      projectRef: resolvedProjectRef,
      runId,
    };
  }

  return {
    autoStart: shouldAutoStart,
    owner: project.owner,
    projectName: project.name,
    runId,
  };
}
