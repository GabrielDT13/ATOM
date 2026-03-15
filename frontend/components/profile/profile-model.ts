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
  joinedLabel: string;
  lastUpdatedLabel: string;
  metrics: ProfileStatItem[];
  passwordDescription: string;
  roleDisplay: string;
  securityAlertsEnabled: boolean;
  darkModeEnabled: boolean;
  username: string;
  emailNotificationsEnabled: boolean;
};

function buildDisplayName(
  profile: ProfileRecord | null,
  user: SessionUser | null,
) {
  if (profile?.display_name?.trim()) {
    return profile.display_name.trim();
  }

  if (!user) {
    return "Perfil de usuario";
  }

  const fallbackName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  return user.display_name ?? (fallbackName || user.username || "Investigador/a ATOM");
}

function formatMonthYear(dateValue: string | undefined) {
  if (!dateValue) {
    return "Pendiente";
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "Pendiente";
  }

  return new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateTime(dateValue: string | undefined) {
  if (!dateValue) {
    return "Sin cambios recientes";
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "Sin cambios recientes";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatActivityTime(dateValue: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

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

  return new Intl.DateTimeFormat("es-ES", {
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
): ProfileViewModel {
  const displayName = buildDisplayName(profile, user);
  const department =
    profile?.department?.trim() ||
    user?.department?.trim() ||
    "Sin departamento asignado";
  const role = profile?.role ?? user?.role ?? "user";
  const roleDisplay = role === "admin" ? "Administrador/a" : "Usuario";
  const username = profile?.username || user?.username || "sin-usuario";
  const email = profile?.email || user?.email || "sin-correo@atom.local";
  const joinedLabel = formatMonthYear(profile?.joined_at);
  const lastUpdatedLabel = formatDateTime(profile?.updated_at);

  const activity: ProfileActivityItem[] =
    profile?.activity?.length
      ? profile.activity.map((item) => ({
          title: item.title,
          description: item.description,
          key: `${item.kind}-${item.created_at}-${item.title}`,
          timeLabel: formatActivityTime(item.created_at),
          accentClassName: resolveActivityAccent(item.kind),
        }))
      : [
          {
            title: "Sin actividad reciente",
            description: "Todavía no hay acciones registradas para esta cuenta.",
            key: "empty-activity",
            timeLabel: "Ahora mismo",
            accentClassName: "bg-slate-300",
          },
        ];

  const metrics: ProfileStatItem[] = [
    {
      label: "Proyectos activos",
      value: String(profile?.summary.active_projects ?? 0),
    },
    {
      label: "Colaboraciones",
      value: String(profile?.summary.collaborations ?? 0),
    },
    {
      label: "Revisiones pendientes",
      value: String(profile?.summary.pending_reviews ?? 0),
    },
  ];

  return {
    activity,
    bio:
      profile?.bio?.trim() ||
      (role === "admin"
        ? "Perfil orientado a la coordinación del espacio de trabajo y la gestión de accesos del equipo."
        : `Perfil vinculado al área de ${department}, con seguimiento activo de proyectos y colaboraciones.`),
    department,
    displayName,
    email,
    emailNotificationsEnabled: profile?.preferences.email_notifications ?? true,
    interfaceLanguage: profile?.preferences.interface_language ?? "es",
    joinedLabel,
    lastUpdatedLabel,
    metrics,
    passwordDescription: `Última actualización registrada: ${lastUpdatedLabel}.`,
    roleDisplay,
    securityAlertsEnabled: profile?.preferences.security_alerts ?? true,
    darkModeEnabled: profile?.preferences.dark_mode ?? false,
    username,
  };
}
