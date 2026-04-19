"use client";

import { useEffect, useState } from "react";

import { apiFetch, fetchSession } from "@/lib/api";
import { listEntities } from "@/lib/entities";
import { useAppToast } from "@/hooks/use-app-toast";
import type {
  DepartmentRecord,
  EntityRecord,
  MutationResponse,
  ProjectMapResponse,
  SessionResponse,
  UserRecord,
} from "@/types/api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { buttonStyles } from "@/components/ui/button";
import { UserFormDialog, type UserFormValues } from "@/components/users/user-form-dialog";
import { PlusIcon, UsersClusterIcon } from "@/components/users/user-management-icons";
import { UserManagementFilters } from "@/components/users/user-management-filters";
import { UserManagementSummary } from "@/components/users/user-management-summary";
import { UserManagementTable } from "@/components/users/user-management-table";
import {
  filterUsers,
  type UserDepartmentFilter,
  type UserRoleFilter,
} from "@/components/users/user-management-utils";

type DialogState =
  | { mode: "create"; open: boolean; user?: undefined }
  | { mode: "edit"; open: boolean; user: UserRecord | null };

export function UserManagement() {
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [entities, setEntities] = useState<EntityRecord[]>([]);
  const [projectsByOwner, setProjectsByOwner] = useState<Record<string, string[]>>({});
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [session, setSession] = useState<SessionResponse | null>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>("all");
  const [departmentFilter, setDepartmentFilter] = useState<UserDepartmentFilter>("all");
  const [dialogState, setDialogState] = useState<DialogState>({ mode: "create", open: false });
  const [pendingDeleteUser, setPendingDeleteUser] = useState<UserRecord | null>(null);
  const appToast = useAppToast();

  async function copyTemporaryPassword(password: string) {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(password);
      return true;
    } catch {
      return false;
    }
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const payload = await apiFetch<UserRecord[]>("/api/users");
      setUsers(payload);
    } catch (loadError) {
      appToast.error(
        "No se pudieron cargar los usuarios",
        loadError instanceof Error ? loadError.message : undefined,
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadDepartments() {
    try {
      const payload = await apiFetch<DepartmentRecord[]>("/api/departments");
      setDepartments(payload);
    } catch (loadError) {
      appToast.error(
        "No se pudieron cargar los departamentos",
        loadError instanceof Error ? loadError.message : undefined,
      );
    }
  }

  async function loadEntities() {
    try {
      const payload = await listEntities();
      setEntities(payload);
    } catch (loadError) {
      appToast.error(
        "No se pudieron cargar las entidades",
        loadError instanceof Error ? loadError.message : undefined,
      );
      setEntities([]);
    }
  }

  async function loadProjectOwnership() {
    try {
      const payload = await apiFetch<ProjectMapResponse>("/api/projects");
      setProjectsByOwner(payload.projects);
    } catch (loadError) {
      appToast.error(
        "No se pudo comprobar la relación de proyectos por usuario",
        loadError instanceof Error ? loadError.message : undefined,
      );
      setProjectsByOwner({});
    }
  }

  useEffect(() => {
    void fetchSession()
      .then((nextSession) => {
        setSession(nextSession);
        if (nextSession.user?.role === "admin") {
          void loadDepartments();
          void loadEntities();
          void loadProjectOwnership();
        } else {
          setDepartments([]);
          setEntities([]);
          setProjectsByOwner({});
        }
      })
      .catch(() => setSession(null));
    void loadUsers();
  }, []);

  function openCreateDialog() {
    setDialogState({ mode: "create", open: true });
  }

  function openEditDialog(user: UserRecord) {
    setDialogState({ mode: "edit", open: true, user });
  }

  function closeDialog() {
    setDialogState((current) => ({ ...current, open: false }));
  }

  async function handleCreate(values: UserFormValues) {
    setSubmitting(true);

    try {
      const response = await apiFetch<MutationResponse>("/api/users", {
        body: JSON.stringify({
          department: values.department || null,
          email: values.email,
          entity_name: values.entityName,
          role: values.role,
          username: values.username,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (response.success) {
        await Promise.all([loadUsers(), loadDepartments(), loadEntities(), loadProjectOwnership()]);
        closeDialog();
        const copied =
          response.temporary_password
            ? await copyTemporaryPassword(response.temporary_password)
            : false;
        appToast.success(
          response.message,
          response.temporary_password
            ? `Contraseña temporal generada: ${response.temporary_password}${copied ? " · Copiada al portapapeles." : ""}`
            : undefined,
          10000,
        );
      } else {
        appToast.error(response.message);
      }
    } catch (submitError) {
      appToast.error(
        "No se pudo crear el usuario",
        submitError instanceof Error ? submitError.message : undefined,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(values: UserFormValues) {
    const selectedUser = dialogState.mode === "edit" ? dialogState.user : null;

    if (!selectedUser) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await apiFetch<MutationResponse>(
        `/api/users/${encodeURIComponent(selectedUser.username)}`,
        {
          body: JSON.stringify({
            department: values.department || null,
            email: values.email,
            entity_name: values.entityName,
            role: values.role,
            username: values.username,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PUT",
        },
      );

      if (response.success) {
        await Promise.all([loadUsers(), loadDepartments(), loadEntities(), loadProjectOwnership()]);
        closeDialog();
        appToast.success(response.message);
      } else {
        appToast.error(response.message);
      }
    } catch (submitError) {
      appToast.error(
        "No se pudo actualizar el usuario",
        submitError instanceof Error ? submitError.message : undefined,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDeleteUser() {
    if (!pendingDeleteUser) {
      return;
    }

    try {
      const response = await apiFetch<MutationResponse>(
        `/api/users/${encodeURIComponent(pendingDeleteUser.username)}`,
        { method: "DELETE" },
      );
      if (response.success) {
        await Promise.all([loadUsers(), loadProjectOwnership()]);
        setPendingDeleteUser(null);
        appToast.success(response.message);
      } else {
        appToast.error(response.message);
      }
    } catch (deleteError) {
      appToast.error(
        "No se pudo eliminar el usuario",
        deleteError instanceof Error ? deleteError.message : undefined,
      );
    }
  }

  const filteredUsers = filterUsers(users, search, roleFilter, departmentFilter);
  const pendingDeleteProjects =
    pendingDeleteUser ? projectsByOwner[pendingDeleteUser.username] ?? [] : [];
  const deleteBlockedByProjects = pendingDeleteProjects.length > 0;

  if (session === undefined) {
    return <div className="screen-center">Cargando usuarios...</div>;
  }

  if (session?.user && session.user.role !== "admin") {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Acceso</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Solo disponible para administradores
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
          Esta vista está preparada para la administración de usuarios. El backend ya limita el
          acceso, y aquí mantenemos también una capa de interfaz clara para evitar acciones fuera
          de contexto.
        </p>
      </section>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <section className="page-hero-surface overflow-hidden rounded-[32px] border border-white/10 p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="page-hero-badge gap-2 rounded-full px-3 py-1">
                <UsersClusterIcon />
                Administración
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Gestión de usuarios
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Vista centralizada para revisar accesos, crear nuevas cuentas y editar usuarios.
              </p>
            </div>

            <button
              className={buttonStyles({ size: "lg", tone: "on-dark", variant: "secondary" })}
              onClick={openCreateDialog}
              type="button"
            >
              <PlusIcon />
              Crear nuevo usuario
            </button>
          </div>
        </section>

        <UserManagementSummary loading={loading} users={users} />

        <UserManagementFilters
          departmentFilter={departmentFilter}
          departments={departments}
          onDepartmentFilterChange={setDepartmentFilter}
          onRoleFilterChange={setRoleFilter}
          onSearchChange={setSearch}
          roleFilter={roleFilter}
          search={search}
        />

        <UserManagementTable
          currentUserRole={session?.user?.role}
          loading={loading}
          onDelete={setPendingDeleteUser}
          onEdit={openEditDialog}
          users={filteredUsers}
        />
      </div>

      <UserFormDialog
        departmentOptions={departments}
        entityOptions={entities}
        mode="create"
        onOpenChange={(open) => setDialogState({ mode: "create", open })}
        onSubmit={handleCreate}
        open={dialogState.mode === "create" && dialogState.open}
        submitting={submitting}
      />

      <UserFormDialog
        departmentOptions={departments}
        entityOptions={entities}
        mode="edit"
        onOpenChange={(open) =>
          setDialogState({ mode: "edit", open, user: dialogState.mode === "edit" ? dialogState.user : null })
        }
        onSubmit={handleEdit}
        open={dialogState.mode === "edit" && dialogState.open}
        submitting={submitting}
        user={dialogState.mode === "edit" ? dialogState.user : null}
      />

      <ConfirmDialog
        actionLabel={deleteBlockedByProjects ? "Bloqueado por proyectos" : "Eliminar usuario"}
        body={
          pendingDeleteUser ? (
            <div className="space-y-3">
              <p>
                Vas a eliminar a <strong>{pendingDeleteUser.username}</strong>. Esta acción quitará
                todo su acceso.
              </p>
              {deleteBlockedByProjects ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-semibold">Este usuario todavía tiene proyectos asociados.</p>
                  <p className="mt-1">
                    Reasigna o elimina primero estos proyectos:
                  </p>
                  <p className="mt-2 break-words">
                    {pendingDeleteProjects.join(", ")}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null
        }
        confirmDisabled={deleteBlockedByProjects}
        confirmVariant="danger"
        onConfirm={confirmDeleteUser}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteUser(null);
          }
        }}
        open={pendingDeleteUser !== null}
        title="Confirmar eliminación"
      />
    </>
  );
}
