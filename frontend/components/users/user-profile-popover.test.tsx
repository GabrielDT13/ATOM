import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UserAvatar, UserProfilePopover, type UserProfileSummary } from "@/components/users/user-profile-popover";

const profile: UserProfileSummary = {
  avatar_url: "https://example.com/avatar.png",
  bio: "Especialista en transcriptomica y revisiones de resultados.",
  department: "Bioinformatica",
  display_name: "Ada Lovelace",
  email: "ada@example.com",
  username: "adal",
};

describe("UserAvatar", () => {
  it("muestra las iniciales cuando no hay avatar disponible", () => {
    render(
      <UserAvatar
        user={{
          ...profile,
          avatar_url: null,
        }}
      />,
    );

    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("vuelve al fallback de iniciales si la imagen falla", () => {
    render(<UserAvatar user={profile} />);

    fireEvent.error(screen.getByAltText("Avatar de Ada Lovelace"));

    expect(screen.getByText("AL")).toBeInTheDocument();
  });
});

describe("UserProfilePopover", () => {
  it("muestra la informacion principal del perfil y el rol del proyecto", () => {
    render(
      <UserProfilePopover profile={profile} projectRole="editor">
        <button type="button">Abrir perfil</button>
      </UserProfilePopover>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir perfil" }));

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("@adal")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("Bioinformatica")).toBeInTheDocument();
    expect(screen.getAllByText("Editor")).toHaveLength(2);
    expect(screen.getByText("Especialista en transcriptomica y revisiones de resultados.")).toBeInTheDocument();
  });

  it("muestra textos fallback cuando faltan datos opcionales", () => {
    render(
      <UserProfilePopover
        profile={{
          display_name: "Usuario Demo",
          username: "demo",
        }}
      >
        <button type="button">Ver perfil demo</button>
      </UserProfilePopover>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ver perfil demo" }));

    expect(screen.getByText("No disponible")).toBeInTheDocument();
    expect(screen.getByText("Sin departamento")).toBeInTheDocument();
    expect(screen.getByText("Sin asignar")).toBeInTheDocument();
    expect(screen.getByText("Este usuario todavia no ha añadido una biografia corta.")).toBeInTheDocument();
  });
});
