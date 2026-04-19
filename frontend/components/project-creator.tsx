"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { fetchSession } from "@/lib/api";
import { listEntities } from "@/lib/entities";
import { createProject } from "@/lib/projects";
import { listTeams } from "@/lib/teams";
import { useAppToast } from "@/hooks/use-app-toast";
import type { EntityRecord, SessionResponse, TeamSummary } from "@/types/api";
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

export function ProjectCreator() {
  const router = useRouter();
  const appToast = useAppToast();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [entities, setEntities] = useState<EntityRecord[]>([]);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [entityName, setEntityName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [templateFiles, setTemplateFiles] = useState<File[]>([]);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
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
          "No se pudieron cargar los datos iniciales",
          loadError instanceof Error ? loadError.message : undefined,
        ),
      );
  }, [appToast]);

  useEffect(() => {
    if (!teamId) {
      return;
    }

    if (!availableTeams.some((team) => team.id === teamId)) {
      setTeamId("");
    }
  }, [availableTeams, teamId]);

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

    try {
      const response = await createProject({
        additionalFiles,
        entityName,
        name: normalizedProjectName,
        onProgress: setUploadProgress,
        teamId,
        templateFile,
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
      <section className="page-hero-surface overflow-hidden rounded-[32px] border border-white/10 p-6 sm:p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="page-hero-badge gap-2 rounded-full px-3 py-1">
              <UploadStackIcon />
              Nuevo proyecto
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Crear proyecto
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              Sube la plantilla principal y los archivos asociados del proyecto.
            </p>
          </div>

          <ButtonLink href="/dashboard/projects" size="lg" tone="on-dark" variant="secondary">
            Volver al listado
          </ButtonLink>
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

            <CreatableSelectField
              allowCreate={false}
              createPlaceholder="Escribe una nueva entidad"
              label="Entidad vinculada"
              onChange={setEntityName}
              options={entityOptions}
              value={entityName}
            />

            <div className="flex flex-col gap-2">
              <CreatableSelectField
                allowCreate={false}
                createPlaceholder="Escribe un equipo"
                label="Añadir a un equipo"
                onChange={setTeamId}
                options={teamOptions}
                value={teamId}
              />
              <p className="text-xs leading-5 text-slate-500">
                Opcional. Solo se muestran equipos que gestionas. Si eliges una entidad, la lista
                se filtra a los equipos de esa entidad.
              </p>
            </div>

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
              <ButtonLink href="/dashboard/projects" variant="secondary">
                Cancelar
              </ButtonLink>
              <Button
                disabled={submitting}
                type="submit"
              >
                {submitting ? "Creando proyecto..." : "Crear proyecto"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
