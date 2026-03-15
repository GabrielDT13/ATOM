"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api";
import type { MutationResponse, UserRecord } from "@/types/api";
import { Button, buttonStyles } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { FormCard, FormField, FormInput, FormMessage, FormPage } from "@/components/ui/form-page";

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
    <FormPage
      actions={
        <ButtonLink href="/dashboard/users" size="lg" tone="on-dark" variant="secondary">
          Volver a usuarios
        </ButtonLink>
      }
      description="Actualiza los datos básicos del usuario seleccionado."
      eyebrow="Usuarios"
      title="Editar usuario"
    >
      <form onSubmit={handleSubmit}>
        <FormCard
          footer={
            <>
              <ButtonLink href="/dashboard/users" variant="secondary">
                Cancelar
              </ButtonLink>
              <Button
                type="submit"
              >
                Guardar cambios
              </Button>
            </>
          }
          title={`Editar ${username}`}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Nombre de usuario">
              <FormInput
                onChange={(event) => setNextUsername(event.target.value)}
                placeholder="Nombre de usuario"
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

          <FormField label="Nueva contraseña">
            <FormInput
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Dejar en blanco si no cambia"
              type="password"
              value={password}
            />
          </FormField>

          {message ? (
            <FormMessage tone={message.includes("correctamente") ? "neutral" : "danger"}>
              {message}
            </FormMessage>
          ) : null}

          {!currentUser && !message ? <FormMessage>Cargando usuario...</FormMessage> : null}
        </FormCard>
      </form>
    </FormPage>
  );
}
