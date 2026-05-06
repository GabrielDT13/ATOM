"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

export type CreatableSelectOption = {
  label: string;
  value: string;
};

type CreatableSelectFieldProps = {
  addButtonLabel?: string;
  allowCreate?: boolean;
  createPlaceholder?: string;
  label: ReactNode;
  onChange: (value: string) => void;
  options: readonly CreatableSelectOption[];
  value: string;
};

function normalizeOptionValue(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function dedupeOptions(options: readonly CreatableSelectOption[]) {
  const seen = new Set<string>();

  return options.filter((option) => {
    const normalizedValue = normalizeOptionValue(option.value);
    if (!normalizedValue || seen.has(normalizedValue)) {
      return false;
    }

    seen.add(normalizedValue);
    return true;
  });
}

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

function ChevronUpIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 14L12 8L18 14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function CreatableSelectField({
  addButtonLabel = "Añadir opción",
  allowCreate = true,
  createPlaceholder = "Escribe una nueva opción",
  label,
  onChange,
  options,
  value,
}: CreatableSelectFieldProps) {
  const [customOptions, setCustomOptions] = useState<CreatableSelectOption[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [draftValue, setDraftValue] = useState("");

  useEffect(() => {
    if (!value) {
      return;
    }

    const normalizedValue = normalizeOptionValue(value);
    const existsInBase = options.some(
      (option) => normalizeOptionValue(option.value) === normalizedValue,
    );
    const existsInCustom = customOptions.some(
      (option) => normalizeOptionValue(option.value) === normalizedValue,
    );

    if (!existsInBase && !existsInCustom) {
      setCustomOptions((current) => [...current, { label: value, value }]);
    }
  }, [customOptions, options, value]);

  const mergedOptions = useMemo(
    () => dedupeOptions([...options, ...customOptions]),
    [customOptions, options],
  );

  function handleCreateOption() {
    const nextValue = draftValue.trim().replace(/\s+/g, " ");
    if (!nextValue) {
      return;
    }

    setCustomOptions((current) => {
      const alreadyExists = current.some(
        (option) => normalizeOptionValue(option.value) === normalizeOptionValue(nextValue),
      );
      return alreadyExists ? current : [...current, { label: nextValue, value: nextValue }];
    });
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
            <option key={normalizeOptionValue(option.value)} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {allowCreate ? (
          <Button
            aria-label={addButtonLabel}
            className="w-12 px-0"
            onClick={() => setIsCreating((current) => !current)}
            size="lg"
            type="button"
            variant="secondary"
          >
            {isCreating ? <ChevronUpIcon /> : <PlusIcon />}
          </Button>
        ) : null}
      </div>

      {allowCreate && isCreating ? (
        <div className="flex gap-2">
          <input
            className="h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-sky-100"
            onChange={(event) => setDraftValue(event.target.value)}
            placeholder={createPlaceholder}
            value={draftValue}
          />
          <Button
            onClick={handleCreateOption}
            size="lg"
            type="button"
          >
            Añadir
          </Button>
        </div>
      ) : null}
    </label>
  );
}
