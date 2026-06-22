"use client";

import { useEffect, useState } from "react";

import { AccessRequestManagementTable } from "@/components/users/access-request-management-table";
import { useLocale } from "@/components/providers/locale-provider";
import { apiFetch, fetchSession } from "@/lib/api";
import { approveAccessRequest, denyAccessRequest, listAccessRequests } from "@/lib/access-requests";
import { listEntities } from "@/lib/entities";
import { useAppToast } from "@/hooks/use-app-toast";
import type {
  AccessRequestRecord,
  DepartmentRecord,
  EntityRecord,
  MutationResponse,
  ProjectMapResponse,
  SessionResponse,
  UserRecord,
} from "@/types/api";
import { Button, buttonStyles } from "@/components/ui/button";
import {
  CreatableSelectField,
  type CreatableSelectOption,
} from "@/components/ui/creatable-select-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserFormDialog, type UserFormValues } from "@/components/users/user-form-dialog";
import { ChevronDownIcon, PlusIcon, UsersClusterIcon } from "@/components/users/user-management-icons";
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

function buildSuggestedUsername(request: AccessRequestRecord) {
  const emailLocalPart = request.email.split("@")[0] ?? "";
  const source = emailLocalPart || request.full_name;
  const normalized = source
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return normalized || "usuario";
}

export function UserManagement() {
  const { locale } = useLocale();
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [entities, setEntities] = useState<EntityRecord[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequestRecord[]>([]);
  const [projectsByOwner, setProjectsByOwner] = useState<Record<string, string[]>>({});
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [session, setSession] = useState<SessionResponse | null>();
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>("all");
  const [departmentFilter, setDepartmentFilter] = useState<UserDepartmentFilter>("all");
  const [dialogState, setDialogState] = useState<DialogState>({ mode: "create", open: false });
  const [pendingDeleteUser, setPendingDeleteUser] = useState<UserRecord | null>(null);
  const [pendingApproveRequest, setPendingApproveRequest] = useState<AccessRequestRecord | null>(null);
  const [pendingDenyRequest, setPendingDenyRequest] = useState<AccessRequestRecord | null>(null);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [requestsOpenInitialized, setRequestsOpenInitialized] = useState(false);
  const [approvalUsername, setApprovalUsername] = useState("");
  const [approvalDepartment, setApprovalDepartment] = useState("");
  const [approvalEntityName, setApprovalEntityName] = useState("");
  const appToast = useAppToast();
  const normalizedDepartmentOptions: CreatableSelectOption[] = departments.map((departmentOption) => ({
    label: departmentOption.name,
    value: departmentOption.name,
  }));
  const normalizedEntityOptions: CreatableSelectOption[] = entities.map((entityOption) => ({
    label: entityOption.name,
    value: entityOption.name,
  }));

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
        locale === "es" ? "No se pudieron cargar los usuarios" : "Could not load users",
        loadError instanceof Error ? loadError.message : undefined,
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadAccessRequests() {
    setRequestsLoading(true);
    try {
      const payload = await listAccessRequests();
      setAccessRequests(payload);
    } catch (loadError) {
      appToast.error(
        locale === "es" ? "No se pudieron cargar las solicitudes" : "Could not load access requests",
        loadError instanceof Error ? loadError.message : undefined,
      );
      setAccessRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  }

  async function loadDepartments() {
    try {
      const payload = await apiFetch<DepartmentRecord[]>("/api/departments");
      setDepartments(payload);
    } catch (loadError) {
      appToast.error(
        locale === "es" ? "No se pudieron cargar los departamentos" : "Could not load departments",
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
        locale === "es" ? "No se pudieron cargar las entidades" : "Could not load entities",
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
        locale === "es" ? "No se pudo comprobar la relación de proyectos por usuario" : "Could not check project ownership by user",
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
          void loadAccessRequests();
        } else {
          setDepartments([]);
          setEntities([]);
          setProjectsByOwner({});
          setAccessRequests([]);
          setRequestsLoading(false);
        }
      })
      .catch(() => setSession(null));
    void loadUsers();
  }, [locale]);

  function openCreateDialog() {
    setDialogState({ mode: "create", open: true });
  }

  function openEditDialog(user: UserRecord) {
    setDialogState({ mode: "edit", open: true, user });
  }

  function closeDialog() {
    setDialogState((current) => ({ ...current, open: false }));
  }

  function openApproveRequestDialog(request: AccessRequestRecord) {
    setPendingApproveRequest(request);
    setApprovalUsername(buildSuggestedUsername(request));
    setApprovalDepartment("");
    setApprovalEntityName("");
  }

  function closeApproveRequestDialog() {
    setPendingApproveRequest(null);
    setApprovalUsername("");
    setApprovalDepartment("");
    setApprovalEntityName("");
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
            ? locale === "es"
              ? `Contraseña temporal generada: ${response.temporary_password}${copied ? " · Copiada al portapapeles." : ""}`
              : `Temporary password generated: ${response.temporary_password}${copied ? " · Copied to clipboard." : ""}`
            : undefined,
          10000,
        );
      } else {
        appToast.error(response.message);
      }
    } catch (submitError) {
      appToast.error(
        locale === "es" ? "No se pudo crear el usuario" : "Could not create user",
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
        locale === "es" ? "No se pudo actualizar el usuario" : "Could not update user",
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
        locale === "es" ? "No se pudo eliminar el usuario" : "Could not delete user",
        deleteError instanceof Error ? deleteError.message : undefined,
      );
    }
  }

  async function confirmApproveRequest() {
    if (!pendingApproveRequest) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await approveAccessRequest(pendingApproveRequest.id, {
        username: approvalUsername,
        department: approvalDepartment || null,
        entity_name: approvalEntityName || null,
      });
      if (response.success) {
        await Promise.all([loadUsers(), loadAccessRequests(), loadDepartments(), loadEntities()]);
        closeApproveRequestDialog();
        const copied =
          response.temporary_password
            ? await copyTemporaryPassword(response.temporary_password)
            : false;
        appToast.success(
          response.message,
          response.temporary_password
            ? locale === "es"
              ? `Contraseña temporal generada: ${response.temporary_password}${copied ? " · Copiada al portapapeles." : ""}`
              : `Temporary password generated: ${response.temporary_password}${copied ? " · Copied to clipboard." : ""}`
            : undefined,
          10000,
        );
      } else {
        appToast.error(response.message);
      }
    } catch (approveError) {
      appToast.error(
        locale === "es" ? "No se pudo aprobar la solicitud" : "Could not approve request",
        approveError instanceof Error ? approveError.message : undefined,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDenyRequest() {
    if (!pendingDenyRequest) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await denyAccessRequest(pendingDenyRequest.id);
      if (response.success) {
        await loadAccessRequests();
        setPendingDenyRequest(null);
        appToast.success(response.message);
      } else {
        appToast.error(response.message);
      }
    } catch (denyError) {
      appToast.error(
        locale === "es" ? "No se pudo denegar la solicitud" : "Could not deny request",
        denyError instanceof Error ? denyError.message : undefined,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const filteredUsers = filterUsers(users, search, roleFilter, departmentFilter, locale);
  const pendingAccessRequestCount = accessRequests.filter((request) => request.status === "pending").length;
  const deniedAccessRequestCount = accessRequests.filter((request) => request.status === "denied").length;
  const pendingDeleteProjects =
    pendingDeleteUser ? projectsByOwner[pendingDeleteUser.username] ?? [] : [];
  const deleteBlockedByProjects = pendingDeleteProjects.length > 0;

  useEffect(() => {
    if (requestsLoading || requestsOpenInitialized) {
      return;
    }

    setRequestsOpen(pendingAccessRequestCount > 0);
    setRequestsOpenInitialized(true);
  }, [pendingAccessRequestCount, requestsLoading, requestsOpenInitialized]);

  if (session === undefined) {
    return <div className="screen-center">{locale === "es" ? "Cargando usuarios..." : "Loading users..."}</div>;
  }

  if (session?.user && session.user.role !== "admin") {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Acceso</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          {locale === "es" ? "Solo disponible para administradores" : "Only available to administrators"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
          {locale === "es"
            ? "Esta vista está preparada para la administración de usuarios. El backend ya limita el acceso, y aquí mantenemos también una capa de interfaz clara para evitar acciones fuera de contexto."
            : "This view is prepared for user administration. Backend already restricts access, and here we also keep a clear UI layer to avoid out-of-context actions."}
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
                {locale === "es" ? "Administración" : "Administration"}
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {locale === "es" ? "Gestión de usuarios" : "User management"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                {locale === "es"
                  ? "Vista centralizada para revisar accesos, gestionar solicitudes y editar usuarios."
                  : "Centralized view to review access, manage requests, and edit users."}
              </p>
              <p className="mt-4 text-sm font-medium text-sky-100">
                {locale === "es"
                  ? `${pendingAccessRequestCount} solicitud(es) pendiente(s) de revisión`
                  : `${pendingAccessRequestCount} request(s) pending review`}
              </p>
            </div>

            <button
              className={buttonStyles({ size: "lg", tone: "on-dark", variant: "secondary" })}
              onClick={openCreateDialog}
              type="button"
            >
              <PlusIcon />
              {locale === "es" ? "Crear nuevo usuario" : "Create new user"}
            </button>
          </div>
        </section>

        <UserManagementSummary loading={loading} users={users} />

        <section
          className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm"
          id="requests"
        >
          <button
            aria-expanded={requestsOpen}
            className="flex w-full items-start justify-between gap-4 px-6 pb-6 pt-7 text-left transition hover:bg-slate-50/70 sm:px-8"
            onClick={() => setRequestsOpen((current) => !current)}
            type="button"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {locale === "es" ? "Solicitudes de acceso" : "Access requests"}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  {pendingAccessRequestCount > 0 ? (
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,0.12)]" />
                  ) : null}
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {locale === "es"
                      ? `${pendingAccessRequestCount} pendientes`
                      : `${pendingAccessRequestCount} pending`}
                  </span>
                  {deniedAccessRequestCount > 0 ? (
                    <span className="inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                      {locale === "es"
                        ? `${deniedAccessRequestCount} denegadas`
                        : `${deniedAccessRequestCount} denied`}
                    </span>
                  ) : null}
                </div>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                {locale === "es"
                  ? "Aquí se revisan las altas nuevas enviadas desde el login. Al aprobar, se crea el usuario y se envía el acceso por correo."
                  : "Review new sign-up requests sent from sign in. Approving creates the user and sends access by email."}
              </p>
            </div>

            <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
              <ChevronDownIcon
                className={`h-5 w-5 transition-transform duration-200 ${requestsOpen ? "rotate-180" : ""}`}
              />
            </span>
          </button>

          <div
            className={`overflow-hidden border-t border-slate-200 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              requestsOpen
                ? "max-h-[1200px] opacity-100"
                : "max-h-0 border-t-transparent opacity-0"
            }`}
          >
            <div
              className={`transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                requestsOpen
                  ? "translate-y-0 p-6 sm:p-8"
                  : "-translate-y-2 px-6 pb-0 pt-0 sm:px-8"
              }`}
            >
              <AccessRequestManagementTable
                loading={requestsLoading}
                onApprove={openApproveRequestDialog}
                onDeny={setPendingDenyRequest}
                requests={accessRequests}
              />
            </div>
          </div>
        </section>

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
        actionLabel={deleteBlockedByProjects
          ? locale === "es" ? "Bloqueado por proyectos" : "Blocked by projects"
          : locale === "es" ? "Eliminar usuario" : "Delete user"}
        body={
          pendingDeleteUser ? (
            <div className="space-y-3">
              <p>
                {locale === "es"
                  ? <>Vas a eliminar a <strong>{pendingDeleteUser.username}</strong>. Esta acción quitará todo su acceso.</>
                  : <>You are about to delete <strong>{pendingDeleteUser.username}</strong>. This action will remove all access.</>}
              </p>
              {deleteBlockedByProjects ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-semibold">
                    {locale === "es"
                      ? "Este usuario todavía tiene proyectos asociados."
                      : "This user still has associated projects."}
                  </p>
                  <p className="mt-1">
                    {locale === "es" ? "Reasigna o elimina primero estos proyectos:" : "Reassign or delete these projects first:"}
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
        title={locale === "es" ? "Confirmar eliminación" : "Confirm deletion"}
      />

      <ConfirmDialog
        actionLabel={locale === "es" ? "Denegar solicitud" : "Deny request"}
        body={
          pendingDenyRequest
            ? locale === "es"
              ? `Se notificará por correo a ${pendingDenyRequest.full_name} (${pendingDenyRequest.email}) que su solicitud ha sido denegada.`
              : `${pendingDenyRequest.full_name} (${pendingDenyRequest.email}) will be notified by email that the request has been denied.`
            : ""
        }
        confirmDisabled={submitting}
        confirmVariant="danger"
        onConfirm={confirmDenyRequest}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDenyRequest(null);
          }
        }}
        open={pendingDenyRequest !== null}
        title={locale === "es" ? "Denegar solicitud" : "Deny request"}
      />

      <Dialog onOpenChange={(open) => (!open ? closeApproveRequestDialog() : undefined)} open={pendingApproveRequest !== null}>
        <DialogContent className="max-w-xl overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-6 sm:px-8">
            <DialogHeader className="pr-10">
              <DialogTitle>
                {locale === "es" ? "Aprobar solicitud" : "Approve request"}
              </DialogTitle>
              <DialogDescription>
                {pendingApproveRequest
                  ? locale === "es"
                    ? `Se creará un usuario para ${pendingApproveRequest.full_name} (${pendingApproveRequest.email}) y recibirá el acceso por correo.`
                    : `A user will be created for ${pendingApproveRequest.full_name} (${pendingApproveRequest.email}) and access will be sent by email.`
                  : ""}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="grid gap-5 px-6 py-6 sm:px-8">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">
                {locale === "es" ? "Nombre de usuario" : "Username"}
              </span>
              <input
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-sky-100"
                onChange={(event) => setApprovalUsername(event.target.value)}
                placeholder={locale === "es" ? "usuario.laboratorio" : "lab.user"}
                value={approvalUsername}
              />
            </label>

            <CreatableSelectField
              createPlaceholder={locale === "es" ? "Escribe un nuevo departamento" : "Type a new department"}
              label={locale === "es" ? "Departamento" : "Department"}
              onChange={setApprovalDepartment}
              options={normalizedDepartmentOptions}
              value={approvalDepartment}
            />

            <CreatableSelectField
              allowCreate={false}
              createPlaceholder={locale === "es" ? "Escribe una nueva entidad" : "Type a new entity"}
              label={locale === "es" ? "Entidad" : "Entity"}
              onChange={setApprovalEntityName}
              options={normalizedEntityOptions}
              value={approvalEntityName}
            />
          </div>

          <DialogFooter className="border-t border-slate-200 px-6 py-4 sm:px-8">
            <DialogClose asChild>
              <Button variant="secondary">{locale === "es" ? "Cancelar" : "Cancel"}</Button>
            </DialogClose>
            <Button
              disabled={submitting || approvalUsername.trim().length < 3}
              onClick={() => void confirmApproveRequest()}
              type="button"
            >
              {locale === "es" ? "Crear usuario y aprobar" : "Create user and approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
