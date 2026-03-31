"use client";

import { UserAvatar, UserProfilePopover } from "@/components/users/user-profile-popover";
import type { ProjectMemberRecord, ProjectMemberRole, ProjectShareCandidate } from "@/types/api";

export type ProjectAccessUser = ProjectMemberRecord | ProjectShareCandidate;

export function formatProjectAccessIdentity(record: {
  email?: string | null;
  username: string;
}) {
  return `@${record.username}${record.email ? ` · ${record.email}` : ""}`;
}

type ProjectAccessUserTriggerProps = {
  projectRole?: ProjectMemberRole | null;
  projectRoleTitle?: string;
  user: ProjectAccessUser;
};

export function ProjectAccessUserTrigger({
  projectRole,
  projectRoleTitle,
  user,
}: ProjectAccessUserTriggerProps) {
  return (
    <UserProfilePopover
      align="start"
      profile={user}
      projectRole={projectRole ?? null}
      projectRoleTitle={projectRoleTitle}
    >
      <button
        className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1 py-1 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
        type="button"
      >
        <UserAvatar size="sm" user={user} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{user.display_name}</p>
          <p className="truncate text-xs text-slate-500">{formatProjectAccessIdentity(user)}</p>
        </div>
      </button>
    </UserProfilePopover>
  );
}
