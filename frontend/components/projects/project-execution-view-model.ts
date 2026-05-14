import {
  formatDuration,
  formatTimeOfDay,
  type AnalysisExecutionSnapshot,
} from "@/components/projects/project-execution-utils";
import type { AppLocale } from "@/lib/locale";

export type ProjectExecutionDisplayModel = {
  currentExecutionLabel: string;
  durationEstimateCaption: string;
  durationEstimateLabel: string;
  progressLabel: string;
  statusBadgeLabel: string;
  summaryDescription: string;
  summaryTitle: string;
  userFacingStatus: string;
};

export function buildProjectExecutionDisplayModel(
  execution: AnalysisExecutionSnapshot,
  locale: AppLocale = "es",
): ProjectExecutionDisplayModel {
  const t = locale === "es";
  const currentExecutionLabel = execution.activeDesign
    ? t
      ? `Ejecución ${execution.activeDesign.currentIndex} de ${execution.totalDesigns || 1}`
      : `Execution ${execution.activeDesign.currentIndex} of ${execution.totalDesigns || 1}`
    : execution.status === "queued"
      ? t ? "En cola de ejecución" : "Queued for execution"
    : execution.status === "completed"
      ? t
        ? `${execution.totalDesigns || execution.processedDesigns} ejecuciones completadas`
        : `${execution.totalDesigns || execution.processedDesigns} completed runs`
      : execution.status === "failed"
        ? t ? "Ejecución interrumpida" : "Execution interrupted"
        : t ? "Pendiente de inicio" : "Pending start";
  const userFacingStatus =
    execution.status === "completed"
      ? t ? "Informe listo" : "Report ready"
      : execution.status === "failed"
        ? t ? "Se ha producido una incidencia" : "An issue occurred"
        : execution.status === "queued"
          ? t ? "En cola" : "Queued"
        : execution.activeDesign
          ? t ? "Generando informe" : "Generating report"
          : t ? "Preparando análisis" : "Preparing analysis";
  const summaryTitle =
    execution.status === "completed"
      ? t ? "Informe generado" : "Report generated"
      : execution.status === "failed"
        ? t ? "No se pudo completar la generación" : "Could not complete generation"
        : execution.status === "queued"
          ? t ? "La ejecución está en cola" : "Execution is queued"
        : t ? "Estamos generando tu informe" : "We are generating your report";
  const summaryDescription =
    execution.status === "completed"
      ? t
        ? "Los resultados ya están disponibles. En unos segundos volverás automáticamente al proyecto."
        : "Results are already available. In a few seconds you will automatically return to the project."
      : execution.status === "failed"
        ? t
          ? "El proceso terminó con incidencias. Puedes revisar el detalle técnico antes de volver al proyecto."
          : "The process ended with issues. You can review the technical details before returning to the project."
        : execution.status === "queued"
          ? t
            ? "El proyecto ya está registrado en segundo plano y se procesará automáticamente en cuanto el worker lo recoja."
            : "The project is already queued in the background and will be processed automatically as soon as a worker picks it up."
        : execution.activeDesign
          ? t
            ? "Estamos procesando los datos y actualizando el progreso en tiempo real."
            : "We are processing the data and updating progress in real time."
          : t
            ? "Estamos validando el proyecto antes de arrancar la primera ejecución."
            : "We are validating the project before starting the first run.";
  const durationEstimateLabel =
    execution.status === "completed"
      ? formatDuration(execution.elapsedMs)
      : execution.status === "failed"
        ? execution.estimatedTotalDurationMs
          ? formatDuration(execution.estimatedTotalDurationMs)
          : t ? "Sin estimación" : "No estimate"
        : execution.status === "queued"
          ? t ? "Pendiente" : "Pending"
        : execution.estimatedTotalDurationMs
          ? formatDuration(execution.estimatedTotalDurationMs)
          : t ? "Calculando..." : "Calculating...";
  const durationEstimateCaption =
    execution.estimatedCompletionAt && execution.status === "running"
      ? t
        ? `Fin estimado sobre las ${formatTimeOfDay(execution.estimatedCompletionAt, locale)}`
        : `Estimated finish around ${formatTimeOfDay(execution.estimatedCompletionAt, locale)}`
      : execution.status === "completed"
        ? t ? "Tiempo total de la ejecución" : "Total execution time"
        : execution.status === "failed"
          ? t ? "Última referencia disponible" : "Latest available reference"
          : execution.status === "queued"
            ? t ? "Esperando turno de ejecución" : "Waiting for execution slot"
          : execution.activeDesignLogCount > 0
            ? t ? "Estimación orientativa basada en el avance actual" : "Guidance estimate based on current progress"
            : t ? "Estimación orientativa basada en el arranque del proceso" : "Guidance estimate based on process start";
  const progressLabel =
    execution.status === "completed"
      ? t ? "Proceso completado" : "Process completed"
      : execution.status === "failed"
        ? t ? "Proceso interrumpido" : "Process interrupted"
        : execution.status === "queued"
          ? t ? "Esperando procesamiento" : "Waiting for processing"
        : t ? "Progreso general del informe" : "Overall report progress";
  const statusBadgeLabel =
    execution.status === "completed"
      ? t ? "Completado" : "Completed"
      : execution.status === "failed"
        ? "Error"
        : execution.status === "queued"
          ? t ? "En cola" : "Queued"
          : t ? "En curso" : "In progress";

  return {
    currentExecutionLabel,
    durationEstimateCaption,
    durationEstimateLabel,
    progressLabel,
    statusBadgeLabel,
    summaryDescription,
    summaryTitle,
    userFacingStatus,
  };
}
