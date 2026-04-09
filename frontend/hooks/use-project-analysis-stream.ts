"use client";

import { useEffect, useMemo, useState } from "react";

import {
  applyAnalysisStreamEvent,
  buildAnalysisExecutionSnapshot,
  createInitialAnalysisExecutionState,
  type AnalysisExecutionState,
} from "@/components/projects/project-execution-utils";
import { createAnalysisRun, getAnalysisRun, getAnalysisRunLogs } from "@/lib/analysis";
import type { AnalysisRun, AnalysisRunEvent, AnalysisStreamEvent } from "@/types/api";

type AnalysisTarget =
  | { owner: string; projectName: string; projectRef?: never; runId?: string | null; autoStart?: boolean }
  | { owner?: never; projectName?: never; projectRef: string; runId?: string | null; autoStart?: boolean };

type AnalysisExecutionResult = ReturnType<typeof buildAnalysisExecutionSnapshot> & {
  error: string | null;
  run: AnalysisRun | null;
};

function buildStateFromRun(
  run: AnalysisRun | null,
  events: AnalysisRunEvent[],
): AnalysisExecutionState {
  const initialState = createInitialAnalysisExecutionState();
  let nextState: AnalysisExecutionState = {
    ...initialState,
    projectName: run?.project_name ?? null,
    startedAt: run?.started_at ? Date.parse(run.started_at) || null : null,
    totalDesigns: run?.total_designs ?? 0,
  };

  for (const event of events) {
    nextState = applyAnalysisStreamEvent(nextState, buildStreamEvent(run, event));
  }

  if (run?.status === "queued" && !events.length) {
    return {
      ...nextState,
      lastEventAt: run.updated_at ? Date.parse(run.updated_at) || null : null,
      status: "queued",
    };
  }

  if (run?.status === "running") {
    return {
      ...nextState,
      lastEventAt: run.updated_at ? Date.parse(run.updated_at) || nextState.lastEventAt : nextState.lastEventAt,
      status: "running",
    };
  }

  if (run?.status === "failed") {
    return {
      ...nextState,
      lastEventAt: run.updated_at ? Date.parse(run.updated_at) || nextState.lastEventAt : nextState.lastEventAt,
      status: "failed",
    };
  }

  if (run?.status === "completed") {
    return {
      ...nextState,
      lastEventAt: run.updated_at ? Date.parse(run.updated_at) || nextState.lastEventAt : nextState.lastEventAt,
      status: "completed",
    };
  }

  return nextState;
}

function buildStreamEvent(run: AnalysisRun | null, event: AnalysisRunEvent): AnalysisStreamEvent {
  const timestamp = event.created_at ?? new Date().toISOString();
  const totalDesigns = event.total_designs ?? run?.total_designs ?? 0;

  switch (event.event_type) {
    case "run_started":
      return {
        type: "run_started",
        project_name: run?.project_name ?? "",
        timestamp,
        total_designs: totalDesigns,
      };
    case "run_completed":
      return {
        type: "run_completed",
        project_name: run?.project_name ?? "",
        processed_designs: run?.processed_designs ?? 0,
        timestamp,
        total_designs: totalDesigns,
      };
    case "run_failed":
      return {
        type: "run_failed",
        message: event.message,
        project_name: run?.project_name ?? "",
        timestamp,
      };
    case "design_started":
      return {
        type: "design_started",
        analysis_type: event.analysis_type ?? "",
        current_index: event.current_index ?? 0,
        design_id: event.design_id ?? "",
        message: event.message,
        timestamp,
        total_designs: totalDesigns,
      };
    case "design_completed":
      return {
        type: "design_completed",
        analysis_type: event.analysis_type ?? "",
        current_index: event.current_index ?? 0,
        design_id: event.design_id ?? "",
        duration_seconds: event.duration_seconds ?? 0,
        message: event.message,
        timestamp,
        total_designs: totalDesigns,
      };
    case "design_failed":
      return {
        type: "design_failed",
        analysis_type: event.analysis_type ?? "",
        current_index: event.current_index ?? 0,
        design_id: event.design_id ?? "",
        duration_seconds: event.duration_seconds ?? undefined,
        exit_code: event.exit_code ?? undefined,
        message: event.message,
        timestamp,
        total_designs: totalDesigns,
      };
    case "cleanup_completed":
      return {
        type: "cleanup_completed",
        analysis_type: event.analysis_type ?? "",
        current_index: event.current_index ?? 0,
        design_id: event.design_id ?? "",
        message: event.message,
        timestamp,
        total_designs: totalDesigns,
      };
    case "cleanup_failed":
      return {
        type: "cleanup_failed",
        analysis_type: event.analysis_type ?? "",
        current_index: event.current_index ?? 0,
        design_id: event.design_id ?? "",
        message: event.message,
        timestamp,
        total_designs: totalDesigns,
      };
    case "log":
    default:
      return {
        type: "log",
        analysis_type: event.analysis_type ?? undefined,
        current_index: event.current_index ?? undefined,
        design_id: event.design_id ?? undefined,
        level:
          event.level === "error" ||
          event.level === "warning"
            ? event.level
            : "info",
        message: event.message,
        timestamp,
        total_designs: totalDesigns,
      };
  }
}

export function useProjectAnalysisStream(target: AnalysisTarget | null): AnalysisExecutionResult {
  const [run, setRun] = useState<AnalysisRun | null>(null);
  const [events, setEvents] = useState<AnalysisRunEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const targetKey = useMemo(() => {
    if (!target) {
      return null;
    }

    if ("projectRef" in target) {
      return `ref:${target.projectRef}:${target.runId ?? ""}:${target.autoStart ? "start" : "view"}`;
    }

    return `project:${target.owner}/${target.projectName}:${target.runId ?? ""}:${target.autoStart ? "start" : "view"}`;
  }, [target]);

  useEffect(() => {
    if (!target || !targetKey) {
      setRun(null);
      setEvents([]);
      setError(null);
      return;
    }

    let cancelled = false;
    let pollId: number | null = null;
    const currentTarget = target;

    async function loadRun(runId: string) {
      try {
        const [nextRun, logsResponse] = await Promise.all([
          getAnalysisRun(runId),
          getAnalysisRunLogs(runId),
        ]);

        if (cancelled) {
          return;
        }

        setRun(nextRun);
        setEvents(logsResponse.items);
        setNow(Date.now());

        if (nextRun.status === "queued" || nextRun.status === "running") {
          pollId = window.setTimeout(() => {
            void loadRun(runId);
          }, 2000);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo seguir el estado de la ejecución.",
          );
        }
      }
    }

    async function ensureRun() {
      setRun(null);
      setEvents([]);
      setError(null);

      try {
        const existingRunId =
          typeof currentTarget.runId === "string" && currentTarget.runId.trim()
            ? currentTarget.runId.trim()
            : null;

        if (existingRunId) {
          await loadRun(existingRunId);
          return;
        }

        if (!currentTarget.autoStart) {
          return;
        }

        let response;
        const projectRef =
          "projectRef" in currentTarget && typeof currentTarget.projectRef === "string"
            ? currentTarget.projectRef
            : null;
        if (projectRef) {
          response = await createAnalysisRun({ project_ref: projectRef });
        } else {
          const projectTarget = currentTarget as { owner: string; projectName: string };
          response = await createAnalysisRun({
            owner: projectTarget.owner,
            project_name: projectTarget.projectName,
          });
        }

        if (cancelled) {
          return;
        }

        setRun(response.run);
        await loadRun(response.run.id);
      } catch (runError) {
        if (!cancelled) {
          setError(
            runError instanceof Error
              ? runError.message
              : "No se pudo iniciar la ejecución.",
          );
        }
      }
    }

    void ensureRun();

    return () => {
      cancelled = true;
      if (pollId) {
        window.clearTimeout(pollId);
      }
    };
  }, [target, targetKey]);

  useEffect(() => {
    if (!run || (run.status !== "queued" && run.status !== "running")) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [run]);

  const executionState = useMemo(() => buildStateFromRun(run, events), [events, run]);

  return {
    ...buildAnalysisExecutionSnapshot(executionState, now),
    error,
    run,
  };
}
