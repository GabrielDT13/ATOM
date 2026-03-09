"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { apiFetch, fetchSession } from "@/lib/api";
import type { MutationResponse, SessionResponse } from "@/types/api";
import { FormCard, FormField, FormInput, FormMessage, FormPage } from "@/components/ui/form-page";

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
      <FormPage
        description="Alta manual de nuevos accesos para la plataforma."
        eyebrow="Usuarios"
        title="Registrar usuario"
      >
        <FormCard title="Acceso restringido">
          <FormMessage tone="danger">
            Solo el usuario administrador puede registrar nuevos usuarios.
          </FormMessage>
        </FormCard>
      </FormPage>
    );
  }

  return (
    <FormPage
      actions={
        <Link
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          href="/dashboard/users"
        >
          Volver a usuarios
        </Link>
      }
      description="Alta manual de nuevos accesos para la plataforma."
      eyebrow="Usuarios"
      title="Registrar usuario"
    >
      <form onSubmit={handleSubmit}>
        <FormCard
          description="Completa los datos básicos del usuario."
          footer={
            <>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                href="/dashboard/users"
              >
                Cancelar
              </Link>
              <button
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
                disabled={submitting}
                type="submit"
              >
                {submitting ? "Guardando..." : "Registrar"}
              </button>
            </>
          }
          title="Datos del usuario"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Nombre de usuario">
              <FormInput
                onChange={(event) => setUsername(event.target.value)}
                placeholder="usuario_laboratorio"
                required
                value={username}
              />
            </FormField>
            <FormField label="Email">
              <FormInput
                onChange={(event) => setEmail(event.target.value)}
                placeholder="usuario@empresa.com"
                required
                type="email"
                value={email}
              />
            </FormField>
          </div>

          <FormField label="Contraseña">
            <FormInput
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Define una contraseña"
              required
              type="password"
              value={password}
            />
          </FormField>

          {message ? (
            <FormMessage tone={message.includes("correctamente") ? "neutral" : "danger"}>
              {message}
            </FormMessage>
          ) : null}
        </FormCard>
      </form>
    </FormPage>
  );
}
