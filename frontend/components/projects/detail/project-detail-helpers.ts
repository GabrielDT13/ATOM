import type { ProjectExecutionGroup } from "@/components/projects/project-detail-utils";
import { buildApiUrl, encodePathSegments } from "@/lib/api";
import type { ProjectFileEntry } from "@/types/api";

function appendCacheKey(path: string, cacheKey?: string | null) {
  const normalizedCacheKey = String(cacheKey || "").trim();
  if (!normalizedCacheKey) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${encodeURIComponent(normalizedCacheKey)}`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function buildProjectFileUrl(
  owner: string,
  projectName: string,
  filePath: string,
  cacheKey?: string | null,
) {
  return appendCacheKey(
    buildApiUrl(
    `/api/projects/${encodeURIComponent(owner)}/download/${encodePathSegments(
      `${projectName}/${filePath}`,
    )}`,
    ),
    cacheKey,
  );
}

export function buildProjectFilePreviewPath(
  owner: string,
  projectName: string,
  filePath: string,
  cacheKey?: string | null,
) {
  return appendCacheKey(
    `/api/projects/${encodeURIComponent(owner)}/files/${encodePathSegments(
      `${projectName}/${filePath}`,
    )}`,
    cacheKey,
  );
}

export function isPreviewableTextFile(file: ProjectFileEntry) {
  return [".csv", ".htm", ".html", ".md", ".tsv", ".txt", ".yaml", ".yml"].includes(
    file.extension.toLowerCase(),
  );
}

export function canAttemptEmbeddedPreview(file: ProjectFileEntry) {
  return [".docx", ".xls", ".xlsx"].includes(file.extension.toLowerCase());
}

export function getArtifactLabel(extension: string) {
  switch (extension.toLowerCase()) {
    case ".html":
    case ".htm":
      return "Informe HTML";
    case ".zip":
      return "Paquete ZIP";
    case ".xlsx":
    case ".xls":
      return "Excel";
    case ".docx":
      return "Documento";
    default:
      return "Artefacto";
  }
}

export function getArtifactDescription(extension: string) {
  switch (extension.toLowerCase()) {
    case ".html":
    case ".htm":
      return "Abre el informe completo en una vista amplia dentro de la aplicación.";
    case ".zip":
      return "Descarga el paquete final con los resultados preparados para compartir o archivar.";
    case ".xlsx":
    case ".xls":
      return "Consulta las tablas y resultados estructurados de esta ejecución.";
    case ".docx":
      return "Accede al documento generado para revisión o entrega.";
    default:
      return "Abre el archivo principal generado por esta ejecución.";
  }
}

export function getArtifactActionLabel(extension: string) {
  switch (extension.toLowerCase()) {
    case ".html":
    case ".htm":
      return "Abrir informe";
    case ".zip":
      return "Descargar paquete";
    default:
      return "Descargar archivo";
  }
}

export function getDeliverableTone(file: ProjectFileEntry) {
  switch (file.extension.toLowerCase()) {
    case ".zip":
      return "border-primary/20 bg-primary/5 text-primary";
    case ".html":
    case ".htm":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case ".xlsx":
    case ".xls":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case ".docx":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export function getDeliverablePriority(file: ProjectFileEntry) {
  switch (file.extension.toLowerCase()) {
    case ".html":
    case ".htm":
      return 0;
    case ".zip":
      return 1;
    case ".xlsx":
    case ".xls":
      return 2;
    case ".docx":
      return 3;
    default:
      return 4;
  }
}

export function getExecutionDeliverables(group: ProjectExecutionGroup) {
  return group.files.filter((file) =>
    [".docx", ".html", ".htm", ".xlsx", ".xls", ".zip"].includes(
      file.extension.toLowerCase(),
    ),
  );
}

export function getExecutionPreviewableFiles(group: ProjectExecutionGroup) {
  return getExecutionDeliverables(group).filter((file) => file.extension.toLowerCase() !== ".zip");
}

export function getProjectDeliverablesLayout(files: ProjectFileEntry[]) {
  const sortedDeliverables = [...files].sort((left, right) => {
    const priorityDifference = getDeliverablePriority(left) - getDeliverablePriority(right);
    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return left.name.localeCompare(right.name);
  });

  return {
    featuredDeliverable: sortedDeliverables[0] ?? null,
    secondaryDeliverables: sortedDeliverables.slice(1),
    sortedDeliverables,
  };
}
