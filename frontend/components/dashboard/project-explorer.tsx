"use client";

import { buildApiUrl, encodePathSegments } from "@/lib/api";
import type { SidebarTreeItem } from "@/types/api";

import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  PlayIcon,
} from "@/components/dashboard/dashboard-icons";

type ProjectExplorerProps = {
  items: SidebarTreeItem[];
  onPreviewFile: (item: SidebarTreeItem) => void;
  onRunProject: (projectName: string) => void;
  onToggleFolder: (path: string) => void;
  openFolders: Record<string, boolean>;
  runningProject: string | null;
  title: string;
};

type TreeBranchProps = {
  isProjectLevel: boolean;
  items: SidebarTreeItem[];
  onPreviewFile: (item: SidebarTreeItem) => void;
  onRunProject: (projectName: string) => void;
  onToggleFolder: (path: string) => void;
  openFolders: Record<string, boolean>;
  runningProject: string | null;
};

function downloadFile(item: SidebarTreeItem) {
  if (!item.username) {
    return;
  }

  const encodedOwner = encodeURIComponent(item.username);
  const encodedPath = encodePathSegments(item.path);
  window.open(
    buildApiUrl(`/api/projects/${encodedOwner}/download/${encodedPath}`),
    "_blank",
  );
}

function TreeBranch({
  isProjectLevel,
  items,
  onPreviewFile,
  onRunProject,
  onToggleFolder,
  openFolders,
  runningProject,
}: TreeBranchProps) {
  const sortedItems = [...items].sort((left, right) => {
    if (left.type === right.type) {
      return left.name.localeCompare(right.name);
    }

    return left.type === "folder" ? -1 : 1;
  });

  return (
    <ul className="space-y-2">
      {sortedItems.map((item) => {
        const isFolder = item.type === "folder";
        const isOpen = Boolean(openFolders[item.path]);
        const children = item.children ?? [];

        if (isFolder) {
          return (
            <li key={`${item.type}-${item.path}`}>
              <div className="rounded-2xl border border-slate-200/80 bg-white/80">
                <div className="flex items-center gap-2 px-2 py-2">
                  <button
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => onToggleFolder(item.path)}
                    type="button"
                  >
                    {isOpen ? (
                      <ChevronDownIcon className="h-4 w-4 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <FolderIcon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate font-medium">{item.name}</span>
                  </button>

                  {isProjectLevel ? (
                    item.html_exists ? (
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <CheckIcon className="h-5 w-5" />
                      </span>
                    ) : (
                      <button
                        aria-label={`Ejecutar proyecto ${item.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary transition hover:bg-primary hover:text-white"
                        onClick={() => onRunProject(item.name)}
                        type="button"
                      >
                        {runningProject === item.name ? (
                          <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        ) : (
                          <PlayIcon className="h-4 w-4" />
                        )}
                      </button>
                    )
                  ) : null}
                </div>

                {isOpen && children.length ? (
                  <div className="border-t border-slate-200/70 px-3 py-3">
                    <div className="border-l border-slate-200 pl-3">
                      <TreeBranch
                        isProjectLevel={false}
                        items={children}
                        onPreviewFile={onPreviewFile}
                        onRunProject={onRunProject}
                        onToggleFolder={onToggleFolder}
                        openFolders={openFolders}
                        runningProject={runningProject}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </li>
          );
        }

        return (
          <li key={`${item.type}-${item.path}`}>
            <button
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-3 text-left text-sm text-slate-600 transition hover:border-primary/25 hover:text-slate-900"
              onClick={() => onPreviewFile(item)}
              onContextMenu={(event) => {
                event.preventDefault();
                downloadFile(item);
              }}
              type="button"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <FileIcon className="h-4 w-4" />
              </span>
              <span className="truncate font-medium">{item.name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ProjectExplorer({
  items,
  onPreviewFile,
  onRunProject,
  onToggleFolder,
  openFolders,
  runningProject,
  title,
}: ProjectExplorerProps) {
  return (
    <aside className="w-full xl:max-w-[24rem]">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Archivos
            </p>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {items.length}
          </span>
        </div>

        {items.length ? (
          <TreeBranch
            isProjectLevel
            items={items}
            onPreviewFile={onPreviewFile}
            onRunProject={onRunProject}
            onToggleFolder={onToggleFolder}
            openFolders={openFolders}
            runningProject={runningProject}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
            No hay proyectos disponibles.
          </div>
        )}
      </div>
    </aside>
  );
}
