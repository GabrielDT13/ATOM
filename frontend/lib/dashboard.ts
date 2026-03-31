import { apiFetch } from "@/lib/api";
import type { DashboardOverview } from "@/types/api";

export function getDashboardOverview() {
  return apiFetch<DashboardOverview>("/api/dashboard/overview");
}
