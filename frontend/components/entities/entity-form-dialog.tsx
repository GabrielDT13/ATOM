"use client";

import { FormEvent, useEffect, useState } from "react";

import type { EntityRecord } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { DialogHero } from "@/components/ui/dialog-hero";
import { EntityLogo } from "@/components/ui/entity-logo";

type EntityFormDialogProps = {
  entity?: EntityRecord | null;
  mode: "create" | "edit";
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: {
    logoFile: File | null;
    name: string;
    removeLogo: boolean;
  }) => Promise<void> | void;
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setName(entity?.name ?? "");
    setLogoFile(null);
    setRemoveLogo(false);
  }, [entity, open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      logoFile,
      name: name.trim(),
      removeLogo,
    });
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

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-700">Logo o escudo</span>
              <input
                accept="image/png,image/jpeg,image/webp"
                className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 file:mr-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700"
                onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                type="file"
              />
              <p className="text-xs leading-5 text-slate-500">
                Se comprimirá al subir para dejar un logo ligero y consistente.
              </p>
            </label>

            {entity?.logo_url ? (
              <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input
                  checked={removeLogo}
                  className="h-4 w-4 rounded border-slate-300"
                  onChange={(event) => setRemoveLogo(event.target.checked)}
                  type="checkbox"
                />
                Quitar logo actual
              </label>
            ) : null}

            {!isCreateMode && entity ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p>
                  Slug actual: <strong>{entity.slug}</strong>
                </p>
                {entity.logo_url ? (
                  <EntityLogo className="mt-3 h-16 w-16 bg-white" logoUrl={entity.logo_url} name={entity.name} />
                ) : null}
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
