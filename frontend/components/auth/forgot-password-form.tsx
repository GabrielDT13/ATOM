"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { AuthBrand } from "@/components/auth/auth-brand";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthInputField } from "@/components/auth/auth-input-field";
import { ArrowRightIcon, MailIcon } from "@/components/auth/auth-icons";
import { useLocale } from "@/components/providers/locale-provider";
import { useAppToast } from "@/hooks/use-app-toast";
import { apiFetch } from "@/lib/api";
import type { AuthMessageResponse } from "@/types/api";

export function ForgotPasswordForm() {
  const toast = useAppToast();
  const { locale } = useLocale();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const request = apiFetch<AuthMessageResponse>("/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    toast.promise(request, {
      loading: {
        title: locale === "es" ? "Enviando instrucciones" : "Sending instructions",
        description: locale === "es" ? "Estamos preparando el correo de recuperación." : "We are preparing recovery email.",
      },
      success: {
        title: locale === "es" ? "Revisa tu email" : "Check your email",
        description:
          locale === "es"
            ? "Si la cuenta existe, recibirás un enlace para restablecer la contraseña."
            : "If account exists, you will receive reset link.",
      },
      error: {
        title: locale === "es" ? "No se pudo completar la solicitud" : "Could not complete request",
        description: locale === "es" ? "Vuelve a intentarlo en unos minutos." : "Try again in a few minutes.",
      },
    });

    try {
      await request;
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard>
      <div className="flex flex-col gap-6">
        <AuthBrand />

        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold text-slate-950">{locale === "es" ? "Recuperar acceso" : "Recover access"}</h2>
          <p className="text-sm leading-6 text-slate-500">
            {locale === "es"
              ? "Introduce tu email y te enviaremos un enlace para establecer una nueva contraseña."
              : "Enter your email and we will send link to set new password."}
          </p>
        </div>

        <form className="mt-2 flex flex-col gap-5" onSubmit={handleSubmit}>
          <AuthInputField
            autoComplete="email"
            id="forgot-password-email"
            label="Email"
            leadingIcon={<MailIcon />}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={locale === "es" ? "Introduce tu email" : "Enter your email"}
            required
            type="email"
            value={email}
          />

          <button
            className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary text-base font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            disabled={loading}
            type="submit"
          >
            <span>{loading ? (locale === "es" ? "Enviando..." : "Sending...") : locale === "es" ? "Enviar enlace" : "Send link"}</span>
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
          {submitted ? (
            <p>
              {locale === "es"
                ? "Si la cuenta existe, recibirás un correo con instrucciones. También puedes volver al "
                : "If account exists, you will receive email with instructions. You can also go back to "}
              <Link className="font-semibold text-primary hover:text-blue-700" href="/login">
                {locale === "es" ? "inicio de sesión" : "sign in"}
              </Link>
              .
            </p>
          ) : (
            <p>
              {locale === "es" ? "¿Recuerdas tu contraseña? " : "Remember your password? "}
              <Link className="font-semibold text-primary hover:text-blue-700" href="/login">
                {locale === "es" ? "Volver a iniciar sesión" : "Back to sign in"}
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </AuthCard>
  );
}
