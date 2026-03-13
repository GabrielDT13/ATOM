import { ProfileSettingsPage } from "@/components/profile/profile-settings-page";
import { fetchServerSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await fetchServerSession();

  return <ProfileSettingsPage user={session?.user ?? null} />;
}
