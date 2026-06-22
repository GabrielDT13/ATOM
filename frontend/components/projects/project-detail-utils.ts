import type { ProjectDetails, ProjectFileEntry } from "@/types/api";

export type ProjectExecutionGroup = {
  directory: string;
  files: ProjectFileEntry[];
  htmlFile: ProjectFileEntry | null;
  label: string;
};

export type ProjectDetailModel = {
  executionGroups: ProjectExecutionGroup[];
  supportFiles: ProjectFileEntry[];
  templateFile: ProjectFileEntry | null;
};

function isInternalAnalysisScript(file: ProjectFileEntry) {
  const normalizedExtension = file.extension.toLowerCase();
  return normalizedExtension === ".r" || normalizedExtension === ".rmd";
}

function getDirectoryName(file: ProjectFileEntry) {
  const separatorIndex = file.path.indexOf("/");
  return separatorIndex >= 0 ? file.path.slice(0, separatorIndex) : null;
}

function humanizeExecutionScript(scriptKey: string) {
  switch (scriptKey) {
    case "rna-seq":
      return "RNA-seq Basic R";
    case "rna-seq-pro":
      return "RNA-seq Extended R";
    case "rna-seq-python":
      return "RNA-seq Python";
    default:
      return scriptKey;
  }
}

function buildExecutionLabel(directory: string, htmlFile: ProjectFileEntry | null) {
  if (directory.includes("__")) {
    const [designId, scriptKey] = directory.split("__", 2);
    if (designId && scriptKey) {
      return `${designId} · ${humanizeExecutionScript(scriptKey)}`;
    }
  }

  if (htmlFile) {
    return htmlFile.name.replace(/\.html?$/i, "");
  }

  return directory;
}

export function buildProjectDetailModel(project: ProjectDetails): ProjectDetailModel {
  const templateFile =
    project.file_entries.find((entry) => entry.kind === "template") ?? null;

  const executionDirectories = new Set(
    project.file_entries
      .filter((entry) => entry.kind === "result")
      .map((entry) => getDirectoryName(entry))
      .filter((value): value is string => Boolean(value)),
  );

  const executionGroupsMap = new Map<string, ProjectFileEntry[]>();
  const supportFiles: ProjectFileEntry[] = [];

  project.file_entries.forEach((entry) => {
    if (entry.kind === "template") {
      return;
    }

    if (isInternalAnalysisScript(entry)) {
      return;
    }

    const directory = getDirectoryName(entry);
    if (directory && executionDirectories.has(directory)) {
      const current = executionGroupsMap.get(directory) ?? [];
      current.push(entry);
      executionGroupsMap.set(directory, current);
      return;
    }

    if (entry.kind === "result") {
      executionGroupsMap.set(entry.path, [entry]);
      return;
    }

    supportFiles.push(entry);
  });

  const executionGroups = [...executionGroupsMap.entries()]
    .map(([directory, files]) => {
      const sortedFiles = [...files].sort((left, right) =>
        left.path.localeCompare(right.path, "es", { sensitivity: "base" }),
      );
      const htmlFile = sortedFiles.find((entry) => entry.kind === "result") ?? null;

      return {
        directory,
        files: sortedFiles,
        htmlFile,
        label: buildExecutionLabel(directory, htmlFile),
      };
    })
    .sort((left, right) =>
      left.label.localeCompare(right.label, "es", { sensitivity: "base" }),
    );

  supportFiles.sort((left, right) =>
    left.path.localeCompare(right.path, "es", { sensitivity: "base" }),
  );

  return {
    executionGroups,
    supportFiles,
    templateFile,
  };
}
