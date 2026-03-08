"use client";

import { Toaster } from "sonner";

export function AppToastProvider() {
  return (
    <Toaster
      closeButton
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-2xl !border !shadow-2xl !shadow-slate-950/10 [&_[data-title]]:!text-current [&_[data-title]]:!font-semibold [&_[data-title]]:!text-sm [&_[data-description]]:!text-current [&_[data-description]]:!text-sm [&_[data-description]]:!opacity-90",
          title: "!text-current !text-sm !font-semibold",
          description: "!text-current !text-sm !opacity-90",
          closeButton:
            "!border-0 !bg-transparent !text-current/80 hover:!bg-black/5 hover:!text-current",
          default:
            "!border-slate-200 !bg-white !text-slate-900",
          success:
            "!border-emerald-700 !bg-emerald-600 !text-white [&_[data-button]]:!border-white/20 [&_[data-button]]:hover:!bg-white/15",
          error:
            "!border-rose-700 !bg-rose-600 !text-white [&_[data-button]]:!border-white/20 [&_[data-button]]:hover:!bg-white/15",
          warning:
            "!border-amber-500 !bg-amber-400 !text-slate-950 [&_[data-button]]:!border-slate-900/10 [&_[data-button]]:hover:!bg-slate-950/5",
          info:
            "!border-sky-300 !bg-sky-100 !text-sky-950 [&_[data-button]]:!border-sky-900/10 [&_[data-button]]:hover:!bg-sky-950/5",
          loading:
            "!border-sky-700 !bg-sky-600 !text-white [&_[data-button]]:!border-white/20 [&_[data-button]]:hover:!bg-white/15",
        },
      }}
      visibleToasts={4}
    />
  );
}
