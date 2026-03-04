"use client";

import { FormEvent, useId, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthBrand } from "@/components/auth/auth-brand";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthInputField } from "@/components/auth/auth-input-field";
import {
  ArrowRightIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
} from "@/components/auth/auth-icons";
import { useAppToast } from "@/hooks/use-app-toast";
import { apiFetch } from "@/lib/api";
import type { SessionResponse } from "@/types/api";

export function LoginForm() {
  const router = useRouter();
  const toast = useAppToast();
  const usernameId = useId();
  const passwordId = useId();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const loginRequest = apiFetch<SessionResponse>("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: identifier, password }),
    });

    toast.promise(loginRequest, {
      loading: {
        title: "Comprobando credenciales",
        description: "Estamos verificando tu acceso.",
      },
      success: {
        title: "Sesión iniciada",
        description: "Accediendo al panel.",
      },
      error: {
        title: (submitError) =>
          submitError instanceof Error
            ? submitError.message
            : "No se pudo iniciar sesión",
        description: "Revisa el usuario y la contraseña e inténtalo otra vez.",
      },
    });

    try {
      await loginRequest;
      router.push("/dashboard");
      router.refresh();
    } catch {
      // Error feedback is handled by the promise toast.
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard>
      <div className="flex flex-col gap-6">
        <AuthBrand />

        <form className="mt-2 flex flex-col gap-5" onSubmit={handleSubmit}>
          <AuthInputField
            autoComplete="username"
            id={usernameId}
            label="Usuario o correo"
            leadingIcon={<MailIcon />}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="usuario@laboratorio.com"
            required
            type="text"
            value={identifier}
          />

          <AuthInputField
            autoComplete="current-password"
            id={passwordId}
            label="Contraseña"
            leadingIcon={<LockIcon />}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Introduce tu contraseña"
            required
            trailingSlot={
              <button
                aria-label="Mostrar u ocultar contraseña"
                className="inline-flex h-11 w-11 items-center justify-center text-slate-400 transition-colors hover:text-slate-600 focus:outline-none"
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? <EyeIcon /> : <EyeOffIcon />}
              </button>
            }
            type={showPassword ? "text" : "password"}
            value={password}
          />

          <button
            className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary text-base font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            disabled={loading}
            type="submit"
          >
            <span>{loading ? "Accediendo..." : "Acceder"}</span>
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </button>
        </form>
      </div>
    </AuthCard>
  );
}
