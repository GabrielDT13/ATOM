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

type ParseProjectReportOptions = {
  resolveImageSrc?: (src: string) => string;
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

function extractSrcSetCandidate(value: string | null) {
  const firstCandidate = (value ?? "")
    .split(",")
    .map((item) => item.trim().split(/\s+/)[0] ?? "")
    .find(Boolean);

  return firstCandidate ?? "";
}

function resolveCandidateImageSrc(element: Element) {
  const tagName = element.tagName.toLowerCase();

  if (tagName === "img") {
    return (
      element.getAttribute("src") ??
      element.getAttribute("data-src") ??
      element.getAttribute("data-lazy-src") ??
      element.getAttribute("data-original") ??
      extractSrcSetCandidate(element.getAttribute("srcset"))
    );
  }

  if (tagName === "a") {
    return element.getAttribute("href") ?? "";
  }

  return "";
}

function getNearestHeadingText(element: Element) {
  let current: Element | null = element;

  while (current) {
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (["H1", "H2", "H3"].includes(sibling.tagName)) {
        return getNodeText(sibling);
      }
      sibling = sibling.previousElementSibling;
    }
    current = current.parentElement;
  }

  return "";
}

function buildImageContextText(element: Element) {
  const primaryParts = [
    element.getAttribute("alt"),
    element.getAttribute("title"),
    element.getAttribute("aria-label"),
    element.closest("figure")?.querySelector("figcaption")?.textContent,
  ]
    .map((item) => normalizeWhitespace(item ?? ""))
    .filter(Boolean)
    .filter((item, index, collection) => collection.indexOf(item) === index);
  const headingText = getNearestHeadingText(element);

  return normalizeWhitespace(
    [...primaryParts, ...(!primaryParts.length && headingText ? [headingText] : [])].join(" "),
  );
}

function isImageLikeLink(element: Element) {
  const href = element.getAttribute("href") ?? "";
  return /\.(avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i.test(href);
}

function isDecorativeImage(src: string, context: string) {
  const normalized = `${src} ${context}`.toLowerCase();
  return (
    normalized.includes("atom") ||
    normalized.includes("logo") ||
    normalized.includes("favicon") ||
    normalized.includes("brand")
  );
}

export function isReportAssetPassthroughPath(assetPath: string) {
  const normalizedAssetPath = assetPath.trim();
  return (
    !normalizedAssetPath ||
    normalizedAssetPath.startsWith("data:") ||
    normalizedAssetPath.startsWith("blob:") ||
    normalizedAssetPath.startsWith("http://") ||
    normalizedAssetPath.startsWith("https://") ||
    normalizedAssetPath.startsWith("//")
  );
}

export function resolveRelativeReportAssetPath(reportPath: string, assetPath: string) {
  const normalizedAssetPath = assetPath.trim();
  if (isReportAssetPassthroughPath(normalizedAssetPath)) {
    return normalizedAssetPath;
  }

  const reportSegments = reportPath.split("/").filter(Boolean);
  if (reportSegments.length > 0) {
    reportSegments.pop();
  }

  const combinedSegments = normalizedAssetPath.startsWith("/")
    ? normalizedAssetPath.split("/").filter(Boolean)
    : [...reportSegments, ...normalizedAssetPath.split("/").filter(Boolean)];
  const resolvedSegments: string[] = [];

  combinedSegments.forEach((segment) => {
    if (!segment || segment === ".") {
      return;
    }

    if (segment === "..") {
      resolvedSegments.pop();
      return;
    }

    resolvedSegments.push(segment);
  });

  return resolvedSegments.join("/");
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

export function parseProjectReportHtml(
  html: string,
  options: ParseProjectReportOptions = {},
): ParsedProjectReport {
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

  const images = [...documentNode.querySelectorAll("img, a[href]")]
    .filter((element) => element.tagName.toLowerCase() === "img" || isImageLikeLink(element))
    .map((element) => {
      const context = buildImageContextText(element);
      const src = resolveCandidateImageSrc(element);
      return {
        alt: context || "Gráfico del informe",
        context,
        kind: inferImageKind(context),
        src: options.resolveImageSrc ? options.resolveImageSrc(src) : src,
      };
    })
    .filter((image) => Boolean(image.src) && !isDecorativeImage(image.src, image.context))
    .filter(
      (image, index, collection) =>
        collection.findIndex((candidate) => candidate.src === image.src) === index,
    )
    .sort((left, right) => {
      const leftScore = scoreImagePriority(`${left.kind} ${left.context}`);
      const rightScore = scoreImagePriority(`${right.kind} ${right.context}`);
      return leftScore - rightScore || left.alt.localeCompare(right.alt, "es", { sensitivity: "base" });
    })
    .slice(0, 12)
    .map(({ alt, kind, src }) => ({ alt, kind, src }));

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
