import { useMemo } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  FilterIcon,
  GridViewIcon,
  ListViewIcon,
  SearchIcon,
} from "@/components/projects/project-management-icons";
import { ChevronDownIcon } from "@/components/users/user-management-icons";
import { cn } from "@/lib/utils";
import type {
  TeamEntityFilter,
  TeamOwnerFilter,
  TeamViewMode,
} from "@/components/teams/team-management-utils";

type TeamManagementFiltersProps = {
  entities: string[];
  entityFilter: TeamEntityFilter;
  onEntityFilterChange: (value: TeamEntityFilter) => void;
  onOwnerFilterChange: (value: TeamOwnerFilter) => void;
  onSearchChange: (value: string) => void;
  onViewModeChange: (value: TeamViewMode) => void;
  ownerFilter: TeamOwnerFilter;
  owners: string[];
  search: string;
  viewMode: TeamViewMode;
};

export function TeamManagementFilters({
  entities,
  entityFilter,
  onEntityFilterChange,
  onOwnerFilterChange,
  onSearchChange,
  onViewModeChange,
  ownerFilter,
  owners,
  search,
  viewMode,
}: TeamManagementFiltersProps) {
  const activeFilterCount = useMemo(() => {
    let total = 0;
    if (ownerFilter !== "all") {
      total += 1;
    }
    if (entityFilter !== "all") {
      total += 1;
    }
    return total;
  }, [entityFilter, ownerFilter]);

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
            placeholder="Buscar por equipo, responsable o entidad..."
            type="search"
            value={search}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="inline-flex h-12 items-center rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <button
              aria-label="Cambiar a vista en lista"
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
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button
              aria-label="Cambiar a vista en tablero"
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
              <span className="hidden sm:inline">Board</span>
            </button>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <button
                className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                type="button"
              >
                <FilterIcon />
                <span>Filtros</span>
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
                  <p className="text-sm font-semibold text-slate-900">Filtros de equipos</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Ajusta la vista por responsable y por entidad vinculada.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-500">
                    Responsable
                    <select
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-sky-100"
                      onChange={(event) => onOwnerFilterChange(event.target.value)}
                      value={ownerFilter}
                    >
                      <option value="all">Todos los responsables</option>
                      {owners.map((owner) => (
                        <option key={owner} value={owner}>
                          {owner}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-500">
                    Entidad
                    <select
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-sky-100"
                      onChange={(event) => onEntityFilterChange(event.target.value)}
                      value={entityFilter}
                    >
                      <option value="all">Todas las entidades</option>
                      {entities.map((entity) => (
                        <option key={entity} value={entity}>
                          {entity}
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
