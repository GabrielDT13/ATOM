"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type BoardHeroArtProps = {
  accentClassName: string;
  corner?: ReactNode;
  eyebrow?: ReactNode;
  imagePath?: string;
  subtitle?: string | null;
  title: string;
};

export function BoardHeroArt({
  accentClassName,
  corner,
  eyebrow,
  imagePath,
  subtitle,
  title,
}: BoardHeroArtProps) {
  const backgroundImage = imagePath
    ? `linear-gradient(180deg, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.7) 100%), url(${imagePath})`
    : "linear-gradient(135deg, rgba(14,165,233,0.22) 0%, rgba(255,255,255,0.98) 48%, rgba(16,185,129,0.2) 100%)";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[24px] border border-slate-200 shadow-sm",
        accentClassName,
      )}
      style={{
        backgroundImage,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_32%)]" />
      {corner ? <div className="absolute right-4 top-4 z-10">{corner}</div> : null}
      <div className="relative flex min-h-[12rem] flex-col justify-end gap-2 p-5">
        {eyebrow ? (
          <div className="w-fit rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
            {eyebrow}
          </div>
        ) : null}
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-white drop-shadow-sm">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-100/90 drop-shadow-sm">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
