"use client";

import type { ReactElement } from "react";

import { getProjectMemberRoleLabel, type EditableProjectMemberRole, PROJECT_SHARE_ROLE_OPTIONS } from "@/components/projects/project-access-utils";
import { ProjectStackIcon, SearchIcon } from "@/components/projects/project-management-icons";
import { Button } from "@/components/ui/button";
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
  function formatOverlap(usernames: string[]) {
    if (usernames.length <= 2) {
      return usernames.map((username) => `@${username}`).join(", ");
    }
    return `${usernames
      .slice(0, 2)
      .map((username) => `@${username}`)
      .join(", ")} y ${usernames.length - 2} mas`;
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
            <p className="text-sm font-semibold text-slate-900">Añadir equipo</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Comparte el proyecto con un equipo completo y asigna el nivel de acceso.
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
                placeholder="Buscar por nombre del equipo o entidad..."
                type="search"
                value={search}
              />
            </label>

            <Select onValueChange={(value) => onShareRoleChange(value as EditableProjectMemberRole)} value={shareRole}>
              <SelectTrigger>
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
                            {` · ${candidate.member_count} miembro${candidate.member_count === 1 ? "" : "s"}`}
                          </p>
                        </div>
                      </div>
                      {(candidate.direct_member_overlap_count ?? 0) > 0 ? (
                        <p className="mt-2 truncate text-xs text-slate-500">
                          Ya con acceso individual:{" "}
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
                      Añadir como {getProjectMemberRoleLabel(shareRole)}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">
                No hay equipos disponibles para compartir con ese criterio.
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
