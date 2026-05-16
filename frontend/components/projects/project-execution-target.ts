export type ProjectExecutionTarget =
  | {
      analysisVariant?: string | null;
      autoStart?: boolean;
      owner: string;
      projectName: string;
      projectRef?: never;
      runId?: string | null;
    }
  | {
      analysisVariant?: string | null;
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
  primary_analysis_variant?: string | null;
  name: string;
  owner: string;
};

function normalizeRunId(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function buildProjectExecutionTarget({
  analysisVariant,
  autoStart,
  boundRunId,
  project,
  resolvedProjectRef,
}: {
  analysisVariant?: string | null;
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
  const normalizedVariant = normalizeRunId(analysisVariant) ?? normalizeRunId(project.primary_analysis_variant);

  if (resolvedProjectRef) {
    return {
      analysisVariant: normalizedVariant,
      autoStart: shouldAutoStart,
      projectRef: resolvedProjectRef,
      runId,
    };
  }

  return {
    analysisVariant: normalizedVariant,
    autoStart: shouldAutoStart,
    owner: project.owner,
    projectName: project.name,
    runId,
  };
}
