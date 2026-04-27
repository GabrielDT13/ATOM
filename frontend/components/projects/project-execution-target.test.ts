import { describe, expect, it } from "vitest";

import { buildProjectExecutionTarget } from "@/components/projects/project-execution-target";

describe("project-execution-target", () => {
  it("keeps autoStart only until a run id exists", () => {
    expect(
      buildProjectExecutionTarget({
        autoStart: true,
        boundRunId: null,
        project: {
          active_run: null,
          name: "RNA Atlas",
          owner: "gabriel",
        },
        resolvedProjectRef: "rna-atlas",
      }),
    ).toEqual({
      autoStart: true,
      projectRef: "rna-atlas",
      runId: null,
    });

    expect(
      buildProjectExecutionTarget({
        autoStart: true,
        boundRunId: "run-123",
        project: {
          active_run: null,
          name: "RNA Atlas",
          owner: "gabriel",
        },
        resolvedProjectRef: "rna-atlas",
      }),
    ).toEqual({
      autoStart: false,
      projectRef: "rna-atlas",
      runId: "run-123",
    });
  });

  it("falls back to project active run after the url query is removed", () => {
    expect(
      buildProjectExecutionTarget({
        autoStart: false,
        boundRunId: null,
        project: {
          active_run: {
            id: "run-456",
          },
          name: "Proteoma",
          owner: "ana",
        },
        resolvedProjectRef: null,
      }),
    ).toEqual({
      autoStart: false,
      owner: "ana",
      projectName: "Proteoma",
      runId: "run-456",
    });
  });
});
