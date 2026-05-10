import type { AppLocale } from "@/lib/locale";
import type { ProfileRecord, SessionUser } from "@/types/api";

export type ProfileActivityItem = {
  accentClassName: string;
  description: string;
  key: string;
  timeLabel: string;
  title: string;
};

export type ProfileStatItem = {
  label: string;
  value: string;
};

export type ProfileViewModel = {
  activity: ProfileActivityItem[];
  bio: string;
  department: string;
  displayName: string;
  email: string;
  interfaceLanguage: "es" | "en";
  interfaceLanguageAuto: boolean;
  joinedLabel: string;
  lastUpdatedLabel: string;
  metrics: ProfileStatItem[];
  passwordDescription: string;
  roleDisplay: string;
  securityAlertsEnabled: boolean;
  darkModeEnabled: boolean;
  darkModeAuto: boolean;
  username: string;
  emailNotificationsEnabled: boolean;
};

function buildDisplayName(
  profile: ProfileRecord | null,
  user: SessionUser | null,
  locale: AppLocale,
) {
  if (profile?.display_name?.trim()) {
    return profile.display_name.trim();
  }

  if (!user) {
    return locale === "es" ? "Perfil de usuario" : "User profile";
  }

  const fallbackName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  return user.display_name ?? (fallbackName || user.username || (locale === "es" ? "Investigador/a ATOM" : "ATOM researcher"));
}

function formatMonthYear(dateValue: string | undefined, locale: AppLocale) {
  if (!dateValue) {
    return locale === "es" ? "Pendiente" : "Pending";
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return locale === "es" ? "Pendiente" : "Pending";
  }

  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateTime(dateValue: string | undefined, locale: AppLocale) {
  if (!dateValue) {
    return locale === "es" ? "Sin cambios recientes" : "No recent changes";
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return locale === "es" ? "Sin cambios recientes" : "No recent changes";
  }

  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatActivityTime(dateValue: string, locale: AppLocale) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return locale === "es" ? "Sin fecha" : "No date";
  }

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale === "es" ? "es" : "en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return rtf.format(diffDays, "day");
  }

  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function resolveActivityAccent(kind: string) {
  switch (kind) {
    case "password_changed":
      return "bg-violet-500";
    case "profile_updated":
      return "bg-emerald-500";
    case "collaboration":
      return "bg-sky-500";
    case "project_updated":
      return "bg-amber-500";
    default:
      return "bg-slate-400";
  }
}

export function buildProfileModel(
  profile: ProfileRecord | null,
  user: SessionUser | null,
  locale: AppLocale,
): ProfileViewModel {
  const displayName = buildDisplayName(profile, user, locale);
  const department =
    profile?.department?.trim() ||
    user?.department?.trim() ||
    (locale === "es" ? "Sin departamento asignado" : "No department assigned");
  const role = profile?.role ?? user?.role ?? "user";
  const roleDisplay = role === "admin"
    ? locale === "es"
      ? "Administrador/a"
      : "Administrator"
    : locale === "es"
      ? "Usuario"
      : "User";
  const username = profile?.username || user?.username || "sin-usuario";
  const email = profile?.email || user?.email || "sin-correo@atom.local";
  const joinedLabel = formatMonthYear(profile?.joined_at, locale);
  const lastUpdatedLabel = formatDateTime(profile?.updated_at, locale);

  const activity: ProfileActivityItem[] =
    profile?.activity?.length
      ? profile.activity.map((item) => ({
          title: item.title,
          description: item.description,
          key: `${item.kind}-${item.created_at}-${item.title}`,
          timeLabel: formatActivityTime(item.created_at, locale),
          accentClassName: resolveActivityAccent(item.kind),
        }))
      : [
          {
            title: locale === "es" ? "Sin actividad reciente" : "No recent activity",
            description:
              locale === "es"
                ? "Todavía no hay acciones registradas para esta cuenta."
                : "There are no recorded actions for this account yet.",
            key: "empty-activity",
            timeLabel: locale === "es" ? "Ahora mismo" : "Right now",
            accentClassName: "bg-slate-300",
          },
        ];

  const metrics: ProfileStatItem[] = [
    {
      label: locale === "es" ? "Proyectos activos" : "Active projects",
      value: String(profile?.summary.active_projects ?? 0),
    },
    {
      label: locale === "es" ? "Colaboraciones" : "Collaborations",
      value: String(profile?.summary.collaborations ?? 0),
    },
    {
      label: locale === "es" ? "Revisiones pendientes" : "Pending reviews",
      value: String(profile?.summary.pending_reviews ?? 0),
    },
  ];

  return {
    activity,
    bio:
      profile?.bio?.trim() ||
      (role === "admin"
        ? locale === "es"
          ? "Perfil orientado a la coordinación del espacio de trabajo y la gestión de accesos del equipo."
          : "Profile focused on workspace coordination and team access management."
        : locale === "es"
          ? `Perfil vinculado al área de ${department}, con seguimiento activo de proyectos y colaboraciones.`
          : `Profile linked to ${department}, with active project and collaboration tracking.`),
    department,
    displayName,
    email,
    emailNotificationsEnabled: profile?.preferences.email_notifications ?? true,
    interfaceLanguage: profile?.preferences.interface_language ?? "es",
    interfaceLanguageAuto: profile?.preferences.interface_language_auto ?? true,
    joinedLabel,
    lastUpdatedLabel,
    metrics,
    passwordDescription:
      locale === "es"
        ? `Última actualización registrada: ${lastUpdatedLabel}.`
        : `Last recorded update: ${lastUpdatedLabel}.`,
    roleDisplay,
    securityAlertsEnabled: profile?.preferences.security_alerts ?? true,
    darkModeEnabled: profile?.preferences.dark_mode ?? false,
    darkModeAuto: profile?.preferences.dark_mode_auto ?? true,
    username,
  };
}
