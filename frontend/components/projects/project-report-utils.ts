export type ProjectReportImage = {
  alt: string;
  kind: string;
  src: string;
};

export type ProjectReportSection = {
  heading: string;
  summary: string;
};

export type ParsedProjectReport = {
  highlights: string[];
  images: ProjectReportImage[];
  sections: ProjectReportSection[];
  title: string | null;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getNodeText(element: Element | null) {
  if (!element) {
    return "";
  }

  return normalizeWhitespace(element.textContent ?? "");
}

function scoreImagePriority(text: string) {
  const normalized = normalizeWhitespace(text).toLowerCase();

  if (normalized.includes("volcano")) {
    return 0;
  }

  if (normalized.includes("heatmap")) {
    return 1;
  }

  if (normalized.includes("pca")) {
    return 2;
  }

  if (normalized.includes("enrichment") || normalized.includes("pathway")) {
    return 3;
  }

  return 10;
}

function inferImageKind(text: string) {
  const normalized = normalizeWhitespace(text).toLowerCase();

  if (normalized.includes("volcano")) {
    return "Volcano";
  }

  if (normalized.includes("heatmap")) {
    return "Heatmap";
  }

  if (normalized.includes("pca")) {
    return "PCA";
  }

  if (normalized.includes("enrichment") || normalized.includes("pathway")) {
    return "Enrichment";
  }

  return "Figura";
}

function scoreSectionPriority(text: string) {
  const normalized = normalizeWhitespace(text).toLowerCase();

  if (normalized.includes("summary") || normalized.includes("resumen")) {
    return 0;
  }

  if (normalized.includes("interpret") || normalized.includes("discusión")) {
    return 1;
  }

  if (normalized.includes("result")) {
    return 2;
  }

  if (normalized.includes("conclus")) {
    return 3;
  }

  return 10;
}

export function parseProjectReportHtml(html: string): ParsedProjectReport {
  if (typeof DOMParser === "undefined") {
    return {
      highlights: [],
      images: [],
      sections: [],
      title: null,
    };
  }

  const parser = new DOMParser();
  const documentNode = parser.parseFromString(html, "text/html");

  const title = getNodeText(documentNode.querySelector("title")) || null;

  const images = [...documentNode.querySelectorAll("img")]
    .map((image) => ({
      alt: normalizeWhitespace(
        image.getAttribute("alt") ??
          image.getAttribute("title") ??
          image.closest("figure")?.querySelector("figcaption")?.textContent ??
          "",
      ) || "Gráfico del informe",
      kind: inferImageKind(
        image.getAttribute("alt") ??
          image.getAttribute("title") ??
          image.closest("figure")?.querySelector("figcaption")?.textContent ??
          "",
      ),
      src: image.getAttribute("src") ?? "",
    }))
    .filter((image) => Boolean(image.src))
    .sort((left, right) => {
      const leftScore = scoreImagePriority(`${left.kind} ${left.alt}`);
      const rightScore = scoreImagePriority(`${right.kind} ${right.alt}`);
      return leftScore - rightScore || left.alt.localeCompare(right.alt, "es", { sensitivity: "base" });
    })
    .slice(0, 10);

  const sections = [...documentNode.querySelectorAll("h1, h2, h3")]
    .map((headingNode) => {
      let sibling = headingNode.nextElementSibling;
      let summary = "";

      while (sibling && !summary) {
        if (["H1", "H2", "H3"].includes(sibling.tagName)) {
          break;
        }

        summary = getNodeText(sibling);
        sibling = sibling.nextElementSibling;
      }

      return {
        heading: getNodeText(headingNode),
        summary,
      };
    })
    .filter(
      (section) =>
        section.heading.length >= 3 &&
        section.summary.length >= 40 &&
        !section.summary.startsWith("##"),
    )
    .sort((left, right) => {
      const leftScore = scoreSectionPriority(left.heading);
      const rightScore = scoreSectionPriority(right.heading);
      return leftScore - rightScore || left.heading.localeCompare(right.heading, "es", { sensitivity: "base" });
    })
    .slice(0, 6);

  const highlights = sections.map((section) => section.summary).slice(0, 3);

  return {
    highlights,
    images,
    sections,
    title,
  };
}
