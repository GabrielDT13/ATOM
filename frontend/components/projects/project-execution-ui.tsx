"use client";

import type {
  AnalysisExecutionLogEntry,
  AnalysisExecutionStep,
} from "@/components/projects/project-execution-utils";
import { formatTimeOfDay } from "@/components/projects/project-execution-utils";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  eyebrow: string;
  tone?: "default" | "danger" | "success";
  value: string;
};

export function MetricCard({ eyebrow, tone = "default", value }: MetricCardProps) {
  const toneClassName =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "danger"
        ? "border-rose-200 bg-rose-50 text-rose-900"
        : "border-slate-200 bg-white text-slate-950";

  return (
    <div className={cn("rounded-[24px] border p-4 shadow-sm", toneClassName)}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export function ExecutionStepList({ steps }: { steps: AnalysisExecutionStep[] }) {
  return (
    <div className="relative space-y-5">
      <div className="absolute left-[13px] top-3 bottom-3 w-px bg-slate-200" />
      {steps.map((step) => (
        <ExecutionStepItem key={step.id} step={step} />
      ))}
    </div>
  );
}

function ExecutionStepItem({ step }: { step: AnalysisExecutionStep }) {
  const indicatorClassName =
    step.status === "completed"
      ? "border-emerald-500 bg-emerald-500 text-white"
      : step.status === "failed"
        ? "border-rose-500 bg-rose-500 text-white"
        : step.status === "active"
          ? "border-primary bg-white text-primary shadow-[0_0_0_6px_rgba(13,127,242,0.12)]"
          : "border-slate-200 bg-slate-100 text-slate-400";

  return (
    <div className="relative z-10 flex items-start gap-4">
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
          indicatorClassName,
        )}
      >
        {step.status === "completed" ? "✓" : step.status === "failed" ? "!" : step.status === "active" ? "•" : "·"}
      </div>
      <div className="pt-0.5">
        <p
          className={cn(
            "text-sm font-semibold",
            step.status === "active"
              ? "text-primary"
              : step.status === "failed"
                ? "text-rose-700"
                : "text-slate-950",
          )}
        >
          {step.label}
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{step.description}</p>
        {step.meta ? <p className="mt-1 text-xs font-medium text-slate-400">{step.meta}</p> : null}
      </div>
    </div>
  );
}

export function ExecutionLogConsole({ logs }: { logs: AnalysisExecutionLogEntry[] }) {
  if (!logs.length) {
    return (
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="dialog-hero-surface flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4 text-slate-200">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              Detalle técnico
            </p>
            <h3 className="mt-1 text-base font-semibold">Salida del proceso</h3>
          </div>
        </div>
        <div className="flex min-h-[18rem] items-center justify-center bg-slate-50 px-6 text-center text-sm leading-6 text-slate-500">
          El detalle técnico aparecerá aquí en cuanto empiece la ejecución.
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="dialog-hero-surface flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4 text-slate-200">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
            Detalle técnico
          </p>
          <h3 className="mt-1 text-base font-semibold">Salida del proceso</h3>
        </div>
        <p className="text-xs text-slate-300">{logs.length} líneas recientes</p>
      </div>
      <div className="max-h-[24rem] overflow-auto bg-slate-950 px-5 py-5 font-mono text-xs leading-6 text-slate-200">
        {logs.map((entry) => (
          <div className="flex gap-3" key={entry.id}>
            <span className="shrink-0 text-slate-500">
              [{entry.timestamp ? formatTimeOfDay(entry.timestamp) : "--:--"}]
            </span>
            <span
              className={cn(
                entry.level === "error"
                  ? "text-rose-300"
                  : entry.level === "success"
                    ? "text-emerald-300"
                    : entry.level === "warning"
                      ? "text-amber-300"
                      : "text-slate-200",
              )}
            >
              {entry.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
