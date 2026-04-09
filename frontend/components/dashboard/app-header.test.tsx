import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppHeader } from "@/components/dashboard/app-header";

const listNotificationsMock = vi.fn();
vi.mock("@/lib/notifications", () => ({
  listNotifications: (...args: unknown[]) => listNotificationsMock(...args),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn().mockResolvedValue({
    success: true,
    unread_count: 0,
    updated_count: 1,
  }),
}));

describe("AppHeader", () => {
  beforeEach(() => {
    listNotificationsMock.mockReset();
  });

  it("muestra el contador de no leídas y renderiza el popover", async () => {
    listNotificationsMock.mockResolvedValue({
      items: [
        {
          action_label: "Abrir proyecto",
          action_url: "/dashboard/projects/researcher-rna-atlas",
          actor_display_name: "Research Owner",
          actor_user_id: "user-1",
          actor_username: "researcher",
          created_at: "2026-04-09T10:30:00+00:00",
          id: 1,
          is_read: false,
          message: "researcher ha compartido contigo RNA Atlas como viewer.",
          project_id: "project-1",
          project_name: "RNA Atlas",
          project_owner_username: "researcher",
          project_slug: "researcher-rna-atlas",
          read_at: null,
          title: "Proyecto compartido: RNA Atlas",
          type: "project_shared",
          user_id: "user-2",
        },
      ],
      unread_count: 1,
    });
    render(
      <AppHeader
        onOpenSidebar={() => undefined}
        user={{
          department: "Bioinformatica",
          display_name: "User Demo",
          email: "user@example.com",
          id: "user-2",
          role: "user",
          username: "userdemo",
        }}
      />,
    );

    expect(await screen.findByRole("button", { name: "Notificaciones" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Notificaciones" }));

    expect(await screen.findByText("Proyecto compartido: RNA Atlas")).toBeInTheDocument();
    expect(screen.getByText("RNA Atlas se ha compartido contigo.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ver más" }));

    expect(await screen.findByText("researcher ha compartido contigo RNA Atlas como viewer.")).toBeInTheDocument();
  });
});
