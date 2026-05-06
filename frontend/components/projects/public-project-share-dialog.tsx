"use client";

import { useMemo, useState } from "react";

import { MailIcon } from "@/components/dashboard/dashboard-icons";
import {
  LinkIcon,
  ShareIcon,
  WhatsAppIcon,
} from "@/components/projects/project-management-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAppToast } from "@/hooks/use-app-toast";
import { buildProjectDetailHref } from "@/lib/projects";

type PublicProjectShareDialogProps = {
  owner: string;
  projectName: string;
  projectRef: string;
  triggerClassName?: string;
  triggerLabel?: string;
  triggerTone?: "default" | "on-dark";
  triggerVariant?: "ghost" | "primary" | "secondary";
};

function buildAbsoluteProjectUrl(projectRef: string) {
  const projectPath = buildProjectDetailHref(projectRef);
  if (typeof window === "undefined") {
    return projectPath;
  }

  return new URL(projectPath, window.location.origin).toString();
}

export function PublicProjectShareDialog({
  owner,
  projectName,
  projectRef,
  triggerClassName,
  triggerLabel = "Compartir",
  triggerTone = "default",
  triggerVariant = "secondary",
}: PublicProjectShareDialogProps) {
  const appToast = useAppToast();
  const [open, setOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const shareUrl = useMemo(() => buildAbsoluteProjectUrl(projectRef), [projectRef]);
  const shareTitle = `Proyecto publico: ${projectName}`;
  const shareMessage = `Mira proyecto publico ${projectName} de @${owner}: ${shareUrl}`;
  const encodedShareMessage = encodeURIComponent(shareMessage);
  const mailtoHref = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodedShareMessage}`;
  const whatsappHref = `https://wa.me/?text=${encodedShareMessage}`;

  async function handleCopyLink() {
    try {
      setCopying(true);
      await navigator.clipboard.writeText(shareUrl);
      appToast.success("Enlace copiado", "Link publico listo para compartir.");
    } catch (copyError) {
      appToast.error(
        "No se pudo copiar enlace",
        copyError instanceof Error ? copyError.message : undefined,
      );
    } finally {
      setCopying(false);
    }
  }

  async function handleNativeShare() {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      return;
    }

    try {
      await navigator.share({
        text: `Proyecto publico de @${owner}`,
        title: shareTitle,
        url: shareUrl,
      });
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") {
        return;
      }

      appToast.error(
        "No se pudo abrir compartir",
        shareError instanceof Error ? shareError.message : undefined,
      );
    }
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button
          className={triggerClassName}
          size="md"
          tone={triggerTone}
          variant={triggerVariant}
        >
          <ShareIcon className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl overflow-hidden rounded-[32px]">
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-6 sm:px-8">
          <DialogHeader>
            <DialogTitle>Compartir proyecto publico</DialogTitle>
            <DialogDescription>
              Comparte enlace directo o abre canal rapido para mandar proyecto fuera de plataforma.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-6 sm:px-8">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Enlace publico
            </p>
            <p className="mt-2 break-all text-sm leading-6 text-slate-700">{shareUrl}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              className="justify-start rounded-[22px]"
              onClick={() => {
                void handleCopyLink();
              }}
              size="lg"
              variant="secondary"
            >
              <LinkIcon className="h-4 w-4" />
              {copying ? "Copiando..." : "Copiar enlace"}
            </Button>
            {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
              <Button
                className="justify-start rounded-[22px]"
                onClick={() => {
                  void handleNativeShare();
                }}
                size="lg"
                variant="secondary"
              >
                <ShareIcon className="h-4 w-4" />
                Compartir desde dispositivo
              </Button>
            ) : null}
            <a
              className="inline-flex h-12 items-center justify-start gap-2 rounded-[22px] border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
              href={whatsappHref}
              rel="noreferrer"
              target="_blank"
            >
              <WhatsAppIcon className="h-4 w-4" />
              Compartir por WhatsApp
            </a>
            <a
              className="inline-flex h-12 items-center justify-start gap-2 rounded-[22px] border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
              href={mailtoHref}
            >
              <MailIcon className="h-4 w-4" />
              Compartir por correo
            </a>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200 bg-white px-6 py-5 sm:px-8">
          <Button onClick={() => setOpen(false)} variant="ghost">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
