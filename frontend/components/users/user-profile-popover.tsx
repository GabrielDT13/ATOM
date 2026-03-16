"use client";

import type { MouseEvent, ReactElement, ReactNode } from "react";
import { useState } from "react";

import { UserIcon } from "@/components/dashboard/dashboard-icons";
import { getProjectMemberRoleBadgeClassName, getProjectMemberRoleLabel } from "@/components/projects/project-access-utils";
import { DepartmentIcon, MailIcon } from "@/components/profile/profile-icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ProjectMemberRole } from "@/types/api";

export type UserProfileSummary = {
  avatar_url?: string | null;
  bio?: string | null;
  department?: string | null;
  display_name: string;
  email?: string | null;
  username: string;
};

type UserAvatarProps = {
  className?: string;
  size?: "lg" | "md" | "sm";
  user: UserProfileSummary;
};

type UserProfilePopoverProps = {
  align?: "center" | "end" | "start";
  children: ReactElement<{
    onClick?: (event: MouseEvent<HTMLElement>) => void;
    type?: "button" | "reset" | "submit";
  }>;
  contentClassName?: string;
  profile: UserProfileSummary;
  projectRole?: ProjectMemberRole | null;
  projectRoleTitle?: string;
  side?: "bottom" | "top";
  sideOffset?: number;
};

const avatarSizeClassName = {
  lg: "h-16 w-16 rounded-3xl text-lg",
  md: "h-11 w-11 rounded-2xl text-sm",
  sm: "h-10 w-10 rounded-2xl text-sm",
} as const;

const EMPTY_BIO_TEXT = "Este usuario todavia no ha añadido una biografia corta.";
const EMPTY_DEPARTMENT_TEXT = "Sin departamento";
const EMPTY_EMAIL_TEXT = "No disponible";
const EMPTY_ROLE_TEXT = "Sin asignar";

function getUserInitials(label: string) {
  return (
    label
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

function getUserDisplayName(user: UserProfileSummary) {
  return user.display_name?.trim() || user.username;
}

export function UserAvatar({ className, size = "md", user }: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const displayLabel = getUserDisplayName(user);
  const initials = getUserInitials(displayLabel);
  const avatarUrl = user.avatar_url?.trim();

  if (avatarUrl && !imageError) {
    return (
      <img
        alt={`Avatar de ${displayLabel}`}
        className={cn(
          "border border-slate-200 bg-slate-100 object-cover shadow-sm",
          avatarSizeClassName[size],
          className,
        )}
        loading="lazy"
        onError={() => setImageError(true)}
        src={avatarUrl}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center border border-slate-200 bg-slate-100 font-semibold text-slate-700 shadow-sm",
        avatarSizeClassName[size],
        className,
      )}
    >
      {initials}
    </div>
  );
}

function DetailRow({
  children,
  icon,
  label,
}: {
  children: ReactNode;
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <div className="mt-1 text-sm text-slate-700">{children}</div>
      </div>
    </div>
  );
}

export function UserProfilePopover({
  align = "start",
  children,
  contentClassName,
  profile,
  projectRole = null,
  projectRoleTitle = "Rol en el proyecto",
  side = "bottom",
  sideOffset = 10,
}: UserProfilePopoverProps) {
  const displayName = getUserDisplayName(profile);
  const roleLabel = projectRole ? getProjectMemberRoleLabel(projectRole) : EMPTY_ROLE_TEXT;

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align={align}
        className={cn("w-[min(24rem,calc(100vw-2rem))] rounded-[28px] p-5", contentClassName)}
        onMouseDown={(event) => event.stopPropagation()}
        side={side}
        sideOffset={sideOffset}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <UserAvatar size="lg" user={profile} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold text-slate-950">{displayName}</p>
              <p className="mt-1 truncate text-sm text-slate-500">@{profile.username}</p>
              {projectRole ? (
                <span
                  className={cn(
                    "mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                    getProjectMemberRoleBadgeClassName(projectRole),
                  )}
                >
                  {getProjectMemberRoleLabel(projectRole)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2">
            <DetailRow icon={<MailIcon className="h-4 w-4" />} label="Email">
              <p className="break-all">{profile.email || EMPTY_EMAIL_TEXT}</p>
            </DetailRow>
            <DetailRow icon={<DepartmentIcon className="h-4 w-4" />} label="Departamento">
              <p>{profile.department || EMPTY_DEPARTMENT_TEXT}</p>
            </DetailRow>
            <DetailRow icon={<UserIcon className="h-4 w-4" />} label={projectRoleTitle}>
              <p>{roleLabel}</p>
            </DetailRow>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Biografia corta
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {profile.bio || EMPTY_BIO_TEXT}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
