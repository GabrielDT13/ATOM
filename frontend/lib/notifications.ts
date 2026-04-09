import { apiFetch } from "@/lib/api";
import type {
  NotificationCollectionResponse,
  NotificationMutationResponse,
} from "@/types/api";

export function listNotifications(limit = 20) {
  const searchParams = new URLSearchParams({
    limit: String(limit),
  });
  return apiFetch<NotificationCollectionResponse>(`/api/notifications?${searchParams.toString()}`);
}

export function markNotificationRead(notificationId: number) {
  return apiFetch<NotificationMutationResponse>(
    `/api/notifications/${encodeURIComponent(String(notificationId))}/read`,
    { method: "POST" },
  );
}

export function markAllNotificationsRead() {
  return apiFetch<NotificationMutationResponse>("/api/notifications/read-all", {
    method: "POST",
  });
}
