import { useMemo } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  FilterIcon,
  GridViewIcon,
  ListViewIcon,
  SearchIcon,
} from "@/components/projects/project-management-icons";
import type {
  ProjectOwnerFilter,
  ProjectStatusFilter,
} from "@/components/projects/project-management-utils";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "@/components/users/user-management-icons";

type ProjectViewMode = "board" | "list";

type ProjectManagementFiltersProps = {
  locale: "en" | "es";
  onOwnerFilterChange: (value: ProjectOwnerFilter) => void;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: ProjectStatusFilter) => void;
  onViewModeChange: (value: ProjectViewMode) => void;
  ownerFilter: ProjectOwnerFilter;
  owners: string[];
  search: string;
  statusFilter: ProjectStatusFilter;
  viewMode: ProjectViewMode;
};

export function ProjectManagementFilters({
  locale,
  onOwnerFilterChange,
  onSearchChange,
  onStatusFilterChange,
  onViewModeChange,
  ownerFilter,
  owners,
  search,
  statusFilter,
  viewMode,
}: ProjectManagementFiltersProps) {
  const t = locale === "es";
  const activeFilterCount = useMemo(() => {
    let total = 0;
    if (statusFilter !== "all") {
      total += 1;
    }
    if (ownerFilter !== "all") {
      total += 1;
    }
    return total;
  }, [ownerFilter, statusFilter]);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-xl">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <SearchIcon />
          </span>
          <input
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-sky-100"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t ? "Buscar por proyecto, propietario o nombre de archivo..." : "Search by project, owner or file name..."}
            type="search"
            value={search}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="inline-flex h-12 items-center rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <button
              aria-label={t ? "Cambiar a vista en lista" : "Switch to list view"}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition",
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
              onClick={() => onViewModeChange("list")}
              type="button"
            >
              <ListViewIcon />
              <span className="hidden sm:inline">{t ? "Lista" : "List"}</span>
            </button>
            <button
              aria-label={t ? "Cambiar a vista en tablero" : "Switch to board view"}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition",
                viewMode === "board"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
              onClick={() => onViewModeChange("board")}
              type="button"
            >
              <GridViewIcon />
              <span className="hidden sm:inline">{t ? "Tablero" : "Board"}</span>
            </button>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <button
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                type="button"
              >
                <FilterIcon />
                <span>{t ? "Filtros" : "Filters"}</span>
                {activeFilterCount > 0 ? (
                  <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700">
                    {activeFilterCount}
                  </span>
                ) : null}
                <ChevronDownIcon className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(28rem,calc(100vw-2rem))] p-5">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {t ? "Filtros de proyectos" : "Project filters"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {t
                      ? "Ajusta el listado por estado del inventario y por propietario."
                      : "Adjust listing by inventory status and owner."}
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-slate-500">
                    {t ? "Estado" : "Status"}
                    <select
                      className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-sky-100"
                      onChange={(event) => onStatusFilterChange(event.target.value as ProjectStatusFilter)}
                      value={statusFilter}
                    >
                      <option value="all">{t ? "Todos los estados" : "All statuses"}</option>
                      <option value="results">{t ? "Resultados listos" : "Results ready"}</option>
                      <option value="configured">{t ? "Pendiente de análisis" : "Pending analysis"}</option>
                      <option value="empty">{t ? "Sin archivos" : "No files"}</option>
                    </select>
                  </label>

                  <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-slate-500">
                    {t ? "Propietario" : "Owner"}
                    <select
                      className="h-12 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-sky-100"
                      onChange={(event) => onOwnerFilterChange(event.target.value)}
                      value={ownerFilter}
                    >
                      <option value="all">{t ? "Todos los propietarios" : "All owners"}</option>
                      {owners.map((owner) => (
                        <option key={owner} value={owner}>
                          {owner}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </section>
  );
}
