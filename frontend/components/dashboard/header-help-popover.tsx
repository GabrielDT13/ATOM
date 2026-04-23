"use client";

import { MailIcon, QuestionCircleIcon } from "@/components/dashboard/dashboard-icons";
import { buttonStyles } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type HeaderHelpPopoverProps = {
  onStartTour: () => void;
  supportEmail: string;
};

function buildSupportHref(supportEmail: string) {
  const subject = encodeURIComponent("Ayuda con ATOM");
  const body = encodeURIComponent(
    "Hola,\n\nNecesito ayuda con la plataforma ATOM.\n\nDescribe aqui incidencia o duda.\n",
  );
  return `mailto:${supportEmail}?subject=${subject}&body=${body}`;
}

export function HeaderHelpPopover({
  onStartTour,
  supportEmail,
}: HeaderHelpPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Ayuda"
          className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-primary"
          data-tour="header-help"
          type="button"
        >
          <QuestionCircleIcon className="h-5 w-5" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[22rem] p-0">
        <div className="overflow-hidden rounded-3xl">
          <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_38%),linear-gradient(135deg,_#ffffff_0%,_#f8fafc_100%)] px-5 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
              Centro de ayuda
            </p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">
              Recorre plataforma o contacta soporte
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Vuelve a abrir guía visual cuando quieras y centraliza dudas desde aquí.
            </p>
          </div>

          <div className="space-y-3 px-5 py-5">
            <button
              className="flex w-full items-start gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-sky-200 hover:bg-sky-50/60"
              onClick={onStartTour}
              type="button"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <QuestionCircleIcon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-950">
                  Ver manual interactivo
                </span>
                <span className="mt-1 block text-sm leading-6 text-slate-500">
                  Recorrido guiado por dashboard, proyectos, creación y accesos rápidos.
                </span>
              </span>
            </button>

            <a
              className="flex items-start gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-4 transition hover:border-emerald-200 hover:bg-emerald-50/60"
              href={buildSupportHref(supportEmail)}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <MailIcon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-950">
                  Pedir ayuda al administrador
                </span>
                <span className="mt-1 block text-sm leading-6 text-slate-500">
                  Abre correo preparado para enviar incidencia o duda a {supportEmail}.
                </span>
              </span>
            </a>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
            <button
              className={buttonStyles({ size: "md", variant: "secondary" })}
              onClick={onStartTour}
              type="button"
            >
              Abrir guía
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
