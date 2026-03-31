import { describe, expect, it } from "vitest";

import {
  applyAnalysisStreamEvent,
  buildAnalysisExecutionSnapshot,
  createInitialAnalysisExecutionState,
  formatDuration,
  parseAnalysisStreamEvent,
} from "@/components/projects/project-execution-utils";

describe("project-execution-utils", () => {
  it("convierte líneas antiguas del stream en logs informativos", () => {
    const event = parseAnalysisStreamEvent("Running analysis for designID A01");

    expect(event.type).toBe("log");
    if (event.type !== "log") {
      throw new Error("Expected log event");
    }
    expect(event.message).toContain("designID A01");
    expect(event.level).toBe("info");
  });

  it("calcula progreso, ETA y pasos a partir del stream estructurado", () => {
    const startedAt = "2026-03-19T10:00:00.000Z";
    const completedAt = "2026-03-19T10:02:00.000Z";
    const nextStartedAt = "2026-03-19T10:02:05.000Z";

    let state = createInitialAnalysisExecutionState();
    state = applyAnalysisStreamEvent(state, {
      type: "run_started",
      project_name: "RNA Demo",
      timestamp: startedAt,
      total_designs: 2,
    });
    state = applyAnalysisStreamEvent(state, {
      type: "design_started",
      analysis_type: "rna-seq",
      current_index: 1,
      design_id: "A01",
      message: "First design started",
      timestamp: startedAt,
      total_designs: 2,
    });
    state = applyAnalysisStreamEvent(state, {
      type: "design_completed",
      analysis_type: "rna-seq",
      current_index: 1,
      design_id: "A01",
      duration_seconds: 120,
      message: "First design completed",
      timestamp: completedAt,
      total_designs: 2,
    });
    state = applyAnalysisStreamEvent(state, {
      type: "design_started",
      analysis_type: "rna-seq",
      current_index: 2,
      design_id: "A02",
      message: "Second design started",
      timestamp: nextStartedAt,
      total_designs: 2,
    });

    const snapshot = buildAnalysisExecutionSnapshot(
      state,
      Date.parse("2026-03-19T10:03:05.000Z"),
    );

    expect(snapshot.status).toBe("running");
    expect(snapshot.processedDesigns).toBe(1);
    expect(snapshot.successfulDesigns).toBe(1);
    expect(snapshot.failedDesigns).toBe(0);
    expect(snapshot.progressPercent).toBeGreaterThan(70);
    expect(snapshot.etaMs).not.toBeNull();
    expect(snapshot.activeDesign?.designId).toBe("A02");
    expect(snapshot.steps.some((step) => step.label === "Análisis")).toBe(true);
    expect(snapshot.steps.some((step) => step.label === "Generación del informe")).toBe(true);
  });

  it("marca el estado como fallido cuando el stream termina con error", () => {
    const state = applyAnalysisStreamEvent(createInitialAnalysisExecutionState(), {
      type: "run_failed",
      message: "Proyecto no encontrado",
      timestamp: "2026-03-19T10:00:00.000Z",
    });

    const snapshot = buildAnalysisExecutionSnapshot(state, Date.parse("2026-03-19T10:00:05.000Z"));

    expect(snapshot.status).toBe("failed");
    expect(snapshot.progressPercent).toBe(100);
    expect(snapshot.logs.at(-1)?.message).toBe("Proyecto no encontrado");
  });

  it("formatea duraciones legibles para la UI", () => {
    expect(formatDuration(18_000)).toBe("18 s");
    expect(formatDuration(125_000)).toBe("2 min 5 s");
  });
});
