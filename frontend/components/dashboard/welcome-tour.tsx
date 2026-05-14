"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CloseIcon,
  QuestionCircleIcon,
} from "@/components/dashboard/dashboard-icons";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";

type WelcomeTourProps = {
  onClose: () => void;
  onFinish: () => void;
  open: boolean;
  pathname: string;
};

type TourStep = {
  description: string;
  id: string;
  route: string;
  selector: string;
  title: string;
};

type SpotlightRect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

type PanelConnectorSide = "bottom" | "floating" | "left" | "right" | "top";

type TourPanelPosition = {
  className: string;
  connectorSide: PanelConnectorSide;
  style?: CSSProperties;
};

type ManualPanelPosition = {
  x: number;
  y: number;
};

type PointerStyle = {
  beaconStyle: CSSProperties;
  className: string;
  nubStyle: CSSProperties;
};

type Locale = "en" | "es";

const DEFAULT_PANEL_POSITION: TourPanelPosition = {
  className: "bottom-4 left-4 right-4 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[24rem] lg:w-[25rem]",
  connectorSide: "floating",
};

function getTourSteps(locale: Locale): TourStep[] {
  return locale === "es"
    ? [
        {
          id: "dashboard",
          route: "/dashboard",
          selector: "[data-tour='dashboard-hero']",
          title: "Dashboard principal",
          description: "Aquí ves estado general, métricas y accesos rápidos para arrancar trabajo.",
        },
        {
          id: "sidebar",
          route: "/dashboard",
          selector: "[data-tour='sidebar-nav']",
          title: "Menú lateral",
          description: "Desde menú entras en dashboard, proyectos, equipos, usuarios y perfil.",
        },
        {
          id: "explorer",
          route: "/dashboard",
          selector: "[data-tour='project-explorer']",
          title: "Acceso rápido a proyectos",
          description: "Panel derecho resume proyectos activos y te lleva a ejecución o detalle en un clic.",
        },
        {
          id: "create-project",
          route: "/dashboard/create_project",
          selector: "[data-tour='create-project-form']",
          title: "Crear proyecto",
          description: "Sube plantilla Excel, añade archivos y vincula entidad o equipo desde esta vista.",
        },
        {
          id: "project-library",
          route: "/dashboard/projects",
          selector: "[data-tour='project-library']",
          title: "Biblioteca e informes",
          description: "Aquí filtras proyectos, revisas estados y abres detalles o informes publicados.",
        },
        {
          id: "help",
          route: "/dashboard",
          selector: "[data-tour='header-help']",
          title: "Ayuda siempre visible",
          description: "Este icono reabre manual cuando quieras y te deja contactar soporte.",
        },
      ]
    : [
        {
          id: "dashboard",
          route: "/dashboard",
          selector: "[data-tour='dashboard-hero']",
          title: "Main dashboard",
          description: "Here you see overall status, metrics and shortcuts to start working fast.",
        },
        {
          id: "sidebar",
          route: "/dashboard",
          selector: "[data-tour='sidebar-nav']",
          title: "Side menu",
          description: "From menu you enter dashboard, projects, teams, users and profile.",
        },
        {
          id: "explorer",
          route: "/dashboard",
          selector: "[data-tour='project-explorer']",
          title: "Quick project access",
          description: "Right panel summarizes active projects and takes you to run or detail in one click.",
        },
        {
          id: "create-project",
          route: "/dashboard/create_project",
          selector: "[data-tour='create-project-form']",
          title: "Create project",
          description: "Upload Excel template, add files and link entity or team from this view.",
        },
        {
          id: "project-library",
          route: "/dashboard/projects",
          selector: "[data-tour='project-library']",
          title: "Library and reports",
          description: "Here you filter projects, review statuses and open details or published reports.",
        },
        {
          id: "help",
          route: "/dashboard",
          selector: "[data-tour='header-help']",
          title: "Always-visible help",
          description: "This icon reopens guide anytime and lets you contact support.",
        },
      ];
}

function resolveRect(selector: string): SpotlightRect | null {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();
  const padding = 12;

  return {
    top: Math.max(8, rect.top - padding),
    left: Math.max(8, rect.left - padding),
    width: Math.min(window.innerWidth - 16, rect.width + padding * 2),
    height: Math.min(window.innerHeight - 16, rect.height + padding * 2),
  };
}

function clampManualPosition(position: ManualPanelPosition, panelRect: DOMRect | null): ManualPanelPosition {
  if (typeof window === "undefined" || !panelRect || window.innerWidth < 640) {
    return position;
  }

  const margin = 24;
  const maxX = Math.max(margin, window.innerWidth - panelRect.width - margin);
  const maxY = Math.max(margin, window.innerHeight - panelRect.height - margin);

  return {
    x: Math.min(Math.max(margin, position.x), maxX),
    y: Math.min(Math.max(margin, position.y), maxY),
  };
}

function resolvePanelPosition(
  spotlightRect: SpotlightRect | null,
  panelRect: DOMRect | null,
): TourPanelPosition {
  if (typeof window === "undefined" || !spotlightRect || !panelRect || window.innerWidth < 640) {
    return DEFAULT_PANEL_POSITION;
  }

  const gap = 24;
  const margin = 24;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const panelWidth = panelRect.width;
  const panelHeight = panelRect.height;

  const spaces = {
    right: viewportWidth - (spotlightRect.left + spotlightRect.width) - margin,
    left: spotlightRect.left - margin,
    bottom: viewportHeight - (spotlightRect.top + spotlightRect.height) - margin,
    top: spotlightRect.top - margin,
  };

  const canFitRight = spaces.right >= panelWidth + gap;
  const canFitLeft = spaces.left >= panelWidth + gap;
  const canFitBottom = spaces.bottom >= panelHeight + gap;
  const canFitTop = spaces.top >= panelHeight + gap;

  const centeredTop = Math.min(
    Math.max(margin, spotlightRect.top + spotlightRect.height / 2 - panelHeight / 2),
    Math.max(margin, viewportHeight - panelHeight - margin),
  );
  const centeredLeft = Math.min(
    Math.max(margin, spotlightRect.left + spotlightRect.width / 2 - panelWidth / 2),
    Math.max(margin, viewportWidth - panelWidth - margin),
  );

  if (canFitRight) {
    return {
      className: "w-[24rem] lg:w-[25rem]",
      connectorSide: "left",
      style: {
        left: spotlightRect.left + spotlightRect.width + gap,
        top: centeredTop,
      },
    };
  }

  if (canFitLeft) {
    return {
      className: "w-[24rem] lg:w-[25rem]",
      connectorSide: "right",
      style: {
        left: Math.max(margin, spotlightRect.left - panelWidth - gap),
        top: centeredTop,
      },
    };
  }

  if (canFitBottom) {
    return {
      className: "w-[24rem] lg:w-[25rem]",
      connectorSide: "top",
      style: {
        left: centeredLeft,
        top: spotlightRect.top + spotlightRect.height + gap,
      },
    };
  }

  if (canFitTop) {
    return {
      className: "w-[24rem] lg:w-[25rem]",
      connectorSide: "bottom",
      style: {
        left: centeredLeft,
        top: Math.max(margin, spotlightRect.top - panelHeight - gap),
      },
    };
  }

  return {
    className: "bottom-4 right-4 sm:bottom-6 sm:right-6 w-[24rem] lg:w-[25rem]",
    connectorSide: "floating",
  };
}

function getPointerStyle(
  panelRect: DOMRect | null,
  spotlightRect: SpotlightRect | null,
  connectorSide: PanelConnectorSide,
): PointerStyle | null {
  if (!panelRect || !spotlightRect || connectorSide === "floating") {
    return null;
  }

  const spotlightCenterX = spotlightRect.left + spotlightRect.width / 2;
  const spotlightCenterY = spotlightRect.top + spotlightRect.height / 2;
  const localCenterX = spotlightCenterX - panelRect.left;
  const localCenterY = spotlightCenterY - panelRect.top;
  const padding = 28;

  if (connectorSide === "left") {
    const top = Math.min(Math.max(padding, localCenterY), panelRect.height - padding);
    return {
      className: "tour-panel-pointer tour-panel-pointer-left",
      nubStyle: { top },
      beaconStyle: { top },
    };
  }

  if (connectorSide === "right") {
    const top = Math.min(Math.max(padding, localCenterY), panelRect.height - padding);
    return {
      className: "tour-panel-pointer tour-panel-pointer-right",
      nubStyle: { top },
      beaconStyle: { top },
    };
  }

  if (connectorSide === "top") {
    const left = Math.min(Math.max(padding, localCenterX), panelRect.width - padding);
    return {
      className: "tour-panel-pointer tour-panel-pointer-top",
      nubStyle: { left },
      beaconStyle: { left },
    };
  }

  const left = Math.min(Math.max(padding, localCenterX), panelRect.width - padding);
  return {
    className: "tour-panel-pointer tour-panel-pointer-bottom",
    nubStyle: { left },
    beaconStyle: { left },
  };
}

export function WelcomeTour({
  onClose,
  onFinish,
  open,
  pathname,
}: WelcomeTourProps) {
  const { locale } = useLocale();
  const tourSteps = useMemo(() => getTourSteps(locale), [locale]);
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    offsetX: number;
    offsetY: number;
    pointerId: number | null;
  }>({
    offsetX: 0,
    offsetY: 0,
    pointerId: null,
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [panelPosition, setPanelPosition] = useState<TourPanelPosition>(DEFAULT_PANEL_POSITION);
  const [manualPosition, setManualPosition] = useState<ManualPanelPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const [panelRect, setPanelRect] = useState<DOMRect | null>(null);
  const activeStep = tourSteps[stepIndex];
  const isLastStep = stepIndex === tourSteps.length - 1;
  const routeReady = pathname === activeStep.route;

  useEffect(() => {
    if (!open) {
      setStepIndex(0);
      setSpotlightRect(null);
      setPanelPosition(DEFAULT_PANEL_POSITION);
      setManualPosition(null);
      setDragging(false);
      setPanelRect(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (pathname !== activeStep.route) {
      startTransition(() => {
        router.push(activeStep.route);
      });
    }
  }, [activeStep.route, open, pathname, router]);

  useEffect(() => {
    if (!open || !routeReady) {
      setSpotlightRect(null);
      return;
    }

    let disposed = false;
    let retryTimeoutId: number | null = null;

    const refreshSpotlight = () => {
      if (disposed) {
        return;
      }

      const element = document.querySelector<HTMLElement>(activeStep.selector);
      if (!element) {
        retryTimeoutId = window.setTimeout(refreshSpotlight, 140);
        return;
      }

      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });

      window.setTimeout(() => {
        if (!disposed) {
          setSpotlightRect(resolveRect(activeStep.selector));
        }
      }, 180);
    };

    refreshSpotlight();
    const handleResize = () => setSpotlightRect(resolveRect(activeStep.selector));
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    return () => {
      disposed = true;
      if (retryTimeoutId) {
        window.clearTimeout(retryTimeoutId);
      }
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [activeStep.selector, open, routeReady]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const updatePanelMetrics = () => {
      const nextRect = panelRef.current?.getBoundingClientRect() ?? null;
      setPanelRect(nextRect);

      if (manualPosition) {
        if (nextRect) {
          setManualPosition((current) => (current ? clampManualPosition(current, nextRect) : current));
        }
        return;
      }

      setPanelPosition(resolvePanelPosition(spotlightRect, nextRect));
    };

    updatePanelMetrics();

    const resizeObserver =
      typeof ResizeObserver !== "undefined" && panelRef.current
        ? new ResizeObserver(() => updatePanelMetrics())
        : null;

    if (resizeObserver && panelRef.current) {
      resizeObserver.observe(panelRef.current);
    }

    window.addEventListener("resize", updatePanelMetrics);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updatePanelMetrics);
    };
  }, [manualPosition, open, spotlightRect, stepIndex]);

  const stepLabel = useMemo(
    () => `${stepIndex + 1} / ${tourSteps.length}`,
    [stepIndex, tourSteps.length],
  );

  const pointerStyle = useMemo(
    () =>
      getPointerStyle(
        panelRect,
        spotlightRect,
        manualPosition ? "floating" : panelPosition.connectorSide,
      ),
    [manualPosition, panelPosition.connectorSide, panelRect, spotlightRect],
  );

  const sectionClassName = manualPosition
    ? "pointer-events-auto absolute w-[24rem] lg:w-[25rem]"
    : `pointer-events-auto absolute transition-[top,left,right,bottom] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${panelPosition.className}`;

  const sectionStyle = manualPosition
    ? {
        left: manualPosition.x,
        top: manualPosition.y,
      }
    : panelPosition.style;

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (typeof window === "undefined" || window.innerWidth < 640 || !panelRef.current) {
      return;
    }

    const rect = panelRef.current.getBoundingClientRect();
    dragStateRef.current = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    setManualPosition({
      x: rect.left,
      y: rect.top,
    });
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging || dragStateRef.current.pointerId !== event.pointerId || !panelRect) {
      return;
    }

    setManualPosition(
      clampManualPosition(
        {
          x: event.clientX - dragStateRef.current.offsetX,
          y: event.clientY - dragStateRef.current.offsetY,
        },
        panelRect,
      ),
    );
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragStateRef.current.pointerId === event.pointerId) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      dragStateRef.current.pointerId = null;
      setDragging(false);
    }
  }

  function handleReturnToAutoPosition() {
    setManualPosition(null);
    setDragging(false);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[65]">
      <div className="absolute inset-0 bg-slate-950/6" />

      {spotlightRect ? (
        <div
          aria-hidden="true"
          className="tour-spotlight"
          style={{
            height: spotlightRect.height,
            left: spotlightRect.left,
            top: spotlightRect.top,
            width: spotlightRect.width,
          }}
        />
      ) : null}

      <section className={sectionClassName} style={sectionStyle}>
        <div className="relative overflow-visible text-white" ref={panelRef}>
          {pointerStyle ? (
            <>
              <span
                aria-hidden="true"
                className={`${pointerStyle.className} tour-panel-pointer-beacon`}
                style={pointerStyle.beaconStyle}
              />
              <span
                aria-hidden="true"
                className={pointerStyle.className}
                style={pointerStyle.nubStyle}
              />
            </>
          ) : null}

          <div className="overflow-hidden rounded-[30px] border border-slate-800 bg-slate-950 shadow-[0_28px_72px_-36px_rgba(15,23,42,0.86)]">
            <div
              className={`border-b border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_34%),linear-gradient(135deg,_#0f172a_0%,_#020617_100%)] px-5 py-5 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">
                    <QuestionCircleIcon className="h-4 w-4" />
                    {locale === "es" ? "Guía de bienvenida" : "Welcome guide"}
                  </div>
                  <h3 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
                    {activeStep.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 sm:inline-flex">
                    {locale === "es" ? "Mover" : "Move"}
                  </span>
                  <button
                    aria-label={locale === "es" ? "Cerrar guía" : "Close guide"}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-200 transition hover:bg-slate-800"
                    onClick={onClose}
                    type="button"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-300">
                {activeStep.description}
              </p>
            </div>

            <div className="space-y-4 bg-slate-950 px-5 py-5">
              <div className="flex items-center justify-between gap-3 rounded-[24px] border border-slate-800 bg-slate-900 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {locale === "es" ? "Paso actual" : "Current step"}
                  </p>
                  <p className="mt-1 text-sm text-slate-100">{stepLabel}</p>
                </div>
                <div className="h-2 w-32 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-sky-400 transition-[width] duration-300"
                    style={{ width: `${((stepIndex + 1) / tourSteps.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="rounded-[24px] border border-dashed border-slate-700 bg-slate-900/90 px-4 py-4 text-sm leading-6 text-slate-300">
                {routeReady
                  ? locale === "es"
                    ? "Elemento resaltado listo. Puedes seguir recorrido o cerrarlo."
                    : "Highlighted element ready. You can continue guide or close it."
                  : locale === "es"
                    ? "Abriendo vista correspondiente para continuar guía."
                    : "Opening corresponding view to continue guide."}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  disabled={stepIndex === 0}
                  onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                  size="md"
                  tone="on-dark"
                  variant="ghost"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  {locale === "es" ? "Anterior" : "Previous"}
                </Button>

                {isLastStep ? (
                  <Button onClick={onFinish} size="md" tone="on-dark" variant="secondary">
                    <CheckIcon className="h-4 w-4" />
                    {locale === "es" ? "Finalizar" : "Finish"}
                  </Button>
                ) : (
                  <Button
                    onClick={() =>
                      setStepIndex((current) => Math.min(tourSteps.length - 1, current + 1))
                    }
                    size="md"
                    tone="on-dark"
                    variant="secondary"
                  >
                    {locale === "es" ? "Siguiente" : "Next"}
                    <ArrowRightIcon className="h-4 w-4" />
                  </Button>
                )}

                {manualPosition ? (
                  <button
                    className="text-sm font-medium text-sky-300 transition hover:text-sky-200"
                    onClick={handleReturnToAutoPosition}
                    type="button"
                  >
                    Auto
                  </button>
                ) : null}

                <button
                  className="ml-auto text-sm font-medium text-slate-300 transition hover:text-white"
                  onClick={onFinish}
                  type="button"
                >
                  {locale === "es" ? "Omitir guía" : "Skip guide"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
