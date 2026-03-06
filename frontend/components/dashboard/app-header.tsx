"use client";

import type { SessionUser } from "@/types/api";

import { BellIcon, MenuIcon, UserIcon } from "@/components/dashboard/dashboard-icons";

type AppHeaderProps = {
  onOpenSidebar: () => void;
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

export function AppHeader({ onOpenSidebar, user }: AppHeaderProps) {
  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">
      <div className="flex items-center gap-3">
        <button
          aria-label="Abrir menú lateral"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-primary lg:hidden"
          onClick={onOpenSidebar}
          type="button"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          aria-label="Notificaciones"
          className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-primary"
          type="button"
        >
          <BellIcon className="h-5 w-5" />
        </button>

        <div className="h-8 w-px bg-slate-200" />

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-900">{getUserHeading(user)}</p>
            <p className="text-xs text-slate-500">{getUserSubtitle(user)}</p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600">
            <UserIcon className="h-5 w-5" />
          </div>
        </div>
      </div>
    </header>
  );
}
