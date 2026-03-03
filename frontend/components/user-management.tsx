"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiFetch, fetchSession } from "@/lib/api";
import type { MutationResponse, SessionResponse, UserRecord } from "@/types/api";

export function UserManagement() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUsers() {
    setLoading(true);
    try {
      const payload = await apiFetch<UserRecord[]>("/api/users");
      setUsers(payload);
    } catch (loadError) {
      setMessage(
        loadError instanceof Error ? loadError.message : "No se pudieron cargar",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchSession().then(setSession);
    void loadUsers();
  }, []);

  async function handleDelete(username: string) {
    if (!window.confirm(`Se eliminará el usuario ${username}.`)) {
      return;
    }

    try {
      const response = await apiFetch<MutationResponse>(
        `/api/users/${encodeURIComponent(username)}`,
        { method: "DELETE" },
      );
      setMessage(response.message);
      await loadUsers();
    } catch (deleteError) {
      setMessage(
        deleteError instanceof Error
          ? deleteError.message
          : "No se pudo eliminar el usuario",
      );
    }
  }

  return (
    <div className="edit-users-box">
      <h2>Editar Usuarios</h2>
      {message ? (
        <div className={`message ${message.includes("correctamente") ? "success" : "error"}`}>
          {message}
        </div>
      ) : null}
      {loading ? <div>Cargando usuarios...</div> : null}
      {!loading ? (
        <table className="edit-users-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.username}>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>
                  <div className="table-actions">
                    <Link
                      className="btn-edit"
                      href={`/dashboard/edit_user/${encodeURIComponent(user.username)}`}
                    >
                      Editar
                    </Link>
                    {session?.user?.role === "admin" && user.username !== "admin" ? (
                      <button
                        className="btn-delete"
                        onClick={() => void handleDelete(user.username)}
                        type="button"
                      >
                        Eliminar
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
