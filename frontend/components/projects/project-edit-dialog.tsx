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
import { ProjectFileDropzone } from "@/components/projects/project-file-dropzone";
import {
  DataFilesIcon,
  TemplateIcon,
} from "@/components/projects/project-management-icons";
import type { ProjectRecord } from "@/components/projects/project-management-utils";

export type ProjectEditValues = {
  additionalFiles: File[];
  name: string;
  templateFiles: File[];
};

type ProjectEditDialogProps = {
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProjectEditValues) => Promise<void> | void;
  open: boolean;
  project: ProjectRecord | null;
  submitting?: boolean;
  uploadProgress?: number;
  uploadState?: "complete" | "idle" | "uploading";
};

export function ProjectEditDialog({
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

  useEffect(() => {
    if (!open || !project) {
      return;
    }

    setName(project.name);
    setTemplateFiles([]);
    setAdditionalFiles([]);
  }, [open, project]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSubmit({
      additionalFiles,
      name: name.trim(),
      templateFiles,
    });
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-3xl overflow-hidden">
        <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_38%),linear-gradient(180deg,_#ffffff_0%,_#f8fbff_100%)] px-6 pb-6 pt-7 sm:px-8">
          <DialogHeader className="pr-10">
            <DialogTitle>Editar proyecto</DialogTitle>
            <DialogDescription>
              Ajusta el nombre del proyecto y actualiza sus archivos.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form className="grid gap-6 px-6 pb-6 sm:px-8" onSubmit={(event) => void handleSubmit(event)}>
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

          <DialogFooter>
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
    </Dialog>
  );
}
