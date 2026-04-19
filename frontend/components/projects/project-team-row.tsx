"use client";

import { getProjectMemberRoleBadgeClassName, getProjectMemberRoleLabel } from "@/components/projects/project-access-utils";
import { PencilIcon, ProjectStackIcon, TrashIcon } from "@/components/projects/project-management-icons";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import type { ProjectSharedTeam } from "@/types/api";

type ProjectTeamRowProps = {
  team: ProjectSharedTeam;
  onEdit: (team: ProjectSharedTeam) => void;
  onRemove: (team: ProjectSharedTeam) => void;
};

export function ProjectTeamRow({ team, onEdit, onRemove }: ProjectTeamRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          <ProjectStackIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{team.name}</p>
          <p className="truncate text-xs text-slate-500">
            @{team.owner_username}
            {team.entity_name ? ` · ${team.entity_name}` : ""}
            {` · ${team.member_count} miembro${team.member_count === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${getProjectMemberRoleBadgeClassName(team.member_role)}`}
        >
          {getProjectMemberRoleLabel(team.member_role)}
        </span>
        <RowActionsMenu
          actions={[
            {
              icon: <PencilIcon className="h-4 w-4" />,
              label: "Editar rol",
              onSelect: () => onEdit(team),
            },
            {
              destructive: true,
              icon: <TrashIcon className="h-4 w-4" />,
              label: "Quitar equipo",
              onSelect: () => onRemove(team),
              separatorBefore: true,
            },
          ]}
          ariaLabel={`Abrir acciones del equipo ${team.name}`}
        />
      </div>
    </div>
  );
}
