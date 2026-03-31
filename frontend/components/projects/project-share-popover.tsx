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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
              <p className="py-6 text-center text-sm text-slate-500">Buscando usuarios...</p>
            ) : candidates.length > 0 ? (
              <div className="flex flex-col gap-2">
                {candidates.map((candidate) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    key={candidate.id}
                  >
                    <ProjectAccessUserTrigger
                      projectRole={shareRole}
                      projectRoleTitle="Rol al compartir"
                      user={candidate}
                    />
                    <Button
                      disabled={submittingUsername === candidate.username}
                      onClick={() => onShare(candidate.username, shareRole)}
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
                No hay usuarios disponibles para compartir con ese criterio.
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
