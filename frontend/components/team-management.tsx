"use client";

import Link from "next/link";
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
import { fetchSession } from "@/lib/api";
import { useAppToast } from "@/hooks/use-app-toast";
import type {
  EntityRecord,
  SessionResponse,
  TeamMemberCandidate,
  TeamSummary,
} from "@/types/api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button, buttonStyles } from "@/components/ui/button";
import { TeamDialog, type TeamFormState, EMPTY_FORM_STATE } from "@/components/projects/team-management-section";
import { PlusIcon, UsersClusterIcon } from "@/components/users/user-management-icons";
import { TeamManagementBoard } from "@/components/teams/team-management-board";
import { TeamManagementFilters } from "@/components/teams/team-management-filters";
import { TeamManagementTable } from "@/components/teams/team-management-table";
import {
  buildTeamRecords,
  filterTeams,
  getTeamEntities,
  getTeamOwners,
  type TeamEntityFilter,
  type TeamOwnerFilter,
  type TeamRecord,
  type TeamViewMode,
} from "@/components/teams/team-management-utils";

const TEAM_VIEW_STORAGE_KEY = "atom.team-management.view";

function TeamSummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
    </article>
  );
}

export function TeamManagement() {
  const appToast = useAppToast();
  const [session, setSession] = useState<SessionResponse | null>();
  const [entities, setEntities] = useState<EntityRecord[]>([]);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamRecord | null>(null);
  const [ownerUsername, setOwnerUsername] = useState<string | null>(null);
  const [pendingDeleteTeam, setPendingDeleteTeam] = useState<TeamRecord | null>(null);
  const [formState, setFormState] = useState<TeamFormState>(EMPTY_FORM_STATE);
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<TeamOwnerFilter>("all");
  const [entityFilter, setEntityFilter] = useState<TeamEntityFilter>("all");
  const [viewMode, setViewMode] = useState<TeamViewMode>("board");

  async function loadTeamsState() {
    setLoading(true);
    try {
      const [sessionPayload, teamsPayload, entitiesPayload] = await Promise.all([
        fetchSession(),
        listTeams(),
        listEntities(),
      ]);
      setSession(sessionPayload);
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedViewMode = window.localStorage.getItem(TEAM_VIEW_STORAGE_KEY);
    if (storedViewMode === "list" || storedViewMode === "board") {
      setViewMode(storedViewMode);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(TEAM_VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const isAdmin = session?.user?.role === "admin";
  const sessionUsername = session?.user?.username ?? null;
  const teamRecords = useMemo(
    () => buildTeamRecords(teams, { isAdmin, sessionUsername }),
    [isAdmin, sessionUsername, teams],
  );
  const filteredTeams = useMemo(
    () => filterTeams(teamRecords, search, ownerFilter, entityFilter),
    [entityFilter, ownerFilter, search, teamRecords],
  );
  const owners = useMemo(() => getTeamOwners(teamRecords), [teamRecords]);
  const entityNames = useMemo(() => getTeamEntities(teamRecords), [teamRecords]);

  const excludedUsernames = useMemo(
    () =>
      [
        ...formState.members.map((member) => member.username),
        ownerUsername ?? "",
      ].filter(Boolean),
    [formState.members, ownerUsername],
  );

  useEffect(() => {
    if (!dialogOpen) {
      return;
    }

    const nextSearch = formState.memberSearch.trim();
    void searchTeamMemberCandidates(nextSearch, {
      excludeUsernames: excludedUsernames,
      limit: nextSearch ? 8 : 5,
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
    setEditingTeam(null);
  }

  function openCreateDialog() {
    resetDialogState(sessionUsername ?? null);
    setDialogOpen(true);
  }

  async function openEditDialog(team: TeamRecord) {
    setSubmitting(true);
    try {
      const payload = await getTeam(team.id);
      setEditingTeam(team);
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
      const response = editingTeam
        ? await updateTeam(editingTeam.id, payload)
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

  const managedTeams = teamRecords.filter((team) => team.canManage).length;
  const teamsWithEntity = teamRecords.filter((team) => Boolean(team.entity_name?.trim())).length;
  const totalMemberships = teamRecords.reduce((sum, team) => sum + team.member_count, 0);

  return (
    <>
      <div className="flex flex-col gap-6">
        <section className="page-hero-surface overflow-hidden rounded-[32px] border border-white/10 p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="page-hero-badge gap-2 rounded-full px-3 py-1">
                <UsersClusterIcon />
                Equipos
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Gestión visual de equipos
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Crea equipos reutilizables, asígnales entidad, añade miembros y mantén su
                administración en un espacio separado del flujo de proyectos.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                  {teamRecords.length} equipo{teamRecords.length === 1 ? "" : "s"} visibles
                </span>
                {isAdmin ? (
                  <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                    Vista multiusuario habilitada
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link className={buttonStyles({ size: "lg", tone: "on-dark", variant: "secondary" })} href="/dashboard/projects">
                Ir a proyectos
              </Link>
              <Button onClick={openCreateDialog} size="lg" tone="on-dark" variant="secondary">
                <PlusIcon />
                Crear equipo
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TeamSummaryCard label="Equipos visibles" value={String(teamRecords.length)} />
          <TeamSummaryCard label="Gestionables" value={String(managedTeams)} />
          <TeamSummaryCard label="Con entidad" value={String(teamsWithEntity)} />
          <TeamSummaryCard label="Miembros agregados" value={String(totalMemberships)} />
        </section>

        <TeamManagementFilters
          entities={entityNames}
          entityFilter={entityFilter}
          onEntityFilterChange={setEntityFilter}
          onOwnerFilterChange={setOwnerFilter}
          onSearchChange={setSearch}
          onViewModeChange={setViewMode}
          ownerFilter={ownerFilter}
          owners={owners}
          search={search}
          viewMode={viewMode}
        />

        {viewMode === "board" ? (
          <TeamManagementBoard
            loading={loading}
            onDelete={setPendingDeleteTeam}
            onEdit={(team) => {
              void openEditDialog(team);
            }}
            teams={filteredTeams}
          />
        ) : (
          <TeamManagementTable
            loading={loading}
            onDelete={setPendingDeleteTeam}
            onEdit={(team) => {
              void openEditDialog(team);
            }}
            teams={filteredTeams}
          />
        )}
      </div>

      <TeamDialog
        entities={entities}
        formState={formState}
        onAddMember={(member: TeamMemberCandidate) =>
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
        title={editingTeam ? "Editar equipo" : "Crear equipo"}
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
