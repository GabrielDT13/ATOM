"use client";

import { FormEvent, useState } from "react";

import { apiFetch } from "@/lib/api";
import type { MutationResponse } from "@/types/api";

export function ProjectCreator() {
  const [projectName, setProjectName] = useState("");
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    const normalizedProjectName = projectName.trim();
    if (!normalizedProjectName) {
      setMessage("Indica un nombre de proyecto válido.");
      return;
    }

    if (!templateFile) {
      setMessage("Selecciona al menos un Excel base.");
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("project_name", normalizedProjectName);
    formData.append("template_file", templateFile);
    additionalFiles.forEach((file) => {
      formData.append("additional_files", file);
    });

    try {
      const response = await apiFetch<MutationResponse>("/api/projects", {
        method: "POST",
        body: formData,
      });
      setMessage(response.message);
      if (response.success) {
        setProjectName("");
        setTemplateFile(null);
        setAdditionalFiles([]);
        form.reset();
      }
    } catch (submitError) {
      setMessage(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo crear el proyecto",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="create-project-box">
      <h2>Crear Nuevo Proyecto</h2>
      <form id="create_project_form" onSubmit={handleSubmit}>
        <input
          onChange={(event) => setProjectName(event.target.value)}
          placeholder="Nombre del proyecto"
          required
          value={projectName}
        />
        <label>Archivo Template (Excel):</label>
        <input
          accept=".xlsx,.xls"
          onChange={(event) => setTemplateFile(event.target.files?.[0] ?? null)}
          required
          type="file"
        />
        <label>Archivos adicionales:</label>
        <input
          multiple
          onChange={(event) => setAdditionalFiles(Array.from(event.target.files ?? []))}
          type="file"
        />
        <button className="btn-submit" disabled={submitting} type="submit">
          {submitting ? "Creando..." : "Crear Proyecto"}
        </button>
      </form>
      {message ? (
        <div className={`register-message ${message.includes("correctamente") ? "success" : "error"}`}>
          {message}
        </div>
      ) : null}
    </div>
  );
}
