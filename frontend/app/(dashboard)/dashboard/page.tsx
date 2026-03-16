import { DashboardOverviewPage } from "@/components/dashboard/dashboard-overview-page";
import { fetchServerDashboardOverview } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const overview = await fetchServerDashboardOverview();

  return <DashboardOverviewPage initialOverview={overview} />;
}
