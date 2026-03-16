"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  ApiError,
  apiFetch,
  buildStreamUrl,
  fetchSession,
  subscribeToAuthFailure,
} from "@/lib/api";
import { AppHeader } from "@/components/dashboard/app-header";
import { Button } from "@/components/ui/button";
import {
  buildDashboardBreadcrumbs,
  DashboardBreadcrumb,
} from "@/components/dashboard/dashboard-breadcrumb";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { ProjectExplorer } from "@/components/dashboard/project-explorer";
import type {
  SessionResponse,
  SidebarLink,
  SidebarProjectItem,
  SidebarResponse,
} from "@/types/api";

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [leftNav, setLeftNav] =
    useState<SidebarResponse<SidebarLink> | null>(null);
  const [rightNav, setRightNav] =
    useState<SidebarResponse<SidebarProjectItem> | null>(null);
  const [previewLabel, setPreviewLabel] = useState<string>("Estado de la ejecución");
  const [previewContent, setPreviewContent] = useState<string>(
    "Inicia una ejecución desde el panel lateral para seguir aquí su progreso.",
  );
  const [showContentOverride, setShowContentOverride] = useState(false);
  const [runningProject, setRunningProject] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileProjectExplorerOpen, setMobileProjectExplorerOpen] = useState(false);
  const [projectExplorerCollapsed, setProjectExplorerCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const showProjectExplorer = pathname === "/dashboard";

  useEffect(() => {
    setMobileSidebarOpen(false);
    setMobileProjectExplorerOpen(false);
    setShowContentOverride(false);
  }, [pathname]);

  useEffect(() => {
    return subscribeToAuthFailure(() => {
      setSession(null);
      setLeftNav(null);
      setRightNav(null);
      setError(null);
      router.replace("/login");
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadShell() {
      try {
        const currentSession = await fetchSession();
        if (cancelled) {
          return;
        }

        if (!currentSession.authenticated || !currentSession.user) {
          router.push("/login");
          return;
        }

        setSession(currentSession);

        const [leftData, rightData] = await Promise.all([
          apiFetch<SidebarResponse<SidebarLink>>("/api/navigation/sidebar-left"),
          apiFetch<SidebarResponse<SidebarProjectItem>>(
            "/api/navigation/sidebar-right",
          ),
        ]);

        if (cancelled) {
          return;
        }

        setLeftNav(leftData);
        setRightNav(rightData);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        if (loadError instanceof ApiError && loadError.status === 401) {
          setSession(null);
          router.replace("/login");
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el panel",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadShell();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  async function handleLogout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Incluso si falla la revocación remota, la UI debe salir del dashboard.
    }
    setSession(null);
    router.replace("/login");
    router.refresh();
  }

  async function refreshRightNav() {
    const payload = await apiFetch<SidebarResponse<SidebarProjectItem>>(
      "/api/navigation/sidebar-right",
    );
    setRightNav(payload);
  }

  function runProject(projectName: string) {
    const source = new EventSource(
      buildStreamUrl(
        `/api/analysis/run?project_name=${encodeURIComponent(projectName)}`,
      ),
      { withCredentials: true },
    );

    setRunningProject(projectName);
    setPreviewLabel(`Ejecución de ${projectName}`);
    setPreviewContent("");
    setShowContentOverride(true);

    source.onmessage = (event) => {
      if (event.data === "---FIN---") {
        setRunningProject(null);
        source.close();
        setPreviewContent((current) =>
          current
            ? `${current}\nAnálisis finalizado. Abre el HTML desde el panel de proyectos cuando quieras revisarlo.`
            : "Análisis finalizado. Abre el HTML desde el panel de proyectos cuando quieras revisarlo.",
        );
        void refreshRightNav().catch(() => {
          setPreviewContent((current) =>
            current
              ? `${current}\nNo se pudo refrescar la lista de archivos generados.`
              : "No se pudo refrescar la lista de archivos generados.",
          );
        });
        return;
      }

      setPreviewContent((current) =>
        current ? `${current}\n${event.data}` : event.data,
      );
    };

    source.onerror = () => {
      setRunningProject(null);
      setPreviewContent((current) =>
        current
          ? `${current}\nError en el stream del análisis.`
          : "Error en el stream del análisis.",
      );
      source.close();
    };
  }

  if (loading) {
    return <div className="screen-center">Cargando panel...</div>;
  }

  if (error) {
    return <div className="screen-center error-panel">{error}</div>;
  }

  if (!session?.authenticated || !session.user) {
    return <div className="screen-center">Redirigiendo...</div>;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100">
      <AppSidebar
        currentPathname={pathname}
        isCollapsed={sidebarCollapsed}
        isMobileOpen={mobileSidebarOpen}
        items={leftNav?.items ?? []}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onLogout={() => void handleLogout()}
        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
      />

      <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-50">
        <AppHeader
          onOpenSidebar={() => setMobileSidebarOpen(true)}
          user={session.user}
        />

        <div className="flex-1 overflow-y-auto">
          <DashboardBreadcrumb items={buildDashboardBreadcrumbs(pathname)} />

          <div className="p-4 sm:p-8">
            {showProjectExplorer ? (
              <div className="mb-4 flex items-center justify-end xl:hidden">
                <Button
                  onClick={() => setMobileProjectExplorerOpen(true)}
                  size="sm"
                  variant="ghost"
                >
                  Proyectos
                </Button>
              </div>
            ) : null}

            <div className={`flex flex-col gap-6 ${showProjectExplorer ? "xl:flex-row" : ""}`}>
              <section className={`min-w-0 ${showProjectExplorer ? "flex-1" : ""}`}>
                {showContentOverride ? (
                  <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Vista previa
                        </p>
                        <h2 className="text-lg font-bold text-slate-900">{previewLabel}</h2>
                      </div>
                    </div>

                    <div className="mt-5 min-h-[20rem] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <pre className="min-h-[20rem] overflow-auto px-4 py-4 text-sm leading-6 text-slate-700">
                        {previewContent}
                      </pre>
                    </div>
                  </section>
                ) : (
                  children
                )}
              </section>

              {showProjectExplorer ? (
                <ProjectExplorer
                  isCollapsed={projectExplorerCollapsed}
                  isMobileOpen={mobileProjectExplorerOpen}
                  items={rightNav?.items ?? []}
                  onCloseMobile={() => setMobileProjectExplorerOpen(false)}
                  onRunProject={(projectName) => runProject(projectName)}
                  onToggleCollapse={() => setProjectExplorerCollapsed((current) => !current)}
                  runningProject={runningProject}
                  title={rightNav?.title ?? "Mis proyectos"}
                />
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
