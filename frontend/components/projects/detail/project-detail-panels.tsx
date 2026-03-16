"use client";

import type { ReactNode } from "react";

import { DataFilesIcon, DownloadIcon, EyeIcon, FileCodeIcon, TemplateIcon } from "@/components/projects/project-management-icons";
import { type ProjectExecutionGroup } from "@/components/projects/project-detail-utils";
import {
  buildProjectFileUrl,
  formatBytes,
  getArtifactActionLabel,
  getArtifactDescription,
  getArtifactLabel,
  getDeliverableTone,
  getExecutionDeliverables,
  isPreviewableTextFile,
  canAttemptEmbeddedPreview,
} from "@/components/projects/detail/project-detail-helpers";
import type { PreviewState } from "@/components/projects/detail/project-detail-types";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProjectFileEntry, ProjectMemberRecord } from "@/types/api";
import { UserAvatar, UserProfilePopover } from "@/components/users/user-profile-popover";

export function DetailMetaRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 py-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

export function SectionCard({
  actions,
  children,
  className,
  contentClassName,
  description,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  description?: string;
  title: string;
}) {
  return (
    <section className={cn("rounded-[28px] border border-slate-200 bg-white shadow-sm", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className={cn("px-5 py-5 sm:px-6", contentClassName)}>{children}</div>
    </section>
  );
}

export function PreviewPanel({
  className,
  emptyMessage,
  loading,
  preview,
  size = "default",
  stretch = false,
}: {
  className?: string;
  emptyMessage: string;
  loading: boolean;
  preview: PreviewState | null;
  size?: "compact" | "default";
  stretch?: boolean;
}) {
  const panelHeight =
    size === "compact"
      ? "h-[22rem]"
      : stretch
        ? "h-full min-h-[26rem]"
        : "min-h-[26rem]";
  const iframeHeight =
    size === "compact"
      ? "h-[14rem]"
      : stretch
        ? "h-full min-h-[42rem]"
        : "h-[42rem]";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950/95 shadow-sm",
        stretch && "flex h-full flex-col",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4 text-slate-200">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Vista previa
          </p>
          <h3 className="mt-1 text-base font-semibold">
            {preview ? preview.label : "Selecciona un archivo"}
          </h3>
        </div>
      </div>

      <div className={cn(panelHeight, "bg-slate-950", stretch && "flex-1")}>
        {loading ? (
          <div className={cn("flex items-center justify-center px-6 text-center text-sm leading-6 text-slate-400", panelHeight)}>
            Cargando vista previa...
          </div>
        ) : null}

        {!loading && !preview ? (
          <div className={cn("flex items-center justify-center px-6 text-center text-sm leading-6 text-slate-400", panelHeight)}>
            {emptyMessage}
          </div>
        ) : null}

        {!loading && preview?.mode === "text" ? (
          <pre className={cn("h-full overflow-auto px-5 py-5 text-sm leading-6 text-slate-200", panelHeight)}>
            {preview.content}
          </pre>
        ) : null}

        {!loading && preview?.mode === "html" ? (
          <iframe
            className={cn("w-full bg-white", iframeHeight)}
            srcDoc={preview.content}
            title={preview.label}
          />
        ) : null}

        {!loading && preview?.mode === "embed" ? (
          <div className="h-full space-y-3 overflow-auto p-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-300">
              {preview.hint}
            </div>
            <iframe
              className={cn("w-full rounded-2xl bg-white", iframeHeight)}
              src={preview.src}
              title={preview.label}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TeamMemberCard({ member }: { member: ProjectMemberRecord }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <UserProfilePopover align="start" profile={member} projectRole={member.member_role}>
          <button
            className="flex min-w-0 items-center gap-3 rounded-2xl text-left transition hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
            type="button"
          >
            <UserAvatar size="sm" user={member} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{member.display_name}</p>
              <p className="mt-1 truncate text-xs text-slate-500">@{member.username}</p>
            </div>
          </button>
        </UserProfilePopover>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
            member.is_owner ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700",
          )}
        >
          {member.member_role}
        </span>
      </div>
      {member.department ? <p className="mt-3 text-sm text-slate-600">{member.department}</p> : null}
    </article>
  );
}

export function ExecutionSelectorCard({
  active,
  group,
  onSelect,
}: {
  active: boolean;
  group: ProjectExecutionGroup;
  onSelect: () => void;
}) {
  const deliverables = getExecutionDeliverables(group);

  return (
    <button
      className={cn(
        "w-full rounded-[24px] border p-4 text-left transition",
        active
          ? "border-primary bg-primary/5 shadow-[0_18px_40px_-30px_rgba(13,127,242,0.7)]"
          : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white",
      )}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">{group.label}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{group.directory}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            active ? "bg-white text-primary" : "bg-white text-slate-600",
          )}
        >
          {group.files.length} archivos
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {deliverables.slice(0, 4).map((file) => (
          <span
            className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", getDeliverableTone(file))}
            key={file.path}
          >
            {file.extension.replace(".", "").toUpperCase()}
          </span>
        ))}
      </div>
    </button>
  );
}

export function DeliverableCard({
  file,
  owner,
  projectName,
  variant = "compact",
}: {
  file: ProjectFileEntry;
  owner: string;
  projectName: string;
  variant?: "compact" | "featured";
}) {
  const extension = file.extension.toLowerCase();
  const isHtmlDeliverable = extension === ".html" || extension === ".htm";
  const href = isHtmlDeliverable
    ? `/dashboard/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectName)}/report?path=${encodeURIComponent(file.path)}`
    : buildProjectFileUrl(owner, projectName, file.path);
  const icon =
    extension === ".rmd" ? (
      <FileCodeIcon className="h-5 w-5" />
    ) : extension === ".xlsx" || extension === ".xls" ? (
      <TemplateIcon className="h-5 w-5" />
    ) : (
      <DataFilesIcon className="h-5 w-5" />
    );

  return (
    <a
      className={cn(
        "group rounded-[24px] border transition hover:border-slate-300 hover:bg-white",
        variant === "featured"
          ? "border-primary/20 bg-gradient-to-br from-primary/8 via-white to-slate-50 p-6 shadow-[0_24px_60px_-42px_rgba(13,127,242,0.55)]"
          : "border-slate-200 bg-slate-50 p-4",
      )}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm",
            variant === "featured" ? "h-14 w-14" : "h-11 w-11",
          )}
        >
          {icon}
        </div>
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
            getDeliverableTone(file),
          )}
        >
          {file.extension.replace(".", "")}
        </span>
      </div>
      <p className={cn("font-semibold text-slate-950", variant === "featured" ? "mt-6 text-xl" : "mt-4 text-sm")}>
        {getArtifactLabel(file.extension)}
      </p>
      <p className="mt-1 text-sm text-slate-500">{file.name}</p>
      <p className={cn("text-slate-600", variant === "featured" ? "mt-4 max-w-2xl text-sm leading-7" : "mt-3 text-sm leading-6")}>
        {getArtifactDescription(file.extension)}
      </p>
      <div className="mt-5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400 group-hover:text-slate-600">
        {getArtifactActionLabel(file.extension)}
      </div>
    </a>
  );
}

export function SupportFileRow({
  active,
  file,
  onPreview,
  owner,
  projectName,
}: {
  active: boolean;
  file: ProjectFileEntry;
  onPreview: (file: ProjectFileEntry) => void;
  owner: string;
  projectName: string;
}) {
  const canPreview = isPreviewableTextFile(file) || canAttemptEmbeddedPreview(file);

  return (
    <article
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-[24px] border px-4 py-3 transition",
        active ? "border-primary bg-primary/5" : "border-slate-200 bg-slate-50",
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
        <p className="mt-1 text-xs text-slate-500">
          {file.path} · {formatBytes(file.size_bytes)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {canPreview ? (
          <button
            className={buttonStyles({ size: "sm", variant: "ghost" })}
            onClick={() => onPreview(file)}
            type="button"
          >
            <EyeIcon className="h-4 w-4" />
            Vista rápida
          </button>
        ) : null}
        <a
          className={buttonStyles({ size: "sm", variant: "secondary" })}
          href={buildProjectFileUrl(owner, projectName, file.path)}
          rel="noreferrer"
          target="_blank"
        >
          <DownloadIcon className="h-4 w-4" />
          Abrir archivo
        </a>
      </div>
    </article>
  );
}
