"use client";

import { Toaster } from "sonner";

export function AppToastProvider() {
  return (
    <Toaster
      closeButton
      position="top-center"
      richColors
      toastOptions={{
        classNames: {
          toast:
            "!rounded-2xl !border !border-slate-200 !bg-white !shadow-2xl !shadow-slate-950/10",
          title: "!text-sm !font-semibold !text-slate-900",
          description: "!text-sm !text-slate-600",
          closeButton:
            "!border-0 !bg-transparent !text-slate-500 hover:!bg-slate-100 hover:!text-slate-900",
          success: "!border-emerald-200 !bg-emerald-50",
          error: "!border-red-200 !bg-red-50",
          warning: "!border-amber-200 !bg-amber-50",
          info: "!border-primary/20 !bg-primary/5",
          loading: "!border-primary/20 !bg-white",
        },
      }}
      visibleToasts={4}
    />
  );
}
