"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

import {
  buttonStyles,
  type AppButtonSize,
  type AppButtonTone,
  type AppButtonVariant,
} from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    children: ReactNode;
    size?: AppButtonSize;
    tone?: AppButtonTone;
    variant?: AppButtonVariant;
  };

export function ButtonLink({
  children,
  className,
  size = "md",
  tone = "default",
  variant = "primary",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(buttonStyles({ size, tone, variant }), className)}
      {...props}
    >
      {children}
    </Link>
  );
}
