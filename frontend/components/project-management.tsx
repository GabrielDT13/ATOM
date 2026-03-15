"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { fetchSession } from "@/lib/api";
import { deleteProject, listProjects, updateProject } from "@/lib/projects";
import { useAppToast } from "@/hooks/use-app-toast";
import type { SessionResponse } from "@/types/api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { buttonStyles } from "@/components/ui/button";
import { ProjectEditDialog, type ProjectEditValues } from "@/components/projects/project-edit-dialog";
import { ProjectManagementFilters } from "@/components/projects/project-management-filters";
import {
  PlusIcon,
  ProjectStackIcon,
} from "@/components/projects/project-management-icons";
import { ProjectManagementSummary } from "@/components/projects/project-management-summary";
import { ProjectManagementTable } from "@/components/projects/project-management-table";
import {
  filterProjects,
  getProjectOwners,
  type ProjectOwnerFilter,
  type ProjectRecord,
  type ProjectStatusFilter,
  buildProjectRecords,
} from "@/components/projects/project-management-utils";
import { ProjectViewDialog } from "@/components/projects/project-view-dialog";

export function ProjectManagement() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [session, setSession] = useState<SessionResponse | null>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>("all");
  const [ownerFilter, setOwnerFilter] = useState<ProjectOwnerFilter>("all");
  const [viewProject, setViewProject] = useState<ProjectRecord | null>(null);
  const [editingProject, setEditingProject] = useState<ProjectRecord | null>(null);
  const [pendingDeleteProject, setPendingDeleteProject] = useState<ProjectRecord | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState<"complete" | "idle" | "uploading">("idle");
  const appToast = useAppToast();

  async function loadProjects() {
    setLoading(true);

    try {
      const payload = await listProjects();
      setProjects(buildProjectRecords(payload.items));
    } catch (loadError) {
      appToast.error(
        "No se pudieron cargar los proyectos",
        loadError instanceof Error ? loadError.message : undefined,
      );
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchSession()
      .then((nextSession) => setSession(nextSession))
      .catch(() => setSession(null));
    void loadProjects();
  }, []);

  async function handleEdit(values: ProjectEditValues) {
    if (!editingProject) {
      return;
    }

    const nextName = values.name.trim();
    const nextTemplate = values.templateFiles[0] ?? null;
    const hasAdditionalFiles = values.additionalFiles.length > 0;
    const hasNameChange = nextName !== editingProject.name;

    if (!nextName) {
      appToast.error("El nombre del proyecto es obligatorio");
      return;
    }

    if (!hasNameChange && !nextTemplate && !hasAdditionalFiles) {
      appToast.info("No hay cambios para guardar");
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);
    setUploadState("uploading");

    try {
      const response = await updateProject(editingProject.owner, editingProject.name, {
        additionalFiles: values.additionalFiles,
        name: hasNameChange ? nextName : undefined,
        onProgress: setUploadProgress,
        templateFile: nextTemplate,
      });

      if (response.success) {
        setUploadProgress(100);
        setUploadState("complete");
        setEditingProject(null);
        setViewProject(null);
        await loadProjects();
        appToast.success(response.message);
      } else {
        appToast.error(response.message);
        setUploadState("idle");
      }
    } catch (submitError) {
      setUploadState("idle");
      appToast.error(
        "No se pudo actualizar el proyecto",
        submitError instanceof Error ? submitError.message : undefined,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDeleteProject() {
    if (!pendingDeleteProject) {
      return;
    }

    try {
      const response = await deleteProject(
        pendingDeleteProject.owner,
        pendingDeleteProject.name,
      );

      if (response.success) {
        setPendingDeleteProject(null);
        setViewProject(null);
        setEditingProject(null);
        await loadProjects();
        appToast.success(response.message);
      } else {
        appToast.error(response.message);
      }
    } catch (deleteError) {
      appToast.error(
        "No se pudo eliminar el proyecto",
        deleteError instanceof Error ? deleteError.message : undefined,
      );
    }
  }

  const owners = useMemo(() => getProjectOwners(projects), [projects]);
  const filteredProjects = useMemo(
    () => filterProjects(projects, search, statusFilter, ownerFilter),
    [ownerFilter, projects, search, statusFilter],
  );
  const isAdmin = session?.user?.role === "admin";
  const canEditProject = (project: ProjectRecord) => Boolean(isAdmin || project.accessRole === "owner" || project.accessRole === "editor");
  const canDeleteProject = (project: ProjectRecord) => Boolean(isAdmin || project.accessRole === "owner");
  const canShareProject = (project: ProjectRecord) => Boolean(project.accessRole === "owner");

  return (
    <>
      <div className="flex flex-col gap-6">
        <section className="page-hero-surface overflow-hidden rounded-[32px] border border-white/10 p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="page-hero-badge gap-2 rounded-full px-3 py-1">
                <ProjectStackIcon />
                Proyectos
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Gestión visual de proyectos
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Administra tus proyectos, revisa sus archivos y realiza acciones rápidas desde una
                sola vista.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                  {projects.length} proyecto{projects.length === 1 ? "" : "s"} visibles
                </span>
                {isAdmin ? (
                  <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                    Vista multiusuario habilitada
                  </span>
                ) : null}
              </div>
            </div>

            <Link
              className={buttonStyles({ size: "lg", tone: "on-dark", variant: "secondary" })}
              href="/dashboard/create_project"
            >
              <PlusIcon />
              Crear nuevo proyecto
            </Link>
          </div>
        </section>

        <ProjectManagementSummary projects={projects} />

        <ProjectManagementFilters
          onOwnerFilterChange={setOwnerFilter}
          onSearchChange={setSearch}
          onStatusFilterChange={setStatusFilter}
          ownerFilter={ownerFilter}
          owners={isAdmin ? owners : owners.slice(0, 1)}
          search={search}
          statusFilter={statusFilter}
        />

        <ProjectManagementTable
          canDeleteProject={canDeleteProject}
          canEditProject={canEditProject}
          loading={loading}
          onDelete={setPendingDeleteProject}
          onEdit={setEditingProject}
          onView={setViewProject}
          projects={filteredProjects}
        />
      </div>

      <ProjectViewDialog
        canManage={viewProject ? canEditProject(viewProject) : false}
        onEdit={(project) => {
          setViewProject(null);
          setEditingProject(project);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setViewProject(null);
          }
        }}
        open={Boolean(viewProject)}
        project={viewProject}
      />

      <ProjectEditDialog
        canShare={editingProject ? canShareProject(editingProject) : false}
        onOpenChange={(open) => {
          if (!open) {
            setEditingProject(null);
            setUploadProgress(0);
            setUploadState("idle");
          }
        }}
        onOwnershipTransferred={async () => {
          setEditingProject(null);
          setViewProject(null);
          await loadProjects();
        }}
        onSubmit={handleEdit}
        open={Boolean(editingProject)}
        project={editingProject}
        submitting={submitting}
        uploadProgress={uploadProgress}
        uploadState={uploadState}
      />

      <ConfirmDialog
        actionLabel="Eliminar proyecto"
        body={
          pendingDeleteProject ? (
            <div className="space-y-3">
              <p>
                Se eliminará <strong>{pendingDeleteProject.name}</strong> y todo su contenido
                asociado.
              </p>
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                Esta acción borra la carpeta del proyecto para @{pendingDeleteProject.owner}.
              </p>
            </div>
          ) : null
        }
        confirmVariant="danger"
        onConfirm={() => void confirmDeleteProject()}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteProject(null);
          }
        }}
        open={Boolean(pendingDeleteProject)}
        title="Confirmar eliminación"
      />
    </>
  );
}
