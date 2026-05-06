import { apiFetch } from "@/lib/api";
import type { PublicProfileRecord } from "@/types/api";

export function buildPublicProfileHref(username: string) {
  return `/dashboard/u/${encodeURIComponent(username)}`;
}

export function getPublicProfile(username: string) {
  return apiFetch<PublicProfileRecord>(`/api/profile/public/${encodeURIComponent(username)}`);
}
