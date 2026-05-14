import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";
import type { SessionUser, UserRecord } from "@/types/api";
import type { DataTableColumn } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import { PencilIcon, TrashIcon } from "@/components/projects/project-management-icons";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
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
  const { locale } = useLocale();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        role === "admin"
          ? "bg-sky-100 text-sky-700"
          : "bg-slate-100 text-slate-600",
      )}
    >
      {getRoleLabel(role, locale)}
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
  const { locale } = useLocale();
  const t = locale === "es";
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
      header: t ? "Usuario" : "User",
      id: "user",
      sortValue: (user) => getDisplayName(user).toLowerCase(),
    },
    {
      cell: (user) => <RoleBadge role={user.role} />,
      header: t ? "Rol" : "Role",
      id: "role",
      sortValue: (user) => getRoleLabel(user.role, locale).toLowerCase(),
    },
    {
      cell: (user) => (
        <span className="text-sm text-slate-600">{user.department || (t ? "Sin departamento" : "No department")}</span>
      ),
      header: t ? "Departamento" : "Department",
      id: "department",
      sortValue: (user) => (user.department || (t ? "Sin departamento" : "No department")).toLowerCase(),
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
          {user.role === "admin" ? (t ? "Control total" : "Full control") : t ? "Acceso estándar" : "Standard access"}
        </span>
      ),
      header: t ? "Acceso" : "Access",
      id: "access",
    },
    {
      cell: (user) => (
        <div className="flex justify-end">
          <RowActionsMenu
            actions={[
              {
                icon: <PencilIcon className="h-4 w-4" />,
                label: t ? "Editar usuario" : "Edit user",
                onSelect: () => onEdit(user),
              },
              ...(currentUserRole === "admin" && user.username !== "admin"
                ? [
                    {
                      destructive: true,
                      icon: <TrashIcon className="h-4 w-4" />,
                      label: t ? "Eliminar usuario" : "Delete user",
                      onSelect: () => onDelete(user),
                    },
                  ]
                : []),
            ]}
            ariaLabel={t ? `Abrir acciones para ${user.username}` : `Open actions for ${user.username}`}
          />
        </div>
      ),
      cellClassName: "w-[1%] whitespace-nowrap text-right",
      header: t ? "Acciones" : "Actions",
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
          <p className="text-base font-semibold text-slate-900">{t ? "No hay usuarios que coincidan." : "No matching users found."}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {t
              ? "Ajusta el texto de búsqueda o el filtro de roles para volver a ver resultados."
              : "Adjust search text or role filter to see results again."}
          </p>
        </div>
      }
      getRowKey={(user) => user.id}
      initialSort={{ columnId: "user", direction: "asc" }}
      loading={loading}
      loadingLabel={t ? "Cargando usuarios..." : "Loading users..."}
    />
  );
}
