"use client";

import { useDeferredValue, useEffect, useState } from "react";

import { UserIcon } from "@/components/dashboard/dashboard-icons";
import {
  EditableProjectMemberRole,
  PROJECT_SHARE_ROLE_OPTIONS,
} from "@/components/projects/project-access-utils";
import { ProjectMemberRow } from "@/components/projects/project-member-row";
import { ProjectSharePopover } from "@/components/projects/project-share-popover";
import { ProjectStackIcon } from "@/components/projects/project-management-icons";
import { ProjectTeamRow } from "@/components/projects/project-team-row";
import { ProjectTeamSharePopover } from "@/components/projects/project-team-share-popover";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  listProjectMembers,
  listProjectTeams,
  removeProjectAccess,
  removeProjectTeamAccess,
  searchProjectShareCandidates,
  searchProjectTeamCandidates,
  shareProjectWithTeam,
  shareProjectWithUser,
  transferProjectOwnership,
} from "@/lib/projects";
import type {
  ProjectMemberRecord,
  ProjectShareCandidate,
  ProjectSharedTeam,
} from "@/types/api";

type ProjectAccessManagerProps = {
  onOwnershipTransferred?: () => Promise<void> | void;
  owner: string;
  projectName: string;
};

export function ProjectAccessManager({
  onOwnershipTransferred,
  owner,
  projectName,
}: ProjectAccessManagerProps) {
  const appToast = useAppToast();
  const [members, setMembers] = useState<ProjectMemberRecord[]>([]);
  const [teams, setTeams] = useState<ProjectSharedTeam[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(true);

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [shareRole, setShareRole] = useState<EditableProjectMemberRole>("viewer");
  const [candidates, setCandidates] = useState<ProjectShareCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const [teamPopoverOpen, setTeamPopoverOpen] = useState(false);
  const [teamSearch, setTeamSearch] = useState("");
  const deferredTeamSearch = useDeferredValue(teamSearch);
  const [teamShareRole, setTeamShareRole] = useState<EditableProjectMemberRole>("viewer");
  const [teamCandidates, setTeamCandidates] = useState<ProjectSharedTeam[]>([]);
  const [loadingTeamCandidates, setLoadingTeamCandidates] = useState(false);

  const [submittingUsername, setSubmittingUsername] = useState<string | null>(null);
  const [submittingTeamId, setSubmittingTeamId] = useState<string | null>(null);

  const [memberPendingRemoval, setMemberPendingRemoval] = useState<ProjectMemberRecord | null>(null);
  const [memberPendingTransfer, setMemberPendingTransfer] = useState<ProjectMemberRecord | null>(null);
  const [memberPendingRoleEdit, setMemberPendingRoleEdit] = useState<ProjectMemberRecord | null>(null);
  const [editedRole, setEditedRole] = useState<EditableProjectMemberRole>("viewer");

  const [teamPendingRemoval, setTeamPendingRemoval] = useState<ProjectSharedTeam | null>(null);
  const [teamPendingRoleEdit, setTeamPendingRoleEdit] = useState<ProjectSharedTeam | null>(null);
  const [editedTeamRole, setEditedTeamRole] = useState<EditableProjectMemberRole>("viewer");

  async function loadAccessState() {
    setLoadingAccess(true);
    try {
      const [membersResponse, teamsResponse] = await Promise.all([
        listProjectMembers(owner, projectName),
        listProjectTeams(owner, projectName),
      ]);
      setMembers(membersResponse.members);
      setTeams(teamsResponse.teams);
    } catch (error) {
      appToast.error(
        "No se pudo cargar el acceso del proyecto",
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setLoadingAccess(false);
    }
  }

  useEffect(() => {
    void loadAccessState();
  }, [owner, projectName]);

  useEffect(() => {
    if (!popoverOpen) {
      setLoadingCandidates(false);
      setCandidates((current) => (current.length > 0 ? [] : current));
      return;
    }

    let cancelled = false;
    setLoadingCandidates(true);

    void searchProjectShareCandidates(owner, projectName, deferredSearch)
      .then((response) => {
        if (!cancelled) {
          setCandidates(response.users);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          appToast.error(
            "No se pudieron buscar usuarios",
            error instanceof Error ? error.message : undefined,
          );
          setCandidates([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingCandidates(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [appToast, deferredSearch, owner, popoverOpen, projectName]);

  useEffect(() => {
    if (!teamPopoverOpen) {
      setLoadingTeamCandidates(false);
      setTeamCandidates((current) => (current.length > 0 ? [] : current));
      return;
    }

    let cancelled = false;
    setLoadingTeamCandidates(true);

    void searchProjectTeamCandidates(owner, projectName, deferredTeamSearch)
      .then((response) => {
        if (!cancelled) {
          setTeamCandidates(response.teams);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          appToast.error(
            "No se pudieron buscar equipos",
            error instanceof Error ? error.message : undefined,
          );
          setTeamCandidates([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingTeamCandidates(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [appToast, deferredTeamSearch, owner, projectName, teamPopoverOpen]);

  async function handleShare(username: string, role: EditableProjectMemberRole) {
    setSubmittingUsername(username);
    try {
      const response = await shareProjectWithUser(owner, projectName, username, role);
      if (response.success) {
        appToast.success(response.message);
        setSearch("");
        await loadAccessState();
        setCandidates((current) => current.filter((candidate) => candidate.username !== username));
      } else {
        appToast.error(response.message);
      }
    } catch (error) {
      appToast.error(
        "No se pudo compartir el proyecto",
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setSubmittingUsername(null);
    }
  }

  async function handleUpdateRole(member: ProjectMemberRecord, role: EditableProjectMemberRole) {
    setSubmittingUsername(member.username);
    try {
      const response = await shareProjectWithUser(owner, projectName, member.username, role);
      if (response.success) {
        appToast.success(response.message);
        await loadAccessState();
      } else {
        appToast.error(response.message);
      }
    } catch (error) {
      appToast.error(
        "No se pudo actualizar el rol",
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setSubmittingUsername(null);
    }
  }

  async function handleRemove(member: ProjectMemberRecord) {
    setSubmittingUsername(member.username);
    try {
      const response = await removeProjectAccess(owner, projectName, member.username);
      if (response.success) {
        appToast.success(response.message);
        await loadAccessState();
      } else {
        appToast.error(response.message);
      }
    } catch (error) {
      appToast.error(
        "No se pudo quitar el acceso",
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setSubmittingUsername(null);
    }
  }

  async function handleTransfer(member: ProjectMemberRecord) {
    setSubmittingUsername(member.username);
    try {
      const response = await transferProjectOwnership(owner, projectName, member.username);
      if (response.success) {
        appToast.success(response.message);
        await onOwnershipTransferred?.();
      } else {
        appToast.error(response.message);
      }
    } catch (error) {
      appToast.error(
        "No se pudo transferir el proyecto",
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setSubmittingUsername(null);
    }
  }

  async function handleShareTeam(teamId: string, role: EditableProjectMemberRole) {
    setSubmittingTeamId(teamId);
    try {
      const response = await shareProjectWithTeam(owner, projectName, teamId, role);
      if (response.success) {
        appToast.success(response.message);
        setTeamSearch("");
        await loadAccessState();
        setTeamCandidates((current) => current.filter((candidate) => candidate.id !== teamId));
      } else {
        appToast.error(response.message);
      }
    } catch (error) {
      appToast.error(
        "No se pudo añadir el equipo",
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setSubmittingTeamId(null);
    }
  }

  async function handleUpdateTeamRole(team: ProjectSharedTeam, role: EditableProjectMemberRole) {
    setSubmittingTeamId(team.id);
    try {
      const response = await shareProjectWithTeam(owner, projectName, team.id, role);
      if (response.success) {
        appToast.success(response.message);
        await loadAccessState();
      } else {
        appToast.error(response.message);
      }
    } catch (error) {
      appToast.error(
        "No se pudo actualizar el acceso del equipo",
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setSubmittingTeamId(null);
    }
  }

  async function handleRemoveTeam(team: ProjectSharedTeam) {
    setSubmittingTeamId(team.id);
    try {
      const response = await removeProjectTeamAccess(owner, projectName, team.id);
      if (response.success) {
        appToast.success(response.message);
        await loadAccessState();
      } else {
        appToast.error(response.message);
      }
    } catch (error) {
      appToast.error(
        "No se pudo quitar el equipo",
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setSubmittingTeamId(null);
    }
  }

  function openRoleEditor(member: ProjectMemberRecord) {
    if (member.member_role === "owner" || member.has_direct_access === false) {
      return;
    }
    setEditedRole((member.direct_member_role ?? member.member_role) as EditableProjectMemberRole);
    setMemberPendingRoleEdit(member);
  }

  function openTeamRoleEditor(team: ProjectSharedTeam) {
    setEditedTeamRole(team.member_role);
    setTeamPendingRoleEdit(team);
  }

  const skeletonRows = Array.from({ length: 3 }, (_, index) => index);
  const directMembers = members.filter((member) => member.has_direct_access !== false);
  const ownerMembers = directMembers.filter((member) => member.is_owner);
  const nonOwnerDirectMembers = directMembers.filter((member) => !member.is_owner);
  const teamOnlyMembers = members.filter(
    (member) => (member.access_via_teams?.length ?? 0) > 0 && member.has_direct_access === false,
  );

  function renderMemberGroup(
    title: string,
    description: string,
    groupMembers: ProjectMemberRecord[],
  ) {
    if (groupMembers.length === 0) {
      return null;
    }

    return (
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {title}
          </p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <div className="flex flex-col gap-3">
          {groupMembers.map((member) => (
            <ProjectMemberRow
              key={member.id}
              member={member}
              onEdit={openRoleEditor}
              onRemove={setMemberPendingRemoval}
              onTransfer={setMemberPendingTransfer}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Acceso al proyecto</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Combina acceso directo por usuario y acceso heredado desde equipos.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ProjectSharePopover
            candidates={candidates}
            loading={loadingCandidates}
            onOpenChange={setPopoverOpen}
            onSearchChange={setSearch}
            onShare={(username, role) => {
              void handleShare(username, role);
            }}
            onShareRoleChange={setShareRole}
            open={popoverOpen}
            search={search}
            shareRole={shareRole}
            submittingUsername={submittingUsername}
            trigger={
              <Button variant="secondary">
                <UserIcon className="h-4 w-4" />
                Añadir usuario
              </Button>
            }
          />

          <ProjectTeamSharePopover
            candidates={teamCandidates}
            loading={loadingTeamCandidates}
            onOpenChange={setTeamPopoverOpen}
            onSearchChange={setTeamSearch}
            onShare={(teamId, role) => {
              void handleShareTeam(teamId, role);
            }}
            onShareRoleChange={setTeamShareRole}
            open={teamPopoverOpen}
            search={teamSearch}
            shareRole={teamShareRole}
            submittingTeamId={submittingTeamId}
            trigger={
              <Button variant="secondary">
                <ProjectStackIcon className="h-4 w-4" />
                Añadir equipo
              </Button>
            }
          />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-[24px] border border-slate-200 bg-white p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Personas con acceso</p>
            <p className="mt-1 text-sm text-slate-500">
              Se muestra el rol efectivo de cada usuario, aunque llegue por equipo.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {loadingAccess ? (
              skeletonRows.map((index) => (
                <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4" key={index}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="min-w-0 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-7 w-20 rounded-full" />
                  </div>
                </div>
              ))
            ) : members.length > 0 ? (
              <div className="space-y-5">
                {renderMemberGroup(
                  "Propietario",
                  "Responsable principal del proyecto.",
                  ownerMembers,
                )}
                {renderMemberGroup(
                  "Acceso directo",
                  "Usuarios añadidos manualmente al proyecto. Pueden además pertenecer a equipos vinculados.",
                  nonOwnerDirectMembers,
                )}
                {renderMemberGroup(
                  "Vía equipos",
                  "Usuarios que acceden solo por pertenecer a equipos vinculados al proyecto.",
                  teamOnlyMembers,
                )}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Este proyecto todavía no está compartido con otros usuarios.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Equipos vinculados</p>
            <p className="mt-1 text-sm text-slate-500">
              Cada equipo añade acceso a todos sus miembros actuales.
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {loadingAccess ? (
              skeletonRows.map((index) => (
                <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4" key={index}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-2xl" />
                      <div className="min-w-0 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-7 w-20 rounded-full" />
                  </div>
                </div>
              ))
            ) : teams.length > 0 ? (
              teams.map((team) => (
                <ProjectTeamRow
                  key={team.id}
                  onEdit={openTeamRoleEditor}
                  onRemove={setTeamPendingRemoval}
                  team={team}
                />
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Este proyecto todavía no tiene equipos vinculados.
              </p>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        actionLabel="Guardar rol"
        body={
          memberPendingRoleEdit ? (
            <div className="space-y-4">
              <p>
                Cambia el rol directo de <strong>{memberPendingRoleEdit.display_name}</strong>
                {" "}(@{memberPendingRoleEdit.username}) dentro de este proyecto.
              </p>
              <Select onValueChange={(value) => setEditedRole(value as EditableProjectMemberRole)} value={editedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_SHARE_ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null
        }
        confirmDisabled={
          !memberPendingRoleEdit ||
          submittingUsername === memberPendingRoleEdit.username ||
          (memberPendingRoleEdit.direct_member_role ?? memberPendingRoleEdit.member_role) === editedRole
        }
        onConfirm={async () => {
          if (!memberPendingRoleEdit) {
            return;
          }
          await handleUpdateRole(memberPendingRoleEdit, editedRole);
          setMemberPendingRoleEdit(null);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setMemberPendingRoleEdit(null);
          }
        }}
        open={memberPendingRoleEdit !== null}
        title="Editar rol del usuario"
      />

      <ConfirmDialog
        actionLabel="Transferir proyecto"
        body={
          memberPendingTransfer ? (
            <div className="space-y-3">
              <p>
                <strong>{memberPendingTransfer.display_name}</strong>
                {" "}(@{memberPendingTransfer.username}) pasará a ser el nuevo owner del proyecto.
              </p>
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Tu usuario conservará acceso como editor y la carpeta del proyecto se moverá al
                workspace del nuevo propietario.
              </p>
            </div>
          ) : null
        }
        confirmDisabled={!memberPendingTransfer || submittingUsername === memberPendingTransfer.username}
        confirmVariant="danger"
        onConfirm={async () => {
          if (!memberPendingTransfer) {
            return;
          }
          await handleTransfer(memberPendingTransfer);
          setMemberPendingTransfer(null);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setMemberPendingTransfer(null);
          }
        }}
        open={memberPendingTransfer !== null}
        title="Confirmar transferencia"
      />

      <ConfirmDialog
        actionLabel="Quitar acceso"
        body={
          memberPendingRemoval ? (
            <>
              Se eliminará el acceso directo de <strong>{memberPendingRemoval.display_name}</strong>
              {" "}(@{memberPendingRemoval.username}) a este proyecto.
            </>
          ) : null
        }
        confirmDisabled={!memberPendingRemoval || submittingUsername === memberPendingRemoval.username}
        confirmVariant="danger"
        onConfirm={async () => {
          if (!memberPendingRemoval) {
            return;
          }
          await handleRemove(memberPendingRemoval);
          setMemberPendingRemoval(null);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setMemberPendingRemoval(null);
          }
        }}
        open={memberPendingRemoval !== null}
        title="Confirmar eliminación de acceso"
      />

      <ConfirmDialog
        actionLabel="Guardar rol"
        body={
          teamPendingRoleEdit ? (
            <div className="space-y-4">
              <p>
                Cambia el rol con el que el equipo <strong>{teamPendingRoleEdit.name}</strong>
                {" "}entra en este proyecto.
              </p>
              <Select onValueChange={(value) => setEditedTeamRole(value as EditableProjectMemberRole)} value={editedTeamRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_SHARE_ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null
        }
        confirmDisabled={
          !teamPendingRoleEdit ||
          submittingTeamId === teamPendingRoleEdit.id ||
          teamPendingRoleEdit.member_role === editedTeamRole
        }
        onConfirm={async () => {
          if (!teamPendingRoleEdit) {
            return;
          }
          await handleUpdateTeamRole(teamPendingRoleEdit, editedTeamRole);
          setTeamPendingRoleEdit(null);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setTeamPendingRoleEdit(null);
          }
        }}
        open={teamPendingRoleEdit !== null}
        title="Editar rol del equipo"
      />

      <ConfirmDialog
        actionLabel="Quitar equipo"
        body={
          teamPendingRemoval ? (
            <>
              Se eliminará el acceso del equipo <strong>{teamPendingRemoval.name}</strong> a este proyecto.
            </>
          ) : null
        }
        confirmDisabled={!teamPendingRemoval || submittingTeamId === teamPendingRemoval.id}
        confirmVariant="danger"
        onConfirm={async () => {
          if (!teamPendingRemoval) {
            return;
          }
          await handleRemoveTeam(teamPendingRemoval);
          setTeamPendingRemoval(null);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setTeamPendingRemoval(null);
          }
        }}
        open={teamPendingRemoval !== null}
        title="Confirmar eliminación del equipo"
      />
    </section>
  );
}
