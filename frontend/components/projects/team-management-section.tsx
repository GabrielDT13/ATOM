"use client";

import { useEffect, useMemo, useState } from "react";

import { listEntities } from "@/lib/entities";
import {
  createTeam,
  deleteTeam,
  getTeam,
  listTeams,
  searchTeamMemberCandidates,
  updateTeam,
} from "@/lib/teams";
import { useAppToast } from "@/hooks/use-app-toast";
import type {
  EntityRecord,
  TeamDetails,
  TeamMemberCandidate,
  TeamSummary,
} from "@/types/api";
import { formatDate } from "@/components/projects/detail/project-detail-helpers";
import {
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/projects/project-management-icons";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { DialogHero } from "@/components/ui/dialog-hero";
import { RowActionsMenu, type RowActionItem } from "@/components/ui/row-actions-menu";
import {
  CreatableSelectField,
  type CreatableSelectOption,
} from "@/components/ui/creatable-select-field";
import { InfoTooltip } from "@/components/ui/info-tooltip";

export type TeamFormState = {
  entityName: string;
  memberCandidates: TeamMemberCandidate[];
  memberSearch: string;
  members: TeamMemberCandidate[];
  name: string;
};

export const EMPTY_FORM_STATE: TeamFormState = {
  entityName: "",
  memberCandidates: [],
  memberSearch: "",
  members: [],
  name: "",
};

function TeamMemberChip({
  member,
  onRemove,
}: {
  member: TeamMemberCandidate;
  onRemove?: (username: string) => void;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">
      <span className="font-medium">{member.display_name}</span>
      <span className="text-slate-400">@{member.username}</span>
      {onRemove ? (
        <button
          className="rounded-full px-1 text-slate-400 transition hover:bg-white hover:text-slate-700"
          onClick={() => onRemove(member.username)}
          type="button"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

export function TeamDialog({
  entities,
  formState,
  onAddMember,
  onChangeEntityName,
  onChangeName,
  onChangeSearch,
  onOpenChange,
  onRemoveMember,
  onSubmit,
  open,
  ownerUsername,
  submitting,
  title,
}: {
  entities: EntityRecord[];
  formState: TeamFormState;
  onAddMember: (member: TeamMemberCandidate) => void;
  onChangeEntityName: (value: string) => void;
  onChangeName: (value: string) => void;
  onChangeSearch: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onRemoveMember: (username: string) => void;
  onSubmit: () => Promise<void> | void;
  open: boolean;
  ownerUsername: string | null;
  submitting: boolean;
  title: string;
}) {
  const entityOptions: CreatableSelectOption[] = entities.map((entity) => ({
    label: entity.name,
    value: entity.name,
  }));

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] max-w-[46rem] flex-col overflow-hidden sm:max-h-[calc(100vh-3rem)]">
        <DialogHero
          description="Crea un equipo reutilizable, asígnale una entidad y define sus miembros."
          title={title}
        />

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">Nombre del equipo</span>
            <input
              autoFocus
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-sky-100"
              onChange={(event) => onChangeName(event.target.value)}
              placeholder="ej. Equipo de transcriptómica"
              value={formState.name}
            />
          </label>

          <CreatableSelectField
            allowCreate={false}
            createPlaceholder="Escribe una nueva entidad"
            label={(
              <span className="inline-flex items-center gap-1">
                Entidad del equipo
                <InfoTooltip
                  content="Entidad ayuda a agrupar equipos y luego filtrar proyectos o comparticiones relacionadas."
                />
              </span>
            )}
            onChange={onChangeEntityName}
            options={entityOptions}
            value={formState.entityName}
          />

          <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Propietario</p>
                <p className="mt-1 text-sm text-slate-500">
                  El creador del equipo siempre permanece como miembro propietario.
                </p>
              </div>
              <div className="inline-flex w-fit rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-700">
                @{ownerUsername ?? "usuario"}
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-4">
              <div>
                <p className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900">
                  Miembros del equipo
                  <InfoTooltip
                    content="Propietario siempre queda dentro. Miembros extra heredan acceso cuando equipo se vincula a proyecto."
                  />
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Cada usuario puede pertenecer como máximo a 5 equipos.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {formState.members.length > 0 ? (
                  formState.members.map((member) => (
                    <TeamMemberChip key={member.id} member={member} onRemove={onRemoveMember} />
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    No has añadido miembros extra todavía.
                  </p>
                )}
              </div>

              <label className="flex flex-col gap-2">
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
                  Buscar usuarios
                  <InfoTooltip
                    content="Busqueda excluye propietario y miembros ya añadidos para evitar duplicados."
                  />
                </span>
                <input
                  className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-sky-100"
                  onChange={(event) => onChangeSearch(event.target.value)}
                  placeholder="Busca por usuario, correo o entidad"
                  value={formState.memberSearch}
                />
              </label>

              {formState.memberCandidates.length > 0 ? (
                <div className="grid gap-3">
                  {formState.memberCandidates.map((candidate) => (
                    <button
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-sky-200 hover:bg-sky-50"
                      key={candidate.id}
                      onClick={() => onAddMember(candidate)}
                      type="button"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {candidate.display_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          @{candidate.username}
                          {candidate.entity_name ? ` · ${candidate.entity_name}` : ""}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        Añadir
                      </span>
                    </button>
                  ))}
                </div>
              ) : formState.memberSearch.trim() ? (
                <p className="text-sm text-slate-500">
                  No se han encontrado candidatos con esa búsqueda.
                </p>
              ) : null}
            </div>
          </section>
        </div>

        <DialogFooter className="shrink-0 border-t border-slate-200 px-6 py-6 sm:px-8">
          <DialogClose asChild>
            <Button variant="secondary">Cancelar</Button>
          </DialogClose>
          <Button disabled={submitting} onClick={() => void onSubmit()} type="button">
            {submitting ? "Guardando..." : "Guardar equipo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TeamManagementSection({
  sessionRole,
  sessionUsername,
}: {
  sessionRole?: "admin" | "user";
  sessionUsername?: string;
}) {
  const appToast = useAppToast();
  const [entities, setEntities] = useState<EntityRecord[]>([]);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [ownerUsername, setOwnerUsername] = useState<string | null>(sessionUsername ?? null);
  const [pendingDeleteTeam, setPendingDeleteTeam] = useState<TeamSummary | null>(null);
  const [formState, setFormState] = useState<TeamFormState>(EMPTY_FORM_STATE);

  async function loadTeamsState() {
    setLoading(true);
    try {
      const [teamsPayload, entitiesPayload] = await Promise.all([listTeams(), listEntities()]);
      setTeams(teamsPayload.items);
      setEntities(entitiesPayload);
    } catch (loadError) {
      appToast.error(
        "No se pudieron cargar los equipos",
        loadError instanceof Error ? loadError.message : undefined,
      );
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTeamsState();
  }, []);

  const excludedUsernames = useMemo(
    () => [
      ...formState.members.map((member) => member.username),
      ownerUsername ?? "",
    ].filter(Boolean),
    [formState.members, ownerUsername],
  );

  useEffect(() => {
    if (!dialogOpen) {
      return;
    }

    const search = formState.memberSearch.trim();
    void searchTeamMemberCandidates(search, {
      excludeUsernames: excludedUsernames,
      limit: search ? 8 : 5,
    })
      .then((payload) =>
        setFormState((current) => ({
          ...current,
          memberCandidates: payload.users,
        })),
      )
      .catch(() =>
        setFormState((current) => ({
          ...current,
          memberCandidates: [],
        })),
      );
  }, [dialogOpen, excludedUsernames, formState.memberSearch]);

  function resetDialogState(nextOwnerUsername?: string | null) {
    setFormState(EMPTY_FORM_STATE);
    setOwnerUsername(nextOwnerUsername ?? sessionUsername ?? null);
    setEditingTeamId(null);
  }

  function openCreateDialog() {
    resetDialogState(sessionUsername ?? null);
    setDialogOpen(true);
  }

  async function openEditDialog(teamId: string) {
    setSubmitting(true);
    try {
      const payload = await getTeam(teamId);
      setEditingTeamId(teamId);
      setOwnerUsername(payload.owner_username);
      setFormState({
        entityName: payload.entity_name ?? "",
        memberCandidates: [],
        memberSearch: "",
        members: payload.members
          .filter((member) => !member.is_owner)
          .map((member) => ({
            avatar_url: member.avatar_url ?? null,
            department: member.department ?? null,
            display_name: member.display_name,
            email: member.email ?? null,
            entity_name: member.entity_name ?? null,
            id: member.id,
            username: member.username,
          })),
        name: payload.name,
      });
      setDialogOpen(true);
    } catch (loadError) {
      appToast.error(
        "No se pudo cargar el equipo",
        loadError instanceof Error ? loadError.message : undefined,
      );
    } finally {
      setSubmitting(false);
    }
  }

  function canManageTeam(team: TeamSummary) {
    return sessionRole === "admin" || team.owner_username === sessionUsername;
  }

  async function handleSubmit() {
    const teamName = formState.name.trim();
    if (!teamName) {
      appToast.error("El nombre del equipo es obligatorio");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        entityName: formState.entityName.trim(),
        memberUsernames: formState.members.map((member) => member.username),
        name: teamName,
      };
      const response = editingTeamId
        ? await updateTeam(editingTeamId, payload)
        : await createTeam(payload);

      if (response.success) {
        setDialogOpen(false);
        resetDialogState();
        await loadTeamsState();
        appToast.success(response.message);
      } else {
        appToast.error(response.message);
      }
    } catch (submitError) {
      appToast.error(
        "No se pudo guardar el equipo",
        submitError instanceof Error ? submitError.message : undefined,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDeleteTeam() {
    if (!pendingDeleteTeam) {
      return;
    }

    try {
      const response = await deleteTeam(pendingDeleteTeam.id);
      if (response.success) {
        setPendingDeleteTeam(null);
        await loadTeamsState();
        appToast.success(response.message);
      } else {
        appToast.error(response.message);
      }
    } catch (deleteError) {
      appToast.error(
        "No se pudo eliminar el equipo",
        deleteError instanceof Error ? deleteError.message : undefined,
      );
    }
  }

  return (
    <>
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Equipos
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Equipos de trabajo
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Crea equipos reutilizables, asígnales una entidad y añade usuarios para preparar la
              colaboración entre proyectos.
            </p>
          </div>

          <Button onClick={openCreateDialog} type="button">
            <PlusIcon />
            Crear equipo
          </Button>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Cargando equipos...</p>
        ) : teams.length === 0 ? (
          <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
            <p className="text-base font-semibold text-slate-900">
              Todavía no hay equipos registrados.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Empieza creando un equipo y añadiendo a sus miembros desde aquí.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {teams.map((team) => {
              const actions: RowActionItem[] = [];
              if (canManageTeam(team)) {
                actions.push({
                  icon: <PencilIcon className="h-4 w-4" />,
                  label: "Editar equipo",
                  onSelect: () => void openEditDialog(team.id),
                });
                actions.push({
                  destructive: true,
                  icon: <TrashIcon className="h-4 w-4" />,
                  label: "Eliminar equipo",
                  onSelect: () => setPendingDeleteTeam(team),
                  separatorBefore: true,
                });
              }

              return (
                <article
                  className="rounded-[28px] border border-slate-200 bg-slate-50 p-5"
                  key={team.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                          {team.name}
                        </h3>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                          {team.member_count} miembro{team.member_count === 1 ? "" : "s"}
                        </span>
                        {team.membership_role ? (
                          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                            {team.membership_role === "owner" ? "Propietario" : "Miembro"}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        Responsable: @{team.owner_username}
                      </p>
                    </div>

                    {actions.length > 0 ? (
                      <RowActionsMenu
                        actions={actions}
                        ariaLabel={`Abrir acciones para ${team.name}`}
                      />
                    ) : null}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {team.entity_name ? (
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700">
                        {team.entity_name}
                      </span>
                    ) : (
                      <span className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-sm text-slate-500">
                        Sin entidad vinculada
                      </span>
                    )}
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700">
                      Actualizado {formatDate(team.updated_at)}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <TeamDialog
        entities={entities}
        formState={formState}
        onAddMember={(member) =>
          setFormState((current) => ({
            ...current,
            memberCandidates: current.memberCandidates.filter((candidate) => candidate.id !== member.id),
            memberSearch: "",
            members: [...current.members, member],
          }))
        }
        onChangeEntityName={(value) =>
          setFormState((current) => ({ ...current, entityName: value }))
        }
        onChangeName={(value) => setFormState((current) => ({ ...current, name: value }))}
        onChangeSearch={(value) =>
          setFormState((current) => ({ ...current, memberSearch: value }))
        }
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetDialogState();
          }
        }}
        onRemoveMember={(username) =>
          setFormState((current) => ({
            ...current,
            members: current.members.filter((member) => member.username !== username),
          }))
        }
        onSubmit={handleSubmit}
        open={dialogOpen}
        ownerUsername={ownerUsername}
        submitting={submitting}
        title={editingTeamId ? "Editar equipo" : "Crear equipo"}
      />

      <ConfirmDialog
        actionLabel="Eliminar equipo"
        body={
          pendingDeleteTeam ? (
            <div className="space-y-3">
              <p>
                Se eliminará <strong>{pendingDeleteTeam.name}</strong> y su composición actual de
                miembros.
              </p>
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                Esta acción no elimina usuarios, solo deshace el equipo.
              </p>
            </div>
          ) : null
        }
        confirmVariant="danger"
        onConfirm={() => void confirmDeleteTeam()}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteTeam(null);
          }
        }}
        open={Boolean(pendingDeleteTeam)}
        title="Confirmar eliminación del equipo"
      />
    </>
  );
}
