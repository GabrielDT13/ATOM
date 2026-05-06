import { cookies } from "next/headers";

import type {
  DashboardOverview,
  PublicProfileRecord,
  ProfileRecord,
  SessionResponse,
} from "@/types/api";

function getServerBackendOrigin() {
  if (process.env.BACKEND_INTERNAL_URL) {
    return process.env.BACKEND_INTERNAL_URL;
  }

  if (process.env.NEXT_PUBLIC_BACKEND_PUBLIC_ORIGIN) {
    return process.env.NEXT_PUBLIC_BACKEND_PUBLIC_ORIGIN;
  }

  const backendPort = process.env.NEXT_PUBLIC_BACKEND_PUBLIC_PORT ?? "8000";
  return `http://127.0.0.1:${backendPort}`;
}

async function fetchServerBackend<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const serializedCookies = cookieStore.toString();

  try {
    const response = await fetch(`${getServerBackendOrigin()}${path}`, {
      headers: serializedCookies
        ? {
            cookie: serializedCookies,
          }
        : {},
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchServerSession(): Promise<SessionResponse | null> {
  return fetchServerBackend<SessionResponse>("/api/auth/session");
}

export async function fetchServerProfile(): Promise<ProfileRecord | null> {
  return fetchServerBackend<ProfileRecord>("/api/profile/me");
}

export async function fetchServerPublicProfile(
  username: string,
): Promise<PublicProfileRecord | null> {
  return fetchServerBackend<PublicProfileRecord>(
    `/api/profile/public/${encodeURIComponent(username)}`,
  );
}

export async function fetchServerDashboardOverview(): Promise<DashboardOverview | null> {
  return fetchServerBackend<DashboardOverview>("/api/dashboard/overview");
}
