"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAppToast } from "@/hooks/use-app-toast";
import { buildProjectDetailHref, listProjects } from "@/lib/projects";
import { buttonStyles } from "@/components/ui/button";
import {
  PlusIcon,
  ProjectStackIcon,
  ReportSparkIcon,
} from "@/components/projects/project-management-icons";
import { buildProjectRecords } from "@/components/projects/project-management-utils";
import { ReportManagementBoard } from "@/components/reports/report-management-board";
import { ReportManagementFilters } from "@/components/reports/report-management-filters";
import { ReportManagementSummary } from "@/components/reports/report-management-summary";
import { ReportManagementTable } from "@/components/reports/report-management-table";
import {
  buildReportRecords,
  filterReports,
  getReportEntities,
  getReportOwners,
  getReportSummaryMetrics,
  type ReportEntityFilter,
  type ReportOwnerFilter,
  type ReportRecord,
  type ReportViewMode,
} from "@/components/reports/report-management-utils";

const REPORT_VIEW_STORAGE_KEY = "atom.report-management.view";

function hasActiveAnalysisRun(reports: ReturnType<typeof buildProjectRecords>) {
  return reports.some(
    (project) => project.activeRun?.status === "queued" || project.activeRun?.status === "running",
  );
}

export function ReportManagement() {
  const router = useRouter();
  const appToast = useAppToast();
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<ReportOwnerFilter>("all");
  const [entityFilter, setEntityFilter] = useState<ReportEntityFilter>("all");
  const [viewMode, setViewMode] = useState<ReportViewMode>("list");
  const [viewPreferenceLoaded, setViewPreferenceLoaded] = useState(false);
  const [hasRunningAnalysis, setHasRunningAnalysis] = useState(false);

  const loadReports = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }

    try {
      const payload = await listProjects();
      const projectRecords = buildProjectRecords(payload.items);
      setReports(buildReportRecords(projectRecords));
      setHasRunningAnalysis(hasActiveAnalysisRun(projectRecords));
    } catch (loadError) {
      if (!options?.silent) {
        appToast.error(
          "No se pudieron cargar los informes",
          loadError instanceof Error ? loadError.message : undefined,
        );
        setReports([]);
      }
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [appToast]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedViewMode = window.localStorage.getItem(REPORT_VIEW_STORAGE_KEY);
    if (storedViewMode === "list" || storedViewMode === "board") {
      setViewMode(storedViewMode);
    }
    setViewPreferenceLoaded(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !viewPreferenceLoaded) {
      return;
    }

    window.localStorage.setItem(REPORT_VIEW_STORAGE_KEY, viewMode);
  }, [viewMode, viewPreferenceLoaded]);

  const owners = useMemo(() => getReportOwners(reports), [reports]);
  const entities = useMemo(() => getReportEntities(reports), [reports]);
  const metrics = useMemo(() => getReportSummaryMetrics(reports), [reports]);
  const filteredReports = useMemo(
    () => filterReports(reports, search, ownerFilter, entityFilter),
    [entityFilter, ownerFilter, reports, search],
  );

  useEffect(() => {
    let cancelled = false;

    async function refreshReports() {
      if (cancelled) {
        return;
      }

      try {
        await loadReports({ silent: true });
      } catch {
        // Evita romper la vista por una revalidación periódica.
      }
    }

    function handleVisibilityRefresh() {
      if (document.visibilityState === "visible") {
        void refreshReports();
      }
    }

    function handleWindowFocus() {
      void refreshReports();
    }

    document.addEventListener("visibilitychange", handleVisibilityRefresh);
    window.addEventListener("focus", handleWindowFocus);

    let intervalId: number | null = null;
    if (hasRunningAnalysis) {
      intervalId = window.setInterval(() => {
        void refreshReports();
      }, 5000);
    }

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
      window.removeEventListener("focus", handleWindowFocus);
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [hasRunningAnalysis, loadReports]);

  return (
    <div className="flex flex-col gap-6">
      <section className="page-hero-surface overflow-hidden rounded-[32px] border border-white/10 p-6 sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="page-hero-badge gap-2 rounded-full px-3 py-1">
              <ReportSparkIcon />
              Informes
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Biblioteca de informes generados
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Revisa todos los informes HTML ya publicados, ábrelos rápido y salta al contexto
              completo del proyecto desde board o lista.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                {metrics.totalReports} informe{metrics.totalReports === 1 ? "" : "s"} listos
              </span>
              <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                {metrics.totalProjects} proyecto{metrics.totalProjects === 1 ? "" : "s"} con resultados
              </span>
              {hasRunningAnalysis ? (
                <span className="inline-flex items-center rounded-full border border-emerald-200/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                  Catálogo autoactualizable activo
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              className={buttonStyles({ size: "lg", tone: "on-dark", variant: "secondary" })}
              href="/dashboard/projects"
            >
              <ProjectStackIcon className="h-4 w-4" />
              Ver proyectos
            </Link>

            <Link
              className={buttonStyles({ size: "lg", tone: "on-dark", variant: "secondary" })}
              href="/dashboard/create_project"
            >
              <PlusIcon />
              Crear proyecto
            </Link>
          </div>
        </div>
      </section>

      <ReportManagementSummary loading={loading} reports={reports} />
      <ReportManagementFilters
        entities={entities}
        entityFilter={entityFilter}
        onEntityFilterChange={setEntityFilter}
        onOwnerFilterChange={setOwnerFilter}
        onSearchChange={setSearch}
        onViewModeChange={setViewMode}
        ownerFilter={ownerFilter}
        owners={owners}
        search={search}
        viewMode={viewMode}
      />

      {viewMode === "board" ? (
        <ReportManagementBoard
          loading={loading}
          onOpenProject={(report) => router.push(buildProjectDetailHref(report.routeRef))}
          onOpenReport={(report) => router.push(report.primaryReportHref)}
          reports={filteredReports}
        />
      ) : (
        <ReportManagementTable
          loading={loading}
          onOpenProject={(report) => router.push(buildProjectDetailHref(report.routeRef))}
          onOpenReport={(report) => router.push(report.primaryReportHref)}
          reports={filteredReports}
        />
      )}
    </div>
  );
}
