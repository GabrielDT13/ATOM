import { cookies } from "next/headers";

import type { SessionResponse } from "@/types/api";

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

export async function fetchServerSession(): Promise<SessionResponse | null> {
  const cookieStore = await cookies();
  const serializedCookies = cookieStore.toString();

  try {
    const response = await fetch(
      `${getServerBackendOrigin()}/api/auth/session`,
      {
        headers: serializedCookies
          ? {
              cookie: serializedCookies,
            }
          : {},
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as SessionResponse;
  } catch {
    return null;
  }
}
