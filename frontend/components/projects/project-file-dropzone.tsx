"use client";

import type { ReactNode } from "react";
import { useId, useRef, useState } from "react";

import { CheckIcon, CloseIcon } from "@/components/dashboard/dashboard-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProjectFileDropzoneProps = {
  accept?: string;
  accentClassName: string;
  description: string;
  disabled?: boolean;
  files: File[];
  helper?: string;
  icon: ReactNode;
  label: string;
  multiple?: boolean;
  onChange: (files: File[]) => void;
  required?: boolean;
  uploadProgress?: number;
  uploadState?: "complete" | "idle" | "uploading";
};

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${size} B`;
}

export function ProjectFileDropzone({
  accept,
  accentClassName,
  description,
  disabled = false,
  files,
  helper,
  icon,
  label,
  multiple = false,
  onChange,
  required = false,
  uploadProgress = 0,
  uploadState = "idle",
}: ProjectFileDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isUploading = uploadState === "uploading";
  const isComplete = uploadState === "complete";

  function handleIncomingFiles(nextFiles: File[]) {
    if (!multiple) {
      onChange(nextFiles.slice(0, 1));
      return;
    }

    onChange(nextFiles);
  }

  return (
    <div
      className={cn(
        "rounded-[28px] border border-dashed border-slate-300 bg-slate-50/70 p-5 transition",
        isDragging && !disabled && "border-primary bg-sky-50 shadow-inner",
        disabled && "opacity-75",
      )}
      onDragEnter={(event) => {
        if (disabled) {
          return;
        }
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        if (disabled) {
          return;
        }
        event.preventDefault();
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
          return;
        }
        setIsDragging(false);
      }}
      onDragOver={(event) => {
        if (disabled) {
          return;
        }
        event.preventDefault();
        setIsDragging(true);
      }}
      onDrop={(event) => {
        if (disabled) {
          return;
        }
        event.preventDefault();
        setIsDragging(false);
        handleIncomingFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <input
        accept={accept}
        className="sr-only"
        disabled={disabled}
        id={inputId}
        multiple={multiple}
        onChange={(event) => handleIncomingFiles(Array.from(event.target.files ?? []))}
        ref={inputRef}
        required={required && files.length === 0}
        type="file"
      />

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className={cn("inline-flex rounded-2xl p-3", accentClassName)}>{icon}</div>
            <div>
              <label className="cursor-pointer text-lg font-semibold text-slate-950" htmlFor={inputId}>
                {label}
              </label>
              <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
              {helper ? <p className="mt-2 text-xs font-medium text-slate-400">{helper}</p> : null}
            </div>
          </div>

          <Button
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            type="button"
            variant="secondary"
          >
            Seleccionar archivo{multiple ? "s" : ""}
          </Button>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm text-slate-500">
          {files.length === 0 ? (
            <p>Arrastra y suelta aquí o usa el selector.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {files.map((file, index) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
                  key={`${file.name}-${file.size}-${index}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
                    <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                    {isUploading ? (
                      <div className="mt-2">
                        <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
                          <span className="text-sky-700">Subiendo</span>
                          <span className="text-sky-600">{uploadProgress}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-sky-100">
                          <div
                            className="h-full rounded-full bg-sky-500 transition-[width] duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : isComplete ? (
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <CheckIcon className="h-4 w-4" />
                        Archivo subido correctamente
                      </div>
                    ) : (
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        Preparado para subir
                      </div>
                    )}
                  </div>
                  <button
                    aria-label={`Quitar ${file.name}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-rose-600 disabled:pointer-events-none disabled:opacity-40"
                    disabled={disabled}
                    onClick={() =>
                      onChange(files.filter((_, currentIndex) => currentIndex !== index))
                    }
                    type="button"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
