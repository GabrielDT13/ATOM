"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
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
import { useLocale } from "@/components/providers/locale-provider";
import { useAppToast } from "@/hooks/use-app-toast";
import { apiFetch } from "@/lib/api";
import type { SessionResponse } from "@/types/api";

export function LoginForm() {
  const router = useRouter();
  const toast = useAppToast();
  const { locale } = useLocale();
  const [email, setEmail] = useState("");
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
      body: JSON.stringify({ email, password }),
    });

    toast.promise(loginRequest, {
      loading: {
        title: locale === "es" ? "Comprobando credenciales" : "Checking credentials",
        description: locale === "es" ? "Estamos verificando tu acceso." : "We are verifying your access.",
      },
      success: {
        title: locale === "es" ? "Sesión iniciada" : "Signed in",
        description: locale === "es" ? "Accediendo al panel." : "Opening dashboard.",
      },
      error: {
        title: (submitError) =>
          submitError instanceof Error
            ? submitError.message
            : locale === "es"
              ? "No se pudo iniciar sesión"
              : "Could not sign in",
        description:
          locale === "es"
            ? "Revisa el email y la contraseña e inténtalo otra vez."
            : "Check email and password, then try again.",
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
            autoComplete="email"
            id="login-email"
            label={locale === "es" ? "Email" : "Email"}
            leadingIcon={<MailIcon />}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={locale === "es" ? "Introduce tu email" : "Enter your email"}
            required
            type="email"
            value={email}
          />

          <AuthInputField
            autoComplete="current-password"
            id="login-password"
            label={locale === "es" ? "Contraseña" : "Password"}
            leadingIcon={<LockIcon />}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={locale === "es" ? "Introduce tu contraseña" : "Enter your password"}
            required
            trailingSlot={
              <button
                aria-label={locale === "es" ? "Mostrar u ocultar contraseña" : "Show or hide password"}
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

          <div className="-mt-2 flex justify-end">
            <Link
              className="text-sm font-medium text-primary transition-colors hover:text-blue-700"
              href="/forgot-password"
            >
              {locale === "es" ? "He olvidado mi contraseña" : "I forgot my password"}
            </Link>
          </div>

          <div className="login-access-request-card rounded-2xl border border-sky-100 bg-sky-50/80 p-4">
            <p className="login-access-request-title text-sm font-semibold text-slate-900">
              {locale === "es" ? "¿Necesitas acceso a ATOM?" : "Need access to ATOM?"}
            </p>
            <p className="login-access-request-body mt-1 text-sm leading-6 text-slate-600">
              {locale === "es"
                ? "Solicita tu incorporación y revisaremos el alta por correo."
                : "Request access and our team will review it by email."}
            </p>
            <Link
              className="login-access-request-link mt-3 inline-flex items-center text-sm font-semibold text-primary transition-colors hover:text-blue-700"
              href="/request-access"
            >
              {locale === "es" ? "Solicitar acceso" : "Request access"}
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Link>
          </div>

          <button
            className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary text-base font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            disabled={loading}
            type="submit"
          >
            <span>{loading ? (locale === "es" ? "Accediendo..." : "Signing in...") : locale === "es" ? "Acceder" : "Sign in"}</span>
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </button>
        </form>
      </div>
    </AuthCard>
  );
}
