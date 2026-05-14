"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { useLocale } from "@/components/providers/locale-provider";
import { apiFetch } from "@/lib/api";
import type { MutationResponse, UserRecord } from "@/types/api";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { FormCard, FormField, FormInput, FormMessage, FormPage } from "@/components/ui/form-page";
import { Skeleton } from "@/components/ui/skeleton";

export function UserEditor() {
  const { locale } = useLocale();
  const t = locale === "es";
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const username = decodeURIComponent(params.username);
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null);
  const [nextUsername, setNextUsername] = useState(username);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const loadingUser = !currentUser && !message;

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
          setMessage(error instanceof Error ? error.message : t ? "No se pudo cargar el usuario" : "Could not load user");
        }
      });

    return () => {
      active = false;
    };
  }, [t, username]);

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
      setMessage(error instanceof Error ? error.message : t ? "No se pudo actualizar el usuario" : "Could not update user");
    }
  }

  return (
    <FormPage
      actions={
        <ButtonLink href="/dashboard/users" size="lg" tone="on-dark" variant="secondary">
          {t ? "Volver a usuarios" : "Back to users"}
        </ButtonLink>
      }
      description={t ? "Actualiza los datos básicos del usuario seleccionado." : "Update basic data for selected user."}
      eyebrow={t ? "Usuarios" : "Users"}
      title={t ? "Editar usuario" : "Edit user"}
    >
      <form onSubmit={handleSubmit}>
        <FormCard
          footer={
            <>
              <ButtonLink href="/dashboard/users" variant="secondary">
                {t ? "Cancelar" : "Cancel"}
              </ButtonLink>
              <Button
                type="submit"
              >
                {t ? "Guardar cambios" : "Save changes"}
              </Button>
            </>
          }
          title={`${t ? "Editar" : "Edit"} ${username}`}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label={t ? "Nombre de usuario" : "Username"}>
              <FormInput
                onChange={(event) => setNextUsername(event.target.value)}
                placeholder={t ? "Nombre de usuario" : "Username"}
                required
                value={nextUsername}
              />
            </FormField>
            <FormField label="Email">
              <FormInput
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                required
                type="email"
                value={email}
              />
            </FormField>
          </div>

          <FormField label={t ? "Nueva contraseña" : "New password"}>
            <FormInput
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t ? "Dejar en blanco si no cambia" : "Leave blank if unchanged"}
              type="password"
              value={password}
            />
          </FormField>

          {message ? (
            <FormMessage tone={message.includes("correctamente") || message.includes("success") ? "neutral" : "danger"}>
              {message}
            </FormMessage>
          ) : null}

          {loadingUser ? (
            <div className="space-y-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-10 rounded-xl bg-white" />
                <Skeleton className="h-10 rounded-xl bg-white" />
              </div>
              <Skeleton className="h-10 rounded-xl bg-white" />
            </div>
          ) : null}
        </FormCard>
      </form>
    </FormPage>
  );
}
