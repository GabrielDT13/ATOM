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
import { ForcedPasswordChangeDialog } from "@/components/dashboard/forced-password-change-dialog";
import { WelcomeTour } from "@/components/dashboard/welcome-tour";
import { Button } from "@/components/ui/button";
import {
  buildDashboardBreadcrumbs,
  DashboardBreadcrumb,
} from "@/components/dashboard/dashboard-breadcrumb";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { ProjectExplorer } from "@/components/dashboard/project-explorer";
import { useLocale } from "@/components/providers/locale-provider";
import { useAppToast } from "@/hooks/use-app-toast";
import { persistDarkModePreference } from "@/lib/theme";
import type {
  ProfileRecord,
  ProfileMutationResponse,
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
  const appToast = useAppToast();
  const { syncProfileLocale } = useLocale();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [leftNav, setLeftNav] =
    useState<SidebarResponse<SidebarLink> | null>(null);
  const [rightNav, setRightNav] =
    useState<SidebarResponse<SidebarProjectItem> | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileProjectExplorerOpen, setMobileProjectExplorerOpen] = useState(false);
  const [projectExplorerCollapsed, setProjectExplorerCollapsed] = useState(false);
  const [passwordChangeSubmitting, setPasswordChangeSubmitting] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const showProjectExplorer = pathname === "/dashboard";
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@atom.local";

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
      setTourOpen(false);
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

        const [leftData, rightData, profileData] = await Promise.all([
          apiFetch<SidebarResponse<SidebarLink>>("/api/navigation/sidebar-left"),
          apiFetch<SidebarResponse<SidebarProjectItem>>(
            "/api/navigation/sidebar-right",
          ),
          apiFetch<ProfileRecord>("/api/profile/me"),
        ]);

        if (cancelled) {
          return;
        }

        setLeftNav(leftData);
        setRightNav(rightData);
        persistDarkModePreference(Boolean(profileData.preferences.dark_mode));
        syncProfileLocale(profileData.preferences);
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
  }, [pathname, router, syncProfileLocale]);

  useEffect(() => {
    if (!showProjectExplorer || !session?.authenticated || !session.user) {
      return;
    }

    let cancelled = false;

    async function refreshRightNav() {
      try {
        const rightData = await apiFetch<SidebarResponse<SidebarProjectItem>>(
          "/api/navigation/sidebar-right",
        );

        if (!cancelled) {
          setRightNav(rightData);
        }
      } catch {
        // Evita romper el shell por un refresh periódico.
      }
    }

    function handleVisibilityRefresh() {
      if (document.visibilityState === "visible") {
        void refreshRightNav();
      }
    }

    function handleWindowFocus() {
      void refreshRightNav();
    }

    void refreshRightNav();

    const intervalId = window.setInterval(() => {
      void refreshRightNav();
    }, 5000);

    document.addEventListener("visibilitychange", handleVisibilityRefresh);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [session, showProjectExplorer]);

  useEffect(() => {
    if (
      session?.authenticated
      && session.user
      && !session.user.must_change_password
      && session.user.welcome_tour_seen === false
    ) {
      setTourOpen(true);
    }
  }, [session]);

  function updateSessionFlags(nextFlags: Partial<NonNullable<SessionResponse["user"]>>) {
    setSession((current) => {
      if (!current?.user) {
        return current;
      }

      return {
        ...current,
        user: {
          ...current.user,
          ...nextFlags,
        },
      };
    });
  }

  async function refreshSessionState() {
    const nextSession = await fetchSession();
    setSession(nextSession);
    return nextSession;
  }

  async function handleLogout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Incluso si falla la revocación remota, la UI debe salir del dashboard.
    }
    setSession(null);
    setTourOpen(false);
    router.replace("/login");
    router.refresh();
  }

  async function handleRequiredPasswordChange(newPassword: string) {
    setPasswordChangeSubmitting(true);

    const request = apiFetch<ProfileMutationResponse>("/api/profile/me/password/required", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        new_password: newPassword,
      }),
    }).then((response) => {
      if (!response.success) {
        throw new Error(response.message || "No se pudo actualizar la contraseña");
      }
      return response;
    });

    appToast.promise(request, {
      loading: {
        title: "Guardando contraseña",
        description: "Actualizando acceso inicial seguro.",
      },
      success: {
        title: "Contraseña actualizada",
        description: "Ya puedes continuar con la plataforma.",
      },
      error: {
        title: (submitError) =>
          submitError instanceof Error ? submitError.message : "No se pudo actualizar la contraseña",
        description: "Revisa la nueva contraseña e inténtalo otra vez.",
      },
    });

    try {
      await request;
      const nextSession = await refreshSessionState();
      if (!nextSession.user?.welcome_tour_seen) {
        setTourOpen(true);
      }
      router.refresh();
    } catch {
      // El feedback ya se muestra en el toast.
    } finally {
      setPasswordChangeSubmitting(false);
    }
  }

  async function persistWelcomeTourSeen() {
    updateSessionFlags({ welcome_tour_seen: true });

    try {
      await apiFetch<ProfileMutationResponse>("/api/profile/me/welcome-tour/seen", {
        method: "POST",
      });
    } catch {
      // Mantiene la guía cerrada en la sesión actual aunque falle persistencia remota.
    }
  }

  function handleOpenTour() {
    setTourOpen(true);
  }

  function handleCloseTour() {
    setTourOpen(false);
    if (session?.user?.welcome_tour_seen === false) {
      void persistWelcomeTourSeen();
    }
  }

  function handleFinishTour() {
    setTourOpen(false);
    if (session?.user?.welcome_tour_seen === false) {
      void persistWelcomeTourSeen();
    }
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
          onOpenHelp={handleOpenTour}
          onOpenSidebar={() => setMobileSidebarOpen(true)}
          supportEmail={supportEmail}
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

      <ForcedPasswordChangeDialog
        onSubmit={(nextPassword) => void handleRequiredPasswordChange(nextPassword)}
        open={Boolean(session.user.must_change_password)}
        submitting={passwordChangeSubmitting}
        userLabel={session.user.display_name ?? session.user.username}
      />

      <WelcomeTour
        onClose={handleCloseTour}
        onFinish={handleFinishTour}
        open={tourOpen && !session.user.must_change_password}
        pathname={pathname}
      />
    </div>
  );
}
