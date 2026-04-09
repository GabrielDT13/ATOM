import {
  formatDuration,
  formatTimeOfDay,
  type AnalysisExecutionSnapshot,
} from "@/components/projects/project-execution-utils";

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
): ProjectExecutionDisplayModel {
  const currentExecutionLabel = execution.activeDesign
    ? `Ejecución ${execution.activeDesign.currentIndex} de ${execution.totalDesigns || 1}`
    : execution.status === "queued"
      ? "En cola de ejecución"
    : execution.status === "completed"
      ? `${execution.totalDesigns || execution.processedDesigns} ejecuciones completadas`
      : execution.status === "failed"
        ? "Ejecución interrumpida"
        : "Pendiente de inicio";
  const userFacingStatus =
    execution.status === "completed"
      ? "Informe listo"
      : execution.status === "failed"
        ? "Se ha producido una incidencia"
        : execution.status === "queued"
          ? "En cola"
        : execution.activeDesign
          ? "Generando informe"
          : "Preparando análisis";
  const summaryTitle =
    execution.status === "completed"
      ? "Informe generado"
      : execution.status === "failed"
        ? "No se pudo completar la generación"
        : execution.status === "queued"
          ? "La ejecución está en cola"
        : "Estamos generando tu informe";
  const summaryDescription =
    execution.status === "completed"
      ? "Los resultados ya están disponibles. En unos segundos volverás automáticamente al proyecto."
      : execution.status === "failed"
        ? "El proceso terminó con incidencias. Puedes revisar el detalle técnico antes de volver al proyecto."
        : execution.status === "queued"
          ? "El proyecto ya está registrado en segundo plano y se procesará automáticamente en cuanto el worker lo recoja."
        : execution.activeDesign
          ? "Estamos procesando los datos y actualizando el progreso en tiempo real."
          : "Estamos validando el proyecto antes de arrancar la primera ejecución.";
  const durationEstimateLabel =
    execution.status === "completed"
      ? formatDuration(execution.elapsedMs)
      : execution.status === "failed"
        ? execution.estimatedTotalDurationMs
          ? formatDuration(execution.estimatedTotalDurationMs)
          : "Sin estimación"
        : execution.status === "queued"
          ? "Pendiente"
        : execution.estimatedTotalDurationMs
          ? formatDuration(execution.estimatedTotalDurationMs)
          : "Calculando...";
  const durationEstimateCaption =
    execution.estimatedCompletionAt && execution.status === "running"
      ? `Fin estimado sobre las ${formatTimeOfDay(execution.estimatedCompletionAt)}`
      : execution.status === "completed"
        ? "Tiempo total de la ejecución"
        : execution.status === "failed"
          ? "Última referencia disponible"
          : execution.status === "queued"
            ? "Esperando turno de ejecución"
          : execution.activeDesignLogCount > 0
            ? "Estimación orientativa basada en el avance actual"
            : "Estimación orientativa basada en el arranque del proceso";
  const progressLabel =
    execution.status === "completed"
      ? "Proceso completado"
      : execution.status === "failed"
        ? "Proceso interrumpido"
        : execution.status === "queued"
          ? "Esperando procesamiento"
        : "Progreso general del informe";
  const statusBadgeLabel =
    execution.status === "completed"
      ? "Completado"
      : execution.status === "failed"
        ? "Error"
        : execution.status === "queued"
          ? "En cola"
          : "En curso";

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
