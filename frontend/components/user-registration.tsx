"use client";

import { FormEvent, useEffect, useState } from "react";

import { apiFetch, fetchSession } from "@/lib/api";
import type { MutationResponse, SessionResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { FormCard, FormField, FormInput, FormMessage, FormPage } from "@/components/ui/form-page";

export function UserRegistration() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function copyTemporaryPassword(password: string) {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(password);
      return true;
    } catch {
      return false;
    }
  }

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
        body: JSON.stringify({ username, email }),
      });
      const copied =
        response.success && response.temporary_password
          ? await copyTemporaryPassword(response.temporary_password)
          : false;
      setMessage(
        response.temporary_password
          ? `${response.message}. Contraseña temporal: ${response.temporary_password}${copied ? ". Copiada al portapapeles" : ""}`
          : response.message,
      );
      if (response.success) {
        setUsername("");
        setEmail("");
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
        <ButtonLink href="/dashboard/users" size="lg" tone="on-dark" variant="secondary">
          Volver a usuarios
        </ButtonLink>
      }
      description="Alta manual de nuevos accesos para la plataforma con contraseña temporal aleatoria."
      eyebrow="Usuarios"
      title="Registrar usuario"
    >
      <form onSubmit={handleSubmit}>
        <FormCard
          description="Completa los datos básicos del usuario. La contraseña temporal se generará automáticamente."
          footer={
            <>
              <ButtonLink href="/dashboard/users" variant="secondary">
                Cancelar
              </ButtonLink>
              <Button
                disabled={submitting}
                type="submit"
              >
                {submitting ? "Guardando..." : "Registrar"}
              </Button>
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
