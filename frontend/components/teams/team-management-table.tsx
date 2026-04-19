import type { DataTableColumn } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import { RowActionsMenu, type RowActionItem } from "@/components/ui/row-actions-menu";
import { PencilIcon, TrashIcon } from "@/components/projects/project-management-icons";
import { formatDate } from "@/components/projects/detail/project-detail-helpers";
import { UsersClusterIcon } from "@/components/users/user-management-icons";
import type { TeamRecord } from "@/components/teams/team-management-utils";

type TeamManagementTableProps = {
  loading: boolean;
  onDelete: (team: TeamRecord) => void;
  onEdit: (team: TeamRecord) => void;
  teams: TeamRecord[];
};

export function TeamManagementTable({
  loading,
  onDelete,
  onEdit,
  teams,
}: TeamManagementTableProps) {
  const columns: DataTableColumn<TeamRecord>[] = [
    {
      cell: (team) => (
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <UsersClusterIcon />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{team.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                @{team.owner_username}
              </span>
              {team.entity_name ? (
                <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">
                  {team.entity_name}
                </span>
              ) : (
                <span className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-slate-500">
                  Sin entidad
                </span>
              )}
            </div>
          </div>
        </div>
      ),
      header: "Equipo",
      id: "team",
      sortValue: (team) => `${team.owner_username} ${team.name}`.toLowerCase(),
    },
    {
      cell: (team) => (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">
            {team.member_count} miembro{team.member_count === 1 ? "" : "s"}
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            {team.membership_role ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                {team.membership_role === "owner" ? "Propietario" : "Miembro"}
              </span>
            ) : null}
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
              Actualizado {formatDate(team.updated_at)}
            </span>
          </div>
        </div>
      ),
      header: "Resumen",
      id: "summary",
      sortValue: (team) => team.member_count,
    },
    {
      cell: (team) => (
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {team.slug}
        </span>
      ),
      header: "Slug",
      id: "slug",
      sortValue: (team) => team.slug,
    },
    {
      cell: (team) => {
        if (!team.canManage) {
          return <span className="text-sm text-slate-400">Sin acciones</span>;
        }

        const actions: RowActionItem[] = [
          {
            icon: <PencilIcon className="h-4 w-4" />,
            label: "Editar equipo",
            onSelect: () => onEdit(team),
          },
          {
            destructive: true,
            icon: <TrashIcon className="h-4 w-4" />,
            label: "Eliminar equipo",
            onSelect: () => onDelete(team),
            separatorBefore: true,
          },
        ];

        return (
          <div className="flex justify-end">
            <RowActionsMenu actions={actions} ariaLabel={`Abrir acciones para ${team.name}`} />
          </div>
        );
      },
      cellClassName: "w-[1%] whitespace-nowrap text-right",
      header: "Acciones",
      headerClassName: "text-right",
      id: "actions",
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={teams}
      emptyState={
        <div className="mx-auto max-w-md text-center">
          <p className="text-base font-semibold text-slate-900">
            No hay equipos que coincidan con los filtros.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Ajusta la búsqueda o crea un equipo nuevo para empezar a organizar colaboraciones.
          </p>
        </div>
      }
      getRowKey={(team) => team.id}
      initialSort={{ columnId: "team", direction: "asc" }}
      loading={loading}
      loadingLabel="Cargando equipos..."
    />
  );
}
