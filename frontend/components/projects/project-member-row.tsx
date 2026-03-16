"use client";

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
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <ProjectAccessUserTrigger projectRole={member.member_role} user={member} />
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${getProjectMemberRoleBadgeClassName(member.member_role)}`}
        >
          {getProjectMemberRoleLabel(member.member_role)}
        </span>
        {!member.is_owner ? (
          <RowActionsMenu
            actions={[
              {
                icon: <PencilIcon className="h-4 w-4" />,
                label: "Editar rol",
                onSelect: () => onEdit(member),
              },
              {
                icon: <TransferIcon className="h-4 w-4" />,
                label: "Transferir proyecto",
                onSelect: () => onTransfer(member),
              },
              {
                destructive: true,
                icon: <TrashIcon className="h-4 w-4" />,
                label: "Quitar acceso",
                onSelect: () => onRemove(member),
                separatorBefore: true,
              },
            ]}
            ariaLabel={`Abrir acciones de acceso para ${member.display_name}`}
          />
        ) : null}
      </div>
    </div>
  );
}
