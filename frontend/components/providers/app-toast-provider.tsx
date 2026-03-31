"use client";

import { Toaster } from "sonner";

export function AppToastProvider() {
  return (
    <Toaster
      closeButton
      className="toaster group"
      expand
      position="top-center"
      richColors
      toastOptions={{
        classNames: {
          toast:
            "!rounded-2xl !border !bg-white !text-slate-900 !shadow-2xl !shadow-slate-950/10 data-[type=success]:!border-emerald-200 data-[type=success]:!bg-emerald-50 data-[type=success]:!text-emerald-950 data-[type=error]:!border-rose-200 data-[type=error]:!bg-rose-50 data-[type=error]:!text-rose-950 data-[type=warning]:!border-amber-200 data-[type=warning]:!bg-amber-50 data-[type=warning]:!text-amber-950 data-[type=info]:!border-sky-200 data-[type=info]:!bg-sky-50 data-[type=info]:!text-sky-950 data-[type=loading]:!border-slate-200 data-[type=loading]:!bg-slate-900 data-[type=loading]:!text-white",
          title: "!text-sm !font-semibold !text-current",
          description: "!text-sm !leading-5 !text-current !opacity-80",
          actionButton:
            "!border-0 !bg-slate-900 !text-white hover:!bg-slate-700 data-[type=loading]:!bg-white/15 data-[type=loading]:!text-white",
          cancelButton:
            "!border !border-slate-200 !bg-white !text-slate-700 hover:!bg-slate-50",
          closeButton:
            "!border-0 !bg-transparent !text-current/70 hover:!bg-black/5 hover:!text-current",
          default: "!border-slate-200 !bg-white !text-slate-900",
          success: "!border-emerald-200 !bg-emerald-50 !text-emerald-950",
          error: "!border-rose-200 !bg-rose-50 !text-rose-950",
          warning: "!border-amber-200 !bg-amber-50 !text-amber-950",
          info: "!border-sky-200 !bg-sky-50 !text-sky-950",
          loading: "!border-slate-200 !bg-slate-900 !text-white",
        },
      }}
      visibleToasts={4}
    />
  );
}
