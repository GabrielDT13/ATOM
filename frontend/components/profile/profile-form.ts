"use client";

import type { ProfileRecord, SessionUser } from "@/types/api";

export type EditableProfileFormValues = {
  bio: string;
  department: string;
  displayName: string;
  email: string;
  emailNotifications: boolean;
  interfaceLanguage: "es" | "en";
  interfaceLanguageAuto: boolean;
  loginAlerts: boolean;
  systemTheme: boolean;
  username: string;
};

function buildEditableDisplayName(
  profileData: ProfileRecord | null,
  user: SessionUser | null,
) {
  if (profileData?.display_name?.trim()) {
    return profileData.display_name.trim();
  }

  if (user?.display_name?.trim()) {
    return user.display_name.trim();
  }

  const combinedName = `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim();
  return combinedName || user?.username || "";
}

export function buildEditableProfileFormValues(
  profileData: ProfileRecord | null,
  user: SessionUser | null,
): EditableProfileFormValues {
  return {
    bio: profileData?.bio ?? "",
    department: profileData?.department ?? user?.department ?? "",
    displayName: buildEditableDisplayName(profileData, user),
    email: profileData?.email ?? user?.email ?? "",
    emailNotifications: profileData?.preferences.email_notifications ?? true,
    interfaceLanguage: profileData?.preferences.interface_language ?? "es",
    interfaceLanguageAuto: profileData?.preferences.interface_language_auto ?? true,
    loginAlerts: profileData?.preferences.security_alerts ?? true,
    systemTheme: profileData?.preferences.dark_mode ?? false,
    username: profileData?.username ?? user?.username ?? "",
  };
}
