"use client";

import { FormEvent, useEffect, useState } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import { apiFetch, fetchSession } from "@/lib/api";
import type { MutationResponse, SessionResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { FormCard, FormField, FormInput, FormMessage, FormPage } from "@/components/ui/form-page";

export function UserRegistration() {
  const { locale } = useLocale();
  const t = locale === "es";
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
          ? t
            ? `${response.message}. Contraseña temporal: ${response.temporary_password}${copied ? ". Copiada al portapapeles" : ""}`
            : `${response.message}. Temporary password: ${response.temporary_password}${copied ? ". Copied to clipboard" : ""}`
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
          : t ? "No se pudo registrar el usuario" : "Could not register user",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!session?.user) {
    return <div>{t ? "Cargando permisos..." : "Loading permissions..."}</div>;
  }

  if (session.user.role !== "admin") {
    return (
      <FormPage
        description={t ? "Alta manual de nuevos accesos para la plataforma." : "Manual onboarding for new platform access."}
        eyebrow={t ? "Usuarios" : "Users"}
        title={t ? "Registrar usuario" : "Register user"}
      >
        <FormCard title={t ? "Acceso restringido" : "Restricted access"}>
          <FormMessage tone="danger">
            {t ? "Solo el usuario administrador puede registrar nuevos usuarios." : "Only administrator can register new users."}
          </FormMessage>
        </FormCard>
      </FormPage>
    );
  }

  return (
    <FormPage
      actions={
        <ButtonLink href="/dashboard/users" size="lg" tone="on-dark" variant="secondary">
          {t ? "Volver a usuarios" : "Back to users"}
        </ButtonLink>
      }
      description={t ? "Alta manual de nuevos accesos para la plataforma con contraseña temporal aleatoria." : "Manual onboarding for new platform access with random temporary password."}
      eyebrow={t ? "Usuarios" : "Users"}
      title={t ? "Registrar usuario" : "Register user"}
    >
      <form onSubmit={handleSubmit}>
        <FormCard
          description={t ? "Completa los datos básicos del usuario. La contraseña temporal se generará automáticamente." : "Fill basic user data. Temporary password will be generated automatically."}
          footer={
            <>
              <ButtonLink href="/dashboard/users" variant="secondary">
                {t ? "Cancelar" : "Cancel"}
              </ButtonLink>
              <Button
                disabled={submitting}
                type="submit"
              >
                {submitting ? (t ? "Guardando..." : "Saving...") : t ? "Registrar" : "Register"}
              </Button>
            </>
          }
          title={t ? "Datos del usuario" : "User data"}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label={t ? "Nombre de usuario" : "Username"}>
              <FormInput
                onChange={(event) => setUsername(event.target.value)}
                placeholder={t ? "usuario_laboratorio" : "lab_user"}
                required
                value={username}
              />
            </FormField>
            <FormField label="Email">
              <FormInput
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t ? "usuario@empresa.com" : "user@company.com"}
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
