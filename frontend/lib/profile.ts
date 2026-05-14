import { apiFetch } from "@/lib/api";
import type {
  ProfileMutationResponse,
  ProfilePreferences,
  PublicProfileRecord,
} from "@/types/api";

export function buildPublicProfileHref(username: string) {
  return `/dashboard/u/${encodeURIComponent(username)}`;
}

export function getPublicProfile(username: string) {
  return apiFetch<PublicProfileRecord>(`/api/profile/public/${encodeURIComponent(username)}`);
}

export function updateProfilePreferences(preferences: ProfilePreferences) {
  return apiFetch<ProfileMutationResponse>("/api/profile/me/preferences", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      preferences,
    }),
  });
}
