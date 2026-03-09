import { useMemo } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  FilterIcon,
  SearchIcon,
} from "@/components/projects/project-management-icons";
import type {
  ProjectOwnerFilter,
  ProjectStatusFilter,
} from "@/components/projects/project-management-utils";
import { ChevronDownIcon } from "@/components/users/user-management-icons";

type ProjectManagementFiltersProps = {
  onOwnerFilterChange: (value: ProjectOwnerFilter) => void;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: ProjectStatusFilter) => void;
  ownerFilter: ProjectOwnerFilter;
  owners: string[];
  search: string;
  statusFilter: ProjectStatusFilter;
};

export function ProjectManagementFilters({
  onOwnerFilterChange,
  onSearchChange,
  onStatusFilterChange,
  ownerFilter,
  owners,
  search,
  statusFilter,
}: ProjectManagementFiltersProps) {
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
            placeholder="Buscar por proyecto, propietario o nombre de archivo..."
            type="search"
            value={search}
          />
        </div>

        <div className="flex justify-end">
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
                  <p className="text-sm font-semibold text-slate-900">Filtros de proyectos</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Ajusta el listado por estado del inventario y por propietario.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-500">
                    Estado
                    <select
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-sky-100"
                      onChange={(event) => onStatusFilterChange(event.target.value as ProjectStatusFilter)}
                      value={statusFilter}
                    >
                      <option value="all">Todos los estados</option>
                      <option value="results">Resultados listos</option>
                      <option value="configured">Pendiente de análisis</option>
                      <option value="empty">Sin archivos</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-500">
                    Propietario
                    <select
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-sky-100"
                      onChange={(event) => onOwnerFilterChange(event.target.value)}
                      value={ownerFilter}
                    >
                      <option value="all">Todos los propietarios</option>
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
