"use client";

import Image from "next/image";
import Link from "next/link";

import type { SidebarLink } from "@/types/api";

import { useLocale } from "@/components/providers/locale-provider";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChartLineIcon,
  CloseIcon,
  DashboardIcon,
  DatabaseIcon,
  FileIcon,
  FolderIcon,
  LogoutIcon,
  UserIcon,
  UsersIcon,
} from "@/components/dashboard/dashboard-icons";

type AppSidebarProps = {
  currentPathname: string;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  items: SidebarLink[];
  onCloseMobile: () => void;
  onLogout: () => void;
  onToggleCollapse: () => void;
};

function isCurrentPath(currentPathname: string, href: string) {
  if (href === "/dashboard") {
    return currentPathname === href;
  }

  return currentPathname === href || currentPathname.startsWith(`${href}/`);
}

function getNavIcon(label: string) {
  const normalized = label.toLowerCase();

  if (normalized.includes("dashboard")) {
    return <DashboardIcon className="h-5 w-5" />;
  }

  if (normalized.includes("proyecto")) {
    return <FolderIcon className="h-5 w-5" />;
  }

  if (normalized.includes("informe") || normalized.includes("report")) {
    return <ChartLineIcon className="h-5 w-5" />;
  }

  if (normalized.includes("equipo")) {
    return <UsersIcon className="h-5 w-5" />;
  }

  if (normalized.includes("entidad")) {
    return <DatabaseIcon className="h-5 w-5" />;
  }

  if (normalized.includes("perfil")) {
    return <UserIcon className="h-5 w-5" />;
  }

  if (normalized.includes("usuario")) {
    return <UsersIcon className="h-5 w-5" />;
  }

  return <FileIcon className="h-5 w-5" />;
}

function getLocalizedNavLabel(url: string, fallback: string, locale: "en" | "es") {
  if (locale === "es") {
    return fallback;
  }

  switch (url) {
    case "/dashboard":
      return "Dashboard";
    case "/dashboard/projects":
      return "Projects";
    case "/dashboard/public-projects":
      return "Public";
    case "/dashboard/reports":
      return "Reports";
    case "/dashboard/teams":
      return "Teams";
    case "/dashboard/entities":
      return "Entities";
    case "/dashboard/profile":
      return "Profile";
    case "/dashboard/users":
      return "Users";
    default:
      return fallback;
  }
}

export function AppSidebar({
  currentPathname,
  isCollapsed,
  isMobileOpen,
  items,
  onCloseMobile,
  onLogout,
  onToggleCollapse,
}: AppSidebarProps) {
  const { locale } = useLocale();

  return (
    <>
      <div
        aria-hidden={!isMobileOpen}
        className={`fixed inset-0 z-30 bg-slate-950/40 transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden ${
          isMobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onCloseMobile}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transition-[transform,width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:sticky lg:top-0 lg:h-screen ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "lg:w-24" : "lg:w-72"}`}
      >
        <div className="relative flex h-full flex-col justify-between border-r border-slate-200 bg-white p-6 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between gap-3">
              <div className={`flex min-w-0 items-center gap-3 ${isCollapsed ? "lg:justify-center" : ""}`}>
                <div
                  className={`flex shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-sky-100 p-2 text-primary transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isCollapsed ? "h-12 w-12" : "h-14 w-14"
                  }`}
                >
                  <Image
                    alt="Logo de ATOM"
                    className="h-full w-full object-contain"
                    height={44}
                    src="/images/logo.png"
                    width={44}
                  />
                </div>
                <div
                  className={`flex min-w-0 flex-col overflow-hidden whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isCollapsed
                      ? "lg:max-w-0 lg:opacity-0 lg:translate-x-1"
                      : "lg:max-w-[11rem] lg:opacity-100 lg:translate-x-0"
                  }`}
                >
                  <h1 className="truncate text-lg font-bold leading-none tracking-tight text-slate-900">
                    ATOM
                  </h1>
                  <p className="text-xs font-medium text-slate-500">Atlantic Omics</p>
                </div>
              </div>

              <button
                aria-label={locale === "es" ? "Cerrar menú lateral" : "Close side menu"}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-primary lg:hidden"
                onClick={onCloseMobile}
                type="button"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-2" data-tour="sidebar-nav">
              {items.map((item) => {
                const active = isCurrentPath(currentPathname, item.url);

                return (
                  <Link
                    className={`group flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    } ${isCollapsed ? "lg:justify-center lg:px-0 lg:gap-0" : ""}`}
                    href={item.url}
                    key={item.url}
                    onClick={onCloseMobile}
                    title={getLocalizedNavLabel(item.url, item.name, locale)}
                  >
                    <span className="shrink-0">{getNavIcon(item.name)}</span>
                    <span
                      className={`truncate font-medium overflow-hidden whitespace-nowrap transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isCollapsed
                          ? "lg:max-w-0 lg:opacity-0 lg:translate-x-1"
                          : "lg:max-w-[10rem] lg:opacity-100 lg:translate-x-0"
                      }`}
                    >
                      {getLocalizedNavLabel(item.url, item.name, locale)}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <button
            className={`group flex items-center gap-3 rounded-lg px-4 py-3 text-slate-600 transition-colors hover:bg-slate-100 hover:text-red-600 ${
              isCollapsed ? "lg:justify-center lg:px-0 lg:gap-0" : ""
            }`}
            onClick={onLogout}
            type="button"
          >
            <LogoutIcon className="h-5 w-5 shrink-0" />
            <span
              className={`font-medium overflow-hidden whitespace-nowrap transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isCollapsed
                  ? "lg:max-w-0 lg:opacity-0 lg:translate-x-1"
                  : "lg:max-w-[8rem] lg:opacity-100 lg:translate-x-0"
              }`}
            >
              {locale === "es" ? "Cerrar sesión" : "Sign out"}
            </span>
          </button>

          <button
            aria-label={
              locale === "es"
                ? isCollapsed
                  ? "Expandir menú lateral"
                  : "Contraer menú lateral"
                : isCollapsed
                  ? "Expand side menu"
                  : "Collapse side menu"
            }
            className="absolute right-0 top-1/2 hidden h-9 w-9 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:text-primary lg:flex"
            onClick={onToggleCollapse}
            type="button"
          >
            {isCollapsed ? (
              <ArrowRightIcon className="h-5 w-5" />
            ) : (
              <ArrowLeftIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
