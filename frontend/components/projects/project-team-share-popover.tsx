"use client";

import type { ReactElement } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { getProjectMemberRoleLabel, type EditableProjectMemberRole, PROJECT_SHARE_ROLE_OPTIONS } from "@/components/projects/project-access-utils";
import { ProjectStackIcon, SearchIcon } from "@/components/projects/project-management-icons";
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
import type { ProjectSharedTeam } from "@/types/api";

type ProjectTeamSharePopoverProps = {
  candidates: ProjectSharedTeam[];
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  onShare: (teamId: string, role: EditableProjectMemberRole) => void;
  onShareRoleChange: (role: EditableProjectMemberRole) => void;
  open: boolean;
  search: string;
  shareRole: EditableProjectMemberRole;
  submittingTeamId: string | null;
  trigger: ReactElement;
};

export function ProjectTeamSharePopover({
  candidates,
  loading,
  onOpenChange,
  onSearchChange,
  onShare,
  onShareRoleChange,
  open,
  search,
  shareRole,
  submittingTeamId,
  trigger,
}: ProjectTeamSharePopoverProps) {
  const { locale } = useLocale();
  const t = locale === "es";
  function formatOverlap(usernames: string[]) {
    if (usernames.length <= 2) {
      return usernames.map((username) => `@${username}`).join(", ");
    }
    return t
      ? `${usernames
          .slice(0, 2)
          .map((username) => `@${username}`)
          .join(", ")} y ${usernames.length - 2} mas`
      : `${usernames
          .slice(0, 2)
          .map((username) => `@${username}`)
          .join(", ")} and ${usernames.length - 2} more`;
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
            <p className="text-sm font-semibold text-slate-900">{t ? "Añadir equipo" : "Add team"}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {t
                ? "Comparte el proyecto con un equipo completo y asigna el nivel de acceso."
                : "Share project with a full team and assign its access level."}
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
                placeholder={t ? "Buscar por nombre del equipo o entidad..." : "Search by team name or entity..."}
                type="search"
                value={search}
              />
            </label>

            <Select onValueChange={(value) => onShareRoleChange(value as EditableProjectMemberRole)} value={shareRole}>
              <SelectTrigger aria-label={t ? "Rol al compartir con equipo" : "Role when sharing with team"}>
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
                  ? "Rol aplica a todo equipo vinculado. Viewer solo lectura. Editor permite cambios en proyecto."
                  : "Role applies to whole linked team. Viewer is read-only. Editor can change project."
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
                      <Skeleton className="h-10 w-10 rounded-2xl" />
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
                  <div
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    key={candidate.id}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                          <ProjectStackIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{candidate.name}</p>
                          <p className="truncate text-xs text-slate-500">
                            @{candidate.owner_username}
                            {candidate.entity_name ? ` · ${candidate.entity_name}` : ""}
                            {t
                              ? ` · ${candidate.member_count} miembro${candidate.member_count === 1 ? "" : "s"}`
                              : ` · ${candidate.member_count} member${candidate.member_count === 1 ? "" : "s"}`}
                          </p>
                        </div>
                      </div>
                      {(candidate.direct_member_overlap_count ?? 0) > 0 ? (
                        <p className="mt-2 truncate text-xs text-slate-500">
                          {t ? "Ya con acceso individual:" : "Already with individual access:"}{" "}
                          {formatOverlap(candidate.direct_member_overlap_usernames ?? [])}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      disabled={submittingTeamId === candidate.id}
                      onClick={() => onShare(candidate.id, shareRole)}
                      size="sm"
                      type="button"
                      variant="primary"
                    >
                      {t ? "Añadir como" : "Add as"} {getProjectMemberRoleLabel(shareRole, locale)}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">
                {t
                  ? "No hay equipos disponibles para compartir con ese criterio."
                  : "No teams available to share with for that search."}
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
