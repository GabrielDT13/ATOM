"use client";

import Link from "next/link";

import { useLocale } from "@/components/providers/locale-provider";
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
  LinkedProjectTeamCard,
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
import { PublicProjectShareButton } from "@/components/projects/public-project-share-button";
import { getProjectVisibilityMeta } from "@/components/projects/project-management-utils";
import type { ProjectExecutionGroup } from "@/components/projects/project-detail-utils";
import type { ParsedProjectReport } from "@/components/projects/project-report-utils";
import { buttonStyles } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { EntityLogo } from "@/components/ui/entity-logo";
import { Skeleton } from "@/components/ui/skeleton";
import { buildPublicProfileHref } from "@/lib/profile";
import { cn } from "@/lib/utils";
import type { ProjectDetails, ProjectFileEntry, ProjectMemberRecord, ProjectSharedTeam } from "@/types/api";

export function ProjectDetailLoadingState() {
  const { locale } = useLocale();
  const t = locale === "es";
  return (
    <div className="grid gap-6">
      <section className="page-hero-surface rounded-[32px] border border-white/10 p-6 sm:p-8">
        <Skeleton className="h-8 w-48 rounded-full bg-white/12" />
        <Skeleton className="mt-5 h-12 w-full max-w-2xl rounded-2xl bg-white/12" />
        <Skeleton className="mt-3 h-6 w-full max-w-3xl rounded-xl bg-white/12" />
      </section>
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Skeleton className="h-[24rem] rounded-[28px] bg-slate-200/80" />
        <Skeleton className="h-[24rem] rounded-[28px] bg-slate-200/80" />
      </div>
    </div>
  );
}

export function ProjectDetailErrorState({ message }: { message: string }) {
  const { locale } = useLocale();
  const t = locale === "es";
  return (
    <section className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-rose-800 shadow-sm">
      <h1 className="text-lg font-semibold">
        {t ? "No se pudo abrir el proyecto" : "Could not open project"}
      </h1>
      <p className="mt-2 text-sm leading-6">{message}</p>
      <div className="mt-5">
        <ButtonLink href="/dashboard/projects" variant="secondary">
          {t ? "Volver a proyectos" : "Back to projects"}
        </ButtonLink>
      </div>
    </section>
  );
}

export function ProjectDetailHero({
  accessRole,
  canEdit,
  project,
  projectRef,
  teamCount,
}: {
  accessRole: string;
  canEdit: boolean;
  project: ProjectDetails;
  projectRef: string | null;
  teamCount: number;
}) {
  const { locale } = useLocale();
  const t = locale === "es";
  const visibilityMeta = getProjectVisibilityMeta(project.visibility, locale);

  return (
    <section className="page-hero-surface overflow-hidden rounded-[32px] border border-white/10 p-6 sm:p-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <div className="page-hero-badge gap-2 rounded-full px-3 py-1">
              <ProjectStackIcon />
              {t ? "Proyecto" : "Project"}
            </div>
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {project.name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            {t
              ? "Consulta el estado del proyecto, abre sus resultados y accede a los archivos principales desde un único lugar."
              : "Review project status, open its results, and access main files from one place."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/14"
              href={buildPublicProfileHref(project.owner)}
            >
              @{project.owner}
            </Link>
            {project.entity_name ? (
              <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                {project.entity_name}
              </span>
            ) : null}
            <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
              {t ? "Acceso" : "Access"}: {accessRole}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
              {t ? "Visibilidad" : "Visibility"}: {visibilityMeta.label}
            </span>
            {teamCount > 0 ? (
              <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                {t
                  ? `${teamCount} equipo${teamCount === 1 ? "" : "s"} vinculado${teamCount === 1 ? "" : "s"}`
                  : `${teamCount} linked team${teamCount === 1 ? "" : "s"}`}
              </span>
            ) : null}
            <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
              {t
                ? `${project.file_count} archivos`
                : `${project.file_count} files`}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-start gap-4 xl:items-end">
          {project.entity_name || project.entity_logo_url ? (
            <EntityLogo
              className="h-20 w-20 bg-white/95 shadow-lg shadow-slate-950/20 sm:h-24 sm:w-24"
              logoUrl={project.entity_logo_url}
              name={project.entity_name ?? project.name}
            />
          ) : null}

          <div className="flex flex-wrap gap-3 xl:justify-end">
          <ButtonLink href="/dashboard/projects" size="lg" tone="on-dark" variant="secondary">
            {t ? "Volver al listado" : "Back to list"}
          </ButtonLink>
          <PublicProjectShareButton
            project={project}
            projectRef={projectRef}
            tone="on-dark"
            variant="ghost"
          />
          {canEdit ? (
            <ButtonLink
              href={`/dashboard/edit_project/${encodeURIComponent(project.owner)}/${encodeURIComponent(project.name)}`}
              size="lg"
              tone="on-dark"
              variant="ghost"
            >
              <PencilIcon className="h-4 w-4" />
              {t ? "Editar proyecto" : "Edit project"}
            </ButtonLink>
          ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProjectQuickActions({
  activeRun,
  activeDeliverablesCount,
  canRegenerate,
  downloadZipFile,
  executionHref,
  executionCount,
  htmlCount,
  project,
  supportFileCount,
}: {
  activeRun: ProjectDetails["active_run"];
  activeDeliverablesCount: number;
  canRegenerate: boolean;
  downloadZipFile: ProjectFileEntry | null;
  executionHref: string | null;
  executionCount: number;
  htmlCount: number;
  project: ProjectDetails;
  supportFileCount: number;
}) {
  const { locale } = useLocale();
  const t = locale === "es";
  return (
    <SectionCard
      actions={
        <>
          {canRegenerate && executionHref ? (
            <ButtonLink href={executionHref} size="md" variant="secondary">
              <RefreshIcon className="h-4 w-4" />
              {activeRun?.status === "queued" || activeRun?.status === "running"
                ? t ? "Ver ejecución activa" : "View active execution"
                : t ? "Volver a ejecutar" : "Run again"}
            </ButtonLink>
          ) : null}
          {downloadZipFile ? (
            <a
              className={buttonStyles({ size: "md", variant: "primary" })}
              href={buildProjectFileUrl(project.owner, project.name, downloadZipFile.path)}
              rel="noreferrer"
              target="_blank"
            >
              <DownloadIcon className="h-4 w-4" />
              {t ? "Descargar resultados" : "Download results"}
            </a>
          ) : null}
        </>
      }
      description={t
        ? "Accede al paquete final del proyecto o vuelve a ejecutar el análisis cuando necesites actualizar los resultados."
        : "Access final project package or run analysis again when you need updated results."}
      title={t ? "Acciones rápidas" : "Quick actions"}
    >
      <div className="flex flex-wrap gap-3">
        {activeRun ? (
          <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
            {activeRun.status === "queued"
              ? t ? "En cola" : "Queued"
              : activeRun.status === "running"
                ? t ? "Procesando" : "Processing"
                : activeRun.status}
          </span>
        ) : null}
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          {t
            ? `${executionCount} ejecuciones disponibles`
            : `${executionCount} executions available`}
        </span>
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          {t ? `${htmlCount} informes disponibles` : `${htmlCount} reports available`}
        </span>
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          {t
            ? `${activeDeliverablesCount} archivos destacados`
            : `${activeDeliverablesCount} featured files`}
        </span>
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          {t ? `${supportFileCount} archivos del proyecto` : `${supportFileCount} project files`}
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
  teams,
}: {
  activeExecutionGroup: ProjectExecutionGroup | null;
  executionGroups: ProjectExecutionGroup[];
  members: ProjectMemberRecord[];
  onSelectExecution: (directory: string) => void;
  project: ProjectDetails;
  statusBadgeClassName: string;
  statusLabel: string;
  teams: ProjectSharedTeam[];
}) {
  const { locale } = useLocale();
  const t = locale === "es";
  const directMembers = members.filter((member) => member.has_direct_access !== false);
  const ownerMembers = directMembers.filter((member) => member.is_owner);
  const nonOwnerDirectMembers = directMembers.filter((member) => !member.is_owner);
  const teamOnlyMembers = members.filter(
    (member) => (member.access_via_teams?.length ?? 0) > 0 && member.has_direct_access === false,
  );

  function renderMemberGroup(
    title: string,
    description: string,
    groupMembers: ProjectMemberRecord[],
  ) {
    if (groupMembers.length === 0) {
      return null;
    }

    return (
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {title}
          </p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <div className="space-y-3">
          {groupMembers.map((member) => (
            <TeamMemberCard key={member.id || member.username} member={member} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <aside className="flex h-full flex-col gap-6">
      <SectionCard title={t ? "Metadatos" : "Metadata"}>
        <div className="space-y-1">
          <DetailMetaRow
            label={t ? "Estado" : "Status"}
            value={
              <span className={cn("inline-flex rounded-full px-3 py-1 text-xs", statusBadgeClassName)}>
                {statusLabel}
              </span>
            }
          />
          <DetailMetaRow label={t ? "Creado" : "Created"} value={formatDate(project.created_at, locale)} />
          <DetailMetaRow label={t ? "Actualizado" : "Updated"} value={formatDate(project.updated_at, locale)} />
          <DetailMetaRow label={t ? "Entidad" : "Entity"} value={project.entity_name ?? (t ? "Sin entidad" : "No entity")} />
          <DetailMetaRow label={t ? "Plantilla" : "Template"} value={project.template_file ?? (t ? "No disponible" : "Not available")} />
          <DetailMetaRow label={t ? "Colaboradores" : "Collaborators"} value={t ? `${members.length} miembro(s)` : `${members.length} member(s)`} />
          <DetailMetaRow label={t ? "Acceso directo" : "Direct access"} value={t ? `${directMembers.length} usuario(s)` : `${directMembers.length} user(s)`} />
          <DetailMetaRow label={t ? "Vía equipos" : "Via teams"} value={t ? `${teamOnlyMembers.length} usuario(s)` : `${teamOnlyMembers.length} user(s)`} />
          <DetailMetaRow label={t ? "Equipos vinculados" : "Linked teams"} value={t ? `${teams.length} equipo(s)` : `${teams.length} team(s)`} />
        </div>
      </SectionCard>

      <SectionCard
        description={t
          ? "Selecciona una ejecución para actualizar el informe principal, las gráficas y los archivos disponibles."
          : "Select an execution to update main report, charts, and available files."}
        title={t ? "Ejecuciones destacadas" : "Featured executions"}
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
            {t
              ? "Este proyecto todavía no tiene ejecuciones disponibles."
              : "This project does not have executions available yet."}
          </div>
        )}
      </SectionCard>

      <SectionCard
        description={t
          ? "Equipos completos que heredan acceso al proyecto y el rol con el que entran."
          : "Full teams inheriting access to project and the role they use."}
        title={t ? "Equipos vinculados" : "Linked teams"}
      >
        {teams.length > 0 ? (
          <div className="space-y-3">
            {teams.map((team) => (
              <LinkedProjectTeamCard key={team.id} team={team} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            {t ? "Este proyecto no tiene equipos vinculados." : "This project has no linked teams."}
          </p>
        )}
      </SectionCard>

      <SectionCard
        description={t
          ? "Personas con acceso actual al proyecto. Pulsa sobre un nombre para ver su ficha."
          : "People with current project access. Click a name to view profile."}
        title={t ? "Equipo del proyecto" : "Project team"}
      >
        {members.length > 0 ? (
          <div className="space-y-5">
            {renderMemberGroup(
              t ? "Propietario" : "Owner",
              t ? "Responsable principal del proyecto." : "Primary project owner.",
              ownerMembers,
            )}
            {renderMemberGroup(
              t ? "Acceso directo" : "Direct access",
              t
                ? "Usuarios añadidos manualmente al proyecto. Pueden además pertenecer a equipos vinculados."
                : "Users added manually to project. They may also belong to linked teams.",
              nonOwnerDirectMembers,
            )}
            {renderMemberGroup(
              t ? "Vía equipos" : "Via teams",
              t
                ? "Usuarios que acceden solo por pertenecer a equipos vinculados al proyecto."
                : "Users who access only because they belong to linked teams.",
              teamOnlyMembers,
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            {t ? "No se encontraron miembros para este proyecto." : "No members found for this project."}
          </p>
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
  const { locale } = useLocale();
  const t = locale === "es";
  const previewFiles = activeExecutionGroup ? getExecutionPreviewableFiles(activeExecutionGroup) : [];

  return (
    <div className="flex min-w-0 flex-col">
      <SectionCard
        actions={
          activeExecutionGroup?.htmlFile && projectReportHref ? (
            <ButtonLink href={projectReportHref} rel="noreferrer" target="_blank" variant="secondary">
              <EyeIcon className="h-4 w-4" />
              {t ? "Abrir informe completo" : "Open full report"}
            </ButtonLink>
          ) : null
        }
        className="flex h-full flex-col"
        contentClassName="flex flex-1 flex-col"
        description={
          activeExecutionGroup
            ? t
              ? `Vista principal de ${activeExecutionGroup.label}.`
              : `Main view for ${activeExecutionGroup.label}.`
            : t
              ? "Cuando haya un informe disponible, aparecerá aquí."
              : "When a report is available, it will appear here."
        }
        title={t ? "Informe principal" : "Main report"}
      >
        {activeExecutionGroup ? (
          <div className="flex h-full flex-1 flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              {activeDeliverables.map((file) => (
                <span
                  className={cn("rounded-full border px-3 py-1 text-xs font-semibold", getDeliverableTone(file))}
                  key={file.path}
                >
                  {getArtifactLabel(file.extension, locale)}
                </span>
              ))}
            </div>

            {previewFiles.length > 1 ? (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {t ? "Archivo mostrado en la vista principal" : "File shown in main view"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {t
                    ? "Elige qué documento quieres consultar dentro de esta ejecución."
                    : "Choose which document you want to review inside this execution."}
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
              emptyMessage={t
                ? 'Selecciona una ejecución en "Ejecuciones destacadas" para abrir aquí su informe o documento principal.'
                : 'Select an execution in "Featured executions" to open its main report or document here.'}
              loading={previewLoading}
              preview={preview}
              stretch
            />
          </div>
        ) : (
          <div className="flex h-full flex-1 flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
            <p className="text-base font-semibold text-slate-900">
              {t ? "Aún no hay informes disponibles para este proyecto." : "No reports available for this project yet."}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {t
                ? "Cuando se genere un informe, aparecerá aquí automáticamente."
                : "When a report is generated, it will appear here automatically."}
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
  const { locale } = useLocale();
  const t = locale === "es";
  return (
    <div className="flex flex-col gap-6">
      <div className="grid items-stretch gap-6 xl:grid-cols-2">
        <SectionCard
          className="flex h-full flex-col"
          contentClassName="flex-1"
          description={t
            ? "Explora las principales figuras del informe seleccionado."
            : "Explore main figures from selected report."}
          title={t ? "Galería de gráficos" : "Chart gallery"}
        >
          <ReportCarousel images={activeReport?.images ?? []} />
        </SectionCard>

        <SectionCard
          className="flex h-full flex-col"
          contentClassName="flex-1"
          description={t
            ? "Revisa el resumen de la ejecución seleccionada y sus apartados más importantes."
            : "Review summary of selected execution and its most important sections."}
          title={t ? "Interpretación del análisis" : "Analysis interpretation"}
        >
          <ReportInsightsPanel report={activeReport} />
        </SectionCard>
      </div>

      <SectionCard
        description={t
          ? "Accede directamente a los archivos principales de la ejecución seleccionada."
          : "Access main files from selected execution directly."}
        title={t ? "Archivos listos para consultar" : "Files ready to review"}
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
            {t
              ? "La ejecución seleccionada todavía no incluye archivos destacados."
              : "Selected execution does not include featured files yet."}
          </div>
        )}
      </SectionCard>

      <SectionCard
        description={t
          ? "Consulta la plantilla y los archivos de apoyo del proyecto sin salir de esta página."
          : "Review project template and support files without leaving this page."}
        title={t ? "Archivos del proyecto" : "Project files"}
      >
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <div className="space-y-5">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                {t ? "Plantilla principal" : "Main template"}
              </p>
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
                  {t
                    ? "Todavía no hay una plantilla asociada a este proyecto."
                    : "There is no template linked to this project yet."}
                </p>
              )}
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                {t ? "Archivos de apoyo" : "Support files"}
              </p>
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
                  {t
                    ? "No hay archivos de apoyo fuera de las carpetas de resultados."
                    : "There are no support files outside result folders."}
                </p>
              )}
            </div>
          </div>

          <PreviewPanel
            emptyMessage={t
              ? "Selecciona un archivo compatible para verlo aquí sin salir de la página."
              : "Select a compatible file to preview it here without leaving page."}
            loading={filePreviewLoading}
            preview={filePreview}
            size="compact"
          />
        </div>
      </SectionCard>
    </div>
  );
}
