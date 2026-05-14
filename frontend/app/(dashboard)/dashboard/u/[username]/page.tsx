import { PublicProfilePage } from "@/components/profile/public-profile-page";
import { fetchServerPublicProfile } from "@/lib/server-auth";

export default async function DashboardPublicProfileRoute({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await fetchServerPublicProfile(username);

  return <PublicProfilePage profile={profile} />;
}
