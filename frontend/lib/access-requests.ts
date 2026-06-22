import { apiFetch } from "@/lib/api";
import type {
  AccessRequestMutationResponse,
  AccessRequestRecord,
} from "@/types/api";

export function listAccessRequests() {
  return apiFetch<AccessRequestRecord[]>("/api/access-requests");
}

export function approveAccessRequest(
  requestId: number,
  payload: {
    username: string;
    department?: string | null;
    entity_name?: string | null;
  },
) {
  return apiFetch<AccessRequestMutationResponse>(
    `/api/access-requests/${encodeURIComponent(String(requestId))}/approve`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
}

export function denyAccessRequest(requestId: number) {
  return apiFetch<AccessRequestMutationResponse>(
    `/api/access-requests/${encodeURIComponent(String(requestId))}/deny`,
    { method: "POST" },
  );
}
