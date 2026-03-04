import { ComponentPropsWithoutRef, ReactNode } from "react";

type AuthInputFieldProps = {
  label: string;
  leadingIcon: ReactNode;
  trailingSlot?: ReactNode;
} & Omit<ComponentPropsWithoutRef<"input">, "className">;

export function AuthInputField({
  label,
  leadingIcon,
  trailingSlot,
  ...inputProps
}: AuthInputFieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-slate-400">
          {leadingIcon}
        </div>
        <input
          {...inputProps}
          className={`block h-12 w-full rounded-lg border-slate-200 bg-slate-50 pl-11 text-base text-slate-900 placeholder:text-slate-400 transition-colors duration-200 focus:border-primary focus:bg-white focus:ring-primary ${
            trailingSlot ? "pr-11" : "pr-4"
          }`}
        />
        {trailingSlot ? (
          <div className="absolute inset-y-0 right-0 flex w-11 items-center justify-center">
            {trailingSlot}
          </div>
        ) : null}
      </div>
    </label>
  );
}
