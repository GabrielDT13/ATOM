"use client";

import type { ReactNode } from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildApiUrl, encodePathSegments } from "@/lib/api";
import {
  DataFilesIcon,
  EyeIcon,
  TemplateIcon,
} from "@/components/projects/project-management-icons";
import {
  getProjectStatusMeta,
  type ProjectRecord,
} from "@/components/projects/project-management-utils";

type ProjectViewDialogProps = {
  canManage: boolean;
  onEdit: (project: ProjectRecord) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  project: ProjectRecord | null;
};

function InfoCard({
  description,
  icon,
  title,
  value,
}: {
  description: string;
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 inline-flex rounded-2xl bg-white p-3 text-slate-700 shadow-sm">
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </article>
  );
}

export function ProjectViewDialog({
  canManage,
  onEdit,
  onOpenChange,
  open,
  project,
}: ProjectViewDialogProps) {
  if (!project) {
    return null;
  }

  const statusMeta = getProjectStatusMeta(project.status);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-4xl overflow-hidden">
        <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_38%),linear-gradient(180deg,_#ffffff_0%,_#f8fbff_100%)] px-6 pb-6 pt-7 sm:px-8">
          <DialogHeader className="pr-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-full border border-sky-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                @{project.owner}
              </span>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badgeClassName}`}>
                {statusMeta.label}
              </span>
            </div>
            <DialogTitle className="mt-4">{project.name}</DialogTitle>
            <DialogDescription>
              Vista rápida del inventario actual del proyecto y sus archivos disponibles.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid gap-6 px-6 pb-6 sm:px-8">
          <section className="grid gap-4 md:grid-cols-3">
            <InfoCard
              description="Archivo base de entrada para el flujo del proyecto."
              icon={<TemplateIcon />}
              title="Plantilla"
              value={project.templateFile ?? "No registrada"}
            />
            <InfoCard
              description="Archivos adicionales cargados junto al proyecto."
              icon={<DataFilesIcon />}
              title="Archivos de soporte"
              value={String(project.additionalFiles.length)}
            />
            <InfoCard
              description="Entregables HTML listos para descargar o revisar."
              icon={<EyeIcon className="h-5 w-5" />}
              title="Resultados"
              value={String(project.htmlFiles.length)}
            />
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-sm font-semibold text-slate-900">Archivos del proyecto</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Puedes descargar cualquier archivo disponible desde esta vista.
              </p>
            </div>
            <div className="max-h-[20rem] overflow-y-auto px-5 py-4">
              {project.files.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {project.files.map((file) => (
                    <a
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white"
                      href={buildApiUrl(
                        `/api/projects/${encodeURIComponent(project.owner)}/download/${encodePathSegments(
                          `${project.name}/${file}`,
                        )}`,
                      )}
                      key={file}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <span className="truncate font-medium">{file}</span>
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Descargar
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    Este proyecto todavía no tiene archivos visibles.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Puedes editarlo para reemplazar la plantilla o adjuntar nuevos ficheros.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        <DialogFooter className="px-6 pb-6 sm:px-8">
          <DialogClose asChild>
            <button
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              type="button"
            >
              Cerrar
            </button>
          </DialogClose>
          {canManage ? (
            <button
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
              onClick={() => onEdit(project)}
              type="button"
            >
              Editar proyecto
            </button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
