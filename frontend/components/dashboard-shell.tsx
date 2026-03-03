"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { ReactNode, useEffect, useState } from "react";

import {
  apiFetch,
  buildApiUrl,
  buildStreamUrl,
  encodePathSegments,
  fetchSession,
} from "@/lib/api";
import { Topbar } from "@/components/topbar";
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
    "Selecciona un archivo del árbol para visualizar su contenido.",
  );
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showContentOverride, setShowContentOverride] = useState(false);
  const [runningProject, setRunningProject] = useState<string | null>(null);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [router, pathname]);

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
      const encodedPath = encodePathSegments(item.path);
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
    setPreviewLabel("Salida RMD");
    setPreviewHtml(null);
    setPreviewContent("");
    setShowContentOverride(true);

    source.onmessage = (event) => {
      if (event.data === "---FIN---") {
        setRunningProject(null);
        source.close();
        setPreviewContent((current) =>
          current
            ? `${current}\nAnálisis finalizado. Abre el HTML desde el panel derecho cuando quieras revisarlo.`
            : "Análisis finalizado. Abre el HTML desde el panel derecho cuando quieras revisarlo.",
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

  function renderTree(items: SidebarTreeItem[], isProjectLevel = false) {
    const sortedItems = [...items].sort((left, right) => {
      if (left.type === right.type) {
        return left.name.localeCompare(right.name);
      }
      return left.type === "folder" ? -1 : 1;
    });

    return (
      <ul>
        {sortedItems.map((item) => {
          const isFolder = item.type === "folder";
          const isOpen = Boolean(openFolders[item.path]);

          return (
            <li key={`${item.type}-${item.path}`}>
              {isFolder ? (
                <>
                  <div
                    className="folder-header"
                    onClick={() => toggleFolder(item.path)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="item-main">
                      <Image alt="Carpeta" height={16} src="/images/folder.png" width={16} />
                      <span>{item.name}</span>
                    </div>
                    {isProjectLevel ? (
                      item.html_exists ? (
                        <span className="status-indicator">
                          <Image alt="Completo" height={20} src="/images/check.png" width={20} />
                        </span>
                      ) : (
                        <button
                          className="status-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            runProject(item.name);
                          }}
                          type="button"
                        >
                          {runningProject === item.name ? (
                            <span className="spinner" />
                          ) : (
                            <Image alt="Ejecutar" height={20} src="/images/play.png" width={20} />
                          )}
                        </button>
                      )
                    ) : null}
                  </div>
                  {isOpen && item.children?.length ? (
                    <div className="tree-children">{renderTree(item.children, false)}</div>
                  ) : null}
                </>
              ) : (
                <div
                  className="file-container"
                  onClick={() => void previewFile(item)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    if (!item.username) {
                      return;
                    }
                    const encodedOwner = encodeURIComponent(item.username);
                    const encodedPath = encodePathSegments(item.path);
                    window.open(
                      buildApiUrl(`/api/projects/${encodedOwner}/download/${encodedPath}`),
                      "_blank",
                    );
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="item-main">
                    <Image alt="Archivo" height={16} src="/images/file.png" width={16} />
                    <span>{item.name}</span>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
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
    <>
      <Topbar onLogout={() => void handleLogout()} showLogout />
      <div className="main-container">
        <div className="dashboard">
          <div className="sidebar left">
            <div id="sidebar-left">
              <h3>{leftNav?.title ?? "Menú de Acciones"}</h3>
              <ul>
                {leftNav?.items.map((item) => (
                  <li key={item.url}>
                    <Link href={item.url}>{item.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="content-panel">
            {showContentOverride ? (
              <div className="create-project-box">
                <h2>{previewLabel}</h2>
                <div className="file-view-box">
                  {previewContent ? (
                    <pre className={previewHtml ? "analysis-log" : undefined}>
                      {previewContent}
                    </pre>
                  ) : null}
                  {previewHtml ? (
                    <iframe
                      className="file-preview-frame"
                      srcDoc={previewHtml}
                      title={previewLabel}
                    />
                  ) : null}
                </div>
              </div>
            ) : (
              children
            )}
          </div>
          <div className="sidebar right">
            <div id="sidebar-right">
              <h3>{rightNav?.title ?? "Mis Proyectos"}</h3>
              {rightNav?.items?.length ? (
                renderTree(rightNav.items, true)
              ) : (
                <ul>
                  <li>No hay proyectos.</li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
