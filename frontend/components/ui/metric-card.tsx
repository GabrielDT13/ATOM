import type { ReactNode } from "react";

export type MetricCardProps = {
  accentClassName: string;
  description: string;
  icon: ReactNode;
  title: string;
  value: string;
};

export function MetricCard({
  accentClassName,
  description,
  icon,
  title,
  value,
}: MetricCardProps) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-4 inline-flex rounded-2xl p-3 ${accentClassName}`}>{icon}</div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </article>
  );
}
