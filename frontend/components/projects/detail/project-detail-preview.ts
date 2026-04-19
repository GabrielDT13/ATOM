import {
  buildProjectFilePreviewPath,
  buildProjectFileUrl,
  canAttemptEmbeddedPreview,
  getExecutionPreviewableFiles,
  isPreviewableTextFile,
} from "@/components/projects/detail/project-detail-helpers";
import { parseOfficePreview } from "@/components/projects/detail/project-detail-office-preview";
import type { PreviewState } from "@/components/projects/detail/project-detail-types";
import type { ProjectExecutionGroup } from "@/components/projects/project-detail-utils";
import { apiFetch } from "@/lib/api";
import type { FileContentResponse, ProjectFileEntry } from "@/types/api";

export function isHtmlProjectFile(file: Pick<ProjectFileEntry, "extension">) {
  return [".html", ".htm"].includes(file.extension.toLowerCase());
}

export function getPreferredExecutionGroup(executionGroups: ProjectExecutionGroup[]) {
  return executionGroups.find((group) => Boolean(group.htmlFile)) ?? executionGroups[0] ?? null;
}

export function getPreferredPrimaryPreviewFile(group: ProjectExecutionGroup | null) {
  if (!group) {
    return null;
  }

  const previewFiles = getExecutionPreviewableFiles(group);

  return (
    previewFiles.find((file) => isHtmlProjectFile(file)) ??
    previewFiles.find((file) => file.extension.toLowerCase() === ".docx") ??
    previewFiles[0] ??
    null
  );
}

export async function buildProjectPreviewState({
  cacheKey,
  file,
  owner,
  projectName,
}: {
  cacheKey?: string | null;
  file: ProjectFileEntry;
  owner: string;
  projectName: string;
}): Promise<PreviewState> {
  if (isHtmlProjectFile(file)) {
    const fileContent = await apiFetch<FileContentResponse>(
      buildProjectFilePreviewPath(owner, projectName, file.path, cacheKey),
    );

    return {
      content: fileContent.content,
      label: file.path,
      mode: "html",
    };
  }

  if (canAttemptEmbeddedPreview(file)) {
    const downloadUrl = buildProjectFileUrl(owner, projectName, file.path, cacheKey);
    const response = await fetch(downloadUrl, {
      cache: "no-store",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`No se pudo descargar el archivo (${response.status})`);
    }

    const blob = await response.blob();
    return parseOfficePreview(file, blob, downloadUrl);
  }

  if (isPreviewableTextFile(file)) {
    const previewPath = buildProjectFilePreviewPath(owner, projectName, file.path, cacheKey);
    const separator = previewPath.includes("?") ? "&" : "?";
    const fileContent = await apiFetch<FileContentResponse>(
      `${previewPath}${separator}max_lines=120`,
    );

    return {
      content: fileContent.truncated ? `${fileContent.content}\n...` : fileContent.content,
      label: file.path,
      mode: "text",
    };
  }

  return {
    actionHref: buildProjectFileUrl(owner, projectName, file.path, cacheKey),
    actionLabel: "Abrir archivo",
    description: "Este archivo no tiene una vista rápida embebida disponible.",
    label: file.path,
    mode: "notice",
  };
}
