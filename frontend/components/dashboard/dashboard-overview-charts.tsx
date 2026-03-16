"use client";

import { ChangeEvent, useState } from "react";

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

type ActivityRangeDays = 7 | 30 | 90 | 180;

type ActivityRangeOption = {
  days: ActivityRangeDays;
  helper: string;
  label: string;
};

type AggregatedActivityPoint = {
  completed_analyses: number;
  label: string;
  total_events: number;
};

const STATUS_COLORS: Record<string, string> = {
  configured: "#0ea5e9",
  empty: "#94a3b8",
  results: "#10b981",
};

const ACTIVITY_RANGE_OPTIONS: ActivityRangeOption[] = [
  { days: 7, helper: "Última semana", label: "7 días" },
  { days: 30, helper: "Último mes", label: "30 días" },
  { days: 90, helper: "Últimos 3 meses", label: "90 días" },
  { days: 180, helper: "Últimos 6 meses", label: "180 días" },
];

function parseActivityRange(value: string): ActivityRangeDays {
  const parsed = Number(value);
  if (parsed === 7 || parsed === 30 || parsed === 90 || parsed === 180) {
    return parsed;
  }

  return 30;
}

function parseBucketDate(point: DashboardTimelinePoint) {
  const parsed = new Date(point.bucket_start);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function getBucketCount(days: ActivityRangeDays) {
  switch (days) {
    case 7:
      return 7;
    case 30:
      return 5;
    case 90:
      return 3;
    default:
      return 6;
  }
}

function formatRangeBucketLabel(
  startDate: Date,
  endDate: Date,
  days: ActivityRangeDays,
) {
  if (days === 7) {
    return new Intl.DateTimeFormat("es-ES", {
      weekday: "short",
    })
      .format(endDate)
      .replace(".", "");
  }

  if (days === 30) {
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    const monthLabel = new Intl.DateTimeFormat("es-ES", {
      month: "short",
    })
      .format(endDate)
      .replace(".", "");

    return startDay === endDay
      ? `${endDay} ${monthLabel}`
      : `${startDay}-${endDay} ${monthLabel}`;
  }

  return new Intl.DateTimeFormat("es-ES", {
    month: "short",
  })
    .format(endDate)
    .replace(".", "");
}

function aggregateTimelinePoints(
  points: DashboardTimelinePoint[],
  days: ActivityRangeDays,
): AggregatedActivityPoint[] {
  const datedPoints = points
    .map((point) => {
      const bucketDate = parseBucketDate(point);
      if (!bucketDate) {
        return null;
      }

      return {
        ...point,
        bucketDate,
      };
    })
    .filter((point): point is DashboardTimelinePoint & { bucketDate: Date } => Boolean(point))
    .sort((left, right) => left.bucketDate.getTime() - right.bucketDate.getTime());

  const sliced = datedPoints.slice(-days);
  if (!sliced.length) {
    return [];
  }

  const bucketCount = getBucketCount(days);
  const groupSize = Math.max(1, Math.ceil(sliced.length / bucketCount));
  const groups: AggregatedActivityPoint[] = [];

  for (let index = 0; index < sliced.length; index += groupSize) {
    const group = sliced.slice(index, index + groupSize);
    if (!group.length) {
      continue;
    }

    const startDate = group[0].bucketDate;
    const endDate = group[group.length - 1].bucketDate;
    groups.push({
      completed_analyses: group.reduce(
        (sum, point) => sum + point.completed_analyses,
        0,
      ),
      label: formatRangeBucketLabel(startDate, endDate, days),
      total_events: group.reduce((sum, point) => sum + point.total_events, 0),
    });
  }

  return groups;
}

export function DashboardActivityChart({ points }: ActivityChartProps) {
  const [selectedRange, setSelectedRange] = useState<ActivityRangeDays>(30);
  const aggregatedPoints = aggregateTimelinePoints(points, selectedRange);
  const hasActivity = aggregatedPoints.some(
    (point) => point.total_events > 0 || point.completed_analyses > 0,
  );
  const maxValue = Math.max(
    1,
    ...aggregatedPoints.map((point) =>
      Math.max(point.total_events, point.completed_analyses),
    ),
  );
  const selectedRangeMeta =
    ACTIVITY_RANGE_OPTIONS.find((option) => option.days === selectedRange) ??
    ACTIVITY_RANGE_OPTIONS[1];

  function handleRangeChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedRange(parseActivityRange(event.target.value));
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Actividad
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            Evolución reciente de actividad
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Seguimiento real de eventos registrados en proyectos y análisis para
            la ventana temporal seleccionada.
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 xl:items-end">
          <div className="flex w-full min-w-0 flex-wrap items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3 shadow-sm sm:flex-nowrap xl:w-auto xl:max-w-[15rem]">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Rango
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {selectedRangeMeta.helper}
              </p>
            </div>

            <label className="min-w-0 sm:ml-auto">
              <span className="sr-only">Seleccionar rango temporal</span>
              <select
                aria-label="Seleccionar rango temporal"
                className="h-11 w-full min-w-0 max-w-full rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-sky-100 sm:w-[8.5rem]"
                onChange={handleRangeChange}
                value={selectedRange}
              >
                {ACTIVITY_RANGE_OPTIONS.map((option) => (
                  <option key={option.days} value={option.days}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div
        className="grid h-72 gap-3"
        style={{
          gridTemplateColumns: `repeat(${Math.max(aggregatedPoints.length, 1)}, minmax(0, 1fr))`,
        }}
      >
        {aggregatedPoints.map((point) => {
          const totalHeight =
            point.total_events > 0
              ? Math.max(12, Math.round((point.total_events / maxValue) * 100))
              : 0;
          const readyHeight =
            point.completed_analyses > 0
              ? Math.max(
                  10,
                  Math.round((point.completed_analyses / maxValue) * 100),
                )
              : 0;

          return (
            <div
              className="flex min-w-0 flex-col items-center justify-end gap-3"
              key={`${selectedRange}-${point.label}`}
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
                  {formatNumber(point.total_events)} mov.
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {!hasActivity ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
          Aún no hay suficientes eventos registrados para dibujar una tendencia
          con datos reales en la ventana seleccionada.
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-300" />
          Movimientos registrados
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          Análisis completados
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
