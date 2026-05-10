import type { AppLocale } from "@/lib/locale";
import type { ProjectMemberRole } from "@/types/api";

export type EditableProjectMemberRole = Extract<ProjectMemberRole, "editor" | "viewer">;

export const PROJECT_SHARE_ROLE_OPTIONS: Array<{
  label: string;
  value: EditableProjectMemberRole;
}> = [
  { label: "Viewer", value: "viewer" },
  { label: "Editor", value: "editor" },
];

export function getProjectMemberRoleBadgeClassName(role: ProjectMemberRole) {
  switch (role) {
    case "owner":
      return "border border-sky-200 bg-sky-50 text-sky-700";
    case "editor":
      return "border border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border border-slate-200 bg-white text-slate-600";
  }
}

export function getProjectMemberRoleLabel(role: ProjectMemberRole, locale: AppLocale = "en") {
  const t = locale === "es";
  switch (role) {
    case "owner":
      return t ? "Propietario" : "Owner";
    case "editor":
      return t ? "Editor" : "Editor";
    default:
      return t ? "Lector" : "Viewer";
  }
}
