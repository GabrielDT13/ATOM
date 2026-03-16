import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardOverviewPage } from "@/components/dashboard/dashboard-overview-page";
import type { DashboardOverview } from "@/types/api";

const { getDashboardOverview } = vi.hoisted(() => ({
  getDashboardOverview: vi.fn(),
}));

vi.mock("@/lib/dashboard", () => ({
  getDashboardOverview,
}));

vi.mock("@/components/dashboard/dashboard-overview", () => ({
  DashboardOverviewView: ({
    overview,
  }: {
    overview: DashboardOverview | null;
  }) => (
    <div data-testid="overview-value">
      {overview ? overview.summary.total_projects : "sin-datos"}
    </div>
  ),
}));

function buildOverview(totalProjects: number): DashboardOverview {
  return {
    access_summary: {
      editable_projects: 1,
      owned_projects: 1,
      shared_projects: 0,
    },
    activity_timeline: [
      {
        completed_analyses: 1,
        label: "Mar",
        total_events: 2,
      },
    ],
    featured_projects: [],
    file_breakdown: {
      additional: 0,
      results: 0,
      templates: 1,
    },
    quick_start_steps: [],
    recent_activity: [],
    example_library: [],
    status_breakdown: [
      {
        label: "Resultados listos",
        status: "results",
        value: 1,
      },
    ],
    summary: {
      example_files: 0,
      completion_rate: 100,
      distinct_owners: 1,
      empty_projects: 0,
      pending_analysis: 0,
      results_ready: 1,
      total_files: 2,
      total_projects: totalProjects,
      workflow_count: 1,
    },
    workflows: [],
  };
}

describe("DashboardOverviewPage", () => {
  beforeEach(() => {
    getDashboardOverview.mockReset();
  });

  it("refresca la vista con los datos reales del cliente", async () => {
    getDashboardOverview.mockResolvedValue(buildOverview(3));

    render(<DashboardOverviewPage initialOverview={buildOverview(1)} />);

    expect(screen.getByTestId("overview-value")).toHaveTextContent("1");

    await waitFor(() => {
      expect(screen.getByTestId("overview-value")).toHaveTextContent("3");
    });
  });

  it("mantiene el fallback inicial si la carga del cliente falla", async () => {
    getDashboardOverview.mockRejectedValue(new Error("fallo"));

    render(<DashboardOverviewPage initialOverview={buildOverview(2)} />);

    await waitFor(() => {
      expect(getDashboardOverview).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByTestId("overview-value")).toHaveTextContent("2");
  });
});
