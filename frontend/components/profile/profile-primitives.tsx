"use client";

import type { ReactNode } from "react";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type PreferenceToggleProps = {
  checked: boolean;
  description: string;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  title: string;
};

export function SectionCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.4)] sm:p-8",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeading({
  description,
  title,
}: {
  description?: string;
  title: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}

export function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          {label}
        </p>
        <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export function PreferenceToggle({
  checked,
  description,
  disabled = false,
  onCheckedChange,
  title,
}: PreferenceToggleProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50/80 px-5 py-4 text-left transition",
        disabled ? "opacity-70" : "hover:border-primary/30 hover:bg-white",
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}
