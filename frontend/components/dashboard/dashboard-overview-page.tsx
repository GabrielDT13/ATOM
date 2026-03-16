"use client";

import { useEffect, useState } from "react";

import { DashboardOverviewView } from "@/components/dashboard/dashboard-overview";
import { getDashboardOverview } from "@/lib/dashboard";
import type { DashboardOverview } from "@/types/api";

type DashboardOverviewPageProps = {
  initialOverview: DashboardOverview | null;
};

export function DashboardOverviewPage({
  initialOverview,
}: DashboardOverviewPageProps) {
  const [overview, setOverview] = useState<DashboardOverview | null>(
    initialOverview,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadOverview() {
      try {
        const payload = await getDashboardOverview();
        if (!cancelled) {
          setOverview(payload);
        }
      } catch {
        // La vista mantiene el fallback visual si el agregado no responde.
      }
    }

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, []);

  return <DashboardOverviewView overview={overview} />;
}
