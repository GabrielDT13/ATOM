"use client";

import { FormEvent } from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onConfirm(values);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="overflow-hidden">
        <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(13,127,242,0.14),_transparent_50%),linear-gradient(180deg,_#ffffff_0%,_#f8fbff_100%)] px-6 py-7 sm:px-8">
          <DialogHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <KeyIcon className="h-5 w-5" />
            </div>
            <DialogTitle className="pt-3">Cambiar contraseña</DialogTitle>
            <p className="text-sm leading-6 text-slate-500">
              Introduce tu contraseña actual y define una nueva contraseña para la cuenta.
            </p>
          </DialogHeader>
        </div>

        <form
          className="px-6 py-6 sm:px-8"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-4">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Contraseña actual
              </span>
              <input
                className="mt-2 block w-full rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:ring-primary"
                onChange={(event) =>
                  onValuesChange({
                    ...values,
                    current_password: event.target.value,
                  })
                }
                placeholder="Introduce tu contraseña actual"
                type="password"
                value={values.current_password}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Nueva contraseña
              </span>
              <input
                className="mt-2 block w-full rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:ring-primary"
                onChange={(event) =>
                  onValuesChange({
                    ...values,
                    new_password: event.target.value,
                  })
                }
                placeholder="Mínimo 8 caracteres"
                type="password"
                value={values.new_password}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Confirmar nueva contraseña
              </span>
              <input
                className="mt-2 block w-full rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:ring-primary"
                onChange={(event) =>
                  onValuesChange({
                    ...values,
                    confirmPassword: event.target.value,
                  })
                }
                placeholder="Repite la nueva contraseña"
                type="password"
                value={values.confirmPassword}
              />
            </label>
          </div>

          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <button
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                type="button"
              >
                Cancelar
              </button>
            </DialogClose>
            <button
              className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:bg-sky-300"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
