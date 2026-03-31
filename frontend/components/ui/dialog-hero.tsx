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
  return (
    <div className={cn("dialog-hero-surface border-b border-white/10 px-6 pb-6 pt-7 sm:px-8", className)}>
      <DialogHeader className="pr-10">
        {children}
        <DialogTitle className="text-white">{title}</DialogTitle>
        {description ? (
          <DialogDescription className="text-slate-300">{description}</DialogDescription>
        ) : null}
      </DialogHeader>
    </div>
  );
}
