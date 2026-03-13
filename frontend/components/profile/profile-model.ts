import type { SessionUser } from "@/types/api";

export type ProfileActivityItem = {
  accentClassName: string;
  description: string;
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
  focusLabel: string;
  joinedLabel: string;
  metrics: ProfileStatItem[];
  roleLabel: string;
  subtitle: string;
  username: string;
};

function buildDisplayName(user: SessionUser | null) {
  if (!user) {
    return "Dra. Inés Martín";
  }

  const fallbackName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  return user.display_name ?? (fallbackName || user.username || "Investigador/a ATOM");
}

export function buildProfileModel(user: SessionUser | null): ProfileViewModel {
  const displayName = buildDisplayName(user);
  const department = user?.department?.trim() || "Bioinformática traslacional";
  const roleLabel =
    user?.role === "admin" ? "Administración científica" : "Investigador/a principal";
  const username = user?.username || "ines.martin";
  const email = user?.email || "ines.martin@atlanticomics.es";
  const joinedLabel = user?.role === "admin" ? "Octubre de 2025" : "Febrero de 2026";
  const focusLabel =
    user?.role === "admin"
      ? "Coordina accesos, revisiones de proyecto y acompañamiento de equipos."
      : `Responsable del seguimiento de proyectos y de la coordinación con ${department}.`;

  const activity: ProfileActivityItem[] =
    user?.role === "admin"
      ? [
          {
            title: "Revisión de permisos del equipo",
            description: "Se actualizaron accesos para el grupo de transcriptómica.",
            timeLabel: "Hace 25 min",
            accentClassName: "bg-sky-500",
          },
          {
            title: "Perfil actualizado",
            description: "Se revisó la información profesional y el departamento asociado.",
            timeLabel: "Hoy, 10:40",
            accentClassName: "bg-emerald-500",
          },
          {
            title: "Cambio de contraseña",
            description: "Se registró una actualización de credenciales desde la cuenta principal.",
            timeLabel: "Ayer, 18:20",
            accentClassName: "bg-violet-500",
          },
          {
            title: "Proyecto compartido",
            description: "Se concedió acceso de edición al proyecto RNA Atlas 07.",
            timeLabel: "12 mar 2026",
            accentClassName: "bg-amber-500",
          },
        ]
      : [
          {
            title: "Proyecto actualizado",
            description: "Se añadieron observaciones al informe del proyecto scRNA Tumor Board.",
            timeLabel: "Hace 40 min",
            accentClassName: "bg-sky-500",
          },
          {
            title: "Perfil actualizado",
            description: "Se ajustó la biografía y la preferencia de notificaciones por correo.",
            timeLabel: "Hoy, 09:15",
            accentClassName: "bg-emerald-500",
          },
          {
            title: "Nueva colaboración",
            description: "Se incorporó al proyecto ATAC Response Cohort como editor/a.",
            timeLabel: "Ayer, 16:05",
            accentClassName: "bg-violet-500",
          },
          {
            title: "Cambio de contraseña",
            description: "Se confirmó la actualización de credenciales sin incidencias.",
            timeLabel: "10 mar 2026",
            accentClassName: "bg-amber-500",
          },
        ];

  const metrics: ProfileStatItem[] =
    user?.role === "admin"
      ? [
          { label: "Proyectos activos", value: "12" },
          { label: "Colaboraciones", value: "18" },
          { label: "Revisiones pendientes", value: "4" },
        ]
      : [
          { label: "Proyectos activos", value: "5" },
          { label: "Colaboraciones", value: "7" },
          { label: "Revisiones pendientes", value: "2" },
        ];

  return {
    activity,
    bio:
      user?.role === "admin"
        ? "Perfil enfocado en la coordinación del espacio de trabajo, la gestión de permisos y el seguimiento de iniciativas del equipo científico."
        : `Investigador/a vinculado/a al área de ${department}, con foco en la coordinación de experimentos, el seguimiento de resultados y la colaboración entre proyectos.`,
    department,
    displayName,
    email,
    focusLabel,
    joinedLabel,
    metrics,
    roleLabel,
    subtitle: `${roleLabel} · ${department}`,
    username,
  };
}
