"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { apiUpload } from "@/lib/api";
import { useAppToast } from "@/hooks/use-app-toast";
import type { MutationResponse } from "@/types/api";
import { ProjectFileDropzone } from "@/components/projects/project-file-dropzone";
import {
  DataFilesIcon,
  ProjectStackIcon,
  TemplateIcon,
  UploadStackIcon,
} from "@/components/projects/project-management-icons";

export function ProjectCreator() {
  const router = useRouter();
  const appToast = useAppToast();
  const [projectName, setProjectName] = useState("");
  const [templateFiles, setTemplateFiles] = useState<File[]>([]);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState<"complete" | "idle" | "uploading">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedProjectName = projectName.trim();
    const templateFile = templateFiles[0] ?? null;

    if (!normalizedProjectName) {
      appToast.error("Indica un nombre de proyecto válido");
      return;
    }

    if (!templateFile) {
      appToast.error("Selecciona al menos un Excel base");
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);
    setUploadState("uploading");

    const formData = new FormData();
    formData.append("project_name", normalizedProjectName);
    formData.append("template_file", templateFile);
    additionalFiles.forEach((file) => {
      formData.append("additional_files", file);
    });

    try {
      const response = await apiUpload<MutationResponse>("/api/projects", formData, {
        method: "POST",
        onProgress: setUploadProgress,
      });

      if (response.success) {
        setUploadProgress(100);
        setUploadState("complete");
        appToast.success(response.message);
        router.push("/dashboard/projects");
      } else {
        appToast.error(response.message);
        setUploadState("idle");
      }
    } catch (submitError) {
      setUploadState("idle");
      appToast.error(
        "No se pudo crear el proyecto",
        submitError instanceof Error ? submitError.message : undefined,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_36%),linear-gradient(180deg,_#ffffff_0%,_#f7fbff_100%)] p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
              <UploadStackIcon />
              Nuevo proyecto
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Crear proyecto
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
              Sube la plantilla principal y los archivos asociados del proyecto.
            </p>
          </div>

          <Link
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            href="/dashboard/projects"
          >
            Volver al listado
          </Link>
        </div>
      </section>

      <div className="grid gap-6">
        <form
          className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="border-b border-slate-200 px-6 pb-6 pt-7 sm:px-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              <ProjectStackIcon />
              Configuración
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
              Identidad del proyecto
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Define el nombre visible del proyecto y prepara los archivos iniciales para el
              workspace.
            </p>
          </div>

          <div className="grid gap-8 px-6 py-6 sm:px-8">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Nombre del proyecto</span>
              <input
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-sky-100"
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="ej. Human Genome Seq-A12"
                required
                type="text"
                value={projectName}
              />
            </label>

            <div className="grid gap-4 lg:grid-cols-2">
              <ProjectFileDropzone
                accept=".xlsx,.xls"
                accentClassName="bg-sky-100 text-sky-700"
                description="Sube el Excel base del proyecto."
                disabled={submitting}
                files={templateFiles}
                helper="Formatos permitidos: .xlsx y .xls"
                icon={<TemplateIcon />}
                label="Plantilla Excel"
                onChange={setTemplateFiles}
                required
                uploadProgress={uploadProgress}
                uploadState={templateFiles.length > 0 ? uploadState : "idle"}
              />
              <ProjectFileDropzone
                accentClassName="bg-indigo-100 text-indigo-700"
                description="Adjunta archivos complementarios del proyecto. Puedes subir varios a la vez."
                disabled={submitting}
                files={additionalFiles}
                helper="Puedes arrastrar varios ficheros o usar el selector."
                icon={<DataFilesIcon />}
                label="Archivos adicionales"
                multiple
                onChange={setAdditionalFiles}
                uploadProgress={uploadProgress}
                uploadState={additionalFiles.length > 0 ? uploadState : "idle"}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                href="/dashboard/projects"
              >
                Cancelar
              </Link>
              <button
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
                disabled={submitting}
                type="submit"
              >
                {submitting ? "Creando proyecto..." : "Crear proyecto"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
