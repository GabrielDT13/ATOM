"use client";

import type { ReactNode } from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DialogHero } from "@/components/ui/dialog-hero";

type ConfirmDialogProps = {
  actionLabel: string;
  body: ReactNode;
  confirmDisabled?: boolean;
  confirmVariant?: "danger" | "primary";
  onConfirm: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
};

export function ConfirmDialog({
  actionLabel,
  body,
  confirmDisabled = false,
  confirmVariant = "primary",
  onConfirm,
  onOpenChange,
  open,
  title,
}: ConfirmDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-lg overflow-hidden">
        <DialogHero description={<div className="text-sm leading-6 text-slate-300">{body}</div>} title={title} />

        <DialogFooter className="px-6 pb-6 sm:px-8">
          <DialogClose asChild>
            <Button variant="secondary">Cancelar</Button>
          </DialogClose>
          <Button
            disabled={confirmDisabled}
            onClick={() => void onConfirm()}
            type="button"
            variant={confirmVariant}
          >
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
