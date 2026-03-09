"use client";

import type { ReactNode } from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

function getConfirmButtonClassName(variant: "danger" | "primary") {
  if (variant === "danger") {
    return "bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300";
  }

  return "bg-primary hover:bg-sky-700 disabled:bg-sky-300";
}

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
        <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(248,113,113,0.12),_transparent_36%),linear-gradient(180deg,_#ffffff_0%,_#fff8f8_100%)] px-6 pb-6 pt-7 sm:px-8">
          <DialogHeader className="pr-10">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription asChild>
              <div className="text-sm leading-6 text-slate-500">{body}</div>
            </DialogDescription>
          </DialogHeader>
        </div>

        <DialogFooter className="px-6 pb-6 sm:px-8">
          <DialogClose asChild>
            <button
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              type="button"
            >
              Cancelar
            </button>
          </DialogClose>
          <button
            className={`inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition ${getConfirmButtonClassName(confirmVariant)}`}
            disabled={confirmDisabled}
            onClick={() => void onConfirm()}
            type="button"
          >
            {actionLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
