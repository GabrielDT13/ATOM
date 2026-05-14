"use client";

import type { ReactElement } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import {
  EditableProjectMemberRole,
  getProjectMemberRoleLabel,
  PROJECT_SHARE_ROLE_OPTIONS,
} from "@/components/projects/project-access-utils";
import { SearchIcon } from "@/components/projects/project-management-icons";
import { ProjectAccessUserTrigger } from "@/components/projects/project-access-user-trigger";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectShareCandidate } from "@/types/api";

type ProjectSharePopoverProps = {
  candidates: ProjectShareCandidate[];
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  onShare: (username: string, role: EditableProjectMemberRole) => void;
  onShareRoleChange: (role: EditableProjectMemberRole) => void;
  open: boolean;
  search: string;
  shareRole: EditableProjectMemberRole;
  submittingUsername: string | null;
  trigger: ReactElement;
};

export function ProjectSharePopover({
  candidates,
  loading,
  onOpenChange,
  onSearchChange,
  onShare,
  onShareRoleChange,
  open,
  search,
  shareRole,
  submittingUsername,
  trigger,
}: ProjectSharePopoverProps) {
  const { locale } = useLocale();
  const t = locale === "es";
  function formatTeamAccess(teams: string[]) {
    if (teams.length <= 2) {
      return teams.join(", ");
    }
    return t
      ? `${teams.slice(0, 2).join(", ")} y ${teams.length - 2} mas`
      : `${teams.slice(0, 2).join(", ")} and ${teams.length - 2} more`;
  }

  return (
    <Popover onOpenChange={onOpenChange} open={open}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(34rem,calc(100vw-3rem))] p-5"
        onMouseDown={(event) => event.stopPropagation()}
        side="top"
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {t ? "Compartir proyecto" : "Share project"}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {t
                ? "Busca usuarios y asignales un rol antes de compartir el proyecto."
                : "Find users and assign a role before sharing the project."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <label className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon className="h-4 w-4" />
              </span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-sky-100"
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={t ? "Buscar por usuario, nombre o email..." : "Search by username, name, or email..."}
                type="search"
                value={search}
              />
            </label>

            <Select onValueChange={(value) => onShareRoleChange(value as EditableProjectMemberRole)} value={shareRole}>
              <SelectTrigger aria-label={t ? "Rol al compartir con usuario" : "Role when sharing with user"}>
                <SelectValue placeholder={t ? "Rol" : "Role"} />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_SHARE_ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {getProjectMemberRoleLabel(option.value, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{t ? "Rol" : "Role"}</span>
            <InfoTooltip
              content={
                t
                  ? "Viewer puede ver. Editor puede ver y modificar proyecto. Owner no se asigna desde aqui."
                  : "Viewer can view. Editor can view and modify project. Owner cannot be assigned here."
              }
            />
          </div>

          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 py-2">
                {Array.from({ length: 3 }, (_, index) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    key={index}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="min-w-0 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                    <Skeleton className="h-9 w-28 rounded-full" />
                  </div>
                ))}
              </div>
            ) : candidates.length > 0 ? (
              <div className="flex flex-col gap-2">
                {candidates.map((candidate) => (
                  (() => {
                    const accessViaTeams = candidate.access_via_teams ?? [];
                    const hasDirectAccess = candidate.has_direct_access === true;
                    const directRole = candidate.direct_member_role ?? null;
                    const currentRole = candidate.member_role ?? null;
                    const buttonDisabled =
                      submittingUsername === candidate.username ||
                      (hasDirectAccess && directRole === shareRole);
                    const buttonLabel = hasDirectAccess
                      ? directRole === shareRole
                        ? t
                          ? `Ya es ${getProjectMemberRoleLabel(shareRole, locale)}`
                          : `Already ${getProjectMemberRoleLabel(shareRole, locale)}`
                        : t
                          ? `Actualizar a ${getProjectMemberRoleLabel(shareRole, locale)}`
                          : `Update to ${getProjectMemberRoleLabel(shareRole, locale)}`
                      : currentRole
                        ? t
                          ? `Añadir acceso directo como ${getProjectMemberRoleLabel(shareRole, locale)}`
                          : `Add direct access as ${getProjectMemberRoleLabel(shareRole, locale)}`
                        : t
                          ? `Añadir como ${getProjectMemberRoleLabel(shareRole, locale)}`
                          : `Add as ${getProjectMemberRoleLabel(shareRole, locale)}`;

                    return (
                      <div
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                        key={candidate.id}
                      >
                        <div className="min-w-0 flex-1">
                          <ProjectAccessUserTrigger
                            projectRole={currentRole ?? shareRole}
                            projectRoleTitle={currentRole ? (t ? "Rol actual" : "Current role") : (t ? "Rol al compartir" : "Sharing role")}
                            user={candidate}
                          />
                          {hasDirectAccess ? (
                            <p className="mt-2 truncate text-xs text-slate-500">
                              {t ? "Acceso directo actual" : "Current direct access"}: {getProjectMemberRoleLabel(directRole ?? "viewer", locale)}
                            </p>
                          ) : null}
                          {accessViaTeams.length > 0 ? (
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {hasDirectAccess
                                ? t ? "Tambien accede por " : "Also has access via "
                                : t ? "Ya accede por " : "Already has access via "}
                              {formatTeamAccess(accessViaTeams)}
                            </p>
                          ) : null}
                        </div>
                        <Button
                          disabled={buttonDisabled}
                          onClick={() => onShare(candidate.username, shareRole)}
                          size="sm"
                          type="button"
                          variant="primary"
                        >
                          {buttonLabel}
                        </Button>
                      </div>
                    );
                  })()
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">
                {t
                  ? "No hay usuarios disponibles para compartir con ese criterio."
                  : "No users available to share with for that search."}
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
