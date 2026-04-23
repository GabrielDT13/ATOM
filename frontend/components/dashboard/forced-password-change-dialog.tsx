"use client";

import { FormEvent, useEffect, useState } from "react";

import { ArrowRightIcon } from "@/components/dashboard/dashboard-icons";
import { KeyIcon } from "@/components/profile/profile-icons";
import { Button } from "@/components/ui/button";

type ForcedPasswordChangeDialogProps = {
  open: boolean;
  onSubmit: (newPassword: string) => void;
  submitting?: boolean;
  userLabel: string;
};

export function ForcedPasswordChangeDialog({
  open,
  onSubmit,
  submitting = false,
  userLabel,
}: ForcedPasswordChangeDialogProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
    }
  }, [open]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedPassword = newPassword.trim();
    if (normalizedPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (normalizedPassword !== confirmPassword) {
      setError("La confirmación no coincide con la nueva contraseña.");
      return;
    }

    setError(null);
    onSubmit(normalizedPassword);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/72 px-4 py-6 backdrop-blur-md">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-[36px] border border-white/10 bg-slate-950 text-white shadow-[0_40px_120px_-48px_rgba(15,23,42,0.9)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.28),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.24),_transparent_32%),linear-gradient(135deg,_#020617_0%,_#0f172a_46%,_#052e2b_100%)]" />

        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
          <section className="flex flex-col justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-slate-200">
                <KeyIcon className="h-4 w-4" />
                Primer acceso seguro
              </div>
              <h2 className="mt-5 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Antes de continuar, define nueva contraseña para {userLabel}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                Has entrado con clave temporal. ATOM bloquea resto de plataforma hasta guardar una
                contraseña nueva y personal.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[28px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Requisito
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-100">
                  Mínimo 8 caracteres.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Estado
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-100">
                  Cambio obligatorio una sola vez.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Después
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-100">
                  Se activa guía de bienvenida si aún no la viste.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-white/8 p-6 backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-white">Actualiza contraseña</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Usa una clave nueva que solo tú conozcas.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="text-sm font-semibold text-slate-100">
                  Nueva contraseña
                </span>
                <input
                  autoComplete="new-password"
                  className="mt-2 block h-12 w-full rounded-2xl border border-white/12 bg-white/10 px-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-300/20"
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  type="password"
                  value={newPassword}
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-100">
                  Repite nueva contraseña
                </span>
                <input
                  autoComplete="new-password"
                  className="mt-2 block h-12 w-full rounded-2xl border border-white/12 bg-white/10 px-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-300/20"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repite contraseña"
                  type="password"
                  value={confirmPassword}
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : null}

              <Button className="mt-2 w-full" disabled={submitting} size="lg" type="submit">
                <span>{submitting ? "Guardando..." : "Guardar y continuar"}</span>
                <ArrowRightIcon className="h-5 w-5" />
              </Button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
