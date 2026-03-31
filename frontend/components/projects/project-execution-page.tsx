"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { formatDuration, formatTimeOfDay } from "@/components/projects/project-execution-utils";
import { SectionCard } from "@/components/projects/detail/project-detail-panels";
import {
  EyeIcon,
  ProjectStackIcon,
  ReportSparkIcon,
} from "@/components/projects/project-management-icons";
import {
  ExecutionLogConsole,
  ExecutionStepList,
  MetricCard,
} from "@/components/projects/project-execution-ui";
import { buildProjectExecutionDisplayModel } from "@/components/projects/project-execution-view-model";
import { ButtonLink } from "@/components/ui/button-link";
import { buttonStyles } from "@/components/ui/button";
import { useAppToast } from "@/hooks/use-app-toast";
import { useProjectAnalysisStream } from "@/hooks/use-project-analysis-stream";
import {
  buildProjectDetailHref,
  getProject,
  getProjectByRef,
  resolveProjectRouteRef,
} from "@/lib/projects";
import { cn } from "@/lib/utils";
import type { ProjectDetails } from "@/types/api";

type ProjectExecutionPageProps =
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

export function ProjectExecutionPage({
  owner,
  projectName,
  projectRef,
}: ProjectExecutionPageProps) {
  const router = useRouter();
  const appToast = useAppToast();
  const completionHandledRef = useRef(false);
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const execution = useProjectAnalysisStream(project?.name ?? null);

  useEffect(() => {
    let cancelled = false;

    async function loadProject() {
      setLoadingProject(true);
      setProjectError(null);

      try {
        const nextProject =
          typeof projectRef === "string"
            ? await getProjectByRef(projectRef)
            : await getProject(owner, projectName);

        if (cancelled) {
          return;
        }

        setProject(nextProject);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setProjectError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo preparar la ejecución del proyecto.",
        );
      } finally {
        if (!cancelled) {
          setLoadingProject(false);
        }
      }
    }

    void loadProject();

    return () => {
      cancelled = true;
    };
  }, [owner, projectName, projectRef]);

  const resolvedProjectRef = project ? resolveProjectRouteRef(project) : null;
  const projectDetailHref =
    resolvedProjectRef
      ? buildProjectDetailHref(resolvedProjectRef)
      : project
        ? `/dashboard/projects/${encodeURIComponent(project.owner)}/${encodeURIComponent(project.name)}`
        : "/dashboard/projects";

  useEffect(() => {
    if (execution.status !== "completed") {
      completionHandledRef.current = false;
      return;
    }

    if (completionHandledRef.current) {
      return;
    }

    completionHandledRef.current = true;
    appToast.success(
      "Informe generado correctamente",
      "Volverás al proyecto en unos segundos.",
      5000,
    );

    const timeoutId = window.setTimeout(() => {
      router.replace(projectDetailHref);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [appToast, execution.status, projectDetailHref, router]);

  if (loadingProject) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Preparando ejecución
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Cargando contexto del proyecto...
        </h1>
      </section>
    );
  }

  if (projectError || !project) {
    return (
      <section className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-rose-800 shadow-sm">
        <h1 className="text-lg font-semibold">No se pudo iniciar la ejecución</h1>
        <p className="mt-2 text-sm leading-6">
          {projectError ?? "El proyecto solicitado no está disponible."}
        </p>
        <div className="mt-5">
          <ButtonLink href="/dashboard/projects" variant="secondary">
            Volver a proyectos
          </ButtonLink>
        </div>
      </section>
    );
  }

  const {
    currentExecutionLabel,
    durationEstimateCaption,
    durationEstimateLabel,
    progressLabel,
    statusBadgeLabel,
    summaryDescription,
    summaryTitle,
    userFacingStatus,
  } = buildProjectExecutionDisplayModel(execution);

  return (
    <div className="flex flex-col gap-6">
      <section className="page-hero-surface overflow-hidden rounded-[32px] border border-white/10 p-6 sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="page-hero-badge gap-2 rounded-full px-3 py-1">
              <ReportSparkIcon />
              Procesando informe
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {summaryTitle}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              {summaryDescription}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                {project.name}
              </span>
              <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                @{project.owner}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <ButtonLink href={projectDetailHref} size="lg" tone="on-dark" variant="secondary">
              <ProjectStackIcon className="h-4 w-4" />
              Volver al proyecto
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 xl:grid-cols-[minmax(20rem,0.9fr)_minmax(0,1.1fr)]">
          <div className="page-hero-surface relative overflow-hidden border-b border-white/10 px-6 py-8 xl:border-b-0 xl:border-r xl:border-white/10">
            <div className="absolute inset-0">
              <div className="absolute left-1/2 top-12 h-48 w-48 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
              <div className="absolute bottom-6 left-10 h-28 w-28 rounded-full bg-emerald-400/15 blur-3xl" />
            </div>
            <div className="relative flex min-h-[20rem] flex-col justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Estado actual
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                  {userFacingStatus}
                </h2>
                <p className="mt-3 max-w-md text-sm leading-7 text-slate-300">
                  {currentExecutionLabel}
                </p>
              </div>

              <div className="mt-8">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-4xl font-semibold tracking-tight text-white">
                      {execution.progressPercent}%
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                      {progressLabel}
                    </p>
                  </div>
                  <div className="rounded-full border border-white/12 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                    {statusBadgeLabel}
                  </div>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-700",
                      execution.status === "failed"
                        ? "bg-rose-500"
                        : execution.status === "completed"
                          ? "bg-emerald-500"
                          : "bg-primary",
                    )}
                    style={{ width: `${execution.progressPercent}%` }}
                  />
                </div>

                <p className="mt-3 text-sm text-slate-400">{durationEstimateCaption}</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                eyebrow="Tiempo transcurrido"
                value={formatDuration(execution.elapsedMs)}
              />
              <MetricCard
                eyebrow={execution.status === "completed" ? "Duración total" : "Duración estimada"}
                value={durationEstimateLabel}
              />
              <MetricCard
                eyebrow="Última actualización"
                value={execution.lastEventAt ? formatTimeOfDay(execution.lastEventAt) : "Pendiente"}
              />
            </div>

            <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Resumen de ejecución
              </p>
              <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                <div>
                  <p className="font-semibold text-slate-900">Ejecuciones completadas</p>
                  <p className="mt-1">{execution.successfulDesigns}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Ejecuciones procesadas</p>
                  <p className="mt-1">{execution.processedDesigns}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Inicio de la ejecución</p>
                  <p className="mt-1">
                    {execution.startedAt ? formatTimeOfDay(execution.startedAt) : "Pendiente"}
                  </p>
                </div>
              </div>
            </div>

            {execution.status === "failed" ? (
              <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-800">
                La ejecución no terminó correctamente. El proyecto no redirigirá automáticamente.
                Puedes volver al detalle para revisar archivos, ajustar datos o lanzar otra ejecución.
              </div>
            ) : null}

            {execution.status === "completed" ? (
              <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-800">
                Los entregables ya están listos. Redirigiendo al detalle del proyecto en 5 segundos...
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <SectionCard
          description="Resumen del avance del informe desde la preparación inicial hasta la publicación final."
          title="Estado del proceso"
        >
          <ExecutionStepList steps={execution.steps} />
        </SectionCard>

        <SectionCard
          actions={
            <a
              className={buttonStyles({ variant: "secondary" })}
              href={projectDetailHref}
            >
              <EyeIcon className="h-4 w-4" />
              Abrir proyecto
            </a>
          }
          description="Detalle técnico de la ejecución por si necesitas revisar mensajes del proceso."
          title="Detalle técnico"
        >
          <ExecutionLogConsole logs={execution.logs} />
        </SectionCard>
      </div>

    </div>
  );
}
