"use client";

import { useEffect, useState } from "react";

import { BrainSparkIcon, ExpandIcon } from "@/components/projects/project-management-icons";
import { type ParsedProjectReport } from "@/components/projects/project-report-utils";
import { buttonStyles } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function ReportCarousel({
  images,
}: {
  images: ParsedProjectReport["images"];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
  }, [images]);

  if (!images.length) {
    return (
      <div className="flex h-[32rem] items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm leading-6 text-slate-500">
        Esta ejecución no incluye imágenes destacadas para mostrar en la galería.
      </div>
    );
  }

  const activeImage = images[Math.min(activeIndex, images.length - 1)] ?? images[0];

  return (
    <div className="flex h-[32rem] flex-col">
      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
        <div className="relative">
          <img
            alt={activeImage.alt}
            className="h-[20rem] w-full object-contain bg-white"
            src={activeImage.src}
          />
          <button
            aria-label="Ampliar gráfico"
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
            onClick={() => setExpanded(true)}
            type="button"
          >
            <ExpandIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {activeImage.kind}
          </span>
          <p className="mt-2 text-sm font-medium text-slate-700">{activeImage.alt}</p>
        </div>

        <div className="flex gap-2">
          <button
            className={buttonStyles({ size: "sm", variant: "ghost" })}
            disabled={activeIndex === 0}
            onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}
            type="button"
          >
            Anterior
          </button>
          <button
            className={buttonStyles({ size: "sm", variant: "ghost" })}
            disabled={activeIndex >= images.length - 1}
            onClick={() => setActiveIndex((current) => Math.min(images.length - 1, current + 1))}
            type="button"
          >
            Siguiente
          </button>
        </div>
      </div>

      {images.length > 1 ? (
        <div className="mt-4 grid flex-1 grid-cols-4 content-start gap-3 overflow-auto pr-1">
          {images.map((image, index) => (
            <button
              className={cn(
                "overflow-hidden rounded-2xl border bg-slate-50 transition",
                index === activeIndex ? "border-primary shadow-sm" : "border-slate-200",
              )}
              key={`${image.alt}-${index}`}
              onClick={() => setActiveIndex(index)}
              type="button"
            >
              <img
                alt={image.alt}
                className="h-24 w-full object-cover bg-white"
                src={image.src}
              />
            </button>
          ))}
        </div>
      ) : null}

      <Dialog onOpenChange={setExpanded} open={expanded}>
        <DialogContent className="flex h-[calc(100vh-2rem)] max-w-[min(96vw,90rem)] flex-col overflow-hidden border-slate-200 bg-white p-0 sm:h-[calc(100vh-3rem)]">
          <DialogHeader className="dialog-hero-surface shrink-0 border-b border-white/10 px-6 py-5 text-white sm:px-8">
            <DialogTitle className="text-white">{activeImage.alt}</DialogTitle>
            <DialogDescription className="text-slate-200">
              Visualiza el gráfico ampliado para revisar mejor sus detalles.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-50 p-4 sm:p-6">
            <img
              alt={activeImage.alt}
              className="max-h-full w-full object-contain"
              src={activeImage.src}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ReportInsightsPanel({
  report,
}: {
  report: ParsedProjectReport | null;
}) {
  if (!report) {
    return (
      <div className="flex h-[32rem] items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm leading-6 text-slate-500">
        Selecciona una ejecución para consultar el resumen del informe.
      </div>
    );
  }

  return (
    <div className="h-[32rem] space-y-5 overflow-y-auto pr-1">
      <div className="rounded-[24px] border border-sky-200 bg-sky-50 p-5">
        <div className="flex items-center gap-2">
          <BrainSparkIcon className="h-4 w-4 text-sky-700" />
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            Resumen del informe
          </p>
        </div>
        <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
          {report.title ?? "Informe detectado"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Consulta los puntos más relevantes de la ejecución seleccionada y revisa sus apartados
          principales sin salir de esta página.
        </p>
        <div className="mt-4 space-y-3">
          {report.highlights.length > 0 ? (
            report.highlights.map((highlight, index) => (
              <p className="text-sm leading-6 text-slate-700" key={`${highlight.slice(0, 24)}-${index}`}>
                {highlight}
              </p>
            ))
          ) : (
            <p className="text-sm leading-6 text-slate-600">
              No se han encontrado fragmentos destacados en el informe seleccionado.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {report.sections.map((section) => (
          <article className="rounded-[24px] border border-slate-200 bg-slate-50 p-4" key={section.heading}>
            <p className="text-sm font-semibold text-slate-950">{section.heading}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{section.summary}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
