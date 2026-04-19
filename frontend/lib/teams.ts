import { apiFetch } from "@/lib/api";
import type {
  TeamCollectionResponse,
  TeamDetails,
  TeamMemberCandidatesResponse,
  TeamMutationResponse,
} from "@/types/api";

type TeamPayload = {
  entityName?: string;
  memberUsernames?: string[];
  name: string;
};

function buildBody(payload: TeamPayload) {
  return JSON.stringify({
    entity_name: payload.entityName?.trim() || null,
    member_usernames: payload.memberUsernames ?? [],
    name: payload.name.trim(),
  });
}

export function listTeams() {
  return apiFetch<TeamCollectionResponse>("/api/teams");
}

export function getTeam(teamId: string) {
  return apiFetch<TeamDetails>(`/api/teams/${encodeURIComponent(teamId)}`);
}

export function createTeam(payload: TeamPayload) {
  return apiFetch<TeamMutationResponse>("/api/teams", {
    body: buildBody(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export function updateTeam(teamId: string, payload: TeamPayload) {
  return apiFetch<TeamMutationResponse>(`/api/teams/${encodeURIComponent(teamId)}`, {
    body: buildBody(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
}

export function deleteTeam(teamId: string) {
  return apiFetch<TeamMutationResponse>(`/api/teams/${encodeURIComponent(teamId)}`, {
    method: "DELETE",
  });
}

export function searchTeamMemberCandidates(query: string, options?: { excludeUsernames?: string[]; limit?: number }) {
  const searchParams = new URLSearchParams({
    limit: String(options?.limit ?? 8),
    q: query,
  });

  for (const username of options?.excludeUsernames ?? []) {
    if (username.trim()) {
      searchParams.append("exclude_usernames", username.trim());
    }
  }

  return apiFetch<TeamMemberCandidatesResponse>(`/api/teams/member-candidates?${searchParams.toString()}`);
}
