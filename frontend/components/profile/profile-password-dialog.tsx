"use client";

import { FormEvent } from "react";

import { useLocale } from "@/components/providers/locale-provider";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DialogHero } from "@/components/ui/dialog-hero";

import { KeyIcon } from "@/components/profile/profile-icons";

export type ProfilePasswordValues = {
  confirmPassword: string;
  current_password: string;
  new_password: string;
};

type ProfilePasswordDialogProps = {
  onConfirm: (values: ProfilePasswordValues) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  submitting?: boolean;
  values: ProfilePasswordValues;
  onValuesChange: (values: ProfilePasswordValues) => void;
};

export function ProfilePasswordDialog({
  onConfirm,
  onOpenChange,
  open,
  submitting = false,
  values,
  onValuesChange,
}: ProfilePasswordDialogProps) {
  const { locale } = useLocale();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onConfirm(values);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="overflow-hidden">
        <DialogHero
          description={
            locale === "es"
              ? "Introduce tu contraseña actual y define una nueva contraseña para la cuenta."
              : "Enter your current password and define a new password for the account."
          }
          title={locale === "es" ? "Cambiar contraseña" : "Change password"}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
            <KeyIcon className="h-5 w-5" />
          </div>
        </DialogHero>

        <form
          className="px-6 py-6 sm:px-8"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-4">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                {locale === "es" ? "Contraseña actual" : "Current password"}
              </span>
              <input
                className="mt-2 block w-full rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:ring-primary"
                onChange={(event) =>
                  onValuesChange({
                    ...values,
                    current_password: event.target.value,
                  })
                }
                placeholder={locale === "es" ? "Introduce tu contraseña actual" : "Enter your current password"}
                type="password"
                value={values.current_password}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                {locale === "es" ? "Nueva contraseña" : "New password"}
              </span>
              <input
                className="mt-2 block w-full rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:ring-primary"
                onChange={(event) =>
                  onValuesChange({
                    ...values,
                    new_password: event.target.value,
                  })
                }
                placeholder={locale === "es" ? "Mínimo 8 caracteres" : "Minimum 8 characters"}
                type="password"
                value={values.new_password}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                {locale === "es" ? "Confirmar nueva contraseña" : "Confirm new password"}
              </span>
              <input
                className="mt-2 block w-full rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:ring-primary"
                onChange={(event) =>
                  onValuesChange({
                    ...values,
                    confirmPassword: event.target.value,
                  })
                }
                placeholder={locale === "es" ? "Repite la nueva contraseña" : "Repeat new password"}
                type="password"
                value={values.confirmPassword}
              />
            </label>
          </div>

          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button variant="secondary">{locale === "es" ? "Cancelar" : "Cancel"}</Button>
            </DialogClose>
            <Button
              disabled={submitting}
              type="submit"
            >
              {submitting
                ? locale === "es" ? "Actualizando..." : "Updating..."
                : locale === "es" ? "Actualizar contraseña" : "Update password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
