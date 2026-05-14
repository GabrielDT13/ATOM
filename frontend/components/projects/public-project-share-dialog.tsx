"use client";

import { useMemo, useState } from "react";

import { MailIcon } from "@/components/dashboard/dashboard-icons";
import { useLocale } from "@/components/providers/locale-provider";
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
  const { locale } = useLocale();
  const appToast = useAppToast();
  const [open, setOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const shareUrl = useMemo(() => buildAbsoluteProjectUrl(projectRef), [projectRef]);
  const shareTitle =
    locale === "es" ? `Proyecto público: ${projectName}` : `Public project: ${projectName}`;
  const shareMessage =
    locale === "es"
      ? `Mira proyecto público ${projectName} de @${owner}: ${shareUrl}`
      : `Check public project ${projectName} from @${owner}: ${shareUrl}`;
  const encodedShareMessage = encodeURIComponent(shareMessage);
  const mailtoHref = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodedShareMessage}`;
  const whatsappHref = `https://wa.me/?text=${encodedShareMessage}`;

  async function handleCopyLink() {
    try {
      setCopying(true);
      await navigator.clipboard.writeText(shareUrl);
      appToast.success(
        locale === "es" ? "Enlace copiado" : "Link copied",
        locale === "es" ? "Enlace público listo para compartir." : "Public link ready to share.",
      );
    } catch (copyError) {
      appToast.error(
        locale === "es" ? "No se pudo copiar enlace" : "Could not copy link",
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
        text: locale === "es" ? `Proyecto público de @${owner}` : `Public project from @${owner}`,
        title: shareTitle,
        url: shareUrl,
      });
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") {
        return;
      }

      appToast.error(
        locale === "es" ? "No se pudo abrir compartir" : "Could not open share",
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
          {triggerLabel === "Compartir" && locale === "en" ? "Share" : triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl overflow-hidden rounded-[32px]">
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-6 sm:px-8">
          <DialogHeader>
            <DialogTitle>
              {locale === "es" ? "Compartir proyecto público" : "Share public project"}
            </DialogTitle>
            <DialogDescription>
              {locale === "es"
                ? "Comparte enlace directo o abre un canal rápido para enviar proyecto fuera de la plataforma."
                : "Share direct link or open a quick channel to send the project outside the platform."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-6 sm:px-8">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {locale === "es" ? "Enlace público" : "Public link"}
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
              {copying
                ? locale === "es" ? "Copiando..." : "Copying..."
                : locale === "es" ? "Copiar enlace" : "Copy link"}
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
                {locale === "es" ? "Compartir desde dispositivo" : "Share from device"}
              </Button>
            ) : null}
            <a
              className="inline-flex h-12 items-center justify-start gap-2 rounded-[22px] border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
              href={whatsappHref}
              rel="noreferrer"
              target="_blank"
            >
              <WhatsAppIcon className="h-4 w-4" />
              {locale === "es" ? "Compartir por WhatsApp" : "Share via WhatsApp"}
            </a>
            <a
              className="inline-flex h-12 items-center justify-start gap-2 rounded-[22px] border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
              href={mailtoHref}
            >
              <MailIcon className="h-4 w-4" />
              {locale === "es" ? "Compartir por correo" : "Share by email"}
            </a>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200 bg-white px-6 py-5 sm:px-8">
          <Button onClick={() => setOpen(false)} variant="ghost">
            {locale === "es" ? "Cerrar" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
