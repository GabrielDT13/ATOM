"use client";

import { useEffect, useMemo, useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { fetchSession } from "@/lib/api";
import { createEntity, deleteEntity, listEntities, updateEntity } from "@/lib/entities";
import { useAppToast } from "@/hooks/use-app-toast";
import type { EntityRecord, SessionResponse } from "@/types/api";
import { DatabaseIcon } from "@/components/dashboard/dashboard-icons";
import { EntityFormDialog } from "@/components/entities/entity-form-dialog";
import { EntityManagementBoard } from "@/components/entities/entity-management-board";
import { EntityManagementFilters } from "@/components/entities/entity-management-filters";
import { EntityManagementTable } from "@/components/entities/entity-management-table";
import { filterEntities, type EntityViewMode } from "@/components/entities/entity-management-utils";
import { PlusIcon } from "@/components/projects/project-management-icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";

function EntitySummaryCard({
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

const ENTITY_VIEW_STORAGE_KEY = "atom.entity-management.view";

export function EntityManagement() {
  const { locale } = useLocale();
  const appToast = useAppToast();
  const [session, setSession] = useState<SessionResponse | null>();
  const [entities, setEntities] = useState<EntityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<EntityViewMode>("board");
  const [editingEntity, setEditingEntity] = useState<EntityRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDeleteEntity, setPendingDeleteEntity] = useState<EntityRecord | null>(null);

  async function loadState() {
    setLoading(true);
    try {
      const [sessionPayload, entitiesPayload] = await Promise.all([
        fetchSession(),
        listEntities(),
      ]);
      setSession(sessionPayload);
      setEntities(entitiesPayload);
    } catch (loadError) {
      appToast.error(
        locale === "es" ? "No se pudieron cargar las entidades" : "Could not load entities",
        loadError instanceof Error ? loadError.message : undefined,
      );
      setEntities([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadState();
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedViewMode = window.localStorage.getItem(ENTITY_VIEW_STORAGE_KEY);
    if (storedViewMode === "list" || storedViewMode === "board") {
      setViewMode(storedViewMode);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(ENTITY_VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const isAdmin = session?.user?.role === "admin";
  const filteredEntities = useMemo(() => filterEntities(entities, search), [entities, search]);
  const totalUsers = entities.reduce((sum, entity) => sum + (entity.user_count ?? 0), 0);
  const totalProjects = entities.reduce((sum, entity) => sum + (entity.project_count ?? 0), 0);
  const totalTeams = entities.reduce((sum, entity) => sum + (entity.team_count ?? 0), 0);

  async function handleCreate(payload: { logoFile: File | null; name: string; removeLogo: boolean }) {
    if (!payload.name.trim()) {
      appToast.error(locale === "es" ? "El nombre de la entidad es obligatorio" : "Entity name is required");
      return;
    }

    setSubmitting(true);
    try {
      const response = await createEntity(payload);
      if (response.success) {
        setCreateOpen(false);
        await loadState();
        appToast.success(response.message);
      } else {
        appToast.error(response.message);
      }
    } catch (submitError) {
      appToast.error(
        locale === "es" ? "No se pudo crear la entidad" : "Could not create entity",
        submitError instanceof Error ? submitError.message : undefined,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(payload: { logoFile: File | null; name: string; removeLogo: boolean }) {
    if (!editingEntity) {
      return;
    }
    if (!payload.name.trim()) {
      appToast.error(locale === "es" ? "El nombre de la entidad es obligatorio" : "Entity name is required");
      return;
    }

    setSubmitting(true);
    try {
      const response = await updateEntity(editingEntity.id, payload);
      if (response.success) {
        setEditingEntity(null);
        await loadState();
        appToast.success(response.message);
      } else {
        appToast.error(response.message);
      }
    } catch (submitError) {
      appToast.error(
        locale === "es" ? "No se pudo actualizar la entidad" : "Could not update entity",
        submitError instanceof Error ? submitError.message : undefined,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDeleteEntity() {
    if (!pendingDeleteEntity) {
      return;
    }

    try {
      const response = await deleteEntity(pendingDeleteEntity.id);
      if (response.success) {
        setPendingDeleteEntity(null);
        await loadState();
        appToast.success(response.message);
      } else {
        appToast.error(response.message);
      }
    } catch (deleteError) {
      appToast.error(
        locale === "es" ? "No se pudo eliminar la entidad" : "Could not delete entity",
        deleteError instanceof Error ? deleteError.message : undefined,
      );
    }
  }

  if (session && !isAdmin) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-10 shadow-sm">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-base font-semibold text-slate-900">{locale === "es" ? "Acceso restringido" : "Restricted access"}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {locale === "es"
              ? "La gestión de entidades está disponible solo para administradores."
              : "Entity management is available only for administrators."}
          </p>
        </div>
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
                <DatabaseIcon className="h-5 w-5" />
                {locale === "es" ? "Entidades" : "Entities"}
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {locale === "es" ? "Gestión de entidades" : "Entity management"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                {locale === "es"
                  ? "Administra universidades, institutos y centros reutilizables para usuarios, proyectos y equipos desde una pantalla específica de administración."
                  : "Manage universities, institutes and reusable centers for users, projects and teams from a dedicated administration screen."}
              </p>
            </div>

            <Button onClick={() => setCreateOpen(true)} size="lg" tone="on-dark" variant="secondary">
              <PlusIcon />
              {locale === "es" ? "Crear entidad" : "Create entity"}
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <EntitySummaryCard label={locale === "es" ? "Entidades" : "Entities"} value={String(entities.length)} />
          <EntitySummaryCard label={locale === "es" ? "Usuarios vinculados" : "Linked users"} value={String(totalUsers)} />
          <EntitySummaryCard label={locale === "es" ? "Proyectos vinculados" : "Linked projects"} value={String(totalProjects)} />
          <EntitySummaryCard label={locale === "es" ? "Equipos vinculados" : "Linked teams"} value={String(totalTeams)} />
        </section>

        <EntityManagementFilters
          onSearchChange={setSearch}
          onViewModeChange={setViewMode}
          search={search}
          viewMode={viewMode}
        />

        {viewMode === "board" ? (
          <EntityManagementBoard
            entities={filteredEntities}
            loading={loading}
            onDelete={setPendingDeleteEntity}
            onEdit={setEditingEntity}
          />
        ) : (
          <EntityManagementTable
            entities={filteredEntities}
            loading={loading}
            onDelete={setPendingDeleteEntity}
            onEdit={setEditingEntity}
          />
        )}
      </div>

      <EntityFormDialog
        mode="create"
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        open={createOpen}
        submitting={submitting}
      />

      <EntityFormDialog
        entity={editingEntity}
        mode="edit"
        onOpenChange={(open) => {
          if (!open) {
            setEditingEntity(null);
          }
        }}
        onSubmit={handleEdit}
        open={Boolean(editingEntity)}
        submitting={submitting}
      />

      <ConfirmDialog
        actionLabel={locale === "es" ? "Eliminar entidad" : "Delete entity"}
        body={
          pendingDeleteEntity ? (
            <div className="space-y-3">
              <p>
                {locale === "es"
                  ? <>Se eliminará <strong>{pendingDeleteEntity.name}</strong>.</>
                  : <>This will delete <strong>{pendingDeleteEntity.name}</strong>.</>}
              </p>
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {locale === "es"
                  ? "Los usuarios, proyectos y equipos vinculados quedarán sin entidad asignada."
                  : "Linked users, projects and teams will remain without an assigned entity."}
              </p>
            </div>
          ) : null
        }
        confirmVariant="danger"
        onConfirm={() => void confirmDeleteEntity()}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteEntity(null);
          }
        }}
        open={Boolean(pendingDeleteEntity)}
        title={locale === "es" ? "Confirmar eliminación de entidad" : "Confirm entity deletion"}
      />
    </>
  );
}
