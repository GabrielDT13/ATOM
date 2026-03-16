import { describe, expect, it } from "vitest";

import {
  buildProjectDetailHref,
  buildProjectReportHref,
  resolveProjectRouteRef,
} from "@/lib/projects";

describe("projects route helpers", () => {
  it("prefers slug over id when resolving a project reference", () => {
    expect(
      resolveProjectRouteRef({
        id: "project-1",
        slug: "researcher-rna-atlas",
      }),
    ).toBe("researcher-rna-atlas");
  });

  it("falls back to id when the slug is not available", () => {
    expect(
      resolveProjectRouteRef({
        id: "project-1",
        slug: null,
      }),
    ).toBe("project-1");
  });

  it("builds canonical detail and report urls", () => {
    expect(buildProjectDetailHref("researcher-rna-atlas")).toBe(
      "/dashboard/projects/researcher-rna-atlas",
    );
    expect(buildProjectReportHref("researcher-rna-atlas", "results/report final.html")).toBe(
      "/dashboard/projects/researcher-rna-atlas/report?path=results%2Freport%20final.html",
    );
  });
});
