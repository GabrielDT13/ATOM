"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthBrand } from "@/components/auth/auth-brand";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthInputField } from "@/components/auth/auth-input-field";
import {
  ArrowRightIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
} from "@/components/auth/auth-icons";
import { useAppToast } from "@/hooks/use-app-toast";
import { apiFetch } from "@/lib/api";
import type { AuthMessageResponse } from "@/types/api";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useAppToast();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      toast.error("Enlace no válido", "Falta el token de recuperación.");
      return;
    }
    if (newPassword.trim().length < 8) {
      toast.error("Contraseña no válida", "La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Contraseñas distintas", "La confirmación no coincide con la nueva contraseña.");
      return;
    }

    setLoading(true);
    const request = apiFetch<AuthMessageResponse>("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        new_password: newPassword,
      }),
    });

    toast.promise(request, {
      loading: {
        title: "Actualizando contraseña",
        description: "Estamos guardando la nueva contraseña.",
      },
      success: {
        title: "Contraseña actualizada",
        description: "Ya puedes iniciar sesión con la nueva contraseña.",
      },
      error: {
        title: (submitError) =>
          submitError instanceof Error ? submitError.message : "No se pudo actualizar la contraseña",
        description: "Solicita un nuevo enlace si este ya no es válido.",
      },
    });

    try {
      await request;
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard>
      <div className="flex flex-col gap-6">
        <AuthBrand />

        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold text-slate-950">Nueva contraseña</h2>
          <p className="text-sm leading-6 text-slate-500">
            Define una nueva contraseña para tu cuenta de ATOM.
          </p>
        </div>

        {!token ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
            El enlace no es válido o está incompleto. Solicita uno nuevo desde{" "}
            <Link className="font-semibold underline" href="/forgot-password">
              recuperar acceso
            </Link>
            .
          </div>
        ) : (
          <form className="mt-2 flex flex-col gap-5" onSubmit={handleSubmit}>
            <AuthInputField
              autoComplete="new-password"
              id="reset-password-new"
              label="Nueva contraseña"
              leadingIcon={<LockIcon />}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Mínimo 8 caracteres"
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
              value={newPassword}
            />

            <AuthInputField
              autoComplete="new-password"
              id="reset-password-confirm"
              label="Confirmar contraseña"
              leadingIcon={<LockIcon />}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repite la contraseña"
              required
              trailingSlot={
                <button
                  aria-label="Mostrar u ocultar confirmación"
                  className="inline-flex h-11 w-11 items-center justify-center text-slate-400 transition-colors hover:text-slate-600 focus:outline-none"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  type="button"
                >
                  {showConfirmPassword ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              }
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
            />

            <button
              className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary text-base font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              disabled={loading}
              type="submit"
            >
              <span>{loading ? "Guardando..." : "Guardar contraseña"}</span>
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </button>
          </form>
        )}
      </div>
    </AuthCard>
  );
}
