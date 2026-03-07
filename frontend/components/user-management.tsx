"use client";

import { useEffect, useState } from "react";

import { apiFetch, fetchSession } from "@/lib/api";
import { useAppToast } from "@/hooks/use-app-toast";
import type { MutationResponse, SessionResponse, UserRecord } from "@/types/api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UserFormDialog, type UserFormValues } from "@/components/users/user-form-dialog";
import { PlusIcon, SearchIcon, UsersClusterIcon } from "@/components/users/user-management-icons";
import { UserManagementSummary } from "@/components/users/user-management-summary";
import { UserManagementTable } from "@/components/users/user-management-table";
import {
  filterUsers,
  type UserRoleFilter,
} from "@/components/users/user-management-utils";

type DialogState =
  | { mode: "create"; open: boolean; user?: undefined }
  | { mode: "edit"; open: boolean; user: UserRecord | null };

export function UserManagement() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [session, setSession] = useState<SessionResponse | null>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>("all");
  const [dialogState, setDialogState] = useState<DialogState>({ mode: "create", open: false });
  const [pendingDeleteUser, setPendingDeleteUser] = useState<UserRecord | null>(null);
  const appToast = useAppToast();

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

  useEffect(() => {
    void fetchSession()
      .then(setSession)
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
          email: values.email,
          password: values.password,
          username: values.username,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (response.success) {
        const createdUser: UserRecord = {
          department: values.department || response.user?.department || null,
          display_name: response.user?.display_name ?? values.username,
          email: response.user?.email ?? values.email,
          first_name: response.user?.first_name ?? null,
          id: response.user?.id ?? `local-${values.username}`,
          last_name: response.user?.last_name ?? null,
          role: values.role,
          username: response.user?.username ?? values.username,
        };

        setUsers((current) => [createdUser, ...current.filter((user) => user.username !== createdUser.username)]);
        closeDialog();
        appToast.success(response.message);
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
            email: values.email,
            username: values.username,
          }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PUT",
        },
      );

      if (response.success) {
        setUsers((current) =>
          current.map((user) =>
            user.username === selectedUser.username
              ? {
                  ...user,
                  ...response.user,
                  department: values.department,
                  email: values.email,
                  role: values.role,
                  username: values.username,
                }
              : user,
          ),
        );
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
        setUsers((current) =>
          current.filter((user) => user.username !== pendingDeleteUser.username),
        );
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

  const filteredUsers = filterUsers(users, search, roleFilter);

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
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_38%),linear-gradient(180deg,_#ffffff_0%,_#f7fbff_100%)] p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                <UsersClusterIcon />
                Administración
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Gestión de usuarios
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                Vista centralizada para revisar accesos, crear nuevas cuentas y editar usuarios.
              </p>
            </div>

            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
              onClick={openCreateDialog}
              type="button"
            >
              <PlusIcon />
              Crear nuevo usuario
            </button>
          </div>
        </section>

        <UserManagementSummary users={users} />

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-xl">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon />
              </span>
              <input
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-sky-100"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, email, usuario o departamento..."
                type="search"
                value={search}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-500">
                Rol
                <select
                  className="h-12 min-w-[180px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-sky-100"
                  onChange={(event) => setRoleFilter(event.target.value as UserRoleFilter)}
                  value={roleFilter}
                >
                  <option value="all">Todos los roles</option>
                  <option value="admin">Administradores</option>
                  <option value="user">Usuarios</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        <UserManagementTable
          currentUserRole={session?.user?.role}
          loading={loading}
          onDelete={setPendingDeleteUser}
          onEdit={openEditDialog}
          users={filteredUsers}
        />
      </div>

      <UserFormDialog
        mode="create"
        onOpenChange={(open) => setDialogState({ mode: "create", open })}
        onSubmit={handleCreate}
        open={dialogState.mode === "create" && dialogState.open}
        submitting={submitting}
      />

      <UserFormDialog
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
        actionLabel="Eliminar usuario"
        body={
          pendingDeleteUser ? (
            <p>
              Vas a eliminar a <strong>{pendingDeleteUser.username}</strong>. Esta acción quitará
              todo su acceso.
            </p>
          ) : null
        }
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
