"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  ApiError,
  apiFetch,
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
                {children}
              </section>

              {showProjectExplorer ? (
                <ProjectExplorer
                  isCollapsed={projectExplorerCollapsed}
                  isMobileOpen={mobileProjectExplorerOpen}
                  items={rightNav?.items ?? []}
                  onCloseMobile={() => setMobileProjectExplorerOpen(false)}
                  onToggleCollapse={() => setProjectExplorerCollapsed((current) => !current)}
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
