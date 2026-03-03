"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { apiFetch, buildApiUrl, encodePathSegments } from "@/lib/api";
import type { MutationResponse, ProjectDetails } from "@/types/api";

export function ProjectEditor() {
  const params = useParams<{ owner: string; projectName: string }>();
  const router = useRouter();
  const owner = decodeURIComponent(params.owner);
  const projectName = decodeURIComponent(params.projectName);
  const [details, setDetails] = useState<ProjectDetails | null>(null);
  const [nextName, setNextName] = useState(projectName);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const downloadLinks = (details?.files ?? []).map((file) => ({
    file,
    href: buildApiUrl(
      `/api/projects/${encodeURIComponent(owner)}/download/${encodePathSegments(
        `${details?.name ?? projectName}/${file}`,
      )}`,
    ),
  }));

  async function loadProject() {
    try {
      const payload = await apiFetch<ProjectDetails>(
        `/api/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectName)}`,
      );
      setDetails(payload);
      setNextName(payload.name);
    } catch (loadError) {
      setMessage(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el proyecto",
      );
    }
  }

  useEffect(() => {
    void loadProject();
  }, [owner, projectName]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();

    if (nextName !== projectName) {
      formData.append("new_name", nextName);
    }

    if (excelFile) {
      formData.append("excel_file", excelFile);
    }

    additionalFiles.forEach((file) => {
      formData.append("additional_files", file);
    });

    try {
      const response = await apiFetch<MutationResponse>(
        `/api/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectName)}`,
        {
          method: "PUT",
          body: formData,
        },
      );
      setMessage(response.message);
      if (nextName !== projectName) {
        router.replace(
          `/dashboard/edit_project/${encodeURIComponent(owner)}/${encodeURIComponent(nextName)}`,
        );
        return;
      }
      await loadProject();
    } catch (submitError) {
      setMessage(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo actualizar el proyecto",
      );
    }
  }

  return (
    <div className="create-project-box">
      <h2>Editar Proyecto: {projectName}</h2>
      {message ? (
        <div className={`message ${message.includes("correctamente") ? "success" : "error"}`}>
          {message}
        </div>
      ) : null}
      <form className="edit-project-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="project_name">Nombre del Proyecto</label>
          <input
            id="project_name"
            onChange={(event) => setNextName(event.target.value)}
            required
            value={nextName}
          />
        </div>
        <div className="form-group">
          <label htmlFor="excel_file">
            Archivo Excel (opcional, reemplaza el existente)
          </label>
          <input
            accept=".xlsx,.xls"
            id="excel_file"
            onChange={(event) => setExcelFile(event.target.files?.[0] ?? null)}
            type="file"
          />
        </div>
        <div className="form-group">
          <label htmlFor="additional_files">
            Archivos adicionales (opcional, reemplazan los existentes)
          </label>
          <input
            id="additional_files"
            multiple
            onChange={(event) => setAdditionalFiles(Array.from(event.target.files ?? []))}
            type="file"
          />
        </div>
        {details?.files?.length ? (
          <div className="form-group">
            <label>Archivos actuales:</label>
            <ul>
              {downloadLinks.map(({ file, href }) => (
                <li key={file}>
                  <a href={href} rel="noreferrer" target="_blank">
                    {file}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="form-actions">
          <button className="btn-submit" type="submit">
            Guardar Cambios
          </button>
          <Link className="btn-cancel" href="/dashboard/edit_projects">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
