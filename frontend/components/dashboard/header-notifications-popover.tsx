"use client";

import { useEffect, useState } from "react";

import { BellIcon, CheckIcon } from "@/components/dashboard/dashboard-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import type {
  NotificationCollectionResponse,
  NotificationRecord,
  SessionUser,
} from "@/types/api";

type HeaderNotificationsPopoverProps = {
  user: SessionUser;
};

const EMPTY_NOTIFICATIONS: NotificationCollectionResponse = {
  items: [],
  unread_count: 0,
};

function formatRelativeTime(dateValue?: string | null) {
  if (!dateValue) {
    return "Ahora";
  }

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Ahora";
  }

  const diffMilliseconds = parsedDate.getTime() - Date.now();
  const diffMinutes = Math.round(diffMilliseconds / 60000);
  const relativeFormatter = new Intl.RelativeTimeFormat("es-ES", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return relativeFormatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return relativeFormatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return relativeFormatter.format(diffDays, "day");
  }

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function getNotificationTypeLabel(notification: NotificationRecord) {
  switch (notification.type) {
    case "analysis_completed":
      return "Análisis";
    case "analysis_failed":
      return "Incidencia";
    case "project_access_changed":
      return "Permisos";
    case "project_ownership_transferred":
      return "Propiedad";
    case "project_shared":
      return "Proyecto";
    default:
      return "Notificación";
  }
}

function getNotificationSummary(notification: NotificationRecord) {
  const projectName = notification.project_name?.trim() || "El proyecto";

  switch (notification.type) {
    case "analysis_completed":
      return `${projectName} ha terminado correctamente.`;
    case "analysis_failed":
      return `${projectName} terminó con incidencias.`;
    case "project_access_changed":
      return `Se actualizaron tus permisos en ${projectName}.`;
    case "project_ownership_transferred":
      return `Ahora gestionas ${projectName}.`;
    case "project_shared":
      return `${projectName} se ha compartido contigo.`;
    default:
      return notification.title;
  }
}

function applyReadState(
  collection: NotificationCollectionResponse,
  notificationId: number,
) {
  let changed = false;
  const items = collection.items.map((item) => {
    if (item.id !== notificationId || item.is_read) {
      return item;
    }
    changed = true;
    return {
      ...item,
      is_read: true,
      read_at: item.read_at ?? new Date().toISOString(),
    };
  });

  if (!changed) {
    return collection;
  }

  return {
    items,
    unread_count: Math.max(0, collection.unread_count - 1),
  };
}

export function HeaderNotificationsPopover({
  user,
}: HeaderNotificationsPopoverProps) {
  const [collection, setCollection] =
    useState<NotificationCollectionResponse>(EMPTY_NOTIFICATIONS);
  const [loading, setLoading] = useState(true);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationRecord | null>(null);
  const unreadItems = collection.items.filter((item) => !item.is_read);

  useEffect(() => {
    let cancelled = false;

    async function refreshNotifications() {
      try {
        const payload = await listNotifications();
        if (!cancelled) {
          setCollection(payload);
        }
      } catch {
        if (!cancelled) {
          setCollection((current) => current);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void refreshNotifications();

    function handleVisibilityRefresh() {
      if (document.visibilityState === "visible") {
        void refreshNotifications();
      }
    }

    function handleWindowFocus() {
      void refreshNotifications();
    }

    const intervalId = window.setInterval(() => {
      void refreshNotifications();
    }, 30000);

    document.addEventListener("visibilitychange", handleVisibilityRefresh);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [user.id]);

  async function refreshNotifications() {
    const payload = await listNotifications();
    setCollection(payload);
    return payload;
  }

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setLoading(true);
      try {
        await refreshNotifications();
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleMarkAsRead(notificationId: number) {
    setCollection((current) => applyReadState(current, notificationId));
    try {
      const payload = await markNotificationRead(notificationId);
      setCollection((current) => ({
        ...current,
        unread_count: payload.unread_count,
      }));
    } catch {
      try {
        await refreshNotifications();
      } catch {
        // Conserva el estado optimista si no se puede recuperar.
      }
    }
  }

  async function handleMarkAllAsRead() {
    if (collection.unread_count <= 0 || markingAllAsRead) {
      return;
    }

    setMarkingAllAsRead(true);
    setCollection((current) => ({
      items: current.items.map((item) => ({
        ...item,
        is_read: true,
        read_at: item.read_at ?? new Date().toISOString(),
      })),
      unread_count: 0,
    }));

    try {
      const payload = await markAllNotificationsRead();
      setCollection((current) => ({
        ...current,
        unread_count: payload.unread_count,
      }));
    } catch {
      try {
        await refreshNotifications();
      } catch {
        // Evita romper el popover si falla el refetch.
      }
    } finally {
      setMarkingAllAsRead(false);
    }
  }

  async function handleOpenNotificationDetails(notification: NotificationRecord) {
    setSelectedNotification(notification);
    setOpen(false);

    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }
  }

  return (
    <>
      <Popover onOpenChange={handleOpenChange} open={open}>
        <PopoverTrigger asChild>
          <button
            aria-label="Notificaciones"
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-primary"
            type="button"
          >
            <span className="relative inline-flex h-5 w-5 items-center justify-center">
              <BellIcon className="h-5 w-5" />
              {collection.unread_count > 0 ? (
                <span className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary shadow-sm" />
              ) : null}
            </span>
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="w-[min(26rem,calc(100vw-2rem))] rounded-[28px] p-0"
          onMouseDown={(event) => event.stopPropagation()}
          side="bottom"
        >
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">Notificaciones</p>
                <p className="mt-1 text-xs text-slate-500">
                  {collection.unread_count > 0
                    ? `${collection.unread_count} pendiente(s) de revisar`
                    : "No tienes avisos pendientes"}
                </p>
              </div>

              <Button
                disabled={collection.unread_count <= 0 || markingAllAsRead}
                onClick={() => void handleMarkAllAsRead()}
                size="sm"
                variant="ghost"
              >
                Marcar todas
              </Button>
            </div>

            <div className="max-h-[24rem] overflow-y-auto p-3">
              {loading ? (
                <div className="px-2 py-6 text-center text-sm text-slate-500">
                  Cargando notificaciones...
                </div>
              ) : unreadItems.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {unreadItems.map((notification) => {
                    const unread = !notification.is_read;

                    return (
                      <article
                        className={cn(
                          "rounded-[22px] border px-4 py-3 transition",
                          unread
                            ? "border-sky-200 bg-sky-50/70"
                            : "border-slate-200 bg-white",
                        )}
                        key={notification.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                                  unread
                                    ? "bg-white text-primary shadow-sm"
                                    : "bg-slate-100 text-slate-500",
                                )}
                              >
                                {getNotificationTypeLabel(notification)}
                              </span>
                              <span className="text-xs text-slate-400">
                                {formatRelativeTime(notification.created_at)}
                              </span>
                            </div>

                            <p className="mt-2 text-sm font-semibold text-slate-950">
                              {notification.title}
                            </p>
                            <p className="mt-1 line-clamp-1 text-sm text-slate-600">
                              {getNotificationSummary(notification)}
                            </p>
                          </div>

                          {unread ? (
                            <button
                              aria-label={`Marcar como leída: ${notification.title}`}
                              className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-white text-primary transition hover:border-sky-300 hover:bg-sky-50"
                              onClick={() => void handleMarkAsRead(notification.id)}
                              type="button"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="truncate text-xs text-slate-400">
                            {notification.actor_display_name || notification.actor_username || "ATOM"}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                              onClick={() => void handleOpenNotificationDetails(notification)}
                              type="button"
                            >
                              Ver más
                            </button>
                            {notification.action_url ? (
                              <a
                                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                                href={notification.action_url}
                                onClick={() => {
                                  if (!notification.is_read) {
                                    void handleMarkAsRead(notification.id);
                                  }
                                }}
                              >
                                {notification.action_label || "Abrir"}
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    No hay notificaciones todavía.
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Aquí verás avisos cuando se comparta un proyecto contigo o termine una ejecución.
                  </p>
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedNotification(null);
          }
        }}
        open={selectedNotification !== null}
      >
        <DialogContent className="max-w-xl overflow-hidden p-0">
          {selectedNotification ? (
            <>
              <div className="border-b border-slate-200 bg-slate-50 px-6 py-6 sm:px-8">
                <DialogHeader className="pr-10">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary shadow-sm">
                      {getNotificationTypeLabel(selectedNotification)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatRelativeTime(selectedNotification.created_at)}
                    </span>
                  </div>
                  <DialogTitle className="mt-3 text-slate-950">
                    {selectedNotification.title}
                  </DialogTitle>
                  <DialogDescription className="text-slate-500">
                    {getNotificationSummary(selectedNotification)}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="space-y-4 px-6 py-6 sm:px-8">
                <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Detalle
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    {selectedNotification.message}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Proyecto
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {selectedNotification.project_name || "No disponible"}
                    </p>
                  </div>
                  <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Origen
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {selectedNotification.actor_display_name ||
                        selectedNotification.actor_username ||
                        "ATOM"}
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t border-slate-200 px-6 py-4 sm:px-8">
                {selectedNotification.action_url ? (
                  <a
                    className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-white shadow-[0_16px_32px_-20px_rgba(13,127,242,0.85)] transition hover:bg-primary-dark"
                    href={selectedNotification.action_url}
                  >
                    {selectedNotification.action_label || "Abrir"}
                  </a>
                ) : null}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
