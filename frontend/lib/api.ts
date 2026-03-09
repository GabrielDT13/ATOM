import type { SessionResponse } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/backend-api";
const DEFAULT_BACKEND_PORT =
  process.env.NEXT_PUBLIC_BACKEND_PUBLIC_PORT ?? "8000";
const AUTH_FAILURE_EVENT = "atom:auth-failure";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function emitAuthFailure() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(AUTH_FAILURE_EVENT));
}

export function subscribeToAuthFailure(
  listener: () => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = () => listener();
  window.addEventListener(AUTH_FAILURE_EVENT, handler);
  return () => window.removeEventListener(AUTH_FAILURE_EVENT, handler);
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const fallback = await response.text();
    let message = fallback || "Request failed";

    try {
      const payload = JSON.parse(fallback) as { detail?: string };
      if (payload.detail) {
        message = payload.detail;
      }
    } catch {
      // Ignore parse errors and keep fallback text.
    }

    if (response.status === 401) {
      emitAuthFailure();
    }

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function fetchSession(): Promise<SessionResponse> {
  return apiFetch<SessionResponse>("/api/auth/session");
}

export function buildApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export function buildStreamUrl(path: string): string {
  const explicitOrigin = process.env.NEXT_PUBLIC_BACKEND_PUBLIC_ORIGIN;
  if (explicitOrigin) {
    return `${explicitOrigin}${path}`;
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:${DEFAULT_BACKEND_PORT}${path}`;
  }

  return buildApiUrl(path);
}

export function encodePathSegments(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}
