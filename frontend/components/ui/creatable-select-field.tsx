"use client";

import { useEffect, useMemo, useState } from "react";

type CreatableSelectFieldProps = {
  addButtonLabel?: string;
  createPlaceholder?: string;
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
};

function PlusIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 5V19M5 12H19"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function CreatableSelectField({
  addButtonLabel = "Añadir opción",
  createPlaceholder = "Escribe una nueva opción",
  label,
  onChange,
  options,
  value,
}: CreatableSelectFieldProps) {
  const [customOptions, setCustomOptions] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [draftValue, setDraftValue] = useState("");

  useEffect(() => {
    if (!value) {
      return;
    }

    const existsInBase = options.includes(value);
    const existsInCustom = customOptions.includes(value);

    if (!existsInBase && !existsInCustom) {
      setCustomOptions((current) => [...current, value]);
    }
  }, [customOptions, options, value]);

  const mergedOptions = useMemo(
    () => [...options, ...customOptions.filter((option) => !options.includes(option))],
    [customOptions, options],
  );

  function handleCreateOption() {
    const nextValue = draftValue.trim();
    if (!nextValue) {
      return;
    }

    setCustomOptions((current) =>
      current.includes(nextValue) ? current : [...current, nextValue],
    );
    onChange(nextValue);
    setDraftValue("");
    setIsCreating(false);
  }

  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>

      <div className="flex gap-2">
        <select
          className="h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-sky-100"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          <option value="">Selecciona una opción</option>
          {mergedOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <button
          aria-label={addButtonLabel}
          className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          onClick={() => setIsCreating((current) => !current)}
          type="button"
        >
          <PlusIcon />
        </button>
      </div>

      {isCreating ? (
        <div className="flex gap-2">
          <input
            className="h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-sky-100"
            onChange={(event) => setDraftValue(event.target.value)}
            placeholder={createPlaceholder}
            value={draftValue}
          />
          <button
            className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
            onClick={handleCreateOption}
            type="button"
          >
            Añadir
          </button>
        </div>
      ) : null}
    </label>
  );
}
