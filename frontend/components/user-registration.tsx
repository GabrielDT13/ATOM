"use client";

import { FormEvent, useEffect, useState } from "react";

import { apiFetch, fetchSession } from "@/lib/api";
import type { MutationResponse, SessionResponse } from "@/types/api";

export function UserRegistration() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchSession().then(setSession);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const response = await apiFetch<MutationResponse>("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      });
      setMessage(response.message);
      if (response.success) {
        setUsername("");
        setEmail("");
        setPassword("");
      }
    } catch (submitError) {
      setMessage(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo registrar el usuario",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!session?.user) {
    return <div>Cargando permisos...</div>;
  }

  if (session.user.role !== "admin") {
    return (
      <div className="create-project-box">
        <h2>Registrar Nuevo Usuario</h2>
        <div className="register-message error">
          Solo el usuario administrador puede registrar nuevos usuarios.
        </div>
      </div>
    );
  }

  return (
    <div className="create-project-box">
      <h2>Registrar Nuevo Usuario</h2>
      <form id="create_project_form" onSubmit={handleSubmit}>
        <input
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Nombre de usuario"
          required
          value={username}
        />
        <input
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Contraseña"
          required
          type="password"
          value={password}
        />
        <input
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          required
          type="email"
          value={email}
        />
        <button className="btn-submit" disabled={submitting} type="submit">
          {submitting ? "Guardando..." : "Registrar"}
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
