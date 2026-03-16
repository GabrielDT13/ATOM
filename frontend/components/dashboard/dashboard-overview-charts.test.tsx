import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  DashboardActivityChart,
  DashboardStatusChart,
} from "@/components/dashboard/dashboard-overview-charts";

describe("DashboardActivityChart", () => {
  it("muestra un estado vacío cuando no hay eventos registrados", () => {
    render(
      <DashboardActivityChart
        points={[
          { completed_analyses: 0, label: "Ene", total_events: 0 },
          { completed_analyses: 0, label: "Feb", total_events: 0 },
        ]}
      />,
    );

    expect(
      screen.getByText(
        "Aún no hay suficientes eventos registrados para dibujar una tendencia con datos reales.",
      ),
    ).toBeInTheDocument();
  });

  it("renderiza los contadores de actividad mensual", () => {
    render(
      <DashboardActivityChart
        points={[
          { completed_analyses: 1, label: "Mar", total_events: 5 },
          { completed_analyses: 2, label: "Abr", total_events: 3 },
        ]}
      />,
    );

    expect(screen.getByText("Evolución reciente de actividad")).toBeInTheDocument();
    expect(screen.getByText("5 mov.")).toBeInTheDocument();
    expect(screen.getByText("3 mov.")).toBeInTheDocument();
    expect(screen.getByText("Análisis completados")).toBeInTheDocument();
  });
});

describe("DashboardStatusChart", () => {
  it("muestra la distribución del portafolio con sus etiquetas", () => {
    render(
      <DashboardStatusChart
        completionRate={67}
        items={[
          { label: "Resultados listos", status: "results", value: 2 },
          { label: "Pendientes de análisis", status: "configured", value: 1 },
          { label: "Sin archivos", status: "empty", value: 0 },
        ]}
      />,
    );

    expect(screen.getByText("Distribución del portafolio")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.getByText("Resultados listos")).toBeInTheDocument();
    expect(screen.getByText("Pendientes de análisis")).toBeInTheDocument();
  });
});
