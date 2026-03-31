"use client";

import type { AnalysisStreamEvent } from "@/types/api";

export type AnalysisExecutionStatus = "idle" | "running" | "completed" | "failed";
export type AnalysisExecutionLogLevel = "error" | "info" | "success" | "warning";
export type AnalysisExecutionStepStatus = "active" | "completed" | "failed" | "pending";

export type AnalysisExecutionLogEntry = {
  currentIndex?: number;
  designId?: string;
  id: string;
  level: AnalysisExecutionLogLevel;
  message: string;
  timestamp: string | null;
};

export type AnalysisExecutionDesign = {
  analysisType: string;
  completedAt: number | null;
  currentIndex: number;
  designId: string;
  durationMs: number | null;
  startedAt: number | null;
  status: Exclude<AnalysisExecutionStepStatus, "pending">;
};

export type AnalysisExecutionState = {
  currentDesignId: string | null;
  designOrder: string[];
  designs: Record<string, AnalysisExecutionDesign>;
  lastEventAt: number | null;
  logs: AnalysisExecutionLogEntry[];
  projectName: string | null;
  startedAt: number | null;
  status: AnalysisExecutionStatus;
  totalDesigns: number;
};

export type AnalysisExecutionStep = {
  description: string;
  id: string;
  label: string;
  meta: string | null;
  status: AnalysisExecutionStepStatus;
};

export type AnalysisExecutionSnapshot = {
  activeDesign: AnalysisExecutionDesign | null;
  activeDesignLogCount: number;
  elapsedMs: number;
  estimatedCompletionAt: string | null;
  estimatedTotalDurationMs: number | null;
  etaMs: number | null;
  failedDesigns: number;
  lastEventAt: number | null;
  logs: AnalysisExecutionLogEntry[];
  processedDesigns: number;
  progressPercent: number;
  startedAt: number | null;
  status: AnalysisExecutionStatus;
  steps: AnalysisExecutionStep[];
  successfulDesigns: number;
  totalDesigns: number;
};

const MAX_LOG_ENTRIES = 200;

function parseTimestamp(timestamp: string | null | undefined) {
  if (!timestamp) {
    return null;
  }

  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? null : parsed;
}

function createLogEntry(
  level: AnalysisExecutionLogLevel,
  message: string,
  timestamp: string | null = null,
  metadata?: {
    currentIndex?: number;
    designId?: string;
  },
) {
  return {
    currentIndex: metadata?.currentIndex,
    designId: metadata?.designId,
    id: `${timestamp ?? "no-ts"}:${level}:${message}`,
    level,
    message,
    timestamp,
  } satisfies AnalysisExecutionLogEntry;
}

function appendLog(
  currentLogs: AnalysisExecutionLogEntry[],
  nextLog: AnalysisExecutionLogEntry,
) {
  return [...currentLogs, nextLog].slice(-MAX_LOG_ENTRIES);
}

function upsertDesign(
  state: AnalysisExecutionState,
  design: AnalysisExecutionDesign,
) {
  return {
    ...state.designs,
    [design.designId]: design,
  };
}

function ensureDesignOrder(
  currentOrder: string[],
  designId: string,
) {
  return currentOrder.includes(designId) ? currentOrder : [...currentOrder, designId];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function estimateActiveDesignProgress(activeElapsedMs: number, activeLogCount: number) {
  const logSignal = Math.min(activeLogCount / 18, 1);
  const timeSignal = Math.min(activeElapsedMs / (8 * 60 * 1000), 1);

  return clamp(0.12 + logSignal * 0.48 + timeSignal * 0.28, 0.12, 0.88);
}

export function createInitialAnalysisExecutionState(): AnalysisExecutionState {
  return {
    currentDesignId: null,
    designOrder: [],
    designs: {},
    lastEventAt: null,
    logs: [],
    projectName: null,
    startedAt: null,
    status: "idle",
    totalDesigns: 0,
  };
}

export function parseAnalysisStreamEvent(rawData: string): AnalysisStreamEvent {
  if (rawData === "---FIN---") {
    return {
      type: "run_completed",
      project_name: "",
      processed_designs: 0,
      timestamp: new Date().toISOString(),
      total_designs: 0,
    };
  }

  try {
    const parsed = JSON.parse(rawData) as AnalysisStreamEvent;
    if (parsed && typeof parsed === "object" && "type" in parsed) {
      return parsed;
    }
  } catch {
    // The previous stream format emitted plain text lines. Keep supporting it as info logs.
  }

  return {
    type: "log",
    level: "info",
    message: rawData,
    timestamp: new Date().toISOString(),
  };
}

export function applyAnalysisStreamEvent(
  state: AnalysisExecutionState,
  event: AnalysisStreamEvent,
): AnalysisExecutionState {
  const eventTimestamp = parseTimestamp(event.timestamp) ?? Date.now();

  switch (event.type) {
    case "run_started":
      return {
        ...state,
        lastEventAt: eventTimestamp,
        projectName: event.project_name,
        startedAt: state.startedAt ?? eventTimestamp,
        status: "running",
        totalDesigns: event.total_designs,
      };

    case "run_completed":
      return {
        ...state,
        currentDesignId: null,
        lastEventAt: eventTimestamp,
        projectName: event.project_name || state.projectName,
        startedAt: state.startedAt ?? eventTimestamp,
        status: "completed",
        totalDesigns: state.totalDesigns || event.total_designs,
      };

    case "run_failed":
      return {
        ...state,
        currentDesignId: null,
        lastEventAt: eventTimestamp,
        logs: appendLog(
          state.logs,
          createLogEntry("error", event.message, event.timestamp),
        ),
        projectName: event.project_name ?? state.projectName,
        startedAt: state.startedAt ?? eventTimestamp,
        status: "failed",
      };

    case "design_started": {
      const previousDesign = state.designs[event.design_id];
      const nextDesign: AnalysisExecutionDesign = {
        analysisType: event.analysis_type,
        completedAt: null,
        currentIndex: event.current_index,
        designId: event.design_id,
        durationMs: null,
        startedAt: previousDesign?.startedAt ?? eventTimestamp,
        status: "active",
      };

      return {
        ...state,
        currentDesignId: event.design_id,
        designOrder: ensureDesignOrder(state.designOrder, event.design_id),
        designs: upsertDesign(state, nextDesign),
        lastEventAt: eventTimestamp,
        logs: appendLog(
          state.logs,
          createLogEntry("info", event.message, event.timestamp, {
            currentIndex: event.current_index,
            designId: event.design_id,
          }),
        ),
        startedAt: state.startedAt ?? eventTimestamp,
        status: "running",
        totalDesigns: state.totalDesigns || event.total_designs,
      };
    }

    case "design_completed":
    case "design_failed": {
      const previousDesign = state.designs[event.design_id];
      const nextStatus = event.type === "design_completed" ? "completed" : "failed";
      const nextLevel = event.type === "design_completed" ? "success" : "error";
      const nextDesign: AnalysisExecutionDesign = {
        analysisType: event.analysis_type,
        completedAt: eventTimestamp,
        currentIndex: event.current_index,
        designId: event.design_id,
        durationMs:
          typeof event.duration_seconds === "number"
            ? Math.round(event.duration_seconds * 1000)
            : previousDesign?.durationMs ?? null,
        startedAt:
          previousDesign?.startedAt ??
          (typeof event.duration_seconds === "number"
            ? eventTimestamp - Math.round(event.duration_seconds * 1000)
            : null),
        status: nextStatus,
      };

      return {
        ...state,
        currentDesignId: state.currentDesignId === event.design_id ? null : state.currentDesignId,
        designOrder: ensureDesignOrder(state.designOrder, event.design_id),
        designs: upsertDesign(state, nextDesign),
        lastEventAt: eventTimestamp,
        logs: appendLog(
          state.logs,
          createLogEntry(nextLevel, event.message, event.timestamp, {
            currentIndex: event.current_index,
            designId: event.design_id,
          }),
        ),
        startedAt: state.startedAt ?? eventTimestamp,
        status: state.status === "failed" ? "failed" : "running",
        totalDesigns: state.totalDesigns || event.total_designs,
      };
    }

    case "cleanup_completed":
    case "cleanup_failed":
      return {
        ...state,
        lastEventAt: eventTimestamp,
        logs: appendLog(
          state.logs,
          createLogEntry(
            event.type === "cleanup_completed" ? "success" : "warning",
            event.message,
            event.timestamp,
            {
              currentIndex: event.current_index,
              designId: event.design_id,
            },
          ),
        ),
        totalDesigns: state.totalDesigns || event.total_designs,
      };

    case "log":
      return {
        ...state,
        lastEventAt: eventTimestamp,
        logs: appendLog(
          state.logs,
          createLogEntry(event.level, event.message, event.timestamp, {
            currentIndex: event.current_index,
            designId: event.design_id,
          }),
        ),
        totalDesigns: state.totalDesigns || event.total_designs || 0,
      };
  }
}

function buildExecutionMeta({
  activeDesign,
  failedDesigns,
  processedDesigns,
  totalDesigns,
}: {
  activeDesign: AnalysisExecutionDesign | null;
  failedDesigns: number;
  processedDesigns: number;
  totalDesigns: number;
}) {
  if (activeDesign) {
    return `Ejecución ${activeDesign.currentIndex} de ${Math.max(totalDesigns, 1)}`;
  }

  if (processedDesigns > 0) {
    return `${processedDesigns} de ${Math.max(totalDesigns, processedDesigns)} completadas`;
  }

  if (failedDesigns > 0) {
    return `${failedDesigns} con incidencias`;
  }

  return totalDesigns > 0 ? `${totalDesigns} previstas` : null;
}

export function buildAnalysisExecutionSnapshot(
  state: AnalysisExecutionState,
  now = Date.now(),
): AnalysisExecutionSnapshot {
  const designs = state.designOrder
    .map((designId) => state.designs[designId])
    .filter((design): design is AnalysisExecutionDesign => Boolean(design))
    .sort((left, right) => left.currentIndex - right.currentIndex);
  const activeDesign =
    (state.currentDesignId ? state.designs[state.currentDesignId] : null) ??
    designs.find((design) => design.status === "active") ??
    null;
  const processedDesigns = designs.filter(
    (design) => design.status === "completed" || design.status === "failed",
  ).length;
  const successfulDesigns = designs.filter((design) => design.status === "completed").length;
  const failedDesigns = designs.filter((design) => design.status === "failed").length;
  const elapsedMs = state.startedAt ? Math.max(now - state.startedAt, 0) : 0;
  const completedDurations = designs
    .map((design) => design.durationMs)
    .filter((duration): duration is number => typeof duration === "number" && duration > 0);
  const averageDurationMs =
    completedDurations.length > 0
      ? completedDurations.reduce((total, duration) => total + duration, 0) / completedDurations.length
      : null;
  const activeElapsedMs = activeDesign?.startedAt ? Math.max(now - activeDesign.startedAt, 0) : 0;
  const activeDesignLogCount = activeDesign
    ? state.logs.filter((log) => log.designId === activeDesign.designId).length
    : 0;
  const activeDesignEstimatedProgress =
    activeDesign && activeElapsedMs > 0
      ? averageDurationMs
        ? clamp(activeElapsedMs / averageDurationMs, 0.12, 0.92)
        : estimateActiveDesignProgress(activeElapsedMs, activeDesignLogCount)
      : 0;
  const estimatedCurrentDesignDurationMs =
    activeDesign && activeElapsedMs > 0
      ? averageDurationMs
        ? Math.max(Math.round(averageDurationMs), activeElapsedMs)
        : Math.max(
            Math.round(activeElapsedMs / Math.max(activeDesignEstimatedProgress, 0.12)),
            activeElapsedMs + 20_000,
            45_000,
          )
      : averageDurationMs
        ? Math.round(averageDurationMs)
        : null;
  const estimatedTotalDurationMs =
    state.totalDesigns > 0
      ? averageDurationMs
        ? Math.round(averageDurationMs * state.totalDesigns)
        : estimatedCurrentDesignDurationMs
          ? Math.round(estimatedCurrentDesignDurationMs * state.totalDesigns)
          : null
      : null;
  let etaMs: number | null = null;

  if (state.status === "completed" || state.status === "failed") {
    etaMs = 0;
  } else if (estimatedCurrentDesignDurationMs && state.totalDesigns > 0) {
    const remainingDesigns = Math.max(
      state.totalDesigns - processedDesigns - (activeDesign ? 1 : 0),
      0,
    );
    const activeRemainingMs = activeDesign
      ? Math.max(
          estimatedCurrentDesignDurationMs - activeElapsedMs,
          Math.round(estimatedCurrentDesignDurationMs * 0.08),
        )
      : 0;

    const additionalDesignsDurationMs = averageDurationMs
      ? remainingDesigns * averageDurationMs
      : remainingDesigns * estimatedCurrentDesignDurationMs;

    etaMs = Math.max(Math.round(activeRemainingMs + additionalDesignsDurationMs), 0);
  }

  let progressPercent = 0;
  if (state.status === "completed" || state.status === "failed") {
    progressPercent = 100;
  } else if (state.totalDesigns > 0) {
    const activeBonus = activeDesign
      ? activeDesignEstimatedProgress
      : state.startedAt
        ? 0.08
        : 0;
    progressPercent = Math.min(
      97,
      Math.max(
        4,
        Math.round(((processedDesigns + activeBonus) / state.totalDesigns) * 100),
      ),
    );
  }

  const remainingExecutions = Math.max(
    state.totalDesigns - processedDesigns - (activeDesign ? 1 : 0),
    0,
  );
  const steps: AnalysisExecutionStep[] = [
    {
      description:
        state.status === "idle"
          ? "Estamos preparando los datos iniciales del proyecto."
          : "La plantilla y los archivos del proyecto ya se han preparado correctamente.",
      id: "project-preparation",
      label: "Preparación",
      meta: state.startedAt ? formatTimeOfDay(state.startedAt) : null,
      status: state.status === "idle" ? "pending" : "completed",
    },
    {
      description:
        state.status === "completed"
          ? "Todas las ejecuciones previstas ya se han procesado."
          : state.status === "failed"
            ? "El procesamiento se detuvo antes de completar todas las ejecuciones."
            : activeDesign
              ? "Estamos procesando las ejecuciones del proyecto y actualizando el detalle técnico en tiempo real."
              : "El procesamiento comenzará en cuanto arranque la primera ejecución.",
      id: "analysis-processing",
      label: "Análisis",
      meta: buildExecutionMeta({
        activeDesign,
        failedDesigns,
        processedDesigns,
        totalDesigns: state.totalDesigns,
      }),
      status:
        state.status === "failed"
          ? "failed"
          : state.status === "completed"
            ? "completed"
            : activeDesign || processedDesigns > 0
              ? "active"
              : "pending",
    },
    {
      description:
        state.status === "completed"
          ? "El informe ya se ha generado con los resultados disponibles."
          : state.status === "failed"
            ? "La generación del informe no pudo finalizar por completo."
            : remainingExecutions === 0 && (activeDesign || processedDesigns > 0)
              ? "Estamos cerrando el informe final con los últimos resultados."
              : "El informe final se generará cuando terminen las ejecuciones pendientes.",
      id: "report-generation",
      label: "Generación del informe",
      meta:
        remainingExecutions > 0 && state.status === "running"
          ? `${remainingExecutions} pendiente${remainingExecutions === 1 ? "" : "s"}`
          : null,
      status:
        state.status === "completed"
          ? "completed"
          : state.status === "failed"
            ? "failed"
            : remainingExecutions === 0 && (activeDesign || processedDesigns > 0)
              ? "active"
              : "pending",
    },
    {
      description:
        state.status === "completed"
          ? "Los resultados ya están listos y la vista volverá al proyecto automáticamente."
          : state.status === "failed"
            ? "Puedes volver al proyecto y relanzar la generación cuando lo necesites."
            : "Los resultados aparecerán en el proyecto cuando termine el informe.",
      id: "publish-results",
      label: "Resultados listos",
      meta: null,
      status:
        state.status === "completed"
          ? "completed"
          : state.status === "failed"
            ? "failed"
            : "pending",
    },
  ];

  return {
    activeDesign,
    activeDesignLogCount,
    elapsedMs,
    estimatedCompletionAt: etaMs ? new Date(now + etaMs).toISOString() : null,
    estimatedTotalDurationMs,
    etaMs,
    failedDesigns,
    lastEventAt: state.lastEventAt,
    logs: state.logs,
    processedDesigns,
    progressPercent,
    startedAt: state.startedAt,
    status: state.status,
    steps,
    successfulDesigns,
    totalDesigns: state.totalDesigns,
  };
}

export function formatDuration(durationMs: number) {
  if (durationMs <= 0) {
    return "0 s";
  }

  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }

  if (minutes > 0) {
    return `${minutes} min ${seconds} s`;
  }

  return `${seconds} s`;
}

export function formatTimeOfDay(value: number | string) {
  const date = typeof value === "number" ? new Date(value) : new Date(value);

  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
