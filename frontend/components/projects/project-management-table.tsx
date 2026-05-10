import Link from "next/link";

import { buildApiUrl, encodePathSegments } from "@/lib/api";
import { buildProjectDetailHref } from "@/lib/projects";
import { cn } from "@/lib/utils";
import type { DataTableColumn } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import { RowActionsMenu, type RowActionItem } from "@/components/ui/row-actions-menu";
import {
  EyeIcon,
  PencilIcon,
  ProjectStackIcon,
  TrashIcon,
} from "@/components/projects/project-management-icons";
import {
  getProjectVisibilityMeta,
  getProjectPreviewFiles,
  getProjectStatusMeta,
  type ProjectRecord,
} from "@/components/projects/project-management-utils";

function ProjectStatusBadge({
  locale,
  project,
}: {
  locale: "en" | "es";
  project: ProjectRecord;
}) {
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

function ProjectInventoryCell({
  locale,
  project,
}: {
  locale: "en" | "es";
  project: ProjectRecord;
}) {
  const t = locale === "es";
  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-slate-900">
        {project.files.length} {t ? `archivo${project.files.length === 1 ? "" : "s"}` : `file${project.files.length === 1 ? "" : "s"}`}
      </p>
      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
          {project.templateFile ? (t ? "Plantilla lista" : "Template ready") : (t ? "Sin plantilla" : "No template")}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
          {project.additionalFiles.length} {t ? `adicional${project.additionalFiles.length === 1 ? "" : "es"}` : `extra${project.additionalFiles.length === 1 ? "" : "s"}`}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
          {project.htmlFiles.length} {t ? `resultado${project.htmlFiles.length === 1 ? "" : "s"}` : `result${project.htmlFiles.length === 1 ? "" : "s"}`}
        </span>
      </div>
    </div>
  );
}

type ProjectManagementTableProps = {
  canDeleteProject: (project: ProjectRecord) => boolean;
  canEditProject: (project: ProjectRecord) => boolean;
  locale: "en" | "es";
  loading: boolean;
  onDelete: (project: ProjectRecord) => void;
  onEdit: (project: ProjectRecord) => void;
  onView: (project: ProjectRecord) => void;
  projects: ProjectRecord[];
};

export function ProjectManagementTable({
  canDeleteProject,
  canEditProject,
  locale,
  loading,
  onDelete,
  onEdit,
  onView,
  projects,
}: ProjectManagementTableProps) {
  const t = locale === "es";
  const columns: DataTableColumn<ProjectRecord>[] = [
    {
      cell: (project) => {
        const statusMeta = getProjectStatusMeta(project.status, project.activeRun, locale);
        const visibilityMeta = getProjectVisibilityMeta(project.visibility, locale);

        return (
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                statusMeta.accentClassName,
              )}
            >
              <ProjectStackIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <Link
                className="truncate text-sm font-semibold text-slate-900 transition hover:text-primary"
                href={buildProjectDetailHref(project.routeRef)}
              >
                {project.name}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                  @{project.owner}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 font-medium",
                    visibilityMeta.badgeClassName,
                  )}
                >
                  {visibilityMeta.label}
                </span>
                {project.entity_name ? (
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">
                    {project.entity_name}
                  </span>
                ) : null}
                {project.templateFile ? (
                  <span className="truncate">{t ? "Base" : "Base"}: {project.templateFile}</span>
                ) : (
                  <span className="truncate">{t ? "Sin plantilla registrada" : "No template registered"}</span>
                )}
              </div>
            </div>
          </div>
        );
      },
      header: t ? "Proyecto" : "Project",
      id: "project",
      sortValue: (project) => `${project.owner} ${project.name}`.toLowerCase(),
    },
    {
      cell: (project) => <ProjectInventoryCell locale={locale} project={project} />,
      header: t ? "Inventario" : "Inventory",
      id: "inventory",
      sortValue: (project) => project.files.length,
    },
    {
      cell: (project) => <ProjectStatusBadge locale={locale} project={project} />,
      header: t ? "Estado" : "Status",
      id: "status",
      sortValue: (project) => getProjectStatusMeta(project.status, project.activeRun, locale).label.toLowerCase(),
    },
    {
      cell: (project) => {
        const previewFiles = getProjectPreviewFiles(project);

        return (
          <div className="flex flex-wrap gap-2">
            {previewFiles.length > 0 ? (
              previewFiles.map((file) => (
                <a
                  className="inline-flex max-w-[14rem] items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
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
              ))
            ) : (
              <span className="text-sm text-slate-400">{t ? "Sin archivos todavía" : "No files yet"}</span>
            )}
            {project.files.length > previewFiles.length ? (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                +{project.files.length - previewFiles.length}
              </span>
            ) : null}
          </div>
        );
      },
      header: t ? "Archivos" : "Files",
      id: "files",
      sortValue: (project) => project.files.join(" ").toLowerCase(),
    },
    {
      cell: (project) => {
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
          <div className="flex justify-end">
            <RowActionsMenu actions={actions} ariaLabel={t ? `Abrir acciones para ${project.name}` : `Open actions for ${project.name}`} />
          </div>
        );
      },
      cellClassName: "w-[1%] whitespace-nowrap text-right",
      header: t ? "Acciones" : "Actions",
      headerClassName: "text-right",
      id: "actions",
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={projects}
      emptyState={
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
      }
      getRowKey={(project) => project.id}
      initialSort={{ columnId: "project", direction: "asc" }}
      loading={loading}
      loadingLabel={t ? "Cargando proyectos..." : "Loading projects..."}
    />
  );
}
