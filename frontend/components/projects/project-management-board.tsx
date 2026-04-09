"use client";

import Link from "next/link";

import { buildApiUrl, encodePathSegments } from "@/lib/api";
import { cn } from "@/lib/utils";
import { buildProjectDetailHref } from "@/lib/projects";
import { formatDate } from "@/components/projects/detail/project-detail-helpers";
import {
  EyeIcon,
  PencilIcon,
  ProjectStackIcon,
  TrashIcon,
} from "@/components/projects/project-management-icons";
import {
  getProjectPreviewFiles,
  getProjectStatusMeta,
  type ProjectRecord,
} from "@/components/projects/project-management-utils";
import { buttonStyles } from "@/components/ui/button";
import { RowActionsMenu, type RowActionItem } from "@/components/ui/row-actions-menu";
import { Skeleton } from "@/components/ui/skeleton";

type ProjectManagementBoardProps = {
  canDeleteProject: (project: ProjectRecord) => boolean;
  canEditProject: (project: ProjectRecord) => boolean;
  loading: boolean;
  onDelete: (project: ProjectRecord) => void;
  onEdit: (project: ProjectRecord) => void;
  onView: (project: ProjectRecord) => void;
  projects: ProjectRecord[];
};

const PROJECT_BOARD_SKELETON_COUNT = 6;

function ProjectStatusBadge({ project }: { project: ProjectRecord }) {
  const meta = getProjectStatusMeta(project.status, project.activeRun);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        meta.badgeClassName,
      )}
    >
      {meta.label}
    </span>
  );
}

function ProjectPreviewPills({ project }: { project: ProjectRecord }) {
  const previewFiles = getProjectPreviewFiles(project, 3);

  if (previewFiles.length === 0) {
    return <p className="text-sm text-slate-400">Sin archivos todavía</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {previewFiles.map((file) => (
        <a
          className="inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          href={buildApiUrl(
            `/api/projects/${encodeURIComponent(project.owner)}/download/${encodePathSegments(
              `${project.name}/${file}`,
            )}`,
          )}
          key={file}
          rel="noreferrer"
          target="_blank"
        >
          <span className="truncate">{file}</span>
        </a>
      ))}
      {project.files.length > previewFiles.length ? (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          +{project.files.length - previewFiles.length}
        </span>
      ) : null}
    </div>
  );
}

function ProjectMetricChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ProjectBoardSkeleton() {
  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="space-y-5 p-5">
        <div className="rounded-[24px] bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-10 w-10 rounded-2xl" />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Skeleton className="h-8 w-32 rounded-full" />
            <Skeleton className="h-8 w-40 rounded-full" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3" key={index}>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-2 h-4 w-20" />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-32 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <Skeleton className="h-11 w-40 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </article>
  );
}

export function ProjectManagementBoard({
  canDeleteProject,
  canEditProject,
  loading,
  onDelete,
  onEdit,
  onView,
  projects,
}: ProjectManagementBoardProps) {
  if (loading) {
    return (
      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: PROJECT_BOARD_SKELETON_COUNT }, (_, index) => (
            <ProjectBoardSkeleton key={index} />
          ))}
        </div>
        <p className="text-center text-sm text-slate-400">Cargando proyectos...</p>
      </section>
    );
  }

  if (projects.length === 0) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-10 shadow-sm">
        <div className="mx-auto max-w-md text-center">
          <p className="text-base font-semibold text-slate-900">
            No hay proyectos que coincidan con los filtros.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Ajusta la búsqueda o crea un nuevo proyecto para empezar a trabajar desde esta vista.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {projects.map((project) => {
        const statusMeta = getProjectStatusMeta(project.status, project.activeRun);
        const actions: RowActionItem[] = [
          {
            icon: <EyeIcon className="h-4 w-4" />,
            label: "Ver proyecto",
            onSelect: () => onView(project),
          },
        ];

        if (canEditProject(project)) {
          actions.push({
            icon: <PencilIcon className="h-4 w-4" />,
            label: "Editar proyecto",
            onSelect: () => onEdit(project),
          });
        }

        if (canDeleteProject(project)) {
          actions.push({
            destructive: true,
            icon: <TrashIcon className="h-4 w-4" />,
            label: "Eliminar proyecto",
            onSelect: () => onDelete(project),
            separatorBefore: canEditProject(project),
          });
        }

        return (
          <article
            className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_24px_60px_-32px_rgba(15,23,42,0.35)]"
            key={project.id}
          >
            <div className="flex flex-col gap-5 p-5">
              <div
                className={cn(
                  "rounded-[24px] border border-slate-200 bg-gradient-to-br p-4",
                  statusMeta.panelClassName,
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-slate-900 shadow-sm">
                      <ProjectStackIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <ProjectStatusBadge project={project} />
                      <Link
                        className="mt-3 block truncate text-lg font-semibold tracking-tight text-slate-950 transition hover:text-primary"
                        href={buildProjectDetailHref(project.routeRef)}
                      >
                        {project.name}
                      </Link>
                      <p className="mt-1 text-sm text-slate-600">@{project.owner}</p>
                    </div>
                  </div>

                  <RowActionsMenu actions={actions} ariaLabel={`Abrir acciones para ${project.name}`} />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-slate-700">
                    Actualizado {formatDate(project.updated_at)}
                  </span>
                  {project.templateFile ? (
                    <span className="max-w-full truncate rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-slate-700">
                      {project.templateFile}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <ProjectMetricChip label="Archivos" value={String(project.files.length)} />
                <ProjectMetricChip label="Resultados" value={String(project.htmlFiles.length)} />
                <ProjectMetricChip label="Extras" value={String(project.additionalFiles.length)} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Archivos destacados
                  </p>
                  <span className="text-xs font-medium text-slate-400">
                    Creado {formatDate(project.created_at)}
                  </span>
                </div>
                <ProjectPreviewPills project={project} />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  className={buttonStyles({ size: "md", variant: "primary" })}
                  onClick={() => onView(project)}
                  type="button"
                >
                  <EyeIcon className="h-4 w-4" />
                  Abrir proyecto
                </button>
                <p className="max-w-[10rem] text-right text-xs leading-5 text-slate-500">
                  {statusMeta.description}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
