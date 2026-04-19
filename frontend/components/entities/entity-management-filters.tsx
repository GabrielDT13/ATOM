import {
  GridViewIcon,
  ListViewIcon,
  SearchIcon,
} from "@/components/projects/project-management-icons";
import { cn } from "@/lib/utils";
import type { EntityViewMode } from "@/components/entities/entity-management-utils";

type EntityManagementFiltersProps = {
  onSearchChange: (value: string) => void;
  onViewModeChange: (value: EntityViewMode) => void;
  search: string;
  viewMode: EntityViewMode;
};

export function EntityManagementFilters({
  onSearchChange,
  onViewModeChange,
  search,
  viewMode,
}: EntityManagementFiltersProps) {
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
            placeholder="Buscar por entidad o slug..."
            type="search"
            value={search}
          />
        </div>

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
      </div>
    </section>
  );
}
