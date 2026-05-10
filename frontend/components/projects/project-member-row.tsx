"use client";

import { useLocale } from "@/components/providers/locale-provider";
import {
  getProjectMemberRoleBadgeClassName,
  getProjectMemberRoleLabel,
} from "@/components/projects/project-access-utils";
import {
  PencilIcon,
  TransferIcon,
  TrashIcon,
} from "@/components/projects/project-management-icons";
import { ProjectAccessUserTrigger } from "@/components/projects/project-access-user-trigger";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import type { ProjectMemberRecord } from "@/types/api";

type ProjectMemberRowProps = {
  member: ProjectMemberRecord;
  onEdit: (member: ProjectMemberRecord) => void;
  onRemove: (member: ProjectMemberRecord) => void;
  onTransfer: (member: ProjectMemberRecord) => void;
};

export function ProjectMemberRow({
  member,
  onEdit,
  onRemove,
  onTransfer,
}: ProjectMemberRowProps) {
  const { locale } = useLocale();
  const t = locale === "es";
  const canManageDirectAccess = !member.is_owner && member.has_direct_access !== false;
  const accessViaTeams = member.access_via_teams ?? [];

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <ProjectAccessUserTrigger projectRole={member.member_role} user={member} />
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-end gap-1">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${getProjectMemberRoleBadgeClassName(member.member_role)}`}
          >
            {getProjectMemberRoleLabel(member.member_role, locale)}
          </span>
          {accessViaTeams.length > 0 ? (
            <p className="max-w-56 truncate text-right text-[11px] text-slate-500">
              {member.has_direct_access
                ? t ? "También por " : "Also via "
                : t ? "Acceso por " : "Access via "}
              {accessViaTeams.join(", ")}
            </p>
          ) : null}
        </div>
        {canManageDirectAccess ? (
          <RowActionsMenu
            actions={[
              {
                icon: <PencilIcon className="h-4 w-4" />,
                label: t ? "Editar rol" : "Edit role",
                onSelect: () => onEdit(member),
              },
              {
                icon: <TransferIcon className="h-4 w-4" />,
                label: t ? "Transferir proyecto" : "Transfer project",
                onSelect: () => onTransfer(member),
              },
              {
                destructive: true,
                icon: <TrashIcon className="h-4 w-4" />,
                label: t ? "Quitar acceso" : "Remove access",
                onSelect: () => onRemove(member),
                separatorBefore: true,
              },
            ]}
            ariaLabel={`${t ? "Abrir" : "Open"} access actions for ${member.display_name}`}
          />
        ) : null}
      </div>
    </div>
  );
}
