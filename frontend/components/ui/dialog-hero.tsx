"use client";

import type { ReactNode } from "react";

import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type DialogHeroProps = {
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  title: ReactNode;
};

export function DialogHero({
  children,
  className,
  description,
  title,
}: DialogHeroProps) {
  const isDescriptionTextOnly =
    typeof description === "string" || typeof description === "number";

  return (
    <div className={cn("dialog-hero-surface border-b border-white/10 px-6 pb-6 pt-7 sm:px-8", className)}>
      <DialogHeader className="pr-10">
        {children}
        <DialogTitle className="text-white">{title}</DialogTitle>
        {description ? (
          isDescriptionTextOnly ? (
            <DialogDescription className="text-slate-300">{description}</DialogDescription>
          ) : (
            <DialogDescription asChild className="text-sm leading-6 text-slate-300">
              <div>{description}</div>
            </DialogDescription>
          )
        ) : null}
      </DialogHeader>
    </div>
  );
}
