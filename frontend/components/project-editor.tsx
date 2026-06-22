"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { useLocale } from "@/components/providers/locale-provider";
import { buildApiUrl, encodePathSegments, fetchSession } from "@/lib/api";
import { getProject, updateProject } from "@/lib/projects";
import {
  getAllowedVariantsForStudy,
  normalizeVariantSelection,
  PROJECT_STATE_OPTIONS,
  RNA_SEQ_VARIANT_OPTIONS,
  STUDY_OPTIONS,
} from "@/components/projects/project-study-options";
import type {
  ProjectAnalysisVariant,
  ProjectDetails,
  ProjectLifecycleStatus,
  ProjectStudyType,
  ProjectVisibility,
  SessionResponse,
} from "@/types/api";
import { ProjectFileDropzone } from "@/components/projects/project-file-dropzone";
import {
  TemplateIcon,
  UploadStackIcon,
} from "@/components/projects/project-management-icons";
import { Button, buttonStyles } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { FormCard, FormField, FormInput, FormMessage, FormPage } from "@/components/ui/form-page";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Skeleton } from "@/components/ui/skeleton";

export function ProjectEditor() {
  const { locale } = useLocale();
  const t = locale === "es";
  const params = useParams<{ owner: string; projectName: string }>();
  const router = useRouter();
  const owner = decodeURIComponent(params.owner);
  const projectName = decodeURIComponent(params.projectName);
  const [details, setDetails] = useState<ProjectDetails | null>(null);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [nextName, setNextName] = useState(projectName);
  const [visibility, setVisibility] = useState<ProjectVisibility>("private");
  const [studyType, setStudyType] = useState<ProjectStudyType>("rna-seq");
  const [projectState, setProjectState] = useState<ProjectLifecycleStatus>("draft");
  const [enabledAnalysisVariants, setEnabledAnalysisVariants] = useState<ProjectAnalysisVariant[]>(["basic", "enhanced"]);
  const [primaryAnalysisVariant, setPrimaryAnalysisVariant] = useState<ProjectAnalysisVariant>("basic");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState<"complete" | "idle" | "uploading">("idle");

  const downloadLinks = (details?.files ?? []).map((file) => ({
    file,
    href: buildApiUrl(
      `/api/projects/${encodeURIComponent(owner)}/download/${encodePathSegments(
        `${details?.name ?? projectName}/${file}`,
      )}`,
    ),
  }));
  const loadingProject = !details && !message;

  async function loadProject() {
    try {
      const payload = await getProject(owner, projectName);
      setDetails(payload);
      setNextName(payload.name);
      setVisibility(payload.visibility);
      setStudyType(payload.study_type ?? "rna-seq");
      setProjectState(payload.project_state ?? "draft");
      setEnabledAnalysisVariants(payload.enabled_analysis_variants?.length ? payload.enabled_analysis_variants : ["basic", "enhanced"]);
      setPrimaryAnalysisVariant(payload.primary_analysis_variant ?? "basic");
    } catch (loadError) {
      setMessage(
        loadError instanceof Error
          ? loadError.message
          : t ? "No se pudo cargar el proyecto" : "Could not load project",
      );
    }
  }

  useEffect(() => {
    void fetchSession()
      .then((payload) => setSession(payload))
      .catch(() => setSession(null));
    void loadProject();
  }, [owner, projectName]);

  useEffect(() => {
    const normalized = normalizeVariantSelection(
      studyType,
      enabledAnalysisVariants,
      primaryAnalysisVariant,
    );
    if (
      normalized.primaryVariant !== primaryAnalysisVariant
      || normalized.enabledVariants.join("|") !== enabledAnalysisVariants.join("|")
    ) {
      setEnabledAnalysisVariants(normalized.enabledVariants);
      setPrimaryAnalysisVariant(normalized.primaryVariant);
    }
  }, [enabledAnalysisVariants, primaryAnalysisVariant, studyType]);

  const canManageVisibility = Boolean(
    session?.user?.role === "admin" || session?.user?.username === owner,
  );

  function toggleVariant(variant: ProjectAnalysisVariant) {
    setEnabledAnalysisVariants((current) => {
      const exists = current.includes(variant);
      const nextVariants = exists ? current.filter((item) => item !== variant) : [...current, variant];
      return normalizeVariantSelection(studyType, nextVariants, primaryAnalysisVariant).enabledVariants;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const hasUploads = Boolean(excelFile) || additionalFiles.length > 0;

    setSubmitting(true);
    setUploadProgress(0);
    setUploadState(hasUploads ? "uploading" : "idle");

    try {
      const response = await updateProject(owner, projectName, {
        additionalFiles,
        enabledAnalysisVariants,
        name: nextName !== projectName ? nextName : undefined,
        onProgress: hasUploads ? setUploadProgress : undefined,
        primaryAnalysisVariant: primaryAnalysisVariant !== (details?.primary_analysis_variant ?? "basic") ? primaryAnalysisVariant : undefined,
        projectState: projectState !== (details?.project_state ?? "draft") ? projectState : undefined,
        studyType: studyType !== (details?.study_type ?? "rna-seq") ? studyType : undefined,
        templateFile: excelFile,
        visibility: canManageVisibility && details && visibility !== details.visibility ? visibility : undefined,
      });
      setMessage(response.message);
      if (response.project) {
        setDetails(response.project);
        setNextName(response.project.name);
      }
      if (hasUploads) {
        setUploadProgress(100);
        setUploadState("complete");
      }
      if (nextName !== projectName) {
        router.replace(
          `/dashboard/edit_project/${encodeURIComponent(owner)}/${encodeURIComponent(nextName)}`,
        );
        return;
      }
      await loadProject();
    } catch (submitError) {
      setUploadState("idle");
      setMessage(
        submitError instanceof Error
          ? submitError.message
          : t ? "No se pudo actualizar el proyecto" : "Could not update project",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormPage
      actions={
        <ButtonLink href="/dashboard/projects" size="lg" tone="on-dark" variant="secondary">
          {t ? "Volver a proyectos" : "Back to projects"}
        </ButtonLink>
      }
      description={t ? "Actualiza el nombre del proyecto y sus archivos." : "Update project name and files."}
      eyebrow={t ? "Proyectos" : "Projects"}
      title={`${t ? "Editar" : "Edit"} ${projectName}`}
    >
      <form onSubmit={handleSubmit}>
        <FormCard
          footer={
            <>
              <ButtonLink href="/dashboard/projects" variant="secondary">
                {t ? "Cancelar" : "Cancel"}
              </ButtonLink>
              <Button
                disabled={submitting}
                type="submit"
              >
                {submitting ? (t ? "Guardando..." : "Saving...") : t ? "Guardar cambios" : "Save changes"}
              </Button>
            </>
          }
          title={t ? "Configuración del proyecto" : "Project settings"}
        >
          <FormField label={t ? "Nombre del proyecto" : "Project name"}>
            <FormInput
              onChange={(event) => setNextName(event.target.value)}
              required
              value={nextName}
            />
          </FormField>

          {canManageVisibility ? (
            <FormField
              label={(
                <span className="inline-flex items-center gap-1">
                  {t ? "Visibilidad" : "Visibility"}
                  <InfoTooltip
                    content={
                      t
                        ? "Privado: solo acceso compartido. Público: visible para cualquier usuario autenticado."
                        : "Private: shared access only. Public: visible to any authenticated user."
                    }
                  />
                </span>
              )}
            >
              <select
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-sky-100"
                onChange={(event) => setVisibility(event.target.value as ProjectVisibility)}
                value={visibility}
              >
                <option value="private">{t ? "Privado" : "Private"}</option>
                <option value="public">{t ? "Público" : "Public"}</option>
              </select>
            </FormField>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {STUDY_OPTIONS.map((option) => {
              const selected = studyType === option.id;
              const disabled = !option.available;
              return (
                <button
                  className={`overflow-hidden rounded-[28px] border text-left transition ${
                    selected ? "border-primary bg-sky-50 shadow-sm shadow-sky-100" : "border-slate-200 bg-white"
                  } ${disabled ? "opacity-70" : "hover:border-slate-300"}`}
                  disabled={disabled}
                  key={option.id}
                  onClick={() => setStudyType(option.id)}
                  type="button"
                >
                  <div className="relative h-28 w-full bg-slate-100">
                    <Image alt={option.label[locale]} className="object-cover" fill sizes="(min-width: 1024px) 50vw, 100vw" src={option.imagePath} />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{option.label[locale]}</p>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                        disabled ? "bg-slate-100 text-slate-500" : selected ? "bg-primary/10 text-primary" : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {disabled ? (t ? "Próximamente" : "Soon") : selected ? (t ? "Seleccionado" : "Selected") : (t ? "Disponible" : "Available")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{option.description[locale]}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <FormField
            label={(
              <span className="inline-flex items-center gap-1">
                {t ? "Estado del proyecto" : "Project state"}
                <InfoTooltip
                  content={t
                    ? "Borrador para preparar y comparar. Activo para uso normal."
                    : "Draft for preparation and comparison. Active for regular use."}
                />
              </span>
            )}
          >
            <select
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-sky-100"
              onChange={(event) => setProjectState(event.target.value as ProjectLifecycleStatus)}
              value={projectState}
            >
              {PROJECT_STATE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label[locale]}
                </option>
              ))}
            </select>
          </FormField>

          {studyType === "rna-seq" ? (
            <div className="grid gap-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <div className="grid gap-4">
                {RNA_SEQ_VARIANT_OPTIONS.filter((option) => getAllowedVariantsForStudy(studyType).includes(option.id)).map((option) => {
                  const checked = enabledAnalysisVariants.includes(option.id);
                  return (
                    <label className={`flex items-start gap-4 rounded-3xl border bg-white px-4 py-4 transition ${checked ? "border-primary" : "border-slate-200"}`} key={option.id}>
                      <input
                        checked={checked}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        onChange={() => toggleVariant(option.id)}
                        type="checkbox"
                      />
                      <span className="flex-1">
                        <span className="block text-sm font-semibold text-slate-900">{option.label[locale]}</span>
                        <span className="mt-1 block text-sm leading-6 text-slate-500">{option.description[locale]}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <FormField label={t ? "Variante principal" : "Primary variant"}>
                <select
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-sky-100"
                  onChange={(event) => setPrimaryAnalysisVariant(event.target.value as ProjectAnalysisVariant)}
                  value={primaryAnalysisVariant}
                >
                  {RNA_SEQ_VARIANT_OPTIONS.filter((option) => enabledAnalysisVariants.includes(option.id)).map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label[locale]}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <ProjectFileDropzone
              accept=".xlsx,.xls"
              accentClassName="bg-sky-100 text-sky-700"
              description={t ? "Opcional. Reemplaza la plantilla actual." : "Optional. Replaces current template."}
              disabled={submitting}
              files={excelFile ? [excelFile] : []}
              helper={t ? "Formatos permitidos: .xlsx y .xls" : "Allowed formats: .xlsx and .xls"}
              icon={<TemplateIcon />}
              label={t ? "Reemplazar plantilla" : "Replace template"}
              onChange={(files) => setExcelFile(files[0] ?? null)}
              uploadProgress={uploadProgress}
              uploadState={excelFile ? uploadState : "idle"}
            />
            <ProjectFileDropzone
              accentClassName="bg-indigo-100 text-indigo-700"
              description={t ? "Opcional. Reemplaza los archivos adicionales." : "Optional. Replaces additional files."}
              disabled={submitting}
              files={additionalFiles}
              helper={t ? "Puedes subir varios archivos." : "You can upload multiple files."}
              icon={<UploadStackIcon />}
              label={t ? "Reemplazar archivos adicionales" : "Replace additional files"}
              multiple
              onChange={setAdditionalFiles}
              uploadProgress={uploadProgress}
              uploadState={additionalFiles.length > 0 ? uploadState : "idle"}
            />
          </div>

          {details?.files?.length ? (
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">{t ? "Archivos actuales" : "Current files"}</p>
              <div className="mt-4 flex flex-col gap-3">
                {downloadLinks.map(({ file, href }) => (
                  <a
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    href={href}
                    key={file}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span className="truncate font-medium">{file}</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {t ? "Descargar" : "Download"}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {message ? (
            <FormMessage tone={message.includes("correctamente") ? "neutral" : "danger"}>
              {message}
            </FormMessage>
          ) : null}

          {loadingProject ? (
            <div className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-10 w-full rounded-xl bg-white" />
              <div className="grid gap-4 lg:grid-cols-2">
                <Skeleton className="h-40 rounded-[24px] bg-white" />
                <Skeleton className="h-40 rounded-[24px] bg-white" />
              </div>
            </div>
          ) : null}
        </FormCard>
      </form>
    </FormPage>
  );
}
