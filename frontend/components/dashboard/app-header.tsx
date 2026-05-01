"use client";

import type { SessionUser } from "@/types/api";

import { useLocale } from "@/components/providers/locale-provider";
import { MenuIcon, UserIcon } from "@/components/dashboard/dashboard-icons";
import { HeaderHelpPopover } from "@/components/dashboard/header-help-popover";
import { HeaderNotificationsPopover } from "@/components/dashboard/header-notifications-popover";

type AppHeaderProps = {
  onOpenHelp: () => void;
  onOpenSidebar: () => void;
  supportEmail: string;
  user: SessionUser;
};

function getUserHeading(user: SessionUser) {
  const preferredName =
    user.display_name ?? user.first_name ?? user.last_name ?? user.username;

  return `Dr. ${preferredName}`;
}

function getUserSubtitle(user: SessionUser) {
  if (user.department) {
    return user.department;
  }

  return user.role === "admin"
    ? "Administrador del sistema"
    : "Usuario de la plataforma";
}

export function AppHeader({
  onOpenHelp,
  onOpenSidebar,
  supportEmail,
  user,
}: AppHeaderProps) {
  const { locale } = useLocale();
  const menuLabel = locale === "es" ? "Abrir menú lateral" : "Open side menu";

  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">
      <div className="flex items-center gap-3">
        <button
          aria-label={menuLabel}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-primary lg:hidden"
          onClick={onOpenSidebar}
          type="button"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <HeaderHelpPopover onStartTour={onOpenHelp} supportEmail={supportEmail} />
        <HeaderNotificationsPopover user={user} />

        <div className="h-8 w-px bg-slate-200" />

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-900">{getUserHeading(user)}</p>
            <p className="text-xs text-slate-500">
              {locale === "es"
                ? getUserSubtitle(user)
                : user.department
                  ? user.department
                  : user.role === "admin"
                    ? "System administrator"
                    : "Platform user"}
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600">
            <UserIcon className="h-5 w-5" />
          </div>
        </div>
      </div>
    </header>
  );
}
