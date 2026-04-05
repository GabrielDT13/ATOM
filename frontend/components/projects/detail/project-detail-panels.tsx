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
import { Skeleton } from "@/components/ui/skeleton";
import { buildProjectReportHref } from "@/lib/projects";
import { cn } from "@/lib/utils";
import type { ProjectFileEntry, ProjectMemberRecord } from "@/types/api";
import { UserAvatar, UserProfilePopover } from "@/components/users/user-profile-popover";

function getProjectRoleBadgeClassName(memberRole: ProjectMemberRecord["member_role"], isOwner: boolean) {
  if (isOwner || memberRole === "owner") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (memberRole === "editor") {
    return "border border-sky-200 bg-sky-50 text-sky-700";
  }

  return "border border-amber-200 bg-amber-50 text-amber-700";
}

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
      ? "h-full"
      : stretch
        ? "h-full min-h-[42rem]"
        : "h-[42rem]";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm",
        stretch && "flex h-full flex-col",
        className,
      )}
    >
      <div className="dialog-hero-surface flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4 text-slate-200">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
            Vista previa
          </p>
          <h3 className="mt-1 text-base font-semibold">
            {preview ? preview.label : "Selecciona un archivo"}
          </h3>
        </div>
      </div>

      <div className={cn(panelHeight, "bg-slate-50", stretch && "flex-1")}>
        {loading ? (
          <div className={cn("px-6 py-6", panelHeight)}>
            <div className="flex h-full flex-col gap-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="flex-1 rounded-[24px]" />
            </div>
          </div>
        ) : null}

        {!loading && !preview ? (
          <div className={cn("flex items-center justify-center px-6 text-center text-sm leading-6 text-slate-500", panelHeight)}>
            {emptyMessage}
          </div>
        ) : null}

        {!loading && preview?.mode === "text" ? (
          <pre className={cn("h-full overflow-auto rounded-b-[28px] bg-slate-950 px-5 py-5 text-sm leading-6 text-slate-200", panelHeight)}>
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

        {!loading && preview?.mode === "notice" ? (
          <div className="flex h-full items-center justify-center p-5">
            <div className="w-full max-w-lg rounded-[24px] border border-slate-200 bg-white p-5 text-center shadow-sm">
              <p className="text-sm font-semibold text-slate-950">{preview.label}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{preview.description}</p>
              <div className="mt-5 flex justify-center">
                <a
                  className={buttonStyles({ size: "sm", variant: "primary" })}
                  href={preview.actionHref}
                  rel="noreferrer"
                  target="_blank"
                >
                  <DownloadIcon className="h-4 w-4" />
                  {preview.actionLabel}
                </a>
              </div>
            </div>
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
            getProjectRoleBadgeClassName(member.member_role, member.is_owner),
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
  projectRef,
  projectName,
  variant = "compact",
}: {
  file: ProjectFileEntry;
  owner: string;
  projectRef: string;
  projectName: string;
  variant?: "compact" | "featured";
}) {
  const extension = file.extension.toLowerCase();
  const isFeatured = variant === "featured";
  const isHtmlDeliverable = extension === ".html" || extension === ".htm";
  const href = isHtmlDeliverable
    ? buildProjectReportHref(projectRef, file.path)
    : buildProjectFileUrl(owner, projectName, file.path);
  const icon =
    extension === ".rmd" ? (
      <FileCodeIcon className="h-5 w-5" />
    ) : extension === ".xlsx" || extension === ".xls" ? (
      <TemplateIcon className="h-5 w-5" />
    ) : (
      <DataFilesIcon className="h-5 w-5" />
    );
  const accentSurfaceClassName = isHtmlDeliverable
    ? "from-sky-500/18 via-cyan-400/12 to-white"
    : extension === ".zip"
      ? "from-primary/18 via-sky-500/10 to-white"
      : extension === ".xlsx" || extension === ".xls"
        ? "from-amber-400/18 via-orange-300/10 to-white"
        : "from-slate-200/60 via-white to-white";
  const actionIcon = isHtmlDeliverable ? (
    <EyeIcon className="h-4 w-4" />
  ) : (
    <DownloadIcon className="h-4 w-4" />
  );

  return (
    <a
      className={cn(
        "group rounded-[24px] border transition hover:border-slate-300 hover:bg-white",
        isFeatured
          ? "page-hero-surface relative overflow-hidden border border-white/10 p-6 shadow-[0_28px_80px_-48px_rgba(13,127,242,0.58)] hover:brightness-[1.02]"
          : "border-slate-200 bg-slate-50 p-4",
      )}
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {isFeatured ? (
        <>
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-sky-200/20 blur-3xl" />
          </div>

          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90 shadow-sm backdrop-blur-sm">
                  {icon}
                  Entregable principal
                </div>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
                  {file.extension.replace(".", "")}
                </span>
              </div>

              <p className="mt-6 text-2xl font-semibold tracking-tight text-white">
                {getArtifactLabel(file.extension)}
              </p>
              <p className="mt-2 max-w-2xl text-sm text-sky-100/90">{file.name}</p>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-100/90">
                {getArtifactDescription(file.extension)}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 shadow-sm backdrop-blur-sm">
                  {formatBytes(file.size_bytes)}
                </span>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 shadow-sm backdrop-blur-sm">
                  Ruta: {file.path}
                </span>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary shadow-[0_14px_30px_-20px_rgba(15,23,42,0.55)] transition group-hover:bg-sky-50">
                  {actionIcon}
                  {getArtifactActionLabel(file.extension)}
                </div>
                <span className="text-sm text-slate-200/90">
                  {isHtmlDeliverable
                    ? "Accede a la versión completa del informe."
                    : "Archivo disponible para descargar."}
                </span>
              </div>
            </div>

            <div className="flex h-full min-h-[16rem] flex-col justify-between rounded-[28px] border border-white/[0.16] bg-white/[0.08] p-5 backdrop-blur-md">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-100/80">
                    Resumen del archivo
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {isHtmlDeliverable ? "Informe interactivo" : "Archivo preparado"}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br text-white shadow-sm",
                    accentSurfaceClassName,
                  )}
                >
                  {icon}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="rounded-2xl border border-white/[0.14] bg-slate-950/20 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100/75">
                    Qué puedes hacer
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-100/90">
                    {isHtmlDeliverable
                      ? "Abrir el informe completo y revisar sus figuras, tablas y secciones con más detalle."
                      : "Descargar el archivo final de esta ejecución para compartirlo o seguir trabajando con él."}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/[0.14] bg-white/[0.08] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100/75">
                      Formato
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {file.extension.replace(".", "").toUpperCase()}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.14] bg-white/[0.08] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100/75">
                      Tamaño
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {formatBytes(file.size_bytes)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm"
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
          <p className="mt-4 text-sm font-semibold text-slate-950">
            {getArtifactLabel(file.extension)}
          </p>
          <p className="mt-1 text-sm text-slate-500">{file.name}</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {getArtifactDescription(file.extension)}
          </p>
          <div className="mt-5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400 group-hover:text-slate-600">
            {getArtifactActionLabel(file.extension)}
          </div>
        </>
      )}
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
