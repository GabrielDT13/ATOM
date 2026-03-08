import { cn } from "@/lib/utils";
import type { SessionUser, UserRecord } from "@/types/api";
import type { DataTableColumn } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import {
  getDisplayName,
  getRoleLabel,
} from "@/components/users/user-management-utils";

function getInitials(label: string) {
  return label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");
}

function UserAvatar({ user }: { user: UserRecord }) {
  const displayName = getDisplayName(user);
  const initials = getInitials(displayName || user.username);

  return (
    <div
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold",
        user.role === "admin"
          ? "bg-sky-100 text-sky-700"
          : "bg-slate-100 text-slate-700",
      )}
    >
      {initials || "U"}
    </div>
  );
}

function RoleBadge({ role }: { role: UserRecord["role"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        role === "admin"
          ? "bg-sky-100 text-sky-700"
          : "bg-slate-100 text-slate-600",
      )}
    >
      {getRoleLabel(role)}
    </span>
  );
}

type UserManagementTableProps = {
  currentUserRole?: SessionUser["role"];
  loading: boolean;
  onDelete: (user: UserRecord) => void;
  onEdit: (user: UserRecord) => void;
  users: UserRecord[];
};

export function UserManagementTable({
  currentUserRole,
  loading,
  onDelete,
  onEdit,
  users,
}: UserManagementTableProps) {
  const columns: DataTableColumn<UserRecord>[] = [
    {
      cell: (user) => (
        <div className="flex items-center gap-4">
          <UserAvatar user={user} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{getDisplayName(user)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span className="truncate">{user.email}</span>
              <span className="hidden text-slate-300 sm:inline">•</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                @{user.username}
              </span>
            </div>
          </div>
        </div>
      ),
      header: "Usuario",
      id: "user",
      sortValue: (user) => getDisplayName(user).toLowerCase(),
    },
    {
      cell: (user) => <RoleBadge role={user.role} />,
      header: "Rol",
      id: "role",
      sortValue: (user) => getRoleLabel(user.role).toLowerCase(),
    },
    {
      cell: (user) => (
        <span className="text-sm text-slate-600">{user.department || "Sin departamento"}</span>
      ),
      header: "Departamento",
      id: "department",
      sortValue: (user) => (user.department || "Sin departamento").toLowerCase(),
    },
    {
      cell: (user) => (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
            user.role === "admin"
              ? "bg-amber-100 text-amber-700"
              : "bg-emerald-100 text-emerald-700",
          )}
        >
          {user.role === "admin" ? "Control total" : "Acceso estándar"}
        </span>
      ),
      header: "Acceso",
      id: "access",
    },
    {
      cell: (user) => (
        <div className="flex justify-end gap-2">
          <button
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            onClick={() => onEdit(user)}
            type="button"
          >
            Editar
          </button>
          {currentUserRole === "admin" && user.username !== "admin" ? (
            <button
              className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100"
              onClick={() => onDelete(user)}
              type="button"
            >
              Eliminar
            </button>
          ) : null}
        </div>
      ),
      cellClassName: "w-[1%] whitespace-nowrap text-right",
      header: "Acciones",
      headerClassName: "text-right",
      id: "actions",
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={users}
      emptyState={
        <div className="mx-auto max-w-md text-center">
          <p className="text-base font-semibold text-slate-900">No hay usuarios que coincidan.</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Ajusta el texto de búsqueda o el filtro de roles para volver a ver resultados.
          </p>
        </div>
      }
      footer={
        <div className="flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Mostrando <span className="font-semibold text-slate-700">{users.length}</span> usuarios
          </p>
          <p>Haz clic en Usuario, Rol o Departamento para ordenar.</p>
        </div>
      }
      getRowKey={(user) => user.id}
      initialSort={{ columnId: "user", direction: "asc" }}
      loading={loading}
      loadingLabel="Cargando usuarios..."
    />
  );
}
