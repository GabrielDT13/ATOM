"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { fetchSession } from "@/lib/api";
import { listEntities } from "@/lib/entities";
import {
  buildProjectDetailHref,
  createProject,
  resolveProjectRouteRef,
} from "@/lib/projects";
import { listTeams } from "@/lib/teams";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  getAllowedVariantsForStudy,
  normalizeVariantSelection,
  PROJECT_STATE_OPTIONS,
  RNA_SEQ_VARIANT_OPTIONS,
  STUDY_OPTIONS,
} from "@/components/projects/project-study-options";
import type {
  EntityRecord,
  ProjectAnalysisProfile,
  ProjectAnalysisVariant,
  ProjectLifecycleStatus,
  ProjectStudyType,
  ProjectVisibility,
  SessionResponse,
  TeamSummary,
} from "@/types/api";
import { ProjectFileDropzone } from "@/components/projects/project-file-dropzone";
import {
  DataFilesIcon,
  ProjectStackIcon,
  TemplateIcon,
  UploadStackIcon,
} from "@/components/projects/project-management-icons";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import {
  CreatableSelectField,
  type CreatableSelectOption,
} from "@/components/ui/creatable-select-field";
import { InfoTooltip } from "@/components/ui/info-tooltip";

export function ProjectCreator() {
  const router = useRouter();
  const { locale } = useLocale();
  const appToast = useAppToast();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [entities, setEntities] = useState<EntityRecord[]>([]);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [entityName, setEntityName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [analysisProfile, setAnalysisProfile] = useState<ProjectAnalysisProfile>("basic");
  const [studyType, setStudyType] = useState<ProjectStudyType>("rna-seq");
  const [projectState, setProjectState] = useState<ProjectLifecycleStatus>("draft");
  const [enabledAnalysisVariants, setEnabledAnalysisVariants] = useState<ProjectAnalysisVariant[]>(["basic", "enhanced"]);
  const [primaryAnalysisVariant, setPrimaryAnalysisVariant] = useState<ProjectAnalysisVariant>("basic");
  const [visibility, setVisibility] = useState<ProjectVisibility>("private");
  const [templateFiles, setTemplateFiles] = useState<File[]>([]);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState<"complete" | "idle" | "uploading">("idle");
  const entityOptions: CreatableSelectOption[] = entities.map((entity) => ({
    label: entity.name,
    value: entity.name,
  }));
  const manageableTeams = teams.filter((team) => {
    if (session?.user?.role === "admin") {
      return true;
    }

    return team.membership_role === "owner" || team.owner_username === session?.user?.username;
  });
  const availableTeams = manageableTeams.filter((team) => {
    if (!entityName.trim()) {
      return true;
    }

    return (team.entity_name ?? "").trim() === entityName.trim();
  });
  const teamOptions: CreatableSelectOption[] = availableTeams.map((team) => ({
    label: team.entity_name ? `${team.name} · ${team.entity_name}` : team.name,
    value: team.id,
  }));

  useEffect(() => {
    void Promise.all([fetchSession(), listEntities(), listTeams()])
      .then(([nextSession, entitiesPayload, teamsPayload]) => {
        setSession(nextSession);
        setEntities(entitiesPayload);
        setTeams(teamsPayload.items);
      })
      .catch((loadError) =>
        appToast.error(
          locale === "es" ? "No se pudieron cargar los datos iniciales" : "Could not load initial data",
          loadError instanceof Error ? loadError.message : undefined,
        ),
      );
  }, [appToast, locale]);

  useEffect(() => {
    if (!teamId) {
      return;
    }

    if (!availableTeams.some((team) => team.id === teamId)) {
      setTeamId("");
    }
  }, [availableTeams, teamId]);

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

  useEffect(() => {
    setAnalysisProfile(primaryAnalysisVariant === "enhanced" ? "enhanced" : "basic");
  }, [primaryAnalysisVariant]);

  function toggleVariant(variant: ProjectAnalysisVariant) {
    setEnabledAnalysisVariants((current) => {
      const exists = current.includes(variant);
      const nextVariants = exists ? current.filter((item) => item !== variant) : [...current, variant];
      return normalizeVariantSelection(studyType, nextVariants, primaryAnalysisVariant).enabledVariants;
    });
  }

  const wizardSteps = [
    {
      title: locale === "es" ? "Proyecto" : "Project",
      description: locale === "es" ? "Nombre, entidad, equipo y estado." : "Name, entity, team and state.",
    },
    {
      title: locale === "es" ? "Estudio" : "Study",
      description: locale === "es" ? "Tipo de estudio y variantes." : "Study type and variants.",
    },
    {
      title: locale === "es" ? "Archivos" : "Files",
      description: locale === "es" ? "Plantilla y archivos adicionales." : "Template and extra files.",
    },
  ];

  function validateStep(stepIndex: number) {
    if (stepIndex === 0) {
      if (!projectName.trim()) {
        appToast.error(locale === "es" ? "Indica un nombre de proyecto válido" : "Enter a valid project name");
        return false;
      }
    }

    if (stepIndex === 1) {
      if (studyType === "rna-seq" && enabledAnalysisVariants.length === 0) {
        appToast.error(locale === "es" ? "Selecciona al menos una variante RNA-seq" : "Select at least one RNA-seq variant");
        return false;
      }
    }

    return true;
  }

  function goToNextStep() {
    if (!validateStep(currentStep)) {
      return;
    }
    setCurrentStep((current) => Math.min(wizardSteps.length - 1, current + 1));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedProjectName = projectName.trim();
    const templateFile = templateFiles[0] ?? null;

    if (!normalizedProjectName) {
      appToast.error(locale === "es" ? "Indica un nombre de proyecto válido" : "Enter a valid project name");
      return;
    }

    if (!templateFile) {
      appToast.error(locale === "es" ? "Selecciona al menos un Excel base" : "Select at least one base Excel file");
      return;
    }

    setSubmitting(true);
    setUploadProgress(0);
    setUploadState("uploading");

    try {
      const response = await createProject({
        additionalFiles,
        entityName,
        name: normalizedProjectName,
        onProgress: setUploadProgress,
        teamId,
        templateFile,
        analysisProfile,
        enabledAnalysisVariants,
        primaryAnalysisVariant,
        projectState,
        studyType,
        visibility,
      });

      if (response.success) {
        setUploadProgress(100);
        setUploadState("complete");
        appToast.success(response.message);
        const projectRef = response.project ? resolveProjectRouteRef(response.project) : null;
        router.push(projectRef ? buildProjectDetailHref(projectRef) : "/dashboard/projects");
      } else {
        appToast.error(response.message);
        setUploadState("idle");
      }
    } catch (submitError) {
      setUploadState("idle");
      appToast.error(
        locale === "es" ? "No se pudo crear el proyecto" : "Could not create project",
        submitError instanceof Error ? submitError.message : undefined,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="page-hero-surface overflow-hidden rounded-[32px] border border-white/10 p-6 sm:p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="page-hero-badge gap-2 rounded-full px-3 py-1">
              <UploadStackIcon />
              {locale === "es" ? "Nuevo proyecto" : "New project"}
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {locale === "es" ? "Crear proyecto" : "Create project"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              {locale === "es"
                ? "Sube la plantilla principal y los archivos asociados del proyecto."
                : "Upload project main template and associated files."}
            </p>
          </div>

          <ButtonLink href="/dashboard/projects" size="lg" tone="on-dark" variant="secondary">
            {locale === "es" ? "Volver al listado" : "Back to list"}
          </ButtonLink>
        </div>
      </section>

      <div className="grid gap-6">
        <form
          className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm"
          data-tour="create-project-form"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className="border-b border-slate-200 px-6 pb-6 pt-7 sm:px-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
              <ProjectStackIcon />
              {locale === "es" ? "Configuración" : "Configuration"}
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
              {locale === "es" ? "Identidad del proyecto" : "Project identity"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {locale === "es"
                ? "Define el nombre visible del proyecto y prepara los archivos iniciales para el workspace."
                : "Define project display name and prepare initial files for workspace."}
            </p>
          </div>

          <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
            <div className="grid gap-3 md:grid-cols-3">
              {wizardSteps.map((step, stepIndex) => {
                const active = stepIndex === currentStep;
                const complete = stepIndex < currentStep;
                return (
                  <button
                    className={`rounded-[24px] border px-4 py-4 text-left transition ${
                      active
                        ? "border-primary bg-sky-50"
                        : complete
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-200 bg-slate-50"
                    }`}
                    key={step.title}
                    onClick={() => {
                      if (stepIndex <= currentStep || validateStep(currentStep)) {
                        setCurrentStep(stepIndex);
                      }
                    }}
                    type="button"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                        active
                          ? "bg-primary text-white"
                          : complete
                            ? "bg-emerald-600 text-white"
                            : "bg-white text-slate-600"
                      }`}>
                        {stepIndex + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                        <p className="text-xs leading-5 text-slate-500">{step.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-8 px-6 py-6 sm:px-8">
            {currentStep === 0 ? (
              <>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">{locale === "es" ? "Nombre del proyecto" : "Project name"}</span>
                  <input
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-sky-100"
                    onChange={(event) => setProjectName(event.target.value)}
                    placeholder={locale === "es" ? "ej. Human Genome Seq-A12" : "e.g. Human Genome Seq-A12"}
                    required
                    type="text"
                    value={projectName}
                  />
                </label>

                <div className="grid gap-6 lg:grid-cols-2">
                  <CreatableSelectField
                    allowCreate={false}
                    createPlaceholder={locale === "es" ? "Escribe una nueva entidad" : "Type a new entity"}
                    label={locale === "es" ? "Entidad vinculada" : "Linked entity"}
                    onChange={setEntityName}
                    options={entityOptions}
                    value={entityName}
                  />

                  <div className="flex flex-col gap-2">
                    <CreatableSelectField
                      allowCreate={false}
                      createPlaceholder="Escribe un equipo"
                      label={
                        <span className="inline-flex items-center gap-1">
                          {locale === "es" ? "Añadir a un equipo" : "Add to a team"}
                          <InfoTooltip
                            content={locale === "es"
                              ? "Comparte proyecto desde inicio con equipo que gestionas. Lista se filtra por entidad si eliges una."
                              : "Share project from start with a team you manage. List is filtered by entity if you choose one."}
                          />
                        </span>
                      }
                      onChange={setTeamId}
                      options={teamOptions}
                      value={teamId}
                    />
                    <p className="text-xs leading-5 text-slate-500">
                      {locale === "es"
                        ? "Opcional. Si eliges entidad, aquí solo verás sus equipos."
                        : "Optional. If you choose an entity, only its teams will appear here."}
                    </p>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
                      {locale === "es" ? "Estado del proyecto" : "Project state"}
                      <InfoTooltip
                        content={locale === "es"
                          ? "Borrador para preparación y comparativas. Activo para ejecución normal."
                          : "Draft for preparation and comparisons. Active for regular execution."}
                      />
                    </span>
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
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
                      {locale === "es" ? "Visibilidad" : "Visibility"}
                      <InfoTooltip
                        content={locale === "es"
                          ? "Privado: solo propietario, miembros y equipos compartidos. Público: cualquier usuario autenticado puede verlo."
                          : "Private: only owner, members and shared teams. Public: any authenticated user can view it."}
                      />
                    </span>
                    <select
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-sky-100"
                      onChange={(event) => setVisibility(event.target.value as ProjectVisibility)}
                      value={visibility}
                    >
                      <option value="private">{locale === "es" ? "Privado" : "Private"}</option>
                      <option value="public">{locale === "es" ? "Público" : "Public"}</option>
                    </select>
                  </label>
                </div>
              </>
            ) : null}

            {currentStep === 1 ? (
              <>
                <div className="flex flex-col gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
                      {locale === "es" ? "Tipo de estudio" : "Study type"}
                      <InfoTooltip
                        content={locale === "es"
                          ? "Ahora mismo solo RNA-seq está activo. Los demás quedan visibles como catálogo futuro."
                          : "Right now only RNA-seq is active. Others stay visible as future catalog items."}
                      />
                    </span>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {locale === "es"
                        ? "Selecciona línea principal del proyecto y luego qué versión quieres tener disponible."
                        : "Select project main study and then choose which versions should be available."}
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {STUDY_OPTIONS.map((option) => {
                      const selected = studyType === option.id;
                      const disabled = !option.available;
                      return (
                        <button
                          className={`overflow-hidden rounded-[26px] border text-left transition ${
                            selected
                              ? "border-primary bg-sky-50 shadow-sm shadow-sky-100"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          } ${disabled ? "opacity-70" : ""}`}
                          disabled={disabled}
                          key={option.id}
                          onClick={() => setStudyType(option.id)}
                          type="button"
                        >
                          <div className="relative flex h-24 items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_rgba(148,163,184,0.08)_70%)] p-6">
                            <Image
                              alt={option.label[locale]}
                              className="object-contain"
                              fill
                              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                              src={option.imagePath}
                            />
                          </div>
                          <div className="flex flex-col gap-2 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-slate-900">{option.label[locale]}</p>
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                                disabled
                                  ? "bg-slate-100 text-slate-500"
                                  : selected
                                    ? "bg-primary/10 text-primary"
                                    : "bg-emerald-100 text-emerald-700"
                              }`}>
                                {disabled
                                  ? locale === "es" ? "Próximamente" : "Soon"
                                  : selected
                                    ? locale === "es" ? "Seleccionado" : "Selected"
                                    : locale === "es" ? "Disponible" : "Available"}
                              </span>
                            </div>
                            <p className="text-sm leading-6 text-slate-500">{option.description[locale]}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {studyType === "rna-seq" ? (
                  <div className="grid gap-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <div>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
                        {locale === "es" ? "Variantes RNA-seq disponibles" : "Available RNA-seq variants"}
                        <InfoTooltip
                          content={locale === "es"
                            ? "Podrás ejecutar cualquiera de las variantes marcadas dentro del mismo proyecto."
                            : "You will be able to run any checked variant inside the same project."}
                        />
                      </span>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {locale === "es"
                          ? "Activa las versiones que quieras tener disponibles y marca cuál será la principal."
                          : "Enable the versions you want available and choose which one will be the primary one."}
                      </p>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                      {RNA_SEQ_VARIANT_OPTIONS.filter((option) =>
                        getAllowedVariantsForStudy(studyType).includes(option.id),
                      ).map((option) => {
                        const checked = enabledAnalysisVariants.includes(option.id);
                        return (
                          <label
                            className={`flex h-full items-start gap-4 rounded-3xl border px-4 py-4 transition ${
                              checked ? "border-primary bg-white" : "border-slate-200 bg-white"
                            }`}
                            key={option.id}
                          >
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

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-semibold text-slate-700">
                        {locale === "es" ? "Variante principal" : "Primary variant"}
                      </span>
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
                    </label>
                  </div>
                ) : null}
              </>
            ) : null}

            {currentStep === 2 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <ProjectFileDropzone
                  accept=".xlsx,.xls"
                  accentClassName="bg-sky-100 text-sky-700"
                  description={locale === "es" ? "Sube Excel base del proyecto." : "Upload project base Excel file."}
                  disabled={submitting}
                  files={templateFiles}
                  helper={locale === "es" ? "Archivo obligatorio. Formatos permitidos: .xlsx y .xls" : "Required file. Allowed formats: .xlsx and .xls"}
                  icon={<TemplateIcon />}
                  label={locale === "es" ? "Plantilla Excel" : "Excel template"}
                  onChange={setTemplateFiles}
                  required
                  uploadProgress={uploadProgress}
                  uploadState={templateFiles.length > 0 ? uploadState : "idle"}
                />
                <ProjectFileDropzone
                  accentClassName="bg-indigo-100 text-indigo-700"
                  description={locale === "es"
                    ? "Adjunta archivos complementarios del proyecto. Puedes subir varios a la vez."
                    : "Attach complementary project files. You can upload several at once."}
                  disabled={submitting}
                  files={additionalFiles}
                  helper={locale === "es" ? "Opcional. Puedes arrastrar varios ficheros o usar el selector." : "Optional. You can drag several files or use picker."}
                  icon={<DataFilesIcon />}
                  label={locale === "es" ? "Archivos adicionales" : "Additional files"}
                  multiple
                  onChange={setAdditionalFiles}
                  uploadProgress={uploadProgress}
                  uploadState={additionalFiles.length > 0 ? uploadState : "idle"}
                />
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/dashboard/projects" variant="secondary">
                {locale === "es" ? "Cancelar" : "Cancel"}
              </ButtonLink>
              {currentStep > 0 ? (
                <Button
                  onClick={() => setCurrentStep((current) => Math.max(0, current - 1))}
                  type="button"
                  variant="secondary"
                >
                  {locale === "es" ? "Atrás" : "Back"}
                </Button>
              ) : null}
              {currentStep < wizardSteps.length - 1 ? (
                <Button
                  onClick={goToNextStep}
                  type="button"
                >
                  {locale === "es" ? "Siguiente" : "Next"}
                </Button>
              ) : (
                <Button
                  disabled={submitting}
                  type="submit"
                >
                  {submitting
                    ? locale === "es" ? "Creando proyecto..." : "Creating project..."
                    : locale === "es" ? "Crear proyecto" : "Create project"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
