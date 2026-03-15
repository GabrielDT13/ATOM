import { ProfileSettingsPage } from "@/components/profile/profile-settings-page";
import { fetchServerProfile, fetchServerSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await fetchServerProfile();
  const user =
    profile
      ? {
          id: profile.id,
          email: profile.email,
          username: profile.username,
          role: profile.role,
          department: profile.department ?? null,
          display_name: profile.display_name,
        }
      : (await fetchServerSession())?.user ?? null;

  return (
    <ProfileSettingsPage
      profileData={profile}
      user={user}
    />
  );
}
