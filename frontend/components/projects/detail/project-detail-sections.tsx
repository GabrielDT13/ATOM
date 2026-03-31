"use client";

import {
  buildProjectFileUrl,
  formatDate,
  getArtifactLabel,
  getDeliverableTone,
  getExecutionPreviewableFiles,
} from "@/components/projects/detail/project-detail-helpers";
import {
  DetailMetaRow,
  DeliverableCard,
  ExecutionSelectorCard,
  PreviewPanel,
  SectionCard,
  SupportFileRow,
  TeamMemberCard,
} from "@/components/projects/detail/project-detail-panels";
import { ReportCarousel, ReportInsightsPanel } from "@/components/projects/detail/project-detail-report-panels";
import type { PreviewState } from "@/components/projects/detail/project-detail-types";
import {
  DownloadIcon,
  EyeIcon,
  PencilIcon,
  ProjectStackIcon,
  RefreshIcon,
} from "@/components/projects/project-management-icons";
import type { ProjectExecutionGroup } from "@/components/projects/project-detail-utils";
import type { ParsedProjectReport } from "@/components/projects/project-report-utils";
import { buttonStyles } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { cn } from "@/lib/utils";
import type { ProjectDetails, ProjectFileEntry, ProjectMemberRecord } from "@/types/api";

export function ProjectDetailLoadingState() {
  return (
    <div className="grid gap-6">
      <section className="page-hero-surface rounded-[32px] border border-white/10 p-6 sm:p-8">
        <div className="h-8 w-48 animate-pulse rounded-full bg-white/10" />
        <div className="mt-5 h-12 w-full max-w-2xl animate-pulse rounded-2xl bg-white/10" />
        <div className="mt-3 h-6 w-full max-w-3xl animate-pulse rounded-xl bg-white/10" />
      </section>
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="h-[24rem] animate-pulse rounded-[28px] bg-white" />
        <div className="h-[24rem] animate-pulse rounded-[28px] bg-white" />
      </div>
    </div>
  );
}

export function ProjectDetailErrorState({ message }: { message: string }) {
  return (
    <section className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-rose-800 shadow-sm">
      <h1 className="text-lg font-semibold">No se pudo abrir el proyecto</h1>
      <p className="mt-2 text-sm leading-6">{message}</p>
      <div className="mt-5">
        <ButtonLink href="/dashboard/projects" variant="secondary">
          Volver a proyectos
        </ButtonLink>
      </div>
    </section>
  );
}

export function ProjectDetailHero({
  accessRole,
  canEdit,
  project,
}: {
  accessRole: string;
  canEdit: boolean;
  project: ProjectDetails;
}) {
  return (
    <section className="page-hero-surface overflow-hidden rounded-[32px] border border-white/10 p-6 sm:p-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <div className="page-hero-badge gap-2 rounded-full px-3 py-1">
            <ProjectStackIcon />
            Proyecto
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {project.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Consulta el estado del proyecto, abre sus resultados y accede a los archivos
            principales desde un único lugar.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
              @{project.owner}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
              Acceso: {accessRole}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
              {project.file_count} archivos
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/dashboard/projects" size="lg" tone="on-dark" variant="secondary">
            Volver al listado
          </ButtonLink>
          {canEdit ? (
            <ButtonLink
              href={`/dashboard/edit_project/${encodeURIComponent(project.owner)}/${encodeURIComponent(project.name)}`}
              size="lg"
              tone="on-dark"
              variant="ghost"
            >
              <PencilIcon className="h-4 w-4" />
              Editar proyecto
            </ButtonLink>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function ProjectQuickActions({
  activeDeliverablesCount,
  canRegenerate,
  downloadZipFile,
  executionCount,
  htmlCount,
  onRegenerate,
  project,
  supportFileCount,
}: {
  activeDeliverablesCount: number;
  canRegenerate: boolean;
  downloadZipFile: ProjectFileEntry | null;
  executionCount: number;
  htmlCount: number;
  onRegenerate: () => void;
  project: ProjectDetails;
  supportFileCount: number;
}) {
  return (
    <SectionCard
      actions={
        <>
          {canRegenerate ? (
            <button
              className={buttonStyles({ size: "md", variant: "secondary" })}
              onClick={onRegenerate}
              type="button"
            >
              <RefreshIcon className="h-4 w-4" />
              Volver a ejecutar
            </button>
          ) : null}
          {downloadZipFile ? (
            <a
              className={buttonStyles({ size: "md", variant: "primary" })}
              href={buildProjectFileUrl(project.owner, project.name, downloadZipFile.path)}
              rel="noreferrer"
              target="_blank"
            >
              <DownloadIcon className="h-4 w-4" />
              Descargar resultados
            </a>
          ) : null}
        </>
      }
      description="Accede al paquete final del proyecto o vuelve a ejecutar el análisis cuando necesites actualizar los resultados."
      title="Acciones rápidas"
    >
      <div className="flex flex-wrap gap-3">
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          {executionCount} ejecuciones disponibles
        </span>
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          {htmlCount} informes disponibles
        </span>
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          {activeDeliverablesCount} archivos destacados
        </span>
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          {supportFileCount} archivos del proyecto
        </span>
      </div>
    </SectionCard>
  );
}

export function ProjectSidebar({
  activeExecutionGroup,
  executionGroups,
  members,
  onSelectExecution,
  project,
  statusBadgeClassName,
  statusLabel,
}: {
  activeExecutionGroup: ProjectExecutionGroup | null;
  executionGroups: ProjectExecutionGroup[];
  members: ProjectMemberRecord[];
  onSelectExecution: (directory: string) => void;
  project: ProjectDetails;
  statusBadgeClassName: string;
  statusLabel: string;
}) {
  return (
    <aside className="flex h-full flex-col gap-6">
      <SectionCard title="Metadatos">
        <div className="space-y-1">
          <DetailMetaRow
            label="Estado"
            value={
              <span className={cn("inline-flex rounded-full px-3 py-1 text-xs", statusBadgeClassName)}>
                {statusLabel}
              </span>
            }
          />
          <DetailMetaRow label="Creado" value={formatDate(project.created_at)} />
          <DetailMetaRow label="Actualizado" value={formatDate(project.updated_at)} />
          <DetailMetaRow label="Plantilla" value={project.template_file ?? "No disponible"} />
          <DetailMetaRow label="Equipo" value={`${members.length} miembro(s)`} />
        </div>
      </SectionCard>

      <SectionCard
        description="Selecciona una ejecución para actualizar el informe principal, las gráficas y los archivos disponibles."
        title="Ejecuciones destacadas"
      >
        {executionGroups.length > 0 ? (
          <div className="space-y-4">
            {executionGroups.map((group) => (
              <ExecutionSelectorCard
                active={activeExecutionGroup?.directory === group.directory}
                group={group}
                key={group.directory}
                onSelect={() => onSelectExecution(group.directory)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm leading-6 text-slate-500">
            Este proyecto todavía no tiene ejecuciones disponibles.
          </div>
        )}
      </SectionCard>

      <SectionCard
        description="Personas con acceso actual al proyecto. Pulsa sobre un nombre para ver su ficha."
        title="Equipo del proyecto"
      >
        {members.length > 0 ? (
          <div className="space-y-3">
            {members.map((member) => (
              <TeamMemberCard key={member.id || member.username} member={member} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No se encontraron miembros para este proyecto.</p>
        )}
      </SectionCard>
    </aside>
  );
}

export function ProjectPrimaryReport({
  activeDeliverables,
  activeExecutionGroup,
  activePreviewPath,
  onSelectPreviewFile,
  preview,
  previewLoading,
  projectReportHref,
}: {
  activeDeliverables: ProjectFileEntry[];
  activeExecutionGroup: ProjectExecutionGroup | null;
  activePreviewPath: string | null;
  onSelectPreviewFile: (file: ProjectFileEntry) => void;
  preview: PreviewState | null;
  previewLoading: boolean;
  projectReportHref: string | null;
}) {
  const previewFiles = activeExecutionGroup ? getExecutionPreviewableFiles(activeExecutionGroup) : [];

  return (
    <div className="flex min-w-0 flex-col">
      <SectionCard
        actions={
          activeExecutionGroup?.htmlFile && projectReportHref ? (
            <ButtonLink href={projectReportHref} rel="noreferrer" target="_blank" variant="secondary">
              <EyeIcon className="h-4 w-4" />
              Abrir informe completo
            </ButtonLink>
          ) : null
        }
        className="flex h-full flex-col"
        contentClassName="flex flex-1 flex-col"
        description={
          activeExecutionGroup
            ? `Vista principal de ${activeExecutionGroup.label}.`
            : "Cuando haya un informe disponible, aparecerá aquí."
        }
        title="Informe principal"
      >
        {activeExecutionGroup ? (
          <div className="flex h-full flex-1 flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              {activeDeliverables.map((file) => (
                <span
                  className={cn("rounded-full border px-3 py-1 text-xs font-semibold", getDeliverableTone(file))}
                  key={file.path}
                >
                  {getArtifactLabel(file.extension)}
                </span>
              ))}
            </div>

            {previewFiles.length > 1 ? (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Archivo mostrado en la vista principal
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Elige qué documento quieres consultar dentro de esta ejecución.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {previewFiles.map((file) => {
                    const active = activePreviewPath === file.path;

                    return (
                      <button
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                          active
                            ? "border-primary bg-primary text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100",
                        )}
                        key={file.path}
                        onClick={() => onSelectPreviewFile(file)}
                        type="button"
                      >
                        {file.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <PreviewPanel
              className="flex-1"
              emptyMessage='Selecciona una ejecución en "Ejecuciones destacadas" para abrir aquí su informe o documento principal.'
              loading={previewLoading}
              preview={preview}
              stretch
            />
          </div>
        ) : (
          <div className="flex h-full flex-1 flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
            <p className="text-base font-semibold text-slate-900">
              Aún no hay informes disponibles para este proyecto.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Cuando se genere un informe, aparecerá aquí automáticamente.
            </p>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export function ProjectResultsSections({
  activeReport,
  featuredDeliverable,
  filePreview,
  filePreviewLoading,
  onPreviewFile,
  owner,
  project,
  projectRef,
  secondaryDeliverables,
  supportFiles,
  templateFile,
}: {
  activeReport: ParsedProjectReport | null;
  featuredDeliverable: ProjectFileEntry | null;
  filePreview: PreviewState | null;
  filePreviewLoading: boolean;
  onPreviewFile: (file: ProjectFileEntry) => void;
  owner: string;
  project: ProjectDetails;
  projectRef: string | null;
  secondaryDeliverables: ProjectFileEntry[];
  supportFiles: ProjectFileEntry[];
  templateFile: ProjectFileEntry | null;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid items-stretch gap-6 xl:grid-cols-2">
        <SectionCard
          className="flex h-full flex-col"
          contentClassName="flex-1"
          description="Explora las principales figuras del informe seleccionado."
          title="Galería de gráficos"
        >
          <ReportCarousel images={activeReport?.images ?? []} />
        </SectionCard>

        <SectionCard
          className="flex h-full flex-col"
          contentClassName="flex-1"
          description="Revisa el resumen de la ejecución seleccionada y sus apartados más importantes."
          title="Interpretación del análisis"
        >
          <ReportInsightsPanel report={activeReport} />
        </SectionCard>
      </div>

      <SectionCard
        description="Accede directamente a los archivos principales de la ejecución seleccionada."
        title="Archivos listos para consultar"
      >
        {featuredDeliverable ? (
          <div
            className={cn(
              "grid gap-4",
              secondaryDeliverables.length > 0
                ? "xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]"
                : "xl:grid-cols-1",
            )}
          >
            <DeliverableCard
              file={featuredDeliverable}
              owner={owner}
              projectName={project.name}
              projectRef={projectRef ?? `${project.owner}::${project.name}`}
              variant="featured"
            />

            {secondaryDeliverables.length > 0 ? (
              <div className="grid content-start gap-4 sm:grid-cols-2">
                {secondaryDeliverables.map((file) => (
                  <DeliverableCard
                    file={file}
                    key={file.path}
                    owner={owner}
                    projectName={project.name}
                    projectRef={projectRef ?? `${project.owner}::${project.name}`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm leading-6 text-slate-500">
            La ejecución seleccionada todavía no incluye archivos destacados.
          </div>
        )}
      </SectionCard>

      <SectionCard
        description="Consulta la plantilla y los archivos de apoyo del proyecto sin salir de esta página."
        title="Archivos del proyecto"
      >
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <div className="space-y-5">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Plantilla principal</p>
              {templateFile ? (
                <div className="mt-3">
                  <SupportFileRow
                    active={filePreview?.label === templateFile.path}
                    file={templateFile}
                    onPreview={onPreviewFile}
                    owner={owner}
                    projectName={project.name}
                  />
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  Todavía no hay una plantilla asociada a este proyecto.
                </p>
              )}
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Archivos de apoyo</p>
              {supportFiles.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {supportFiles.map((file) => (
                    <SupportFileRow
                      active={filePreview?.label === file.path}
                      file={file}
                      key={file.path}
                      onPreview={onPreviewFile}
                      owner={owner}
                      projectName={project.name}
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  No hay archivos de apoyo fuera de las carpetas de resultados.
                </p>
              )}
            </div>
          </div>

          <PreviewPanel
            emptyMessage="Selecciona un archivo compatible para verlo aquí sin salir de la página."
            loading={filePreviewLoading}
            preview={filePreview}
            size="compact"
          />
        </div>
      </SectionCard>
    </div>
  );
}
