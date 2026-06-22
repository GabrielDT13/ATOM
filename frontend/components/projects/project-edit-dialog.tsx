"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { listEntities } from "@/lib/entities";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DialogHero } from "@/components/ui/dialog-hero";
import { ProjectFileDropzone } from "@/components/projects/project-file-dropzone";
import {
  DataFilesIcon,
  TemplateIcon,
} from "@/components/projects/project-management-icons";
import { ProjectAccessManager } from "@/components/projects/project-access-manager";
import {
  getAllowedVariantsForStudy,
  normalizeVariantSelection,
  PROJECT_STATE_OPTIONS,
  RNA_SEQ_VARIANT_OPTIONS,
  STUDY_OPTIONS,
} from "@/components/projects/project-study-options";
import {
  CreatableSelectField,
  type CreatableSelectOption,
} from "@/components/ui/creatable-select-field";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import type {
  EntityRecord,
  ProjectAnalysisVariant,
  ProjectLifecycleStatus,
  ProjectStudyType,
  ProjectVisibility,
} from "@/types/api";
import type { ProjectRecord } from "@/components/projects/project-management-utils";

export type ProjectEditValues = {
  additionalFiles: File[];
  enabledAnalysisVariants: ProjectAnalysisVariant[];
  entityName: string;
  name: string;
  primaryAnalysisVariant: ProjectAnalysisVariant;
  projectState: ProjectLifecycleStatus;
  studyType: ProjectStudyType;
  templateFiles: File[];
  visibility: ProjectVisibility;
};

type ProjectEditDialogProps = {
  canShare?: boolean;
  canManageVisibility?: boolean;
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
  const { locale } = useLocale();
  const t = locale === "es";
  return (
    <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{t ? "Archivos actuales" : "Current files"}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {t
              ? "Antes de reemplazar nada, revisa qué inventario tiene ahora mismo el proyecto."
              : "Before replacing anything, review current project inventory."}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {t ? "Plantilla actual" : "Current template"}
            </p>
            <div className="mt-3">
              <CurrentFileList
                emptyLabel={t ? "No hay plantilla cargada." : "No template uploaded."}
                items={project.templateFile ? [project.templateFile] : []}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {t ? "Archivos adicionales actuales" : "Current additional files"}
            </p>
            <div className="mt-3">
              <CurrentFileList
                emptyLabel={t ? "No hay archivos adicionales cargados." : "No additional files uploaded."}
                items={project.additionalFiles}
              />
            </div>
          </div>
        </div>

        {project.status === "results" ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {t
              ? "Este proyecto ya tiene resultados generados. Si reemplazas la plantilla o los archivos adicionales, los HTML actuales se conservarán, pero podrían dejar de corresponder con los nuevos ficheros."
              : "This project already has generated results. If you replace template or additional files, current HTML will be kept but may no longer match new files."}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function ProjectEditDialog({
  canShare = false,
  canManageVisibility = false,
  onOwnershipTransferred,
  onOpenChange,
  onSubmit,
  open,
  project,
  submitting = false,
  uploadProgress = 0,
  uploadState = "idle",
}: ProjectEditDialogProps) {
  const { locale } = useLocale();
  const t = locale === "es";
  const [entities, setEntities] = useState<EntityRecord[]>([]);
  const [name, setName] = useState("");
  const [entityName, setEntityName] = useState("");
  const [visibility, setVisibility] = useState<ProjectVisibility>("private");
  const [studyType, setStudyType] = useState<ProjectStudyType>("rna-seq");
  const [projectState, setProjectState] = useState<ProjectLifecycleStatus>("draft");
  const [enabledAnalysisVariants, setEnabledAnalysisVariants] = useState<ProjectAnalysisVariant[]>(["basic", "enhanced"]);
  const [primaryAnalysisVariant, setPrimaryAnalysisVariant] = useState<ProjectAnalysisVariant>("basic");
  const [templateFiles, setTemplateFiles] = useState<File[]>([]);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [confirmReplacementOpen, setConfirmReplacementOpen] = useState(false);
  const [resultsReplacementConfirmed, setResultsReplacementConfirmed] = useState(false);
  const entityOptions: CreatableSelectOption[] = entities.map((entity) => ({
    label: entity.name,
    value: entity.name,
  }));

  useEffect(() => {
    void listEntities().then(setEntities).catch(() => setEntities([]));
  }, []);

  useEffect(() => {
    if (!open || !project) {
      return;
    }

    setName(project.name);
    setEntityName(project.entity_name ?? "");
    setVisibility(project.visibility);
    setStudyType(project.study_type ?? "rna-seq");
    setProjectState(project.project_state ?? "draft");
    setEnabledAnalysisVariants(
      project.enabled_analysis_variants?.length ? project.enabled_analysis_variants : ["basic", "enhanced"],
    );
    setPrimaryAnalysisVariant(project.primary_analysis_variant ?? "basic");
    setTemplateFiles([]);
    setAdditionalFiles([]);
    setConfirmReplacementOpen(false);
    setResultsReplacementConfirmed(false);
  }, [open, project]);

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

  function toggleVariant(variant: ProjectAnalysisVariant) {
    setEnabledAnalysisVariants((current) => {
      const exists = current.includes(variant);
      const nextVariants = exists ? current.filter((item) => item !== variant) : [...current, variant];
      return normalizeVariantSelection(studyType, nextVariants, primaryAnalysisVariant).enabledVariants;
    });
  }

  async function submitChanges() {
    await onSubmit({
      additionalFiles,
      enabledAnalysisVariants,
      entityName: entityName.trim(),
      name: name.trim(),
      primaryAnalysisVariant,
      projectState,
      studyType,
      templateFiles,
      visibility,
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
        <DialogHero
          description={t ? "Ajusta el nombre del proyecto y actualiza sus archivos." : "Adjust project name and update files."}
          title={t ? "Editar proyecto" : "Edit project"}
        />

        <form className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={(event) => void handleSubmit(event)}>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">{t ? "Nombre del proyecto" : "Project name"}</span>
              <input
                autoFocus
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-sky-100"
                onChange={(event) => setName(event.target.value)}
                placeholder={t ? "ej. RNA Atlas 2026" : "e.g. RNA Atlas 2026"}
                required
                type="text"
                value={name}
              />
            </label>

            <CreatableSelectField
              allowCreate={false}
              createPlaceholder={t ? "Escribe una nueva entidad" : "Type a new entity"}
              label={t ? "Entidad vinculada" : "Linked entity"}
              onChange={setEntityName}
              options={entityOptions}
              value={entityName}
            />

            <div className="flex flex-col gap-3">
              <div>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
                  {t ? "Tipo de estudio" : "Study type"}
                  <InfoTooltip
                    content={t
                      ? "Solo RNA-seq está disponible por ahora. Los demás quedan visibles para próximos flujos."
                      : "Only RNA-seq is available for now. Others stay visible for upcoming workflows."}
                  />
                </span>
              </div>
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
            </div>

            <label className="flex flex-col gap-2">
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
                {t ? "Estado del proyecto" : "Project state"}
                <InfoTooltip
                  content={t
                    ? "Puedes dejarlo en borrador mientras comparas variantes y activarlo cuando quede listo."
                    : "You can keep it in draft while comparing variants and activate it when ready."}
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

            {studyType === "rna-seq" ? (
              <div className="grid gap-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                <div>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
                    {t ? "Variantes RNA-seq" : "RNA-seq variants"}
                    <InfoTooltip
                      content={t
                        ? "Las variantes marcadas estarán disponibles para ejecutar y comparar dentro del proyecto."
                        : "Checked variants will be available to run and compare inside the project."}
                    />
                  </span>
                </div>
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
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-slate-700">{t ? "Variante principal" : "Primary variant"}</span>
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

            {canManageVisibility ? (
              <label className="flex flex-col gap-2">
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
                  {t ? "Visibilidad" : "Visibility"}
                  <InfoTooltip
                    content={
                      t
                        ? "Privado: acceso solo por propiedad o compartición. Público: visible para cualquier usuario autenticado en catálogo público."
                        : "Private: access only by ownership or sharing. Public: visible to any authenticated user in public catalog."
                    }
                  />
                </span>
                <select
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-sky-100"
                  onChange={(event) => setVisibility(event.target.value as ProjectVisibility)}
                  value={visibility}
                >
                  <option value="private">{t ? "Privado" : "Private"}</option>
                  <option value="public">{t ? "Público" : "Public"}</option>
                </select>
              </label>
            ) : null}

            {project ? <CurrentProjectInventory project={project} /> : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <ProjectFileDropzone
                accept=".xlsx,.xls"
                accentClassName="bg-sky-100 text-sky-700"
                description={t ? "Opcional. Si subes un nuevo Excel, reemplazará la plantilla actual." : "Optional. Uploading a new Excel will replace current template."}
                disabled={submitting}
                files={templateFiles}
                helper={
                  project?.templateFile
                    ? `${t ? "Actual" : "Current"}: ${project.templateFile}`
                    : t
                      ? "Actualmente no hay plantilla registrada."
                      : "There is currently no registered template."
                }
                icon={<TemplateIcon />}
                label={t ? "Reemplazar plantilla" : "Replace template"}
                onChange={setTemplateFiles}
                uploadProgress={uploadProgress}
                uploadState={templateFiles.length > 0 ? uploadState : "idle"}
              />
              <ProjectFileDropzone
                accentClassName="bg-indigo-100 text-indigo-700"
                description={t ? "Opcional. Si adjuntas nuevos ficheros, sustituirán el set actual." : "Optional. Attaching new files will replace current set."}
                disabled={submitting}
                files={additionalFiles}
                helper={
                  t
                    ? `${project?.additionalFiles.length ?? 0} archivo(s) adicional(es) en el proyecto.`
                    : `${project?.additionalFiles.length ?? 0} additional file(s) in project.`
                }
                icon={<DataFilesIcon />}
                label={t ? "Reemplazar archivos adicionales" : "Replace additional files"}
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
              <Button variant="secondary">{t ? "Cancelar" : "Cancel"}</Button>
            </DialogClose>
            <Button
              disabled={submitting}
              type="submit"
            >
              {submitting ? (t ? "Guardando..." : "Saving...") : t ? "Guardar cambios" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <ConfirmDialog
        actionLabel={t ? "Confirmar reemplazo" : "Confirm replacement"}
        body={
          <div className="space-y-4">
            <p>
              {t ? "Vas a sustituir los archivos de entrada del proyecto actual." : "You are about to replace current project input files."}
            </p>
            {project?.status === "results" ? (
              <>
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  {t
                    ? "Los resultados HTML actuales se conservarán, pero podrían dejar de corresponder con la nueva plantilla o con los nuevos archivos adicionales."
                    : "Current HTML results will be kept, but they may no longer match new template or additional files."}
                </p>
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input
                    checked={resultsReplacementConfirmed}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    onChange={(event) => setResultsReplacementConfirmed(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    {t
                      ? "Confirmo que quiero reemplazar los archivos de entrada aunque el proyecto ya tenga resultados existentes."
                      : "I confirm I want to replace input files even though project already has existing results."}
                  </span>
                </label>
              </>
            ) : (
              <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                {t
                  ? "Se sustituirá la plantilla actual o el conjunto actual de archivos adicionales por los nuevos ficheros seleccionados."
                  : "Current template or current additional file set will be replaced by selected new files."}
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
        title={t ? "Confirmar reemplazo de inputs" : "Confirm input replacement"}
      />
    </Dialog>
  );
}
