"use client";

import { useEffect, useMemo, useState } from "react";

import {
  buildProjectFilePreviewPath,
  buildProjectFileUrl,
  canAttemptEmbeddedPreview,
  formatDate,
  getArtifactLabel,
  getDeliverableTone,
  getExecutionDeliverables,
  getProjectDeliverablesLayout,
  isPreviewableTextFile,
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
  PencilIcon,
  ProjectStackIcon,
  RefreshIcon,
  DownloadIcon,
  EyeIcon,
} from "@/components/projects/project-management-icons";
import {
  buildProjectDetailModel,
  type ProjectExecutionGroup,
} from "@/components/projects/project-detail-utils";
import {
  parseProjectReportHtml,
  type ParsedProjectReport,
} from "@/components/projects/project-report-utils";
import { getProjectStatusMeta } from "@/components/projects/project-management-utils";
import { buttonStyles } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  apiFetch,
  buildStreamUrl,
  fetchSession,
} from "@/lib/api";
import {
  buildProjectDetailHref,
  buildProjectReportHref,
  getProject,
  getProjectByRef,
  listProjectMembers,
  listProjectMembersByRef,
  resolveProjectRouteRef,
} from "@/lib/projects";
import { cn } from "@/lib/utils";
import type {
  FileContentResponse,
  ProjectDetails,
  ProjectFileEntry,
  ProjectMemberRecord,
  SessionResponse,
} from "@/types/api";

type ProjectDetailPageProps =
  | {
      owner: string;
      projectName: string;
      projectRef?: never;
    }
  | {
      owner?: never;
      projectName?: never;
      projectRef: string;
    };

function ProjectDetailLoadingState() {
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

function ProjectDetailErrorState({ message }: { message: string }) {
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

function ProjectDetailHero({
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

function ProjectQuickActions({
  activeDeliverablesCount,
  analysisRunning,
  canRegenerate,
  downloadZipFile,
  executionCount,
  htmlCount,
  onRegenerate,
  project,
  supportFileCount,
}: {
  activeDeliverablesCount: number;
  analysisRunning: boolean;
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
              disabled={analysisRunning}
              onClick={onRegenerate}
              type="button"
            >
              <RefreshIcon className="h-4 w-4" />
              {analysisRunning ? "Actualizando resultados..." : "Volver a ejecutar"}
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

function ProjectSidebar({
  activeExecutionGroup,
  members,
  onSelectExecution,
  project,
  statusBadgeClassName,
  statusLabel,
  executionGroups,
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

function ProjectPrimaryReport({
  activeDeliverables,
  activeExecutionGroup,
  projectReportHref,
  preview,
  previewLoading,
}: {
  activeDeliverables: ProjectFileEntry[];
  activeExecutionGroup: ProjectExecutionGroup | null;
  preview: PreviewState | null;
  previewLoading: boolean;
  projectReportHref: string | null;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <SectionCard
        className="flex h-full flex-col"
        contentClassName="flex flex-1 flex-col"
        actions={
          activeExecutionGroup?.htmlFile && projectReportHref ? (
            <ButtonLink
              href={projectReportHref}
              rel="noreferrer"
              target="_blank"
              variant="secondary"
            >
              <EyeIcon className="h-4 w-4" />
              Abrir informe completo
            </ButtonLink>
          ) : null
        }
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

            <PreviewPanel
              className="flex-1"
              emptyMessage="Selecciona una ejecución con HTML para verla aquí."
              loading={previewLoading}
              preview={preview?.mode === "html" ? preview : null}
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

function ProjectResultsSections({
  activeReport,
  analysisLog,
  featuredDeliverable,
  owner,
  projectRef,
  preview,
  previewLoading,
  project,
  secondaryDeliverables,
  supportFiles,
  templateFile,
  onPreview,
}: {
  activeReport: ParsedProjectReport | null;
  analysisLog: string;
  featuredDeliverable: ProjectFileEntry | null;
  onPreview: (file: ProjectFileEntry) => void;
  owner: string;
  projectRef: string | null;
  preview: PreviewState | null;
  previewLoading: boolean;
  project: ProjectDetails;
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
              projectRef={projectRef ?? `${project.owner}::${project.name}`}
              projectName={project.name}
              variant="featured"
            />

            {secondaryDeliverables.length > 0 ? (
              <div className="grid content-start gap-4 sm:grid-cols-2">
                {secondaryDeliverables.map((file) => (
                  <DeliverableCard
                    file={file}
                    key={file.path}
                    owner={owner}
                    projectRef={projectRef ?? `${project.owner}::${project.name}`}
                    projectName={project.name}
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

      {analysisLog ? (
        <SectionCard
          description="Sigue el progreso de la nueva ejecución en tiempo real."
          title="Estado de la ejecución"
        >
          <pre className="max-h-[18rem] overflow-auto rounded-[24px] bg-slate-950 px-5 py-5 text-sm leading-6 text-slate-200">
            {analysisLog}
          </pre>
        </SectionCard>
      ) : null}

      <SectionCard
        description="Consulta la plantilla y los archivos de apoyo del proyecto sin salir de esta página."
        title="Archivos del proyecto"
      >
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,560px)] xl:justify-between">
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-slate-900">Plantilla principal</p>
              {templateFile ? (
                <div className="mt-3">
                  <SupportFileRow
                    active={preview?.label === templateFile.path}
                    file={templateFile}
                    onPreview={onPreview}
                    owner={owner}
                    projectName={project.name}
                  />
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Todavía no hay una plantilla asociada a este proyecto.</p>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">Archivos de apoyo</p>
              {supportFiles.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {supportFiles.map((file) => (
                    <SupportFileRow
                      active={preview?.label === file.path}
                      file={file}
                      key={file.path}
                      onPreview={onPreview}
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
            loading={previewLoading && preview?.mode !== "html"}
            preview={preview?.mode === "text" || preview?.mode === "embed" ? preview : null}
            size="compact"
          />
        </div>
      </SectionCard>
    </div>
  );
}

export function ProjectDetailPage({
  owner,
  projectName,
  projectRef,
}: ProjectDetailPageProps) {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [members, setMembers] = useState<ProjectMemberRecord[]>([]);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [activeReport, setActiveReport] = useState<ParsedProjectReport | null>(null);
  const [activeExecutionDirectory, setActiveExecutionDirectory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [analysisLog, setAnalysisLog] = useState("");
  const appToast = useAppToast();

  async function loadProjectState(isCancelled: () => boolean = () => false) {
    setLoading(true);
    setError(null);

    try {
      const projectRequest =
        typeof projectRef === "string"
          ? getProjectByRef(projectRef)
          : getProject(owner, projectName);
      const membersRequest =
        typeof projectRef === "string"
          ? listProjectMembersByRef(projectRef)
          : listProjectMembers(owner, projectName);

      const [sessionResponse, projectResponse, membersResponse] = await Promise.all([
        fetchSession(),
        projectRequest,
        membersRequest,
      ]);

      if (isCancelled()) {
        return;
      }

      setSession(sessionResponse);
      setProject(projectResponse);
      setMembers(membersResponse.members);
    } catch (loadError) {
      if (isCancelled()) {
        return;
      }

      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el detalle del proyecto.",
      );
    } finally {
      if (!isCancelled()) {
        setLoading(false);
      }
    }
  }

  const detailModel = useMemo(
    () => (project ? buildProjectDetailModel(project) : null),
    [project],
  );

  const activeExecutionGroup =
    detailModel?.executionGroups.find((group) => group.directory === activeExecutionDirectory) ??
    detailModel?.executionGroups[0] ??
    null;

  async function handlePreview(
    file: ProjectFileEntry,
    currentProjectName = project?.name,
    currentProjectOwner = project?.owner,
  ) {
    if (!currentProjectName || !currentProjectOwner) {
      return;
    }

    if (file.kind === "result") {
      setPreviewLoading(true);

      try {
        const fileContent = await apiFetch<FileContentResponse>(
          buildProjectFilePreviewPath(currentProjectOwner, currentProjectName, file.path),
        );

        setActiveReport(parseProjectReportHtml(fileContent.content));
        setPreview({
          content: fileContent.content,
          label: file.path,
          mode: "html",
        });
      } catch (previewError) {
        appToast.error(
          "No se pudo cargar la vista previa HTML",
          previewError instanceof Error ? previewError.message : undefined,
        );
      } finally {
        setPreviewLoading(false);
      }

      return;
    }

    if (!isPreviewableTextFile(file)) {
      if (canAttemptEmbeddedPreview(file)) {
        setPreview({
          hint:
            "Intentaremos mostrar este archivo aquí mismo. Si tu navegador no puede visualizarlo correctamente, puedes abrirlo en una pestaña aparte.",
          label: file.path,
          mode: "embed",
          src: buildProjectFileUrl(currentProjectOwner, currentProjectName, file.path),
        });
        return;
      }

      appToast.info("Este archivo no tiene vista previa embebida", file.name);
      return;
    }

    setPreviewLoading(true);

    try {
      const fileContent = await apiFetch<FileContentResponse>(
        `${buildProjectFilePreviewPath(currentProjectOwner, currentProjectName, file.path)}?max_lines=120`,
      );

      setPreview({
        content: fileContent.truncated ? `${fileContent.content}\n...` : fileContent.content,
        label: file.path,
        mode: "text",
      });
    } catch (previewError) {
      appToast.error(
        "No se pudo cargar la vista previa",
        previewError instanceof Error ? previewError.message : undefined,
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    void loadProjectState(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, [owner, projectName, projectRef]);

  useEffect(() => {
    if (!detailModel?.executionGroups.length) {
      setActiveExecutionDirectory(null);
      return;
    }

    const stillExists = detailModel.executionGroups.some(
      (group) => group.directory === activeExecutionDirectory,
    );

    if (!stillExists) {
      setActiveExecutionDirectory(detailModel.executionGroups[0]?.directory ?? null);
    }
  }, [activeExecutionDirectory, detailModel]);

  useEffect(() => {
    if (!project || !activeExecutionGroup) {
      return;
    }

    if (activeExecutionGroup.htmlFile) {
      void handlePreview(activeExecutionGroup.htmlFile, project.name);
    }
  }, [activeExecutionGroup, project]);

  useEffect(() => {
    if (activeExecutionGroup) {
      return;
    }

    if (!project || !detailModel) {
      setPreview(null);
      setActiveReport(null);
      return;
    }

    const firstPreviewableSupportFile =
      detailModel.supportFiles.find((file) => isPreviewableTextFile(file)) ?? null;

    if (!firstPreviewableSupportFile) {
      setPreview(null);
      setActiveReport(null);
      return;
    }

    void handlePreview(firstPreviewableSupportFile, project.name);
  }, [activeExecutionGroup, detailModel, project]);

  function handleRegenerate() {
    if (!project) {
      return;
    }

    const source = new EventSource(
      buildStreamUrl(`/api/analysis/run?project_name=${encodeURIComponent(project.name)}`),
      { withCredentials: true },
    );

    setAnalysisRunning(true);
    setAnalysisLog("");

    source.onmessage = (event) => {
      if (event.data === "---FIN---") {
        setAnalysisRunning(false);
        source.close();
        setAnalysisLog((current) =>
          current
            ? `${current}\nAnálisis finalizado. Se refrescará el proyecto.`
            : "Análisis finalizado. Se refrescará el proyecto.",
        );
        void loadProjectState();
        return;
      }

      setAnalysisLog((current) => (current ? `${current}\n${event.data}` : event.data));
    };

    source.onerror = () => {
      setAnalysisRunning(false);
      source.close();
      setAnalysisLog((current) =>
        current
          ? `${current}\nError en el stream del análisis.`
          : "Error en el stream del análisis.",
      );
    };
  }

  if (loading) {
    return <ProjectDetailLoadingState />;
  }

  if (error || !project || !detailModel) {
    return <ProjectDetailErrorState message={error ?? "El proyecto solicitado no existe."} />;
  }

  const statusMeta = getProjectStatusMeta(project.status);
  const resolvedProjectRef = resolveProjectRouteRef(project);
  const projectHref = resolvedProjectRef
    ? buildProjectDetailHref(resolvedProjectRef)
    : `/dashboard/projects/${encodeURIComponent(project.owner)}/${encodeURIComponent(project.name)}`;
  const projectReportHref =
    resolvedProjectRef && activeExecutionGroup?.htmlFile
      ? buildProjectReportHref(resolvedProjectRef, activeExecutionGroup.htmlFile.path)
      : activeExecutionGroup?.htmlFile
        ? `${projectHref}/report?path=${encodeURIComponent(activeExecutionGroup.htmlFile.path)}`
        : null;
  const accessRole =
    session?.user?.role === "admin"
      ? project.access_role === "owner"
        ? "owner"
        : "editor"
      : project.access_role ?? (session?.user?.username === project.owner ? "owner" : "viewer");
  const canEdit =
    session?.user?.role === "admin" || accessRole === "owner" || accessRole === "editor";
  const canRegenerate = session?.user?.username === project.owner;
  const activeDeliverables = activeExecutionGroup ? getExecutionDeliverables(activeExecutionGroup) : [];
  const { featuredDeliverable, secondaryDeliverables } =
    getProjectDeliverablesLayout(activeDeliverables);
  const downloadZipFile =
    activeDeliverables.find((file) => file.extension.toLowerCase() === ".zip") ??
    detailModel.executionGroups
      .flatMap((group) => getExecutionDeliverables(group))
      .find((file) => file.extension.toLowerCase() === ".zip") ??
    null;
  const htmlCount = detailModel.executionGroups.filter((group) => group.htmlFile).length;

  return (
    <div className="flex flex-col gap-6">
      <ProjectDetailHero accessRole={accessRole} canEdit={canEdit} project={project} />

      <ProjectQuickActions
        activeDeliverablesCount={activeDeliverables.length}
        analysisRunning={analysisRunning}
        canRegenerate={canRegenerate}
        downloadZipFile={downloadZipFile}
        executionCount={detailModel.executionGroups.length}
        htmlCount={htmlCount}
        onRegenerate={handleRegenerate}
        project={project}
        supportFileCount={detailModel.supportFiles.length + (detailModel.templateFile ? 1 : 0)}
      />

      <div className="grid items-stretch gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <ProjectSidebar
          activeExecutionGroup={activeExecutionGroup}
          executionGroups={detailModel.executionGroups}
          members={members}
          onSelectExecution={setActiveExecutionDirectory}
          project={project}
          statusBadgeClassName={statusMeta.badgeClassName}
          statusLabel={statusMeta.label}
        />

        <ProjectPrimaryReport
          activeDeliverables={activeDeliverables}
          activeExecutionGroup={activeExecutionGroup}
          preview={preview}
          previewLoading={previewLoading}
          projectReportHref={projectReportHref}
        />
      </div>

      <ProjectResultsSections
        activeReport={activeReport}
        analysisLog={analysisLog}
        featuredDeliverable={featuredDeliverable}
        onPreview={(file) => void handlePreview(file)}
        owner={project.owner}
        projectRef={resolvedProjectRef}
        preview={preview}
        previewLoading={previewLoading}
        project={project}
        secondaryDeliverables={secondaryDeliverables}
        supportFiles={detailModel.supportFiles}
        templateFile={detailModel.templateFile}
      />
    </div>
  );
}
