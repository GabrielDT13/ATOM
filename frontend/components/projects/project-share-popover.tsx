"use client";

import type { ReactElement } from "react";

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
  function formatTeamAccess(teams: string[]) {
    if (teams.length <= 2) {
      return teams.join(", ");
    }
    return `${teams.slice(0, 2).join(", ")} y ${teams.length - 2} mas`;
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
            <p className="text-sm font-semibold text-slate-900">Compartir proyecto</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Busca usuarios y asignales un rol antes de compartir el proyecto.
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
                placeholder="Buscar por usuario, nombre o email..."
                type="search"
                value={search}
              />
            </label>

            <Select onValueChange={(value) => onShareRoleChange(value as EditableProjectMemberRole)} value={shareRole}>
              <SelectTrigger aria-label="Rol al compartir con usuario">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_SHARE_ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Rol</span>
            <InfoTooltip
              content="Viewer puede ver. Editor puede ver y modificar proyecto. Owner no se asigna desde aqui."
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
                        ? `Ya es ${getProjectMemberRoleLabel(shareRole)}`
                        : `Actualizar a ${getProjectMemberRoleLabel(shareRole)}`
                      : currentRole
                        ? `Añadir acceso directo como ${getProjectMemberRoleLabel(shareRole)}`
                        : `Añadir como ${getProjectMemberRoleLabel(shareRole)}`;

                    return (
                      <div
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                        key={candidate.id}
                      >
                        <div className="min-w-0 flex-1">
                          <ProjectAccessUserTrigger
                            projectRole={currentRole ?? shareRole}
                            projectRoleTitle={currentRole ? "Rol actual" : "Rol al compartir"}
                            user={candidate}
                          />
                          {hasDirectAccess ? (
                            <p className="mt-2 truncate text-xs text-slate-500">
                              Acceso directo actual: {getProjectMemberRoleLabel(directRole ?? "viewer")}
                            </p>
                          ) : null}
                          {accessViaTeams.length > 0 ? (
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {hasDirectAccess ? "Tambien accede por " : "Ya accede por "}
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
                No hay usuarios disponibles para compartir con ese criterio.
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
