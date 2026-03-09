import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MoreHorizontalIcon,
} from "@/components/dashboard/dashboard-icons";
import { cn } from "@/lib/utils";

export function Pagination({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <nav
      aria-label="Paginación"
      className={cn("mx-auto flex w-full justify-end", className)}
      {...props}
    >
      {children}
    </nav>
  );
}

export function PaginationContent({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLUListElement>) {
  return (
    <ul className={cn("flex flex-row items-center gap-1", className)} {...props}>
      {children}
    </ul>
  );
}

export function PaginationItem({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLLIElement>) {
  return (
    <li className={cn("", className)} {...props}>
      {children}
    </li>
  );
}

type PaginationButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  children: ReactNode;
};

export function PaginationButton({
  active = false,
  children,
  className,
  ...props
}: PaginationButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-9 min-w-9 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition",
        active
          ? "border-primary bg-primary text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export function PaginationPrevious(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <PaginationButton aria-label="Página anterior" className="w-9 px-0" {...props}>
      <ArrowLeftIcon className="h-4 w-4" />
      <span className="sr-only">Página anterior</span>
    </PaginationButton>
  );
}

export function PaginationNext(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <PaginationButton aria-label="Página siguiente" className="w-9 px-0" {...props}>
      <ArrowRightIcon className="h-4 w-4" />
      <span className="sr-only">Página siguiente</span>
    </PaginationButton>
  );
}

export function PaginationEllipsis() {
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center text-slate-400">
      <MoreHorizontalIcon className="h-4 w-4" />
      <span className="sr-only">Más páginas</span>
    </span>
  );
}
