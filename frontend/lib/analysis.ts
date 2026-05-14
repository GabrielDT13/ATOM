import { apiFetch } from "@/lib/api";
import type {
  AnalysisRun,
  AnalysisRunCollectionResponse,
  AnalysisRunEventCollectionResponse,
  AnalysisRunMutationResponse,
} from "@/types/api";

type CreateAnalysisRunPayload =
  | { owner: string; project_name: string; project_ref?: never }
  | { owner?: never; project_name?: never; project_ref: string };

export function createAnalysisRun(payload: CreateAnalysisRunPayload) {
  return apiFetch<AnalysisRunMutationResponse>("/api/analysis/runs", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export function getAnalysisRun(runId: string) {
  return apiFetch<AnalysisRun>(`/api/analysis/runs/${encodeURIComponent(runId)}`);
}

export function getAnalysisRunLogs(runId: string, limit = 500) {
  return apiFetch<AnalysisRunEventCollectionResponse>(
    `/api/analysis/runs/${encodeURIComponent(runId)}/logs?limit=${encodeURIComponent(String(limit))}`,
  );
}

export function listProjectAnalysisRuns(projectRef: string, limit = 20) {
  return apiFetch<AnalysisRunCollectionResponse>(
    `/api/analysis/projects/${encodeURIComponent(projectRef)}/runs?limit=${encodeURIComponent(String(limit))}`,
  );
}
