import { useMemo } from "react";

import type { DepartmentRecord } from "@/types/api";
import {
  ChevronDownIcon,
  FilterIcon,
  SearchIcon,
} from "@/components/users/user-management-icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type {
  UserDepartmentFilter,
  UserRoleFilter,
} from "@/components/users/user-management-utils";

type UserManagementFiltersProps = {
  departmentFilter: UserDepartmentFilter;
  departments: DepartmentRecord[];
  onDepartmentFilterChange: (value: UserDepartmentFilter) => void;
  onRoleFilterChange: (value: UserRoleFilter) => void;
  onSearchChange: (value: string) => void;
  roleFilter: UserRoleFilter;
  search: string;
};

export function UserManagementFilters({
  departmentFilter,
  departments,
  onDepartmentFilterChange,
  onRoleFilterChange,
  onSearchChange,
  roleFilter,
  search,
}: UserManagementFiltersProps) {
  const activeFilterCount = useMemo(() => {
    let total = 0;
    if (roleFilter !== "all") {
      total += 1;
    }
    if (departmentFilter !== "all") {
      total += 1;
    }
    return total;
  }, [departmentFilter, roleFilter]);

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
            placeholder="Buscar por nombre, email, usuario o departamento..."
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
            <PopoverContent className="w-[min(24rem,calc(100vw-2rem))] p-5">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Filtros</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Refina la tabla por rol y departamento.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-500">
                    Rol
                    <select
                      className="h-12 min-w-[180px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-sky-100"
                      onChange={(event) => onRoleFilterChange(event.target.value as UserRoleFilter)}
                      value={roleFilter}
                    >
                      <option value="all">Todos los roles</option>
                      <option value="admin">Administradores</option>
                      <option value="user">Usuarios</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-slate-500">
                    Departamento
                    <select
                      className="h-12 min-w-[220px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-sky-100"
                      onChange={(event) => onDepartmentFilterChange(event.target.value)}
                      value={departmentFilter}
                    >
                      <option value="all">Todos los departamentos</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.name}>
                          {department.name}
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
