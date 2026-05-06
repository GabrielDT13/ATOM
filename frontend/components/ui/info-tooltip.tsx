"use client";

import type { ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function HelpCircleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M9.85 9.3C9.85 7.95 10.93 6.95 12.38 6.95C13.72 6.95 14.9 7.86 14.9 9.26C14.9 10.44 14.18 11.12 13.35 11.68C12.58 12.2 12.1 12.63 12.1 13.55"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <circle cx="12.1" cy="16.7" fill="currentColor" r="1" />
    </svg>
  );
}

export function InfoTooltip({
  content,
  label = "Más información",
  side = "top",
  triggerClassName,
}: {
  content: ReactNode;
  label?: string;
  side?: "bottom" | "left" | "right" | "top";
  triggerClassName?: string;
}) {
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            aria-label={label}
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              triggerClassName,
            )}
            type="button"
          >
            <HelpCircleIcon />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side}>{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
