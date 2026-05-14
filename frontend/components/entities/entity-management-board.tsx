"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { formatDate } from "@/components/projects/detail/project-detail-helpers";
import { PencilIcon, TrashIcon } from "@/components/projects/project-management-icons";
import { EntityLogo } from "@/components/ui/entity-logo";
import { RowActionsMenu, type RowActionItem } from "@/components/ui/row-actions-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { EntityRecord } from "@/types/api";

type EntityManagementBoardProps = {
  entities: EntityRecord[];
  loading: boolean;
  onDelete: (entity: EntityRecord) => void;
  onEdit: (entity: EntityRecord) => void;
};

const ENTITY_BOARD_SKELETON_COUNT = 6;

function EntityBoardSkeleton() {
  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="space-y-5 p-5">
        <div className="rounded-[24px] bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-10 w-10 rounded-2xl" />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
      </div>
    </article>
  );
}

export function EntityManagementBoard({
  entities,
  loading,
  onDelete,
  onEdit,
}: EntityManagementBoardProps) {
  const { locale } = useLocale();
  if (loading) {
    return (
      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: ENTITY_BOARD_SKELETON_COUNT }, (_, index) => (
            <EntityBoardSkeleton key={index} />
          ))}
        </div>
        <p className="text-center text-sm text-slate-400">{locale === "es" ? "Cargando entidades..." : "Loading entities..."}</p>
      </section>
    );
  }

  if (entities.length === 0) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-10 shadow-sm">
        <div className="mx-auto max-w-md text-center">
          <p className="text-base font-semibold text-slate-900">
            {locale === "es" ? "No hay entidades que coincidan con la búsqueda." : "No entities match search."}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {locale === "es"
              ? "Ajusta la búsqueda o crea una entidad nueva desde esta pantalla."
              : "Adjust search or create a new entity from this screen."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {entities.map((entity) => {
        const actions: RowActionItem[] = [
          {
            icon: <PencilIcon className="h-4 w-4" />,
            label: locale === "es" ? "Editar entidad" : "Edit entity",
            onSelect: () => onEdit(entity),
          },
          {
            destructive: true,
            icon: <TrashIcon className="h-4 w-4" />,
            label: locale === "es" ? "Eliminar entidad" : "Delete entity",
            onSelect: () => onDelete(entity),
            separatorBefore: true,
          },
        ];

        return (
          <article
            className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_24px_60px_-32px_rgba(15,23,42,0.35)]"
            key={entity.id}
          >
            <div className="flex flex-col gap-5 p-5">
              <div className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <EntityLogo className="h-12 w-12 shrink-0 bg-white text-sky-700 shadow-sm" logoUrl={entity.logo_url} name={entity.name} />
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold tracking-tight text-slate-950">
                        {entity.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">{entity.slug}</p>
                    </div>
                  </div>

                  <RowActionsMenu actions={actions} ariaLabel={locale === "es" ? `Abrir acciones para ${entity.name}` : `Open actions for ${entity.name}`} />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700">
                    {entity.user_count ?? 0} {locale === "es" ? "usuarios" : "users"}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700">
                    {entity.project_count ?? 0} {locale === "es" ? "proyectos" : "projects"}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700">
                    {entity.team_count ?? 0} {locale === "es" ? "equipos" : "teams"}
                  </span>
                </div>
              </div>

              {entity.created_at ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{locale === "es" ? "Creada" : "Created"}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(entity.created_at)}</p>
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}
