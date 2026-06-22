"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { AuthBrand } from "@/components/auth/auth-brand";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthInputField } from "@/components/auth/auth-input-field";
import { ArrowRightIcon, MailIcon, UserIcon } from "@/components/auth/auth-icons";
import { useLocale } from "@/components/providers/locale-provider";
import { useAppToast } from "@/hooks/use-app-toast";
import { apiFetch } from "@/lib/api";
import type { AccessRequestMutationResponse } from "@/types/api";

export function AccessRequestForm() {
  const { locale } = useLocale();
  const toast = useAppToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await apiFetch<AccessRequestMutationResponse>("/api/access-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
        }),
      });

      if (!response.success) {
        toast.error(response.message);
        return;
      }

      setSubmitted(true);
      setFullName("");
      setEmail("");
      toast.success(response.message);
    } catch (submitError) {
      toast.error(
        locale === "es" ? "No se pudo enviar la solicitud" : "Could not send request",
        submitError instanceof Error ? submitError.message : undefined,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard>
      <div className="flex flex-col gap-6">
        <AuthBrand />

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
            {locale === "es" ? "Nuevo acceso" : "New access"}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            {locale === "es" ? "Solicita tu incorporación" : "Request your access"}
          </h1>
          <p className="text-sm leading-6 text-slate-500">
            {locale === "es"
              ? "Déjanos tu nombre y tu correo. El equipo administrador revisará la solicitud y te responderá por email."
              : "Share your name and email. Admin team will review the request and reply by email."}
          </p>
        </div>

        {submitted ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
            {locale === "es"
              ? "Solicitud enviada. Cuando el equipo la revise, recibirás la respuesta en tu correo."
              : "Request sent. Once team reviews it, you will receive a reply by email."}
          </div>
        ) : null}

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <AuthInputField
            autoComplete="name"
            id="request-access-name"
            label={locale === "es" ? "Nombre y apellidos" : "Full name"}
            leadingIcon={<UserIcon />}
            onChange={(event) => setFullName(event.target.value)}
            placeholder={locale === "es" ? "Introduce tu nombre" : "Enter your name"}
            required
            value={fullName}
          />

          <AuthInputField
            autoComplete="email"
            id="request-access-email"
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
            <span>
              {loading
                ? locale === "es"
                  ? "Enviando..."
                  : "Sending..."
                : locale === "es"
                  ? "Enviar solicitud"
                  : "Send request"}
            </span>
            <ArrowRightIcon className="ml-2 h-5 w-5" />
          </button>
        </form>

        <div className="border-t border-slate-200 pt-4 text-sm text-slate-500">
          <span>{locale === "es" ? "¿Ya tienes cuenta?" : "Already have an account?"}</span>{" "}
          <Link className="font-semibold text-primary transition-colors hover:text-blue-700" href="/login">
            {locale === "es" ? "Volver al login" : "Back to sign in"}
          </Link>
        </div>
      </div>
    </AuthCard>
  );
}
