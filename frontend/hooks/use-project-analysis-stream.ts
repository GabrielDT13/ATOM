"use client";

import { useEffect, useState } from "react";

import {
  applyAnalysisStreamEvent,
  buildAnalysisExecutionSnapshot,
  createInitialAnalysisExecutionState,
  parseAnalysisStreamEvent,
} from "@/components/projects/project-execution-utils";
import { buildStreamUrl } from "@/lib/api";

export function useProjectAnalysisStream(projectName: string | null) {
  const [state, setState] = useState(createInitialAnalysisExecutionState);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!projectName) {
      setState(createInitialAnalysisExecutionState());
      return;
    }

    setNow(Date.now());
    setState(createInitialAnalysisExecutionState());

    const source = new EventSource(
      buildStreamUrl(`/api/analysis/run?project_name=${encodeURIComponent(projectName)}`),
      { withCredentials: true },
    );

    source.onmessage = (event) => {
      const parsedEvent = parseAnalysisStreamEvent(event.data);
      setState((current) => applyAnalysisStreamEvent(current, parsedEvent));
      setNow(Date.now());
    };

    source.onerror = () => {
      setState((current) => {
        if (current.status === "completed" || current.status === "failed") {
          return current;
        }

        return applyAnalysisStreamEvent(current, {
          type: "run_failed",
          message: "Se perdió la conexión con el proceso de ejecución.",
          timestamp: new Date().toISOString(),
        });
      });
      setNow(Date.now());
      source.close();
    };

    return () => {
      source.close();
    };
  }, [projectName]);

  useEffect(() => {
    if (state.status !== "running") {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [state.status]);

  return buildAnalysisExecutionSnapshot(state, now);
}
