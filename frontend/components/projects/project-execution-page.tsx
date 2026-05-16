"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useLocale } from "@/components/providers/locale-provider";
import {
  buildProjectFileUrl,
  getExecutionDeliverables,
} from "@/components/projects/detail/project-detail-helpers";
import { buildProjectDetailModel } from "@/components/projects/project-detail-utils";
import { RNA_SEQ_VARIANT_OPTIONS } from "@/components/projects/project-study-options";
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
import { createAnalysisRun } from "@/lib/analysis";
import {
  buildProjectDetailHref,
  buildProjectExecutionHref,
  buildProjectReportHref,
  getProject,
  getProjectByRef,
  resolveProjectRouteRef,
} from "@/lib/projects";
import { cn } from "@/lib/utils";
import type { ProjectAnalysisVariant, ProjectDetails } from "@/types/api";
import { buildProjectExecutionTarget } from "@/components/projects/project-execution-target";

type ProjectExecutionPageProps =
  | {
      autoStart?: boolean;
      initialAnalysisVariant?: string;
      initialAnalysisVariants?: string[];
      owner: string;
      projectName: string;
      projectRef?: never;
    }
  | {
      autoStart?: boolean;
      initialAnalysisVariant?: string;
      initialAnalysisVariants?: string[];
      owner?: never;
      projectName?: never;
      projectRef: string;
    };

type BatchExecutionStepStatus = "completed" | "failed" | "pending" | "queued" | "running";

type BatchExecutionStep = {
  runId: string | null;
  status: BatchExecutionStepStatus;
  variant: ProjectAnalysisVariant;
};

type FinalVariantSummary = {
  deliverablesCount: number;
  docxCount: number;
  excelCount: number;
  groups: ReturnType<typeof buildProjectDetailModel>["executionGroups"];
  htmlFile: ProjectDetails["file_entries"][number] | null;
  step: BatchExecutionStep;
  zipFile: ProjectDetails["file_entries"][number] | null;
};

function getVariantScriptKey(variant: ProjectAnalysisVariant) {
  switch (variant) {
    case "enhanced":
      return "rna-seq-pro";
    case "python":
      return "rna-seq-python";
    case "basic":
    default:
      return "rna-seq";
  }
}

function getBatchStepStatusLabel(status: BatchExecutionStepStatus, locale: "en" | "es") {
  const t = locale === "es";
  switch (status) {
    case "completed":
      return t ? "Completado" : "Completed";
    case "failed":
      return t ? "Fallido" : "Failed";
    case "running":
    case "queued":
      return t ? "En curso" : "In progress";
    case "pending":
    default:
      return t ? "Pendiente" : "Pending";
  }
}

function buildVariantComparisonNarrative(
  summaries: FinalVariantSummary[],
  locale: "en" | "es",
) {
  if (summaries.length === 0) {
    return null;
  }

  const t = locale === "es";
  const successfulSummaries = summaries.filter((summary) => summary.step.status === "completed");
  if (successfulSummaries.length === 0) {
    return t
      ? "Ninguna variante terminó correctamente. Conviene revisar logs y artefactos antes de comparar resultados."
      : "No variant finished successfully. Review logs and artifacts before comparing results.";
  }

  const byDeliverables = [...successfulSummaries].sort((left, right) => right.deliverablesCount - left.deliverablesCount);
  const byReports = [...successfulSummaries].sort(
    (left, right) =>
      right.groups.filter((group) => group.htmlFile).length - left.groups.filter((group) => group.htmlFile).length,
  );
  const byDocuments = [...successfulSummaries].sort((left, right) => (right.docxCount + right.excelCount) - (left.docxCount + left.excelCount));
  const richest = byDeliverables[0];
  const strongestReporting = byReports[0];
  const strongestTables = byDocuments[0];
  const failedCount = summaries.length - successfulSummaries.length;
  const failedSuffix = failedCount > 0
    ? t
      ? ` ${failedCount} variante(s) quedaron con incidencias.`
      : ` ${failedCount} variant(s) finished with issues.`
    : "";

  const richestLabel = RNA_SEQ_VARIANT_OPTIONS.find((item) => item.id === richest.step.variant)?.label[locale] ?? richest.step.variant;
  const reportingLabel = RNA_SEQ_VARIANT_OPTIONS.find((item) => item.id === strongestReporting.step.variant)?.label[locale] ?? strongestReporting.step.variant;
  const tablesLabel = RNA_SEQ_VARIANT_OPTIONS.find((item) => item.id === strongestTables.step.variant)?.label[locale] ?? strongestTables.step.variant;

  if (summaries.length === 1) {
    return t
      ? `${richestLabel} generó ${richest.deliverablesCount} entregables, con ${richest.docxCount} DOCX y ${richest.excelCount} Excel listos.`
      : `${richestLabel} generated ${richest.deliverablesCount} deliverables, with ${richest.docxCount} DOCX and ${richest.excelCount} Excel outputs ready.`;
  }

  return t
    ? `${richestLabel} dejó mayor volumen de entregables (${richest.deliverablesCount}). ${reportingLabel} destacó en informes HTML. ${tablesLabel} concentró más tablas y documentos exportables.${failedSuffix}`
    : `${richestLabel} produced highest deliverable volume (${richest.deliverablesCount}). ${reportingLabel} stood out in HTML reports. ${tablesLabel} concentrated most exportable tables and documents.${failedSuffix}`;
}

export function ProjectExecutionPage({
  autoStart = false,
  initialAnalysisVariant,
  initialAnalysisVariants = [],
  owner,
  projectName,
  projectRef,
}: ProjectExecutionPageProps) {
  const { locale } = useLocale();
  const t = locale === "es";
  const router = useRouter();
  const appToast = useAppToast();
  const batchIdRef = useRef<string | null>(null);
  const handledRunCompletionRef = useRef<string | null>(null);
  const redirectHandledRef = useRef(false);
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [selectedAnalysisVariant, setSelectedAnalysisVariant] = useState<ProjectAnalysisVariant | null>(
    (initialAnalysisVariant as ProjectAnalysisVariant | undefined) ?? null,
  );
  const [batchSteps, setBatchSteps] = useState<BatchExecutionStep[]>([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [batchStarted, setBatchStarted] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [boundRunId, setBoundRunId] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const initialVariantsKey = initialAnalysisVariants.join("|");
  const normalizedInitialVariants = useMemo(
    () =>
      initialVariantsKey
        .split("|")
        .map((variant) => variant.trim())
        .filter(Boolean),
    [initialVariantsKey],
  );
  const resolvedProjectRef = project ? resolveProjectRouteRef(project) : null;
  const queuedVariants = batchSteps.map((step) => step.variant);
  const executionPageHref =
    resolvedProjectRef
      ? buildProjectExecutionHref(resolvedProjectRef, {
          variant: queuedVariants.length === 1 ? queuedVariants[0] : null,
          variants: queuedVariants.length > 1 ? queuedVariants : null,
        })
      : project
        ? (() => {
            const searchParams = new URLSearchParams();
            if (queuedVariants.length > 1) {
              searchParams.set("variants", queuedVariants.join(","));
            } else if (queuedVariants.length === 1) {
              searchParams.set("variant", queuedVariants[0]);
            }
            const basePath = `/dashboard/project-execution/${encodeURIComponent(project.owner)}/${encodeURIComponent(project.name)}`;
            const queryString = searchParams.toString();
            return queryString ? `${basePath}?${queryString}` : basePath;
          })()
        : null;
  const analysisTarget = useMemo(
    () =>
      buildProjectExecutionTarget({
        analysisVariant: selectedAnalysisVariant,
        autoStart: false,
        boundRunId,
        project,
        resolvedProjectRef,
      }),
    [boundRunId, project, resolvedProjectRef, selectedAnalysisVariant],
  );
  const execution = useProjectAnalysisStream(analysisTarget, locale);

  useEffect(() => {
    batchIdRef.current = null;
    handledRunCompletionRef.current = null;
    redirectHandledRef.current = false;
    setBatchError(null);
    setBatchStarted(false);
    setBatchSteps([]);
    setCurrentBatchIndex(0);
    setBoundRunId(null);
  }, [initialAnalysisVariant, initialVariantsKey, owner, projectName, projectRef]);

  useEffect(() => {
    if (!project) {
      return;
    }

    const allowedVariants = (
      project.enabled_analysis_variants?.length
        ? project.enabled_analysis_variants
        : ["basic", "enhanced"]
    ) as ProjectAnalysisVariant[];
    const requestedVariants = (normalizedInitialVariants.length > 0
      ? normalizedInitialVariants
      : initialAnalysisVariant
        ? [initialAnalysisVariant]
        : []
    )
      .map((variant) => variant.trim() as ProjectAnalysisVariant)
      .filter((variant, index, items) => allowedVariants.includes(variant) && items.indexOf(variant) === index);
    const effectiveVariants = requestedVariants.length > 0
      ? requestedVariants
      : [(project.primary_analysis_variant ?? allowedVariants[0]) as ProjectAnalysisVariant];

    setBatchSteps((current) => {
      if (current.length > 0) {
        return current;
      }
      return effectiveVariants.map((variant) => ({
        runId: null,
        status: "pending",
        variant,
      }));
    });

    if (!selectedAnalysisVariant || !allowedVariants.includes(selectedAnalysisVariant)) {
      setSelectedAnalysisVariant(effectiveVariants[0] ?? allowedVariants[0]);
    }
  }, [initialAnalysisVariant, normalizedInitialVariants, project, selectedAnalysisVariant]);

  useEffect(() => {
    const nextRunId = execution.run?.id?.trim() || (!batchStarted ? project?.active_run?.id?.trim() : "") || null;
    if (!nextRunId) {
      return;
    }

    setBoundRunId((current) => (current === nextRunId ? current : nextRunId));
  }, [batchStarted, execution.run?.id, project?.active_run?.id]);

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
        setSelectedAnalysisVariant((current) => current ?? nextProject.primary_analysis_variant ?? "basic");
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setProjectError(
          loadError instanceof Error
            ? loadError.message
            : t ? "No se pudo preparar la ejecución del proyecto." : "Could not prepare the project execution.",
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
  }, [owner, projectName, projectRef, t]);

  useEffect(() => {
    if (!autoStart || !executionPageHref) {
      return;
    }

    if (!batchStarted && !boundRunId) {
      return;
    }

    router.replace(executionPageHref, { scroll: false });
  }, [autoStart, batchStarted, boundRunId, executionPageHref, router]);

  const projectDetailHref =
    resolvedProjectRef
      ? buildProjectDetailHref(resolvedProjectRef)
      : project
        ? `/dashboard/projects/${encodeURIComponent(project.owner)}/${encodeURIComponent(project.name)}`
        : "/dashboard/projects";
  const batchFinished = batchSteps.length > 0 && batchSteps.every((step) => step.status === "completed" || step.status === "failed");
  const finalProjectModel = useMemo(() => (project ? buildProjectDetailModel(project) : null), [project]);
  const finalVariantSummaries = useMemo<FinalVariantSummary[]>(
    () =>
      finalProjectModel
        ? batchSteps.map((step) => {
            const scriptKey = getVariantScriptKey(step.variant);
            const groups = finalProjectModel.executionGroups.filter((group) => group.directory.endsWith(`__${scriptKey}`));
            const deliverables = groups.flatMap((group) => getExecutionDeliverables(group));
            const htmlFile = groups.flatMap((group) => (group.htmlFile ? [group.htmlFile] : [])).at(-1) ?? null;
            const zipFile = deliverables.findLast((file) => file.extension.toLowerCase() === ".zip") ?? null;
            const docxCount = deliverables.filter((file) => file.extension.toLowerCase() === ".docx").length;
            const excelCount = deliverables.filter((file) => [".xls", ".xlsx"].includes(file.extension.toLowerCase())).length;
            return {
              deliverablesCount: deliverables.length,
              docxCount,
              excelCount,
              groups,
              htmlFile,
              step,
              zipFile,
            };
          })
        : [],
    [batchSteps, finalProjectModel],
  );
  const variantComparisonNarrative = useMemo(
    () => buildVariantComparisonNarrative(finalVariantSummaries, locale),
    [finalVariantSummaries, locale],
  );

  async function startBatchRun(stepIndex: number) {
    const targetStep = batchSteps[stepIndex];
    if (!targetStep) {
      return;
    }

    setBatchError(null);
    setBatchStarted(true);
    setCurrentBatchIndex(stepIndex);
    setSelectedAnalysisVariant(targetStep.variant);
    setBatchSteps((current) =>
      current.map((step, index) =>
        index === stepIndex
          ? {
              ...step,
              status: step.status === "completed" ? step.status : "queued",
            }
          : step,
      ),
    );

    const totalSteps = batchSteps.length || 1;
    if (!batchIdRef.current) {
      batchIdRef.current = globalThis.crypto?.randomUUID?.() ?? `batch-${Date.now()}`;
    }

    try {
      const payload =
        typeof projectRef === "string"
          ? {
              analysis_variant: targetStep.variant,
              batch_id: totalSteps > 1 ? batchIdRef.current : undefined,
              batch_index: totalSteps > 1 ? stepIndex + 1 : undefined,
              batch_total: totalSteps > 1 ? totalSteps : undefined,
              notify_on_completion: stepIndex === totalSteps - 1,
              project_ref: projectRef,
            }
          : {
              analysis_variant: targetStep.variant,
              batch_id: totalSteps > 1 ? batchIdRef.current : undefined,
              batch_index: totalSteps > 1 ? stepIndex + 1 : undefined,
              batch_total: totalSteps > 1 ? totalSteps : undefined,
              notify_on_completion: stepIndex === totalSteps - 1,
              owner,
              project_name: projectName,
            };

      const response = await createAnalysisRun(payload);
      setBoundRunId(response.run.id);
      setBatchSteps((current) =>
        current.map((step, index) =>
          index === stepIndex
            ? {
                ...step,
                runId: response.run.id,
                status: response.run.status as BatchExecutionStepStatus,
              }
            : step,
        ),
      );
    } catch (runError) {
      setBatchError(
        runError instanceof Error
          ? runError.message
          : t
            ? "No se pudo iniciar la ejecución."
            : "Could not start execution.",
      );
    }
  }

  useEffect(() => {
    if (!autoStart || !project || batchSteps.length === 0 || batchStarted || boundRunId) {
      return;
    }

    if (project.active_run?.status === "queued" || project.active_run?.status === "running") {
      return;
    }

    void startBatchRun(0);
  }, [autoStart, batchStarted, batchSteps, boundRunId, project]);

  useEffect(() => {
    const completedRunId = execution.run?.id?.trim();
    if (!completedRunId || (execution.status !== "completed" && execution.status !== "failed")) {
      return;
    }

    if (handledRunCompletionRef.current === completedRunId) {
      return;
    }

    handledRunCompletionRef.current = completedRunId;
    const nextSteps = batchSteps.map((step, index) =>
      index === currentBatchIndex
        ? {
            ...step,
            runId: completedRunId,
            status: execution.status as BatchExecutionStepStatus,
          }
        : step,
    );
    setBatchSteps(nextSteps);

    const nextStepIndex = currentBatchIndex + 1;
    if (batchStarted && nextStepIndex < nextSteps.length) {
      setBoundRunId(null);
      void startBatchRun(nextStepIndex);
      return;
    }

    if (redirectHandledRef.current) {
      return;
    }

    redirectHandledRef.current = true;
    const failedVariants = nextSteps.filter((step) => step.status === "failed");
    setRedirectCountdown(8);
    if (failedVariants.length > 0) {
      appToast.error(
        t ? "Secuencia terminada con incidencias" : "Sequence finished with issues",
        t ? "Revisa resumen final antes de volver al proyecto." : "Review final summary before returning to the project.",
      );
    } else {
      appToast.success(
        nextSteps.length > 1
          ? t ? "Informes generados correctamente" : "Reports generated successfully"
          : t ? "Informe generado correctamente" : "Report generated successfully",
        t ? "Resumen final disponible antes de volver al proyecto." : "Final summary available before returning to the project.",
        5000,
      );
    }

    void (async () => {
      try {
        const nextProject =
          typeof projectRef === "string"
            ? await getProjectByRef(projectRef)
            : await getProject(owner, projectName);
        setProject(nextProject);
      } catch {
        // Mantener último snapshot disponible.
      }
    })();

    const intervalId = window.setInterval(() => {
      setRedirectCountdown((current) => {
        if (current === null) {
          return null;
        }
        return current <= 1 ? 0 : current - 1;
      });
    }, 1000);

    const timeoutId = window.setTimeout(() => {
      window.clearInterval(intervalId);
      router.refresh();
      router.replace(projectDetailHref);
    }, 8000);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [appToast, batchStarted, batchSteps, currentBatchIndex, execution.run?.id, execution.status, owner, projectDetailHref, projectName, projectRef, router, t]);

  if (loadingProject) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          {t ? "Preparando ejecución" : "Preparing execution"}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          {t ? "Cargando contexto del proyecto..." : "Loading project context..."}
        </h1>
      </section>
    );
  }

  if (projectError || !project) {
    return (
      <section className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-rose-800 shadow-sm">
        <h1 className="text-lg font-semibold">
          {t ? "No se pudo iniciar la ejecución" : "Could not start execution"}
        </h1>
        <p className="mt-2 text-sm leading-6">
          {projectError ?? (t ? "El proyecto solicitado no está disponible." : "The requested project is not available.")}
        </p>
        <div className="mt-5">
          <ButtonLink href="/dashboard/projects" variant="secondary">
            {t ? "Volver a proyectos" : "Back to projects"}
          </ButtonLink>
        </div>
      </section>
    );
  }

  if (batchError || execution.error) {
    return (
      <section className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-rose-800 shadow-sm">
        <h1 className="text-lg font-semibold">
          {t ? "No se pudo iniciar la ejecución" : "Could not start execution"}
        </h1>
        <p className="mt-2 text-sm leading-6">{batchError ?? execution.error}</p>
        <div className="mt-5">
          <ButtonLink href={projectDetailHref} variant="secondary">
            {t ? "Volver al proyecto" : "Back to project"}
          </ButtonLink>
        </div>
      </section>
    );
  }

  if (!execution.run && !autoStart) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-950">
          {t ? "No hay una ejecución activa" : "There is no active execution"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {t
            ? "Este proyecto no tiene ahora mismo una ejecución en curso. Puedes volver al proyecto o lanzar una nueva ejecución manualmente."
            : "This project does not currently have an execution in progress. You can go back to the project or start a new execution manually."}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href={projectDetailHref} variant="secondary">
            {t ? "Volver al proyecto" : "Back to project"}
          </ButtonLink>
          {resolvedProjectRef ? (
            <ButtonLink
              href={buildProjectExecutionHref(resolvedProjectRef, {
                autoStart: true,
                variant: queuedVariants.length === 1 ? queuedVariants[0] : selectedAnalysisVariant,
                variants: queuedVariants.length > 1 ? queuedVariants : null,
              })}
            >
              {queuedVariants.length > 1
                ? t ? "Iniciar secuencia completa" : "Start full sequence"
                : t ? "Iniciar variante principal" : "Start primary variant"}
            </ButtonLink>
          ) : null}
        </div>
        {resolvedProjectRef && project.study_type === "rna-seq" && (project.enabled_analysis_variants?.length ?? 0) > 0 ? (
          <div className="mt-5 flex flex-wrap gap-3">
            {(project.enabled_analysis_variants ?? []).map((variant) => {
              const option = RNA_SEQ_VARIANT_OPTIONS.find((item) => item.id === variant);
              return (
                <ButtonLink
                  href={buildProjectExecutionHref(resolvedProjectRef, { autoStart: true, variant })}
                  key={variant}
                  variant="secondary"
                >
                  {t ? "Ejecutar" : "Run"} {option?.label[locale] ?? variant}
                </ButtonLink>
              );
            })}
          </div>
        ) : null}
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
  } = buildProjectExecutionDisplayModel(execution, locale);

  return (
    <div className="flex flex-col gap-6">
      <section className="page-hero-surface overflow-hidden rounded-[32px] border border-white/10 p-6 sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="page-hero-badge gap-2 rounded-full px-3 py-1">
              <ReportSparkIcon />
              {t ? "Procesando informe" : "Processing report"}
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
              {selectedAnalysisVariant ? (
                <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                  {t ? "Variante" : "Variant"}: {RNA_SEQ_VARIANT_OPTIONS.find((option) => option.id === selectedAnalysisVariant)?.label[locale] ?? selectedAnalysisVariant}
                </span>
              ) : null}
              {batchSteps.length > 1 ? (
                <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                  {t ? "Secuencia" : "Sequence"}: {Math.min(currentBatchIndex + 1, batchSteps.length)}/{batchSteps.length}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <ButtonLink href={projectDetailHref} size="lg" tone="on-dark" variant="secondary">
              <ProjectStackIcon className="h-4 w-4" />
              {t ? "Volver al proyecto" : "Back to project"}
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        {project.study_type === "rna-seq" && (project.enabled_analysis_variants?.length ?? 0) > 0 ? (
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {t ? "Variante de ejecución" : "Execution variant"}
              </p>
              <p className="text-sm leading-6 text-slate-500">
                {t
                  ? "Cada variante se guarda en su propia carpeta para comparar resultados dentro del mismo proyecto."
                  : "Each variant is stored in its own folder so you can compare results inside the same project."}
              </p>
            </div>
            {batchSteps.length > 1 ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {batchSteps.map((step, index) => {
                  const option = RNA_SEQ_VARIANT_OPTIONS.find((item) => item.id === step.variant);
                  const active = index === currentBatchIndex;
                  return (
                    <div
                      className={`rounded-2xl border px-4 py-3 text-sm ${
                        step.status === "completed"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : step.status === "failed"
                            ? "border-rose-200 bg-rose-50 text-rose-800"
                            : active
                              ? "border-primary/30 bg-sky-50 text-slate-900"
                              : "border-slate-200 bg-white text-slate-600"
                      }`}
                      key={step.variant}
                    >
                      <p className="font-semibold">{option?.label[locale] ?? step.variant}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em]">
                        {getBatchStepStatusLabel(step.status, locale)}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              {(project.enabled_analysis_variants ?? []).map((variant) => {
                const option = RNA_SEQ_VARIANT_OPTIONS.find((item) => item.id === variant);
                const selected = selectedAnalysisVariant === variant;
                const runLocked = batchStarted || execution.run?.status === "queued" || execution.run?.status === "running";
                return (
                  <button
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      selected
                        ? "border-primary bg-primary text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                    disabled={runLocked}
                    key={variant}
                    onClick={() => setSelectedAnalysisVariant(variant)}
                    type="button"
                  >
                    {option?.label[locale] ?? variant}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <div className="grid gap-0 xl:grid-cols-[minmax(20rem,0.9fr)_minmax(0,1.1fr)]">
          <div className="page-hero-surface relative overflow-hidden border-b border-white/10 px-6 py-8 xl:border-b-0 xl:border-r xl:border-white/10">
            <div className="absolute inset-0">
              <div className="absolute left-1/2 top-12 h-48 w-48 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
              <div className="absolute bottom-6 left-10 h-28 w-28 rounded-full bg-emerald-400/15 blur-3xl" />
            </div>
            <div className="relative flex min-h-[20rem] flex-col justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {t ? "Estado actual" : "Current status"}
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
                eyebrow={t ? "Tiempo transcurrido" : "Elapsed time"}
                value={formatDuration(execution.elapsedMs)}
              />
              <MetricCard
                eyebrow={
                  execution.status === "completed"
                    ? t ? "Duración total" : "Total duration"
                    : t ? "Duración estimada" : "Estimated duration"
                }
                value={durationEstimateLabel}
              />
              <MetricCard
                eyebrow={t ? "Última actualización" : "Last update"}
                value={execution.lastEventAt ? formatTimeOfDay(execution.lastEventAt, locale) : t ? "Pendiente" : "Pending"}
              />
            </div>

            <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {t ? "Resumen de ejecución" : "Execution summary"}
              </p>
              <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {t ? "Ejecuciones completadas" : "Completed runs"}
                  </p>
                  <p className="mt-1">{execution.successfulDesigns}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    {t ? "Ejecuciones procesadas" : "Processed runs"}
                  </p>
                  <p className="mt-1">{execution.processedDesigns}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">
                    {t ? "Inicio de la ejecución" : "Execution start"}
                  </p>
                  <p className="mt-1">
                    {execution.startedAt ? formatTimeOfDay(execution.startedAt, locale) : t ? "Pendiente" : "Pending"}
                  </p>
                </div>
              </div>
            </div>

            {execution.status === "failed" ? (
              <div className="mt-6 rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-800">
                {t
                  ? "La ejecución no terminó correctamente. El proyecto no redirigirá automáticamente. Puedes volver al detalle para revisar archivos, ajustar datos o lanzar otra ejecución."
                  : "Execution did not finish correctly. The project will not redirect automatically. You can return to the detail view to review files, adjust data, or launch another execution."}
              </div>
            ) : null}

            {execution.status === "completed" && batchFinished ? (
              <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-800">
                {t
                  ? `Entregables listos. Redirigiendo al detalle del proyecto en ${redirectCountdown ?? 8} segundos...`
                  : `Deliverables ready. Redirecting to project detail in ${redirectCountdown ?? 8} seconds...`}
              </div>
            ) : null}

            {execution.status === "completed" && !batchFinished && batchSteps.length > 1 ? (
              <div className="mt-6 rounded-[24px] border border-sky-200 bg-sky-50 p-5 text-sm leading-6 text-sky-800">
                {t
                  ? "Variante completada. Lanzando siguiente ejecución de la secuencia..."
                  : "Variant completed. Starting next execution in sequence..."}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {batchFinished && finalVariantSummaries.length > 0 ? (
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {t ? "Comparativa final" : "Final comparison"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {t ? "Resumen por variante" : "Variant summary"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {t
                ? "Vista rápida de resultados generados por cada variante antes de volver al proyecto."
                : "Quick view of results generated by each variant before returning to the project."}
            </p>
            {variantComparisonNarrative ? (
              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-700">
                {variantComparisonNarrative}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3 sm:p-8">
            {finalVariantSummaries.map((summary) => {
              const option = RNA_SEQ_VARIANT_OPTIONS.find((item) => item.id === summary.step.variant);
              const htmlHref =
                resolvedProjectRef && summary.htmlFile
                  ? buildProjectReportHref(resolvedProjectRef, summary.htmlFile.path)
                  : null;
              const zipHref = summary.zipFile
                ? buildProjectFileUrl(project.owner, project.name, summary.zipFile.path, project.updated_at ?? null)
                : null;

              return (
                <div
                  className={`rounded-[24px] border p-5 ${
                    summary.step.status === "failed"
                      ? "border-rose-200 bg-rose-50"
                      : "border-emerald-200 bg-emerald-50"
                  }`}
                  key={summary.step.variant}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {option?.label[locale] ?? summary.step.variant}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                        {summary.step.status === "failed"
                          ? t ? "Finalizada con incidencias" : "Finished with issues"
                          : t ? "Finalizada correctamente" : "Finished successfully"}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      summary.step.status === "failed"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}>
                      {summary.groups.length} {t ? "run(s)" : "run(s)"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                    <div>
                      <p className="font-semibold text-slate-900">{t ? "Informes" : "Reports"}</p>
                      <p className="mt-1">{summary.groups.filter((group) => group.htmlFile).length}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Excel</p>
                      <p className="mt-1">{summary.excelCount}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">DOCX</p>
                      <p className="mt-1">{summary.docxCount}</p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {t
                      ? `${summary.deliverablesCount} entregables detectados para esta variante.`
                      : `${summary.deliverablesCount} deliverables detected for this variant.`}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {htmlHref ? (
                      <ButtonLink href={htmlHref} variant="secondary">
                        <EyeIcon className="h-4 w-4" />
                        {t ? "Abrir informe" : "Open report"}
                      </ButtonLink>
                    ) : null}
                    {zipHref ? (
                      <a
                        className={buttonStyles({ variant: "secondary" })}
                        href={zipHref}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {t ? "Descargar ZIP" : "Download ZIP"}
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <SectionCard
          description={
            t
              ? "Resumen del avance del informe desde la preparación inicial hasta la publicación final."
              : "Summary of report progress from initial preparation to final publication."
          }
          title={t ? "Estado del proceso" : "Process status"}
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
              {t ? "Abrir proyecto" : "Open project"}
            </a>
          }
          description={
            t
              ? "Detalle técnico de la ejecución por si necesitas revisar mensajes del proceso."
              : "Technical execution details in case you need to review process messages."
          }
          title={t ? "Detalle técnico" : "Technical details"}
        >
          <ExecutionLogConsole locale={locale} logs={execution.logs} />
        </SectionCard>
      </div>

    </div>
  );
}
