"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  apiFetch,
  buildStreamUrl,
  fetchSession,
} from "@/lib/api";
import { AppHeader } from "@/components/dashboard/app-header";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { ProjectExplorer } from "@/components/dashboard/project-explorer";
import type {
  FileContentResponse,
  SessionResponse,
  SidebarLink,
  SidebarResponse,
  SidebarTreeItem,
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
    useState<SidebarResponse<SidebarTreeItem> | null>(null);
  const [previewLabel, setPreviewLabel] = useState<string>("Sin selección");
  const [previewContent, setPreviewContent] = useState<string>(
    "Selecciona un archivo del panel de proyectos para visualizar su contenido.",
  );
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showContentOverride, setShowContentOverride] = useState(false);
  const [runningProject, setRunningProject] = useState<string | null>(null);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const showProjectExplorer = pathname === "/dashboard";

  useEffect(() => {
    setMobileSidebarOpen(false);
    setShowContentOverride(false);
    setPreviewHtml(null);
  }, [pathname]);

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
          apiFetch<SidebarResponse<SidebarTreeItem>>(
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
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function previewFile(item: SidebarTreeItem) {
    if (!item.username) {
      return;
    }

    try {
      const encodedOwner = encodeURIComponent(item.username);
      const encodedPath = item.path
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
      const isHtml = item.name.toLowerCase().endsWith(".html");
      const payload = await apiFetch<FileContentResponse>(
        isHtml
          ? `/api/projects/${encodedOwner}/files/${encodedPath}`
          : `/api/projects/${encodedOwner}/files/${encodedPath}?max_lines=30`,
      );

      setPreviewLabel(item.path);
      setPreviewHtml(isHtml ? payload.content : null);
      setPreviewContent(
        isHtml
          ? ""
          : payload.truncated
            ? `${payload.content}\n...`
            : payload.content,
      );
      setShowContentOverride(true);
    } catch (previewError) {
      setPreviewLabel(item.path);
      setPreviewHtml(null);
      setPreviewContent(
        previewError instanceof Error
          ? previewError.message
          : "No se pudo leer el archivo",
      );
      setShowContentOverride(true);
    }
  }

  async function refreshRightNav() {
    const payload = await apiFetch<SidebarResponse<SidebarTreeItem>>(
      "/api/navigation/sidebar-right",
    );
    setRightNav(payload);
  }

  function toggleFolder(path: string) {
    setOpenFolders((current) => ({
      ...current,
      [path]: !current[path],
    }));
  }

  function runProject(projectName: string) {
    const source = new EventSource(
      buildStreamUrl(
        `/api/analysis/run?project_name=${encodeURIComponent(projectName)}`,
      ),
      { withCredentials: true },
    );

    setRunningProject(projectName);
    setPreviewLabel("Salida del análisis");
    setPreviewHtml(null);
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

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
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
                    {previewContent ? (
                      <pre
                        className={`overflow-auto px-4 py-4 text-sm leading-6 text-slate-700 ${
                          previewHtml ? "max-h-80 border-b border-slate-200" : "min-h-[20rem]"
                        }`}
                      >
                        {previewContent}
                      </pre>
                    ) : null}

                    {previewHtml ? (
                      <iframe
                        className="min-h-[34rem] w-full bg-white"
                        srcDoc={previewHtml}
                        title={previewLabel}
                      />
                    ) : null}
                  </div>
                </section>
              ) : (
                children
              )}
            </section>

            {showProjectExplorer ? (
              <ProjectExplorer
                items={rightNav?.items ?? []}
                onPreviewFile={(item) => void previewFile(item)}
                onRunProject={(projectName) => runProject(projectName)}
                onToggleFolder={toggleFolder}
                openFolders={openFolders}
                runningProject={runningProject}
                title={rightNav?.title ?? "Mis proyectos"}
              />
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
