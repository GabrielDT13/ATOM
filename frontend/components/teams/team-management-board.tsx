"use client";

import { formatDate } from "@/components/projects/detail/project-detail-helpers";
import { PencilIcon, TrashIcon } from "@/components/projects/project-management-icons";
import { RowActionsMenu, type RowActionItem } from "@/components/ui/row-actions-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { UsersClusterIcon } from "@/components/users/user-management-icons";
import type { TeamRecord } from "@/components/teams/team-management-utils";

type TeamManagementBoardProps = {
  loading: boolean;
  onDelete: (team: TeamRecord) => void;
  onEdit: (team: TeamRecord) => void;
  teams: TeamRecord[];
};

const TEAM_BOARD_SKELETON_COUNT = 6;

function TeamBoardSkeleton() {
  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="space-y-5 p-5">
        <div className="rounded-[24px] bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-10 w-10 rounded-2xl" />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Skeleton className="h-8 w-32 rounded-full" />
            <Skeleton className="h-8 w-40 rounded-full" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }, (_, index) => (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3" key={index}>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-2 h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export function TeamManagementBoard({
  loading,
  onDelete,
  onEdit,
  teams,
}: TeamManagementBoardProps) {
  if (loading) {
    return (
      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: TEAM_BOARD_SKELETON_COUNT }, (_, index) => (
            <TeamBoardSkeleton key={index} />
          ))}
        </div>
        <p className="text-center text-sm text-slate-400">Cargando equipos...</p>
      </section>
    );
  }

  if (teams.length === 0) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-10 shadow-sm">
        <div className="mx-auto max-w-md text-center">
          <p className="text-base font-semibold text-slate-900">
            No hay equipos que coincidan con los filtros.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Ajusta la búsqueda o crea un equipo nuevo para empezar a organizar colaboraciones.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {teams.map((team) => {
        const actions: RowActionItem[] = [];

        if (team.canManage) {
          actions.push({
            icon: <PencilIcon className="h-4 w-4" />,
            label: "Editar equipo",
            onSelect: () => onEdit(team),
          });
          actions.push({
            destructive: true,
            icon: <TrashIcon className="h-4 w-4" />,
            label: "Eliminar equipo",
            onSelect: () => onDelete(team),
            separatorBefore: true,
          });
        }

        return (
          <article
            className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_24px_60px_-32px_rgba(15,23,42,0.35)]"
            key={team.id}
          >
            <div className="flex flex-col gap-5 p-5">
              <div className="rounded-[24px] border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                      <UsersClusterIcon />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                          {team.member_count} miembro{team.member_count === 1 ? "" : "s"}
                        </span>
                        {team.membership_role ? (
                          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                            {team.membership_role === "owner" ? "Propietario" : "Miembro"}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-3 truncate text-lg font-semibold tracking-tight text-slate-950">
                        {team.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">@{team.owner_username}</p>
                    </div>
                  </div>

                  {actions.length > 0 ? (
                    <RowActionsMenu actions={actions} ariaLabel={`Abrir acciones para ${team.name}`} />
                  ) : null}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {team.entity_name ? (
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-sky-700">
                      {team.entity_name}
                    </span>
                  ) : (
                    <span className="rounded-full border border-dashed border-slate-300 bg-white px-3 py-1 text-sm text-slate-500">
                      Sin entidad vinculada
                    </span>
                  )}
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700">
                    Actualizado {formatDate(team.updated_at)}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Slug</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-900">{team.slug}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Creado</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(team.created_at)}</p>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
