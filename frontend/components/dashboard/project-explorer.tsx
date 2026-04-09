"use client";

import Link from "next/link";

import { buildProjectDetailHref, buildProjectExecutionHref } from "@/lib/projects";
import type { SidebarProjectItem } from "@/types/api";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CloseIcon,
  FolderIcon,
  PlayIcon,
} from "@/components/dashboard/dashboard-icons";

type ProjectExplorerProps = {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  items: SidebarProjectItem[];
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
  title: string;
};

function getStatusLabel(item: SidebarProjectItem) {
  if (item.active_run?.status === "queued") {
    return "En cola";
  }

  if (item.active_run?.status === "running") {
    return "Procesando";
  }

  switch (item.status) {
    case "results":
      return "Con resultados";
    case "configured":
      return "Pendiente";
    default:
      return "Sin archivos";
  }
}

export function ProjectExplorer({
  isCollapsed,
  isMobileOpen,
  items,
  onCloseMobile,
  onToggleCollapse,
  title,
}: ProjectExplorerProps) {
  const isDesktopCollapsed = isCollapsed && !isMobileOpen;

  return (
    <>
      <div
        aria-hidden={!isMobileOpen}
        className={`fixed inset-0 z-30 bg-slate-950/40 transition-opacity duration-500 xl:hidden ${
          isMobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onCloseMobile}
      />

      <aside
        className={`fixed inset-y-0 right-0 z-40 w-[22rem] transition-[transform,width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] xl:sticky xl:top-8 xl:z-10 xl:h-[calc(100vh-8rem)] xl:self-start ${
          isMobileOpen ? "translate-x-0" : "translate-x-full xl:translate-x-0"
        } ${isCollapsed ? "xl:w-24" : "xl:w-[24rem]"}`}
      >
        <div className="relative flex h-full flex-col rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm xl:p-6">
          <div
            className={`mb-5 flex items-center justify-between gap-3 ${
              isDesktopCollapsed ? "xl:justify-center" : ""
            }`}
          >
            {isDesktopCollapsed ? (
              <div className="hidden xl:flex xl:justify-center">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-[22px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_rgba(15,23,42,0.02)_68%)] text-slate-700 shadow-sm">
                  <FolderIcon className="h-5 w-5 text-primary" />
                  <span className="absolute -right-1.5 -top-1.5 rounded-full bg-slate-950 px-2 py-0.5 text-[10px] font-semibold text-white">
                    {items.length}
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Acceso rápido
                  </p>
                  <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {items.length}
                  </span>
                  <button
                    aria-label="Cerrar panel de proyectos"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 xl:hidden"
                    onClick={onCloseMobile}
                    type="button"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          {!isCollapsed || isMobileOpen ? (
            items.length ? (
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                {items.map((item) => (
                  <article
                    className="rounded-2xl border border-slate-200/80 bg-white/80 p-4"
                    key={item.route_ref}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          className="block truncate text-sm font-semibold text-slate-900 transition hover:text-primary"
                          href={buildProjectDetailHref(item.route_ref)}
                        >
                          {item.name}
                        </Link>
                        <p className="mt-1 text-xs text-slate-500">@{item.owner}</p>
                      </div>

                      {item.can_run ? (
                        item.active_run?.status === "queued" || item.active_run?.status === "running" ? (
                          <Link
                            aria-label={`Abrir ejecución de ${item.name}`}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 transition hover:bg-violet-100"
                            href={buildProjectExecutionHref(item.route_ref)}
                          >
                            <span className="h-3 w-3 rounded-full bg-current animate-pulse" />
                          </Link>
                        ) : item.html_count > 0 ? (
                          <Link
                            aria-label={`Abrir proyecto ${item.name}`}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
                            href={buildProjectDetailHref(item.route_ref)}
                          >
                            <CheckIcon className="h-5 w-5" />
                          </Link>
                        ) : (
                          <Link
                            aria-label={`Ejecutar proyecto ${item.name}`}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition hover:bg-primary hover:text-white"
                            href={buildProjectExecutionHref(item.route_ref, { autoStart: true })}
                          >
                            <PlayIcon className="h-4 w-4" />
                          </Link>
                        )
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">{getStatusLabel(item)}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        {item.file_count} archivo{item.file_count === 1 ? "" : "s"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        {item.html_count} informe{item.html_count === 1 ? "" : "s"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                No hay proyectos disponibles.
              </div>
            )
          ) : (
            <div className="hidden flex-1 items-center justify-center xl:flex">
              <div className="flex flex-col items-center gap-4 text-slate-400">
                <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/80 px-4 py-5 shadow-inner">
                  <div className="flex flex-col items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm">
                      <FolderIcon className="h-4 w-4" />
                    </span>
                    <div className="flex flex-col items-center gap-2">
                      {items.slice(0, 3).map((item) => (
                        <span
                          className="h-2 w-10 rounded-full bg-slate-200"
                          key={item.route_ref}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="max-w-[8rem] text-center text-xs leading-5">
                  Abre el panel para acceder rápido a tus proyectos.
                </p>
              </div>
            </div>
          )}

          <button
            aria-label={isCollapsed ? "Expandir panel de proyectos" : "Contraer panel de proyectos"}
            className="absolute -left-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 xl:flex"
            onClick={onToggleCollapse}
            type="button"
          >
            {isCollapsed ? <ArrowLeftIcon className="h-4 w-4" /> : <ArrowRightIcon className="h-4 w-4" />}
          </button>
        </div>
      </aside>
    </>
  );
}
