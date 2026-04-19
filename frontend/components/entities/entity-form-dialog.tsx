"use client";

import { FormEvent, useEffect, useState } from "react";

import type { EntityRecord } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { DialogHero } from "@/components/ui/dialog-hero";

type EntityFormDialogProps = {
  entity?: EntityRecord | null;
  mode: "create" | "edit";
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<void> | void;
  open: boolean;
  submitting?: boolean;
};

export function EntityFormDialog({
  entity,
  mode,
  onOpenChange,
  onSubmit,
  open,
  submitting = false,
}: EntityFormDialogProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(entity?.name ?? "");
  }, [entity, open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(name.trim());
  }

  const isCreateMode = mode === "create";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="overflow-hidden">
        <DialogHero
          description={
            isCreateMode
              ? "Registra una nueva entidad reutilizable para usuarios, proyectos y equipos."
              : "Actualiza el nombre visible de la entidad y su slug asociado."
          }
          title={isCreateMode ? "Crear entidad" : "Editar entidad"}
        />

        <form className="px-6 pb-6 sm:px-8" onSubmit={(event) => void handleSubmit(event)}>
          <div className="grid gap-5">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Nombre de la entidad</span>
              <input
                autoFocus
                className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-sky-100"
                onChange={(event) => setName(event.target.value)}
                placeholder="ej. Universidad de La Laguna"
                required
                value={name}
              />
            </label>

            {!isCreateMode && entity ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Slug actual: <strong>{entity.slug}</strong>
              </div>
            ) : null}
          </div>

          <DialogFooter className="mt-8">
            <DialogClose asChild>
              <Button variant="secondary">Cancelar</Button>
            </DialogClose>
            <Button disabled={submitting} type="submit">
              {submitting
                ? isCreateMode
                  ? "Creando..."
                  : "Guardando..."
                : isCreateMode
                  ? "Crear entidad"
                  : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
