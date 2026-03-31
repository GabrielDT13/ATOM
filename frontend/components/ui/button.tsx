"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type AppButtonVariant = "danger" | "ghost" | "primary" | "secondary";
export type AppButtonTone = "default" | "on-dark";
export type AppButtonSize = "sm" | "md" | "lg";

type ButtonStyleOptions = {
  size?: AppButtonSize;
  tone?: AppButtonTone;
  variant?: AppButtonVariant;
};

const BUTTON_BASE_CLASS_NAME =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60";

const BUTTON_SIZE_CLASS_NAMES: Record<AppButtonSize, string> = {
  lg: "h-12 px-5 text-sm",
  md: "h-11 px-5 text-sm",
  sm: "h-9 px-4 text-xs",
};

const BUTTON_VARIANT_CLASS_NAMES: Record<
  AppButtonTone,
  Record<AppButtonVariant, string>
> = {
  default: {
    danger:
      "border border-rose-200 bg-rose-600 text-white shadow-sm hover:border-rose-700 hover:bg-rose-700 disabled:border-rose-200 disabled:bg-rose-300",
    ghost:
      "border border-slate-200 bg-transparent text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950",
    primary:
      "bg-primary text-white shadow-[0_16px_32px_-20px_rgba(13,127,242,0.85)] hover:bg-primary-dark disabled:bg-sky-300 disabled:shadow-none",
    secondary:
      "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950",
  },
  "on-dark": {
    danger:
      "border border-rose-300/30 bg-rose-500/90 text-white shadow-sm hover:bg-rose-500 disabled:bg-rose-300/70",
    ghost:
      "border border-white/18 bg-white/10 text-white hover:border-white/28 hover:bg-white/14",
    primary:
      "bg-primary text-white shadow-[0_18px_36px_-24px_rgba(13,127,242,0.95)] hover:bg-primary-dark disabled:bg-sky-300 disabled:shadow-none",
    secondary: "bg-white text-slate-950 hover:bg-slate-100",
  },
};

export function buttonStyles({
  size = "md",
  tone = "default",
  variant = "primary",
}: ButtonStyleOptions = {}) {
  return cn(
    BUTTON_BASE_CLASS_NAME,
    BUTTON_SIZE_CLASS_NAMES[size],
    BUTTON_VARIANT_CLASS_NAMES[tone][variant],
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonStyleOptions & {
    fullWidth?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      fullWidth = false,
      size = "md",
      tone = "default",
      type = "button",
      variant = "primary",
      ...props
    },
    ref,
  ) => (
    <button
      className={cn(buttonStyles({ size, tone, variant }), fullWidth && "w-full", className)}
      ref={ref}
      type={type}
      {...props}
    />
  ),
);

Button.displayName = "Button";
