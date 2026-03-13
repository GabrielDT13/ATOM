"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProjectFileDropzone } from "@/components/projects/project-file-dropzone";
import {
  DataFilesIcon,
  TemplateIcon,
} from "@/components/projects/project-management-icons";
import { ProjectAccessManager } from "@/components/projects/project-access-manager";
import type { ProjectRecord } from "@/components/projects/project-management-utils";

export type ProjectEditValues = {
  additionalFiles: File[];
  name: string;
  templateFiles: File[];
};

type ProjectEditDialogProps = {
  canShare?: boolean;
  onOwnershipTransferred?: () => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProjectEditValues) => Promise<void> | void;
  open: boolean;
  project: ProjectRecord | null;
  submitting?: boolean;
  uploadProgress?: number;
  uploadState?: "complete" | "idle" | "uploading";
};

function CurrentFileList({
  emptyLabel,
  items,
}: {
  emptyLabel: string;
  items: string[];
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li
          className="truncate rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          key={item}
          title={item}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function CurrentProjectInventory({ project }: { project: ProjectRecord }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Archivos actuales</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Antes de reemplazar nada, revisa qué inventario tiene ahora mismo el proyecto.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Plantilla actual
            </p>
            <div className="mt-3">
              <CurrentFileList
                emptyLabel="No hay plantilla cargada."
                items={project.templateFile ? [project.templateFile] : []}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Archivos adicionales actuales
            </p>
            <div className="mt-3">
              <CurrentFileList
                emptyLabel="No hay archivos adicionales cargados."
                items={project.additionalFiles}
              />
            </div>
          </div>
        </div>

        {project.status === "results" ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Este proyecto ya tiene resultados generados. Si reemplazas la plantilla o los archivos
            adicionales, los HTML actuales se conservarán, pero podrían dejar de corresponder con
            los nuevos ficheros.
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function ProjectEditDialog({
  canShare = false,
  onOwnershipTransferred,
  onOpenChange,
  onSubmit,
  open,
  project,
  submitting = false,
  uploadProgress = 0,
  uploadState = "idle",
}: ProjectEditDialogProps) {
  const [name, setName] = useState("");
  const [templateFiles, setTemplateFiles] = useState<File[]>([]);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [confirmReplacementOpen, setConfirmReplacementOpen] = useState(false);
  const [resultsReplacementConfirmed, setResultsReplacementConfirmed] = useState(false);

  useEffect(() => {
    if (!open || !project) {
      return;
    }

    setName(project.name);
    setTemplateFiles([]);
    setAdditionalFiles([]);
    setConfirmReplacementOpen(false);
    setResultsReplacementConfirmed(false);
  }, [open, project]);

  async function submitChanges() {
    await onSubmit({
      additionalFiles,
      name: name.trim(),
      templateFiles,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const isReplacingInputs = templateFiles.length > 0 || additionalFiles.length > 0;
    if (isReplacingInputs) {
      setConfirmReplacementOpen(true);
      return;
    }

    await submitChanges();
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] max-w-[52rem] flex-col overflow-hidden sm:max-h-[calc(100vh-3rem)]">
        <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_38%),linear-gradient(180deg,_#ffffff_0%,_#f8fbff_100%)] px-6 pb-6 pt-7 sm:px-8">
          <DialogHeader className="pr-10">
            <DialogTitle>Editar proyecto</DialogTitle>
            <DialogDescription>
              Ajusta el nombre del proyecto y actualiza sus archivos.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={(event) => void handleSubmit(event)}>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Nombre del proyecto</span>
              <input
                autoFocus
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-sky-100"
                onChange={(event) => setName(event.target.value)}
                placeholder="ej. RNA Atlas 2026"
                required
                type="text"
                value={name}
              />
            </label>

            {project ? <CurrentProjectInventory project={project} /> : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <ProjectFileDropzone
                accept=".xlsx,.xls"
                accentClassName="bg-sky-100 text-sky-700"
                description="Opcional. Si subes un nuevo Excel, reemplazará la plantilla actual."
                disabled={submitting}
                files={templateFiles}
                helper={
                  project?.templateFile
                    ? `Actual: ${project.templateFile}`
                    : "Actualmente no hay plantilla registrada."
                }
                icon={<TemplateIcon />}
                label="Reemplazar plantilla"
                onChange={setTemplateFiles}
                uploadProgress={uploadProgress}
                uploadState={templateFiles.length > 0 ? uploadState : "idle"}
              />
              <ProjectFileDropzone
                accentClassName="bg-indigo-100 text-indigo-700"
                description="Opcional. Si adjuntas nuevos ficheros, sustituirán el set actual."
                disabled={submitting}
                files={additionalFiles}
                helper={`${project?.additionalFiles.length ?? 0} archivo(s) adicional(es) en el proyecto.`}
                icon={<DataFilesIcon />}
                label="Reemplazar archivos adicionales"
                multiple
                onChange={setAdditionalFiles}
                uploadProgress={uploadProgress}
                uploadState={additionalFiles.length > 0 ? uploadState : "idle"}
              />
            </div>

            {canShare && project ? (
              <ProjectAccessManager
                onOwnershipTransferred={onOwnershipTransferred}
                owner={project.owner}
                projectName={project.name}
              />
            ) : null}
          </div>

          <DialogFooter className="shrink-0 border-t border-slate-200 px-6 py-6 sm:px-8">
            <DialogClose asChild>
              <button
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                type="button"
              >
                Cancelar
              </button>
            </DialogClose>
            <button
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Guardando..." : "Guardar cambios"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>

      <ConfirmDialog
        actionLabel="Confirmar reemplazo"
        body={
          <div className="space-y-4">
            <p>
              Vas a sustituir los archivos de entrada del proyecto actual.
            </p>
            {project?.status === "results" ? (
              <>
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Los resultados HTML actuales se conservarán, pero podrían dejar de corresponder
                  con la nueva plantilla o con los nuevos archivos adicionales.
                </p>
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input
                    checked={resultsReplacementConfirmed}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    onChange={(event) => setResultsReplacementConfirmed(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    Confirmo que quiero reemplazar los archivos de entrada aunque el proyecto ya
                    tenga resultados existentes.
                  </span>
                </label>
              </>
            ) : (
              <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                Se sustituirá la plantilla actual o el conjunto actual de archivos adicionales por
                los nuevos ficheros seleccionados.
              </p>
            )}
          </div>
        }
        confirmDisabled={Boolean(
          submitting || (project?.status === "results" && !resultsReplacementConfirmed),
        )}
        onConfirm={async () => {
          await submitChanges();
          setConfirmReplacementOpen(false);
          setResultsReplacementConfirmed(false);
        }}
        onOpenChange={(nextOpen) => {
          setConfirmReplacementOpen(nextOpen);
          if (!nextOpen) {
            setResultsReplacementConfirmed(false);
          }
        }}
        open={confirmReplacementOpen}
        title="Confirmar reemplazo de inputs"
      />
    </Dialog>
  );
}
