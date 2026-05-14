import Image from "next/image";
import Link from "next/link";

import {
  ChartLineIcon,
  DashboardIcon,
  DatabaseIcon,
  FileIcon,
  FolderIcon,
  ScienceIcon,
  UsersIcon,
} from "@/components/dashboard/dashboard-icons";
import {
  DashboardActivityChart,
  DashboardStatusChart,
} from "@/components/dashboard/dashboard-overview-charts";
import { useLocale } from "@/components/providers/locale-provider";
import { buttonStyles } from "@/components/ui/button";
import {
  createEmptyDashboardOverviewForLocale,
  formatDateTime,
  formatBytes,
  formatDate,
  formatDateLong,
  formatNumber,
  getDashboardActivityMeta,
  getExampleKindMeta,
  getProjectSupportingText,
  getStatusMeta,
} from "@/components/dashboard/dashboard-overview-utils";
import { MetricCard } from "@/components/ui/metric-card";
import type { DashboardOverview } from "@/types/api";

type DashboardOverviewProps = {
  overview: DashboardOverview | null;
};

export function DashboardOverviewView({ overview }: DashboardOverviewProps) {
  const { locale } = useLocale();
  const t = locale === "es";
  const dashboard = overview ?? createEmptyDashboardOverviewForLocale(locale);

  const metrics = [
    {
      accentClassName: "bg-sky-100 text-sky-700",
      description: t
        ? `${formatNumber(dashboard.summary.results_ready, locale)} con informes listos y ${formatNumber(dashboard.summary.pending_analysis, locale)} en preparación.`
        : `${formatNumber(dashboard.summary.results_ready, locale)} with reports ready and ${formatNumber(dashboard.summary.pending_analysis, locale)} in preparation.`,
      icon: <FolderIcon className="h-6 w-6" />,
      title: t ? "Proyectos visibles" : "Visible projects",
      value: formatNumber(dashboard.summary.total_projects, locale),
    },
    {
      accentClassName: "bg-emerald-100 text-emerald-700",
      description: t
        ? `Cobertura actual del portafolio: ${dashboard.summary.completion_rate}% con resultados accesibles.`
        : `Current portfolio coverage: ${dashboard.summary.completion_rate}% with accessible results.`,
      icon: <ChartLineIcon className="h-6 w-6" />,
      title: t ? "Entregables listos" : "Ready deliverables",
      value: formatNumber(dashboard.summary.results_ready, locale),
    },
    {
      accentClassName: "bg-amber-100 text-amber-700",
      description: t
        ? `${formatNumber(dashboard.summary.example_files, locale)} archivos públicos de ejemplo y ${formatNumber(dashboard.summary.total_files, locale)} archivos inventariados.`
        : `${formatNumber(dashboard.summary.example_files, locale)} public example files and ${formatNumber(dashboard.summary.total_files, locale)} inventoried files.`,
      icon: <DatabaseIcon className="h-6 w-6" />,
      title: t ? "Biblioteca de datos" : "Data library",
      value: formatNumber(dashboard.summary.total_files, locale),
    },
    {
      accentClassName: "bg-indigo-100 text-indigo-700",
      description: t
        ? `${formatNumber(dashboard.summary.distinct_owners, locale)} propietario(s) y catálogo listo para nuevas ejecuciones.`
        : `${formatNumber(dashboard.summary.distinct_owners, locale)} owner(s) and catalog ready for new runs.`,
      icon: <ScienceIcon className="h-6 w-6" />,
      title: t ? "Flujos disponibles" : "Available workflows",
      value: formatNumber(dashboard.summary.workflow_count, locale),
    },
  ];

  return (
    <div className="space-y-6">
      <section
        className="relative overflow-hidden rounded-[36px] bg-slate-950 px-6 py-8 text-white shadow-[0_32px_80px_rgba(15,23,42,0.28)] sm:px-8 lg:px-10"
        data-tour="dashboard-hero"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.28),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.24),_transparent_28%),linear-gradient(135deg,_#0f172a_0%,_#111827_45%,_#0b1120_100%)]" />
        <div className="absolute -left-16 top-10 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative grid gap-8 xl:grid-cols-[1.4fr_0.9fr]">
          <div>
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200">
              Panel Atlantic Omics
            </span>
            <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
              {t
                ? "Analítica visual para entender el estado real de la plataforma"
                : "Visual analytics to understand the real platform status"}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              {t
                ? "Consulta proyectos, flujos soportados, archivos de ejemplo y la actividad reciente desde una portada pensada para orientar al usuario desde el primer acceso."
                : "Review projects, supported workflows, example files and recent activity from a landing surface designed to orient the user from first access."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-slate-200">
                {formatNumber(dashboard.summary.example_files, locale)} {t ? "archivos de ejemplo" : "example files"}
              </span>
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-slate-200">
                {formatNumber(dashboard.summary.workflow_count, locale)} {t ? "flujos preparados" : "prepared workflows"}
              </span>
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-slate-200">
                {formatNumber(dashboard.summary.results_ready, locale)} {t ? "proyectos con salida lista" : "projects with ready output"}
              </span>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className={buttonStyles({ size: "lg", tone: "on-dark", variant: "secondary" })}
                href="/dashboard/create_project"
              >
                {t ? "Crear proyecto" : "Create project"}
              </Link>
              <Link
                className={buttonStyles({ size: "lg", tone: "on-dark", variant: "ghost" })}
                href="/dashboard/projects"
              >
                {t ? "Ver proyectos" : "View projects"}
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                {t ? "Panorama actual" : "Current overview"}
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                <div>
                  <p className="text-3xl font-semibold">
                    {dashboard.summary.completion_rate}%
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {t ? "Cobertura con resultados" : "Coverage with results"}
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-semibold">
                    {formatNumber(dashboard.summary.distinct_owners, locale)}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {t ? "Espacios activos" : "Active spaces"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                {t ? "Entrada rápida" : "Quick glance"}
              </p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
                  <span className="text-sm text-slate-200">{t ? "Pendientes de análisis" : "Pending analysis"}</span>
                  <span className="text-sm font-semibold text-white">
                    {formatNumber(dashboard.summary.pending_analysis, locale)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
                  <span className="text-sm text-slate-200">{t ? "Ejemplos públicos" : "Public examples"}</span>
                  <span className="text-sm font-semibold text-white">
                    {formatNumber(dashboard.summary.example_files, locale)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
                  <span className="text-sm text-slate-200">{t ? "Archivos inventariados" : "Inventoried files"}</span>
                  <span className="text-sm font-semibold text-white">
                    {formatNumber(dashboard.summary.total_files, locale)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard
            accentClassName={metric.accentClassName}
            description={metric.description}
            icon={metric.icon}
            key={metric.title}
            title={metric.title}
            value={metric.value}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <DashboardActivityChart points={dashboard.activity_timeline} />
        <DashboardStatusChart
          completionRate={dashboard.summary.completion_rate}
          items={dashboard.status_breakdown}
        />
      </section>

      <section>
        <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                {t ? "Inventario" : "Inventory"}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">
                {t ? "Acceso y tipos de archivo" : "Access and file types"}
              </h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <UsersIcon className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                {t ? "Propios" : "Owned"}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {formatNumber(dashboard.access_summary.owned_projects, locale)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                {t ? "Compartidos" : "Shared"}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {formatNumber(dashboard.access_summary.shared_projects, locale)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                {t ? "Editables" : "Editable"}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {formatNumber(dashboard.access_summary.editable_projects, locale)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                {t ? "Plantillas" : "Templates"}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {formatNumber(dashboard.file_breakdown.templates, locale)}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
              <span className="text-sm text-slate-600">{t ? "Resultados HTML" : "HTML results"}</span>
              <span className="text-sm font-semibold text-slate-950">
                {formatNumber(dashboard.file_breakdown.results, locale)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
              <span className="text-sm text-slate-600">{t ? "Archivos adicionales" : "Additional files"}</span>
              <span className="text-sm font-semibold text-slate-950">
                {formatNumber(dashboard.file_breakdown.additional, locale)}
              </span>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                {t ? "Tipos de análisis" : "Analysis types"}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">
                {t ? "Flujos visibles para el usuario final" : "Workflows visible to the end user"}
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                {t
                  ? "Los flujos se muestran a partir de los scripts reales detectados en la plataforma y de su relación con el inventario actual."
                  : "Workflows are shown from the real scripts detected in the platform and their relation to the current inventory."}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {formatNumber(dashboard.workflows.length, locale)} {t ? "disponibles" : "available"}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {dashboard.workflows.length ? dashboard.workflows.map((workflow) => (
              <article
                className="group h-full overflow-hidden rounded-[28px] border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
                key={workflow.key}
              >
                <div className="relative flex h-full min-h-[13rem] overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_30%),linear-gradient(135deg,_#eff6ff_0%,_#ffffff_48%,_#ecfeff_100%)]">
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,_rgba(15,23,42,0.04)_0%,_transparent_45%)]" />
                  <div className="relative flex h-full flex-col justify-between gap-5 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 shadow-sm">
                        {workflow.script_name}
                      </span>
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                        {workflow.project_matches > 0
                          ? t
                            ? `${formatNumber(workflow.project_matches, locale)} proyecto(s)`
                            : `${formatNumber(workflow.project_matches, locale)} project(s)`
                          : t ? "Sin proyectos vinculados" : "No linked projects"}
                      </span>
                    </div>

                    <div className="grid items-end gap-4 sm:grid-cols-[1fr_8rem]">
                      <div>
                        <h4 className="text-2xl font-semibold tracking-tight text-slate-950">
                          {workflow.title}
                        </h4>
                        <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
                          {workflow.description}
                        </p>
                      </div>

                      <div className="relative mx-auto h-28 w-28 transition duration-300 group-hover:scale-105">
                        <Image
                          alt={t ? `Ilustración de ${workflow.title}` : `Illustration of ${workflow.title}`}
                          className="object-contain drop-shadow-[0_16px_24px_rgba(14,165,233,0.22)]"
                          fill
                          sizes="112px"
                          src={workflow.image_path}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            )) : (
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500 md:col-span-2">
                {t
                  ? "No se han detectado scripts de análisis disponibles en este momento."
                  : "No analysis scripts are currently available."}
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                {t ? "Actividad reciente" : "Recent activity"}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">
                {t ? "Últimos movimientos visibles" : "Latest visible activity"}
              </h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <DashboardIcon className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                {t ? "Eventos" : "Events"}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {formatNumber(dashboard.activity_summary.total_events, locale)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                {t ? "Última señal" : "Latest signal"}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {dashboard.activity_summary.last_event_at
                  ? formatDateTime(dashboard.activity_summary.last_event_at, locale)
                  : t ? "Sin registros" : "No records"}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-600">
                {t ? "Completados" : "Completed"}
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-700">
                {formatNumber(dashboard.activity_summary.analyses_completed, locale)}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-amber-600">
                {t ? "Con incidencias" : "With issues"}
              </p>
              <p className="mt-2 text-2xl font-semibold text-amber-700">
                {formatNumber(dashboard.activity_summary.analyses_failed, locale)}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {dashboard.recent_activity.length ? dashboard.recent_activity.map((item) => {
              const meta = getDashboardActivityMeta(item, locale);

              const Icon =
                item.kind === "analysis"
                  ? ScienceIcon
                  : item.kind === "result"
                  ? ChartLineIcon
                  : UsersIcon;

              return (
                <article
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4"
                  key={`${item.created_at}-${item.title}`}
                >
                  <div className="flex gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meta.badgeClassName}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-slate-900">
                          {item.title}
                        </h4>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.badgeClassName}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDate(item.created_at, locale)}
                        </span>
                      </div>
                      {(item.project_name || item.analysis_type || item.design_id) ? (
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                          {item.project_name ? <span>{item.project_name}</span> : null}
                          {item.analysis_type ? <span>{item.analysis_type}</span> : null}
                          {item.design_id ? <span>{item.design_id}</span> : null}
                        </div>
                      ) : null}
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </article>
              );
            }) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                {t
                  ? "Aún no se han registrado movimientos recientes de proyectos o ejecuciones."
                  : "No recent project or execution activity has been recorded yet."}
              </div>
            )}
          </div>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                {t ? "Proyectos" : "Projects"}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">
                {t ? "Proyectos destacados" : "Featured projects"}
              </h3>
            </div>
            <Link
              className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              href="/dashboard/projects"
            >
              {t ? "Abrir inventario" : "Open inventory"}
            </Link>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {dashboard.featured_projects.length ? dashboard.featured_projects.map((project) => {
              const statusMeta = getStatusMeta(project.status, project.active_run, locale);

              return (
                <article
                  className={`rounded-[28px] border border-slate-200 bg-gradient-to-br p-5 ${statusMeta.panelClassName}`}
                  key={`${project.owner}-${project.name}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        {project.owner}
                      </p>
                      <h4 className="mt-2 truncate text-xl font-semibold text-slate-950">
                        {project.name}
                      </h4>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badgeClassName}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {getProjectSupportingText(project, locale)}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {project.highlight_files.map((file) => (
                      <span
                        className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-700"
                        key={file}
                      >
                        {file}
                      </span>
                    ))}
                  </div>

                  <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
                    <span>{t ? `${formatNumber(project.file_count, locale)} archivo(s)` : `${formatNumber(project.file_count, locale)} file(s)`}</span>
                    <span>{formatDateLong(project.updated_at, locale)}</span>
                  </div>
                </article>
              );
            }) : (
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500 lg:col-span-2">
                {t
                  ? "Todavía no hay suficientes proyectos para destacar resultados o configuraciones recientes."
                  : "There are not enough projects yet to highlight recent results or configurations."}
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                {t ? "Recursos" : "Resources"}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">
                {t ? "Biblioteca pública de ejemplos" : "Public example library"}
              </h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <FileIcon className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6 space-y-2.5">
            {dashboard.example_library.length ? dashboard.example_library.map((exampleFile) => {
              const meta = getExampleKindMeta(exampleFile, locale);

              return (
                <div
                  className="rounded-[22px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100/80 px-4 py-3.5"
                  key={exampleFile.relative_path}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {exampleFile.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                        {exampleFile.description}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.badgeClassName}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span>{formatBytes(exampleFile.size_bytes)}</span>
                      <span>{formatDate(exampleFile.updated_at, locale)}</span>
                    </div>
                    <a
                      className="font-semibold text-primary transition hover:text-primary-dark"
                      href={exampleFile.public_url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {t ? "Descargar" : "Download"}
                    </a>
                  </div>
                </div>
              );
            }) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                {t
                  ? "No hay archivos públicos de ejemplo visibles en este momento."
                  : "There are no visible public example files at the moment."}
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
