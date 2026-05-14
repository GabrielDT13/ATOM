"use client";

import { ChangeEvent, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  DashboardStatusBreakdown,
  DashboardTimelinePoint,
} from "@/types/api";

import { useLocale } from "@/components/providers/locale-provider";
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
  bucket_start: string;
  completed_analyses: number;
  label: string;
  total_events: number;
};

const STATUS_COLORS: Record<string, string> = {
  configured: "#0ea5e9",
  empty: "#94a3b8",
  results: "#10b981",
};

function getActivityRangeOptions(locale: "en" | "es"): ActivityRangeOption[] {
  return locale === "es"
    ? [
        { days: 7, helper: "Última semana", label: "7 días" },
        { days: 30, helper: "Último mes", label: "30 días" },
        { days: 90, helper: "Últimos 3 meses", label: "90 días" },
        { days: 180, helper: "Últimos 6 meses", label: "180 días" },
      ]
    : [
        { days: 7, helper: "Last week", label: "7 days" },
        { days: 30, helper: "Last month", label: "30 days" },
        { days: 90, helper: "Last 3 months", label: "90 days" },
        { days: 180, helper: "Last 6 months", label: "180 days" },
      ];
}

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
      return 10;
    case 90:
      return 9;
    default:
      return 12;
  }
}

function formatRangeBucketLabel(
  startDate: Date,
  endDate: Date,
  days: ActivityRangeDays,
  locale: "en" | "es",
) {
  const localeCode = locale === "es" ? "es-ES" : "en-US";
  if (days === 7) {
    return new Intl.DateTimeFormat(localeCode, {
      weekday: "short",
    })
      .format(endDate)
      .replace(".", "");
  }

  if (days === 30) {
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    const monthLabel = new Intl.DateTimeFormat(localeCode, {
      month: "short",
    })
      .format(endDate)
      .replace(".", "");

    return startDay === endDay
      ? `${endDay} ${monthLabel}`
      : `${startDay}-${endDay} ${monthLabel}`;
  }

  return new Intl.DateTimeFormat(localeCode, {
    month: "short",
  })
    .format(endDate)
    .replace(".", "");
}

function aggregateTimelinePoints(
  points: DashboardTimelinePoint[],
  days: ActivityRangeDays,
  locale: "en" | "es",
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
      bucket_start: group[0].bucket_start,
      completed_analyses: group.reduce(
        (sum, point) => sum + point.completed_analyses,
        0,
      ),
      label: formatRangeBucketLabel(startDate, endDate, days, locale),
      total_events: group.reduce((sum, point) => sum + point.total_events, 0),
    });
  }

  return groups;
}

function renderActivityTooltip(props: any, locale: "en" | "es") {
  const { active, label, payload } = props ?? {};
  if (!active || !Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const totals = payload.reduce((accumulator: Record<string, number>, item: any) => {
    if (typeof item?.dataKey === "string" && typeof item?.value === "number") {
      accumulator[item.dataKey] = item.value;
    }
    return accumulator;
  }, {});

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
      <p className="text-sm font-semibold text-slate-950">{label}</p>
      <div className="mt-2 space-y-1 text-xs text-slate-600">
        <p>
          {locale === "es" ? "Eventos" : "Events"}: {formatNumber(totals.total_events ?? 0, locale)}
        </p>
        <p>
          {locale === "es" ? "Completados" : "Completed"}: {formatNumber(totals.completed_analyses ?? 0, locale)}
        </p>
      </div>
    </div>
  );
}

export function DashboardActivityChart({ points }: ActivityChartProps) {
  const { locale } = useLocale();
  const [selectedRange, setSelectedRange] = useState<ActivityRangeDays>(30);
  const rangeOptions = getActivityRangeOptions(locale);
  const aggregatedPoints = aggregateTimelinePoints(points, selectedRange, locale);
  const hasActivity = aggregatedPoints.some(
    (point) => point.total_events > 0 || point.completed_analyses > 0,
  );
  const selectedRangeMeta =
    rangeOptions.find((option) => option.days === selectedRange) ??
    rangeOptions[1];

  function handleRangeChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedRange(parseActivityRange(event.target.value));
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            {locale === "es" ? "Actividad" : "Activity"}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            {locale === "es" ? "Evolución reciente de actividad" : "Recent activity trend"}
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            {locale === "es"
              ? "Solo usa eventos reales registrados en proyectos y análisis visibles dentro de ventana temporal seleccionada."
              : "Uses only real events recorded in visible projects and analyses within selected time window."}
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 xl:items-end">
          <div className="flex w-full min-w-0 flex-wrap items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-3 shadow-sm sm:flex-nowrap xl:w-auto xl:max-w-[15rem]">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                {locale === "es" ? "Rango" : "Range"}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {selectedRangeMeta.helper}
              </p>
            </div>

            <label className="min-w-0 sm:ml-auto">
              <span className="sr-only">
                {locale === "es" ? "Seleccionar rango temporal" : "Select time range"}
              </span>
              <select
                aria-label={locale === "es" ? "Seleccionar rango temporal" : "Select time range"}
                className="h-11 w-full min-w-0 max-w-full rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-sky-100 sm:w-[8.5rem]"
                onChange={handleRangeChange}
                value={selectedRange}
              >
                {rangeOptions.map((option) => (
                  <option key={option.days} value={option.days}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="h-80 rounded-[24px] border border-slate-100 bg-slate-50/70 px-3 py-4">
        {aggregatedPoints.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={aggregatedPoints}
              margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
            >
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="label"
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickLine={false}
                width={34}
              />
              <Tooltip
                content={(props) => renderActivityTooltip(props, locale)}
                cursor={{ fill: "rgba(148, 163, 184, 0.10)" }}
              />
              <Legend
                formatter={(value) =>
                  value === "total_events"
                    ? locale === "es" ? "Movimientos registrados" : "Recorded events"
                    : locale === "es" ? "Análisis completados" : "Completed analyses"
                }
                iconType="circle"
                wrapperStyle={{ fontSize: "12px", paddingTop: "4px" }}
              />
              <Bar
                barSize={28}
                dataKey="total_events"
                fill="#7dd3fc"
                name="total_events"
                radius={[10, 10, 0, 0]}
              />
              <Line
                activeDot={{ r: 4 }}
                dataKey="completed_analyses"
                dot={{ fill: "#10b981", r: 3, strokeWidth: 0 }}
                name="completed_analyses"
                stroke="#10b981"
                strokeWidth={3}
                type="monotone"
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : null}
      </div>

      {!hasActivity ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
          {locale === "es"
            ? "Aún no hay suficientes eventos reales para dibujar tendencia en rango seleccionado."
            : "There are not enough real events yet to draw a trend for the selected range."}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-300" />
          {locale === "es" ? "Movimientos registrados" : "Recorded events"}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          {locale === "es" ? "Análisis completados" : "Completed analyses"}
        </span>
      </div>
    </div>
  );
}

export function DashboardStatusChart({
  completionRate,
  items,
}: StatusChartProps) {
  const { locale } = useLocale();
  const chartItems = items.filter((item) => item.value > 0);
  const hasData = chartItems.length > 0;
  const pieData = hasData
    ? chartItems.map((item) => ({
        ...item,
        fill: STATUS_COLORS[item.status],
      }))
    : [
        {
          fill: "#e2e8f0",
          label: locale === "es" ? "Sin actividad" : "No activity",
          status: "empty",
          value: 1,
        },
      ];

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
        {locale === "es" ? "Estado general" : "Overall status"}
      </p>
      <h3 className="mt-2 text-xl font-semibold text-slate-950">
        {locale === "es" ? "Distribución del portafolio" : "Portfolio distribution"}
      </h3>

      <div className="relative mt-6 flex h-72 items-center justify-center">
        <div className="h-56 w-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                cx="50%"
                cy="50%"
                data={pieData}
                dataKey="value"
                innerRadius={58}
                outerRadius={88}
                paddingAngle={hasData ? 3 : 0}
                stroke="none"
              >
                {pieData.map((item) => (
                  <Cell fill={item.fill} key={`${item.status}-${item.label}`} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) =>
                  formatNumber(typeof value === "number" ? value : Number(value ?? 0), locale)
                }
                contentStyle={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  boxShadow: "0 16px 40px rgba(15, 23, 42, 0.12)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="absolute left-1/2 top-1/2 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-100">
          <span className="text-4xl font-semibold tracking-tight text-slate-950">
            {completionRate}%
          </span>
          <span className="mt-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            {locale === "es" ? "Cobertura" : "Coverage"}
          </span>
        </div>
      </div>

      <div className="space-y-3">
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
              {formatNumber(item.value, locale)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
