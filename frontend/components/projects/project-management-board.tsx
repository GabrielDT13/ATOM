"use client";

import Link from "next/link";

import { buildApiUrl, encodePathSegments } from "@/lib/api";
import { cn } from "@/lib/utils";
import { buildProjectDetailHref } from "@/lib/projects";
import { formatDate } from "@/components/dashboard/dashboard-overview-utils";
import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from "@/components/projects/project-management-icons";
import {
  getProjectVisibilityMeta,
  getProjectPreviewFiles,
  getProjectStatusMeta,
  type ProjectRecord,
} from "@/components/projects/project-management-utils";
import { buttonStyles } from "@/components/ui/button";
import { BoardHeroArt } from "@/components/ui/board-hero-art";
import { EntityLogo } from "@/components/ui/entity-logo";
import { RowActionsMenu, type RowActionItem } from "@/components/ui/row-actions-menu";
import { Skeleton } from "@/components/ui/skeleton";

type ProjectManagementBoardProps = {
  canDeleteProject: (project: ProjectRecord) => boolean;
  canEditProject: (project: ProjectRecord) => boolean;
  locale: "en" | "es";
  loading: boolean;
  onDelete: (project: ProjectRecord) => void;
  onEdit: (project: ProjectRecord) => void;
  onView: (project: ProjectRecord) => void;
  projects: ProjectRecord[];
};

const PROJECT_BOARD_SKELETON_COUNT = 6;
const PROJECT_BOARD_HERO_IMAGE = "/images/project-hero-molecule.jpg";

function ProjectStatusBadge({ locale, project }: { locale: "en" | "es"; project: ProjectRecord }) {
  const meta = getProjectStatusMeta(project.status, project.activeRun, locale);

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

function ProjectPreviewPills({ locale, project }: { locale: "en" | "es"; project: ProjectRecord }) {
  const previewFiles = getProjectPreviewFiles(project, 3);

  if (previewFiles.length === 0) {
    return <p className="text-sm text-slate-400">{locale === "es" ? "Sin archivos todavía" : "No files yet"}</p>;
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
        <Skeleton className="h-48 rounded-[24px]" />

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
  locale,
  loading,
  onDelete,
  onEdit,
  onView,
  projects,
}: ProjectManagementBoardProps) {
  const t = locale === "es";
  if (loading) {
    return (
      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: PROJECT_BOARD_SKELETON_COUNT }, (_, index) => (
            <ProjectBoardSkeleton key={index} />
          ))}
        </div>
        <p className="text-center text-sm text-slate-400">{t ? "Cargando proyectos..." : "Loading projects..."}</p>
      </section>
    );
  }

  if (projects.length === 0) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-10 shadow-sm">
        <div className="mx-auto max-w-md text-center">
          <p className="text-base font-semibold text-slate-900">
            {t ? "No hay proyectos que coincidan con los filtros." : "No projects match the current filters."}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {t
              ? "Ajusta la búsqueda o crea un nuevo proyecto para empezar a trabajar desde esta vista."
              : "Adjust your search or create a new project to start working from this view."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {projects.map((project) => {
        const statusMeta = getProjectStatusMeta(project.status, project.activeRun, locale);
        const visibilityMeta = getProjectVisibilityMeta(project.visibility, locale);
        const actions: RowActionItem[] = [
          {
            icon: <EyeIcon className="h-4 w-4" />,
            label: t ? "Ver proyecto" : "View project",
            onSelect: () => onView(project),
          },
        ];

        if (canEditProject(project)) {
          actions.push({
            icon: <PencilIcon className="h-4 w-4" />,
            label: t ? "Editar proyecto" : "Edit project",
            onSelect: () => onEdit(project),
          });
        }

        if (canDeleteProject(project)) {
          actions.push({
            destructive: true,
            icon: <TrashIcon className="h-4 w-4" />,
            label: t ? "Eliminar proyecto" : "Delete project",
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
              <BoardHeroArt
                accentClassName={statusMeta.panelClassName}
                corner={
                  project.entity_name || project.entity_logo_url ? (
                    <EntityLogo
                      className="h-14 w-14 bg-white/95"
                      logoUrl={project.entity_logo_url}
                      name={project.entity_name ?? project.name}
                    />
                  ) : null
                }
                eyebrow={statusMeta.label}
                imagePath={PROJECT_BOARD_HERO_IMAGE}
                subtitle={`@${project.owner}${project.entity_name ? ` · ${project.entity_name}` : ""}`}
                title={project.name}
              />

              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <ProjectStatusBadge locale={locale} project={project} />

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                      {t ? "Actualizado" : "Updated"} {formatDate(project.updated_at, locale)}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm font-medium",
                        visibilityMeta.badgeClassName,
                      )}
                    >
                      {visibilityMeta.label}
                    </span>
                    {project.templateFile ? (
                      <span className="max-w-full truncate rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                        {project.templateFile}
                      </span>
                    ) : null}
                  </div>
                </div>

                <RowActionsMenu actions={actions} ariaLabel={t ? `Abrir acciones para ${project.name}` : `Open actions for ${project.name}`} />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <ProjectMetricChip label={t ? "Archivos" : "Files"} value={String(project.files.length)} />
                <ProjectMetricChip label={t ? "Resultados" : "Results"} value={String(project.htmlFiles.length)} />
                <ProjectMetricChip label={t ? "Extras" : "Extras"} value={String(project.additionalFiles.length)} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {t ? "Archivos destacados" : "Featured files"}
                  </p>
                  <span className="text-xs font-medium text-slate-400">
                    {t ? "Creado" : "Created"} {formatDate(project.created_at, locale)}
                  </span>
                </div>
                <ProjectPreviewPills locale={locale} project={project} />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  className={buttonStyles({ size: "md", variant: "primary" })}
                  onClick={() => onView(project)}
                  type="button"
                >
                  <EyeIcon className="h-4 w-4" />
                  {t ? "Abrir proyecto" : "Open project"}
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
