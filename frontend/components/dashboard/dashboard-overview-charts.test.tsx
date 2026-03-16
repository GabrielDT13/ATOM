import { fireEvent, render, screen } from "@testing-library/react";
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
          {
            bucket_start: "2026-03-09",
            completed_analyses: 0,
            label: "9 mar",
            total_events: 0,
          },
          {
            bucket_start: "2026-03-10",
            completed_analyses: 0,
            label: "10 mar",
            total_events: 0,
          },
        ]}
      />,
    );

    expect(
      screen.getByText(
        "Aún no hay suficientes eventos registrados para dibujar una tendencia con datos reales en la ventana seleccionada.",
      ),
    ).toBeInTheDocument();
  });

  it("renderiza la actividad y permite cambiar la ventana temporal", () => {
    render(
      <DashboardActivityChart
        points={[
          {
            bucket_start: "2026-03-07",
            completed_analyses: 0,
            label: "7 mar",
            total_events: 1,
          },
          {
            bucket_start: "2026-03-08",
            completed_analyses: 0,
            label: "8 mar",
            total_events: 2,
          },
          {
            bucket_start: "2026-03-09",
            completed_analyses: 1,
            label: "9 mar",
            total_events: 5,
          },
          {
            bucket_start: "2026-03-10",
            completed_analyses: 2,
            label: "10 mar",
            total_events: 3,
          },
        ]}
      />,
    );

    expect(screen.getByText("Evolución reciente de actividad")).toBeInTheDocument();
    expect(screen.getByText("Último mes")).toBeInTheDocument();
    expect(screen.getByText("5 mov.")).toBeInTheDocument();
    expect(screen.getByText("3 mov.")).toBeInTheDocument();
    expect(screen.getByText("Análisis completados")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "7 días" }));

    expect(screen.getByText("Última semana")).toBeInTheDocument();
    expect(screen.getByText("5 mov.")).toBeInTheDocument();
    expect(screen.getByText("3 mov.")).toBeInTheDocument();
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
