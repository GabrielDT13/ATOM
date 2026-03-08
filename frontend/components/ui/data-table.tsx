import { ReactNode, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

type DataTableSortDirection = "asc" | "desc";

type DataTableSortValue = boolean | number | string | null | undefined;

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  sortValue?: (row: T) => DataTableSortValue;
  sortComparator?: (left: T, right: T, direction: DataTableSortDirection) => number;
};

type DataTableSortState = {
  columnId: string;
  direction: DataTableSortDirection;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  emptyState?: ReactNode;
  footer?: ReactNode;
  getRowKey: (row: T) => string;
  loading?: boolean;
  loadingLabel?: string;
  rowClassName?: string | ((row: T) => string | undefined);
  initialSort?: DataTableSortState;
};

function compareSortValues(left: DataTableSortValue, right: DataTableSortValue) {
  if (left == null && right == null) {
    return 0;
  }
  if (left == null) {
    return 1;
  }
  if (right == null) {
    return -1;
  }
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }

  return String(left).localeCompare(String(right), "es", {
    numeric: true,
    sensitivity: "base",
  });
}

function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction: DataTableSortDirection;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex text-[10px] transition-colors",
        active ? "text-sky-600" : "text-slate-300 group-hover:text-slate-500",
      )}
    >
      {direction === "asc" ? "▲" : "▼"}
    </span>
  );
}

export function DataTable<T>({
  columns,
  data,
  emptyState,
  footer,
  getRowKey,
  loading = false,
  loadingLabel = "Cargando datos...",
  rowClassName,
  initialSort,
}: DataTableProps<T>) {
  const [sortState, setSortState] = useState<DataTableSortState | null>(initialSort ?? null);

  const sortedData = useMemo(() => {
    if (!sortState) {
      return data;
    }

    const activeColumn = columns.find((column) => column.id === sortState.columnId);
    if (!activeColumn || (!activeColumn.sortComparator && !activeColumn.sortValue)) {
      return data;
    }

    const directionFactor = sortState.direction === "asc" ? 1 : -1;

    return [...data].sort((left, right) => {
      if (activeColumn.sortComparator) {
        return activeColumn.sortComparator(left, right, sortState.direction);
      }

      return (
        compareSortValues(activeColumn.sortValue?.(left), activeColumn.sortValue?.(right)) *
        directionFactor
      );
    });
  }, [columns, data, sortState]);

  function handleSort(column: DataTableColumn<T>) {
    if (!column.sortComparator && !column.sortValue) {
      return;
    }

    setSortState((current) => {
      if (!current || current.columnId !== column.id) {
        return { columnId: column.id, direction: "asc" };
      }

      return {
        columnId: column.id,
        direction: current.direction === "asc" ? "desc" : "asc",
      };
    });
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {columns.map((column) => {
                const isSortable = Boolean(column.sortComparator || column.sortValue);
                const isActive = sortState?.columnId === column.id;

                return (
                  <th
                    className={cn(
                      "px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500",
                      column.headerClassName,
                    )}
                    key={column.id}
                    scope="col"
                  >
                    {isSortable ? (
                      <button
                        className="group inline-flex items-center gap-2 text-left transition hover:text-slate-700"
                        onClick={() => handleSort(column)}
                        type="button"
                      >
                        <span>{column.header}</span>
                        <SortIndicator
                          active={isActive}
                          direction={isActive ? sortState.direction : "asc"}
                        />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td className="px-6 py-14 text-center text-sm text-slate-500" colSpan={columns.length}>
                  {loadingLabel}
                </td>
              </tr>
            ) : null}

            {!loading && data.length === 0 ? (
              <tr>
                <td className="px-6 py-14" colSpan={columns.length}>
                  {emptyState ?? (
                    <div className="text-center text-sm text-slate-500">No hay datos para mostrar.</div>
                  )}
                </td>
              </tr>
            ) : null}

            {!loading
              ? sortedData.map((row) => (
                  <tr
                    className={cn(
                      "transition-colors hover:bg-slate-50/80",
                      typeof rowClassName === "function" ? rowClassName(row) : rowClassName,
                    )}
                    key={getRowKey(row)}
                  >
                    {columns.map((column) => (
                      <td
                        className={cn("px-6 py-5 align-middle text-sm text-slate-700", column.cellClassName)}
                        key={column.id}
                      >
                        {column.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      {footer ? <div className="border-t border-slate-200 bg-slate-50/70 px-6 py-4">{footer}</div> : null}
    </div>
  );
}
