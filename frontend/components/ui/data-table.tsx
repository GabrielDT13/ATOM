import { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
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
};

export function DataTable<T>({
  columns,
  data,
  emptyState,
  footer,
  getRowKey,
  loading = false,
  loadingLabel = "Cargando datos...",
  rowClassName,
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {columns.map((column) => (
                <th
                  className={cn(
                    "px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500",
                    column.headerClassName,
                  )}
                  key={column.id}
                  scope="col"
                >
                  {column.header}
                </th>
              ))}
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
              ? data.map((row) => (
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
