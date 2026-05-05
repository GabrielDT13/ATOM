import type { DataTableColumn } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import { RowActionsMenu, type RowActionItem } from "@/components/ui/row-actions-menu";
import { PencilIcon, TrashIcon } from "@/components/projects/project-management-icons";
import { formatDate } from "@/components/projects/detail/project-detail-helpers";
import { EntityLogo } from "@/components/ui/entity-logo";
import type { EntityRecord } from "@/types/api";

type EntityManagementTableProps = {
  loading: boolean;
  onDelete: (entity: EntityRecord) => void;
  onEdit: (entity: EntityRecord) => void;
  entities: EntityRecord[];
};

export function EntityManagementTable({
  loading,
  onDelete,
  onEdit,
  entities,
}: EntityManagementTableProps) {
  const columns: DataTableColumn<EntityRecord>[] = [
    {
      cell: (entity) => (
        <div className="flex items-center gap-4">
          <EntityLogo className="h-11 w-11 shrink-0" logoUrl={entity.logo_url} name={entity.name} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{entity.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                {entity.slug}
              </span>
              {entity.created_at ? (
                <span>Creada {formatDate(entity.created_at)}</span>
              ) : null}
            </div>
          </div>
        </div>
      ),
      header: "Entidad",
      id: "entity",
      sortValue: (entity) => entity.name.toLowerCase(),
    },
    {
      cell: (entity) => (
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {entity.user_count ?? 0} usuarios
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {entity.project_count ?? 0} proyectos
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {entity.team_count ?? 0} equipos
          </span>
        </div>
      ),
      header: "Uso",
      id: "usage",
      sortValue: (entity) =>
        (entity.user_count ?? 0) + (entity.project_count ?? 0) + (entity.team_count ?? 0),
    },
    {
      cell: (entity) => {
        const actions: RowActionItem[] = [
          {
            icon: <PencilIcon className="h-4 w-4" />,
            label: "Editar entidad",
            onSelect: () => onEdit(entity),
          },
          {
            destructive: true,
            icon: <TrashIcon className="h-4 w-4" />,
            label: "Eliminar entidad",
            onSelect: () => onDelete(entity),
            separatorBefore: true,
          },
        ];

        return (
          <div className="flex justify-end">
            <RowActionsMenu actions={actions} ariaLabel={`Abrir acciones para ${entity.name}`} />
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
      data={entities}
      emptyState={
        <div className="mx-auto max-w-md text-center">
          <p className="text-base font-semibold text-slate-900">
            No hay entidades que coincidan con la búsqueda.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Ajusta la búsqueda o crea una entidad nueva desde esta pantalla.
          </p>
        </div>
      }
      getRowKey={(entity) => entity.id}
      initialSort={{ columnId: "entity", direction: "asc" }}
      loading={loading}
      loadingLabel="Cargando entidades..."
    />
  );
}
