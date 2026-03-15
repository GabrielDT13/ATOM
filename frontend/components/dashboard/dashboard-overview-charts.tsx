import type {
  DashboardStatusBreakdown,
  DashboardTimelinePoint,
} from "@/types/api";

import { formatNumber } from "@/components/dashboard/dashboard-overview-utils";

type ActivityChartProps = {
  points: DashboardTimelinePoint[];
};

type StatusChartProps = {
  completionRate: number;
  items: DashboardStatusBreakdown[];
};

const STATUS_COLORS: Record<string, string> = {
  configured: "#0ea5e9",
  empty: "#94a3b8",
  results: "#10b981",
};

export function DashboardActivityChart({ points }: ActivityChartProps) {
  const hasActivity = points.some(
    (point) => point.total_projects > 0 || point.results_ready > 0,
  );
  const maxValue = Math.max(
    1,
    ...points.map((point) => Math.max(point.total_projects, point.results_ready)),
  );

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Actividad
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            Evolución reciente de proyectos
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Seguimiento real de actualizaciones visibles y entregables disponibles
            durante los últimos seis meses.
          </p>
        </div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          6 meses
        </div>
      </div>

      <div className="grid h-72 grid-cols-6 gap-3">
        {points.map((point) => {
          const totalHeight =
            point.total_projects > 0
              ? Math.max(12, Math.round((point.total_projects / maxValue) * 100))
              : 0;
          const readyHeight =
            point.results_ready > 0
              ? Math.max(10, Math.round((point.results_ready / maxValue) * 100))
              : 0;

          return (
            <div
              className="flex min-w-0 flex-col items-center justify-end gap-3"
              key={point.label}
            >
              <div className="flex h-full w-full items-end gap-2 rounded-[24px] border border-slate-100 bg-slate-50/80 px-3 py-4">
                <div className="flex h-full flex-1 items-end">
                  <div
                    className="w-full rounded-full bg-sky-200/85"
                    style={{ height: `${totalHeight}%` }}
                  />
                </div>
                <div className="flex h-full flex-1 items-end">
                  <div
                    className="w-full rounded-full bg-emerald-400/90"
                    style={{ height: `${readyHeight}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {point.label}
                </p>
                <p className="text-xs text-slate-500">
                  {formatNumber(point.total_projects)} act.
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {!hasActivity ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
          Aún no hay suficiente actividad reciente para dibujar una tendencia con datos reales.
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-300" />
          Proyectos actualizados
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          Resultados listos
        </span>
      </div>
    </div>
  );
}

export function DashboardStatusChart({
  completionRate,
  items,
}: StatusChartProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  let currentAngle = 0;
  const segments = items
    .filter((item) => item.value > 0)
    .map((item) => {
      const start = currentAngle;
      const segmentAngle = total > 0 ? (item.value / total) * 360 : 0;
      currentAngle += segmentAngle;
      return `${STATUS_COLORS[item.status]} ${start}deg ${currentAngle}deg`;
    });

  const background =
    segments.length > 0
      ? `conic-gradient(${segments.join(", ")})`
      : "conic-gradient(#e2e8f0 0deg 360deg)";

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
        Estado general
      </p>
      <h3 className="mt-2 text-xl font-semibold text-slate-950">
        Distribución del portafolio
      </h3>

      <div className="mt-8 flex items-center justify-center">
        <div
          className="relative h-56 w-56 rounded-full p-5 shadow-inner"
          style={{ background }}
        >
          <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-white">
            <span className="text-4xl font-semibold tracking-tight text-slate-950">
              {completionRate}%
            </span>
            <span className="mt-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Cobertura
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {items.map((item) => (
          <div
            className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
            key={item.status}
          >
            <div className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[item.status] }}
              />
              <span className="text-sm font-medium text-slate-600">
                {item.label}
              </span>
            </div>
            <span className="text-sm font-semibold text-slate-950">
              {formatNumber(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
