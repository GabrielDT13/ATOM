"use client";

import { DatabaseIcon } from "@/components/dashboard/dashboard-icons";
import { resolveEntityLogoUrl } from "@/lib/entities";
import { cn } from "@/lib/utils";

type EntityLogoProps = {
  className?: string;
  logoUrl?: string | null;
  name?: string | null;
};

export function EntityLogo({ className, logoUrl, name }: EntityLogoProps) {
  const resolvedLogoUrl = resolveEntityLogoUrl(logoUrl);

  if (resolvedLogoUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/95 shadow-sm",
          className,
        )}
      >
        <img
          alt={name ? `Logo de ${name}` : "Logo de entidad"}
          className="h-full w-full object-contain p-2"
          src={resolvedLogoUrl}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-2xl bg-sky-50 text-sky-700",
        className,
      )}
    >
      <DatabaseIcon className="h-5 w-5" />
    </div>
  );
}
