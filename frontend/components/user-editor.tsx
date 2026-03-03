"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import type { MutationResponse, UserRecord } from "@/types/api";

export function UserEditor() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const username = decodeURIComponent(params.username);
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [nextUsername, setNextUsername] = useState(username);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void apiFetch<UserRecord[]>("/api/users")
      .then((users) => {
        if (!active) {
          return;
        }
        const selected = users.find((user) => user.username === username) ?? null;
        setCurrentUser(selected);
        setNextUsername(selected?.username ?? username);
        setEmail(selected?.email ?? "");
      })
      .catch((error) => {
        if (active) {
          setMessage(error instanceof Error ? error.message : "No se pudo cargar el usuario");
        }
      });

    return () => {
      active = false;
    };
  }, [username]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const response = await apiFetch<MutationResponse>(
        `/api/users/${encodeURIComponent(username)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: nextUsername,
            email,
            password: password || null,
          }),
        },
      );
      setMessage(response.message);
      router.replace("/dashboard/edit_users");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el usuario");
    }
  }

  return (
    <div className="create-project-box">
      <h2>Editar Usuario</h2>
      <form id="edit_user_form" onSubmit={handleSubmit}>
        <input
          onChange={(event) => setNextUsername(event.target.value)}
          placeholder="Nombre de usuario"
          required
          value={nextUsername}
        />
        <input
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          required
          type="email"
          value={email}
        />
        <input
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Nueva contraseña (dejar en blanco si no cambia)"
          type="password"
          value={password}
        />
        <div className="form-actions">
          <button className="btn-submit" type="submit">
            Guardar cambios
          </button>
          <Link className="btn-cancel" href="/dashboard/edit_users">
            Cancelar
          </Link>
        </div>
      </form>
      {message ? (
        <div className={`message ${message.includes("correctamente") ? "success" : "error"}`}>
          {message}
        </div>
      ) : null}
      {!currentUser && !message ? <div>Cargando usuario...</div> : null}
    </div>
  );
}
