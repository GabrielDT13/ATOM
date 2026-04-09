import Image from "next/image";
import Link from "next/link";

import {
  ChartLineIcon,
  CheckIcon,
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
import { buttonStyles } from "@/components/ui/button";
import {
  createEmptyDashboardOverview,
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
  const dashboard = overview ?? createEmptyDashboardOverview();

  const metrics = [
    {
      accentClassName: "bg-sky-100 text-sky-700",
      description: `${formatNumber(dashboard.summary.results_ready)} con informes listos y ${formatNumber(dashboard.summary.pending_analysis)} en preparación.`,
      icon: <FolderIcon className="h-6 w-6" />,
      title: "Proyectos visibles",
      value: formatNumber(dashboard.summary.total_projects),
    },
    {
      accentClassName: "bg-emerald-100 text-emerald-700",
      description: `Cobertura actual del portafolio: ${dashboard.summary.completion_rate}% con resultados accesibles.`,
      icon: <ChartLineIcon className="h-6 w-6" />,
      title: "Entregables listos",
      value: formatNumber(dashboard.summary.results_ready),
    },
    {
      accentClassName: "bg-amber-100 text-amber-700",
      description: `${formatNumber(dashboard.summary.example_files)} archivos públicos de ejemplo y ${formatNumber(dashboard.summary.total_files)} archivos inventariados.`,
      icon: <DatabaseIcon className="h-6 w-6" />,
      title: "Biblioteca de datos",
      value: formatNumber(dashboard.summary.total_files),
    },
    {
      accentClassName: "bg-indigo-100 text-indigo-700",
      description: `${formatNumber(dashboard.summary.distinct_owners)} propietario(s) y catálogo listo para nuevas ejecuciones.`,
      icon: <ScienceIcon className="h-6 w-6" />,
      title: "Flujos disponibles",
      value: formatNumber(dashboard.summary.workflow_count),
    },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[36px] bg-slate-950 px-6 py-8 text-white shadow-[0_32px_80px_rgba(15,23,42,0.28)] sm:px-8 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.28),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.24),_transparent_28%),linear-gradient(135deg,_#0f172a_0%,_#111827_45%,_#0b1120_100%)]" />
        <div className="absolute -left-16 top-10 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative grid gap-8 xl:grid-cols-[1.4fr_0.9fr]">
          <div>
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200">
              Panel Atlantic Omics
            </span>
            <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Analítica visual para entender el estado real de la plataforma
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Consulta proyectos, flujos soportados, archivos de ejemplo y la
              actividad reciente desde una portada pensada para orientar al
              usuario desde el primer acceso.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-slate-200">
                {formatNumber(dashboard.summary.example_files)} archivos de ejemplo
              </span>
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-slate-200">
                {formatNumber(dashboard.summary.workflow_count)} flujos preparados
              </span>
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-slate-200">
                {formatNumber(dashboard.summary.results_ready)} proyectos con salida lista
              </span>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className={buttonStyles({ size: "lg", tone: "on-dark", variant: "secondary" })}
                href="/dashboard/create_project"
              >
                Crear proyecto
              </Link>
              <Link
                className={buttonStyles({ size: "lg", tone: "on-dark", variant: "ghost" })}
                href="/dashboard/projects"
              >
                Ver proyectos
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Panorama actual
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                <div>
                  <p className="text-3xl font-semibold">
                    {dashboard.summary.completion_rate}%
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    Cobertura con resultados
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-semibold">
                    {formatNumber(dashboard.summary.distinct_owners)}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    Espacios activos
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Entrada rápida
              </p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
                  <span className="text-sm text-slate-200">Pendientes de análisis</span>
                  <span className="text-sm font-semibold text-white">
                    {formatNumber(dashboard.summary.pending_analysis)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
                  <span className="text-sm text-slate-200">Ejemplos públicos</span>
                  <span className="text-sm font-semibold text-white">
                    {formatNumber(dashboard.summary.example_files)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
                  <span className="text-sm text-slate-200">Archivos inventariados</span>
                  <span className="text-sm font-semibold text-white">
                    {formatNumber(dashboard.summary.total_files)}
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

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Inicio rápido
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">
                Cómo empezar con un proyecto
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Resumen del flujo recomendado para subir una plantilla, cargar
                datos y revisar resultados desde la plataforma.
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <CheckIcon className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {dashboard.quick_start_steps.length ? dashboard.quick_start_steps.map((step) => (
              <article
                className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5"
                key={step.step}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                    {step.step}
                  </span>
                  <h4 className="text-base font-semibold text-slate-950">
                    {step.title}
                  </h4>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-500">
                  {step.description}
                </p>
              </article>
            )) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center text-sm text-slate-500 md:col-span-3">
                La guía de inicio aparecerá aquí cuando el resumen real del dashboard esté disponible.
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Inventario
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">
                Acceso y tipos de archivo
              </h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <UsersIcon className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Propios
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {formatNumber(dashboard.access_summary.owned_projects)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Compartidos
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {formatNumber(dashboard.access_summary.shared_projects)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Editables
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {formatNumber(dashboard.access_summary.editable_projects)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Plantillas
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {formatNumber(dashboard.file_breakdown.templates)}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
              <span className="text-sm text-slate-600">Resultados HTML</span>
              <span className="text-sm font-semibold text-slate-950">
                {formatNumber(dashboard.file_breakdown.results)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
              <span className="text-sm text-slate-600">Archivos adicionales</span>
              <span className="text-sm font-semibold text-slate-950">
                {formatNumber(dashboard.file_breakdown.additional)}
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
                Tipos de análisis
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">
                Flujos visibles para el usuario final
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Los flujos se muestran a partir de los scripts reales detectados
                en la plataforma y de su relación con el inventario actual.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {formatNumber(dashboard.workflows.length)} disponibles
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
                          ? `${formatNumber(workflow.project_matches)} proyecto(s)`
                          : "Sin proyectos vinculados"}
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
                          alt={`Ilustración de ${workflow.title}`}
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
                No se han detectado scripts de análisis disponibles en este momento.
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Actividad reciente
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">
                Últimos movimientos visibles
              </h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <DashboardIcon className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Eventos
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {formatNumber(dashboard.activity_summary.total_events)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Última señal
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {dashboard.activity_summary.last_event_at
                  ? formatDateTime(dashboard.activity_summary.last_event_at)
                  : "Sin registros"}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-600">
                Completados
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-700">
                {formatNumber(dashboard.activity_summary.analyses_completed)}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-amber-600">
                Con incidencias
              </p>
              <p className="mt-2 text-2xl font-semibold text-amber-700">
                {formatNumber(dashboard.activity_summary.analyses_failed)}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {dashboard.recent_activity.length ? dashboard.recent_activity.map((item) => {
              const meta = getDashboardActivityMeta(item);

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
                          {formatDate(item.created_at)}
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
                Aún no se han registrado movimientos recientes de proyectos o ejecuciones.
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
                Proyectos
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">
                Proyectos destacados
              </h3>
            </div>
            <Link
              className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              href="/dashboard/projects"
            >
              Abrir inventario
            </Link>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {dashboard.featured_projects.length ? dashboard.featured_projects.map((project) => {
              const statusMeta = getStatusMeta(project.status, project.active_run);

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
                    {getProjectSupportingText(project)}
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
                    <span>{formatNumber(project.file_count)} archivo(s)</span>
                    <span>{formatDateLong(project.updated_at)}</span>
                  </div>
                </article>
              );
            }) : (
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500 lg:col-span-2">
                Todavía no hay suficientes proyectos para destacar resultados o configuraciones recientes.
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Recursos
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">
                Biblioteca pública de ejemplos
              </h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <FileIcon className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6 space-y-2.5">
            {dashboard.example_library.length ? dashboard.example_library.map((exampleFile) => {
              const meta = getExampleKindMeta(exampleFile);

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
                      <span>{formatDate(exampleFile.updated_at)}</span>
                    </div>
                    <a
                      className="font-semibold text-primary transition hover:text-primary-dark"
                      href={exampleFile.public_url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Descargar
                    </a>
                  </div>
                </div>
              );
            }) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                No hay archivos públicos de ejemplo visibles en este momento.
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
