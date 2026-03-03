"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import type { MutationResponse, ProjectMapResponse } from "@/types/api";

export function ProjectManagement() {
  const [projects, setProjects] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProjects() {
    setLoading(true);
    try {
      const payload = await apiFetch<ProjectMapResponse>("/api/projects");
      setProjects(payload.projects);
    } catch (loadError) {
      setMessage(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar los proyectos",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  async function handleDelete(owner: string, projectName: string) {
    if (!window.confirm(`Se eliminará el proyecto ${projectName}.`)) {
      return;
    }

    try {
      const response = await apiFetch<MutationResponse>(
        `/api/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectName)}`,
        { method: "DELETE" },
      );
      setMessage(response.message);
      await loadProjects();
    } catch (deleteError) {
      setMessage(
        deleteError instanceof Error
          ? deleteError.message
          : "No se pudo eliminar el proyecto",
      );
    }
  }

  return (
    <div className="edit-users-box">
      <h2>Editar Proyectos</h2>
      {message ? (
        <div className={`message ${message.includes("correctamente") ? "success" : "error"}`}>
          {message}
        </div>
      ) : null}
      {loading ? <div>Cargando proyectos...</div> : null}
      {!loading ? (
        <table className="edit-users-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Proyecto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(projects).flatMap(([owner, projectNames]) =>
              projectNames.map((projectName) => (
                <tr key={`${owner}-${projectName}`}>
                  <td>{owner}</td>
                  <td>{projectName}</td>
                  <td>
                    <div className="table-actions">
                      <Link
                        className="btn-edit"
                        href={`/dashboard/edit_project/${encodeURIComponent(owner)}/${encodeURIComponent(projectName)}`}
                      >
                        Editar
                      </Link>
                      <button
                        className="btn-delete"
                        onClick={() => void handleDelete(owner, projectName)}
                        type="button"
                      >
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
