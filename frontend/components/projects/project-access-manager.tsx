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
  PROJECT_SHARE_ROLE_OPTIONS,
} from "@/components/projects/project-access-utils";
import { ProjectMemberRow } from "@/components/projects/project-member-row";
import { ProjectSharePopover } from "@/components/projects/project-share-popover";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

  function openRoleEditor(member: ProjectMemberRecord) {
    if (member.member_role === "owner") {
      return;
    }

    setEditedRole(member.member_role);
    setMemberPendingRoleEdit(member);
  }

  const memberSkeletons = Array.from({ length: 3 }, (_, index) => index);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Acceso al proyecto</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Comparte el proyecto, ajusta el rol de cada miembro o transfiere la propiedad.
          </p>
        </div>

        <ProjectSharePopover
          candidates={candidates}
          loading={loadingCandidates}
          onOpenChange={setPopoverOpen}
          onSearchChange={(value) => setSearch(value)}
          onShare={(username, role) => {
            void handleShare(username, role);
          }}
          onShareRoleChange={(role) => setShareRole(role)}
          open={popoverOpen}
          search={search}
          shareRole={shareRole}
          submittingUsername={submittingUsername}
          trigger={
            <Button variant="secondary">
              <UserIcon className="h-4 w-4" />
              Compartir
            </Button>
          }
        />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {loadingMembers ? (
          memberSkeletons.map((index) => (
            <div
              className="rounded-3xl border border-slate-200 bg-white px-4 py-4"
              key={index}
            >
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
          members.map((member) => (
            <ProjectMemberRow
              key={member.id}
              member={member}
              onEdit={openRoleEditor}
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
