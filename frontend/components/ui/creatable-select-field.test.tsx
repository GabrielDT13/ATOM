import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CreatableSelectField } from "@/components/ui/creatable-select-field";

describe("CreatableSelectField", () => {
  it("deduplica opciones repetidas antes de renderizarlas", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <CreatableSelectField
        label="Departamento"
        onChange={() => undefined}
        options={[
          { label: "Administración del sistema", value: "Administración del sistema" },
          { label: "Administración del sistema", value: "Administración del sistema" },
          { label: "Bioinformática", value: "Bioinformática" },
        ]}
        value=""
      />,
    );

    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(screen.getAllByRole("option", { name: "Administración del sistema" })).toHaveLength(1);
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
