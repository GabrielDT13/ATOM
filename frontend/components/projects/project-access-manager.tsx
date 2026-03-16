"use client";

import { useDeferredValue, useEffect, useState } from "react";

import { useAppToast } from "@/hooks/use-app-toast";
import {
  listProjectMembers,
  removeProjectAccess,
  searchProjectShareCandidates,
  shareProjectWithUser,
  transferProjectOwnership,
} from "@/lib/projects";
import type { ProjectMemberRecord, ProjectShareCandidate } from "@/types/api";
import { UserIcon } from "@/components/dashboard/dashboard-icons";
import {
  EditableProjectMemberRole,
  getProjectMemberRoleBadgeClassName,
  getProjectMemberRoleLabel,
  PROJECT_SHARE_ROLE_OPTIONS,
} from "@/components/projects/project-access-utils";
import {
  PencilIcon,
  SearchIcon,
  TransferIcon,
  TrashIcon,
} from "@/components/projects/project-management-icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProjectAccessManagerProps = {
  onOwnershipTransferred?: () => Promise<void> | void;
  owner: string;
  projectName: string;
};

function formatAccessIdentity(record: {
  email?: string | null;
  username: string;
}) {
  return `@${record.username}${record.email ? ` · ${record.email}` : ""}`;
}

function MemberPill({
  member,
  onEdit,
  onRemove,
  onTransfer,
}: {
  member: ProjectMemberRecord;
  onEdit: (member: ProjectMemberRecord) => void;
  onRemove: (member: ProjectMemberRecord) => void;
  onTransfer: (member: ProjectMemberRecord) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{member.display_name}</p>
        <p className="truncate text-xs text-slate-500">{formatAccessIdentity(member)}</p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${getProjectMemberRoleBadgeClassName(member.member_role)}`}
        >
          {getProjectMemberRoleLabel(member.member_role)}
        </span>
        {!member.is_owner ? (
          <RowActionsMenu
            actions={[
              {
                icon: <PencilIcon className="h-4 w-4" />,
                label: "Editar rol",
                onSelect: () => onEdit(member),
              },
              {
                icon: <TransferIcon className="h-4 w-4" />,
                label: "Transferir proyecto",
                onSelect: () => onTransfer(member),
              },
              {
                destructive: true,
                icon: <TrashIcon className="h-4 w-4" />,
                label: "Quitar acceso",
                onSelect: () => onRemove(member),
                separatorBefore: true,
              },
            ]}
            ariaLabel={`Abrir acciones de acceso para ${member.display_name}`}
          />
        ) : null}
      </div>
    </div>
  );
}

export function ProjectAccessManager({
  onOwnershipTransferred,
  owner,
  projectName,
}: ProjectAccessManagerProps) {
  const appToast = useAppToast();
  const [members, setMembers] = useState<ProjectMemberRecord[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [shareRole, setShareRole] = useState<EditableProjectMemberRole>("viewer");
  const [candidates, setCandidates] = useState<ProjectShareCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [submittingUsername, setSubmittingUsername] = useState<string | null>(null);
  const [memberPendingRemoval, setMemberPendingRemoval] = useState<ProjectMemberRecord | null>(null);
  const [memberPendingTransfer, setMemberPendingTransfer] = useState<ProjectMemberRecord | null>(null);
  const [memberPendingRoleEdit, setMemberPendingRoleEdit] = useState<ProjectMemberRecord | null>(null);
  const [editedRole, setEditedRole] = useState<EditableProjectMemberRole>("viewer");

  async function loadMembers() {
    setLoadingMembers(true);
    try {
      const response = await listProjectMembers(owner, projectName);
      setMembers(response.members);
    } catch (error) {
      appToast.error(
        "No se pudo cargar el acceso del proyecto",
        error instanceof Error ? error.message : undefined,
      );
    } finally {
      setLoadingMembers(false);
    }
  }

  useEffect(() => {
    void loadMembers();
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

  async function handleShare(username: string, role: EditableProjectMemberRole) {
    setSubmittingUsername(username);
    try {
      const response = await shareProjectWithUser(owner, projectName, username, role);
      if (response.success) {
        appToast.success(response.message);
        setSearch("");
        await loadMembers();
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
        await loadMembers();
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
        await loadMembers();
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

  return (
    <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Acceso al proyecto</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Comparte el proyecto, ajusta el rol de cada miembro o transfiere la propiedad.
          </p>
        </div>

        <Popover onOpenChange={setPopoverOpen} open={popoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="secondary">
              <UserIcon className="h-4 w-4" />
              Compartir
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-[min(34rem,calc(100vw-3rem))] p-5"
            onMouseDown={(event) => event.stopPropagation()}
            side="top"
          >
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Compartir proyecto</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Busca usuarios y asígnales un rol antes de compartir el proyecto.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
                <label className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <SearchIcon className="h-4 w-4" />
                  </span>
                  <input
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-sky-100"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por usuario, nombre o email..."
                    type="search"
                    value={search}
                  />
                </label>

                <Select onValueChange={(value) => setShareRole(value as EditableProjectMemberRole)} value={shareRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Rol" />
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

              <div className="max-h-72 overflow-y-auto">
                {loadingCandidates ? (
                  <p className="py-6 text-center text-sm text-slate-500">Buscando usuarios...</p>
                ) : candidates.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {candidates.map((candidate) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                        key={candidate.id}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {candidate.display_name}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {formatAccessIdentity(candidate)}
                          </p>
                        </div>
                        <Button
                          disabled={submittingUsername === candidate.username}
                          onClick={() => void handleShare(candidate.username, shareRole)}
                          size="sm"
                          type="button"
                          variant="primary"
                        >
                          Añadir como {getProjectMemberRoleLabel(shareRole)}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-slate-500">
                    No hay usuarios disponibles para compartir con ese criterio.
                  </p>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {loadingMembers ? (
          <p className="text-sm text-slate-500">Cargando usuarios con acceso...</p>
        ) : members.length > 0 ? (
          members.map((member) => (
            <MemberPill
              key={member.id}
              member={member}
              onEdit={(nextMember) => {
                if (nextMember.member_role === "owner") {
                  return;
                }
                setEditedRole(nextMember.member_role);
                setMemberPendingRoleEdit(nextMember);
              }}
              onRemove={setMemberPendingRemoval}
              onTransfer={setMemberPendingTransfer}
            />
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
            Este proyecto todavía no está compartido con otros usuarios.
          </p>
        )}
      </div>

      <ConfirmDialog
        actionLabel="Guardar rol"
        body={
          memberPendingRoleEdit ? (
            <div className="space-y-4">
              <p>
                Cambia el rol de <strong>{memberPendingRoleEdit.display_name}</strong>
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
          memberPendingRoleEdit.member_role === editedRole
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
        title="Editar rol del miembro"
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
        confirmDisabled={
          !memberPendingTransfer || submittingUsername === memberPendingTransfer.username
        }
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
              Se eliminará el acceso de <strong>{memberPendingRemoval.display_name}</strong>
              {" "}(@{memberPendingRemoval.username}) a este proyecto.
            </>
          ) : null
        }
        confirmDisabled={
          !memberPendingRemoval || submittingUsername === memberPendingRemoval.username
        }
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
    </section>
  );
}
