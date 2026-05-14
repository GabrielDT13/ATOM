import type { ReactNode } from "react";

export function FormPage({
  actions,
  children,
  description,
  eyebrow,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="page-hero-surface overflow-hidden rounded-[32px] border border-white/10 p-6 sm:p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            {eyebrow ? (
              <div className="page-hero-badge rounded-full px-3 py-1">
                {eyebrow}
              </div>
            ) : null}
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              {description}
            </p>
          </div>

          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </section>

      {children}
    </div>
  );
}

export function FormCard({
  children,
  footer,
  title,
  description,
}: {
  children: ReactNode;
  description?: string;
  footer?: ReactNode;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 pb-6 pt-7 sm:px-8">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
        ) : null}
      </div>

      <div className="grid gap-6 px-6 py-6 sm:px-8">{children}</div>

      {footer ? (
        <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

export function FormField({
  children,
  label,
}: {
  children: ReactNode;
  label: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function FormInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-sky-100"
      {...props}
    />
  );
}

export function FormMessage({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "danger" | "neutral";
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
        tone === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {children}
    </div>
  );
}
