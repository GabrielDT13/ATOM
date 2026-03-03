"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { fetchSession } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    void fetchSession()
      .then((session) => {
        if (!active) {
          return;
        }
        router.replace(session.authenticated ? "/dashboard" : "/login");
      })
      .catch(() => {
        if (active) {
          router.replace("/login");
        }
      });

    return () => {
      active = false;
    };
  }, [router]);

  return <div className="screen-center">Cargando...</div>;
}
