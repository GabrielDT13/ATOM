"use client";

import { toast, type ExternalToast } from "sonner";

type AppToastVariant = "default" | "success" | "error" | "warning" | "loading" | "info";
type AppToastId = string | number;
type AppToastPromiseInput<T> = Promise<T> | (() => Promise<T>);
type AppToastPromiseLoadingState = {
  description?: string;
  title: string;
};
type AppToastPromiseState<T> = {
  description?: string;
  title: string | ((value: T) => string);
};
type AppToastPromiseConfig<T> = {
  error: AppToastPromiseState<unknown>;
  loading: AppToastPromiseLoadingState;
  success: AppToastPromiseState<T>;
};

type AppToastPayload = {
  description?: string;
  duration?: number;
  title: string;
  variant?: AppToastVariant;
};

function showToast({
  title,
  description,
  duration,
  variant = "default",
}: AppToastPayload): AppToastId {
  const options: ExternalToast = {
    description,
    duration,
  };

  switch (variant) {
    case "success":
      return toast.success(title, options);
    case "error":
      return toast.error(title, options);
    case "warning":
      return toast.warning(title, options);
    case "loading":
      return toast.loading(title, options);
    case "info":
      return toast.info(title, options);
    default:
      return toast(title, options);
  }
}

function showPromiseToast<T>(
  promiseInput: AppToastPromiseInput<T>,
  config: AppToastPromiseConfig<T>,
) {
  return toast.promise(promiseInput, {
    loading: config.loading.title,
    description: config.loading.description,
    success: (value) => ({
      message:
        typeof config.success.title === "function"
          ? config.success.title(value)
          : config.success.title,
      description: config.success.description,
    }),
    error: (error) => ({
      message:
        typeof config.error.title === "function"
          ? config.error.title(error)
          : config.error.title,
      description: config.error.description,
    }),
  });
}

export function useAppToast() {
  return {
    show: showToast,
    promise: showPromiseToast,
    success: (title: string, description?: string, duration?: number) =>
      showToast({ title, description, duration, variant: "success" }),
    error: (title: string, description?: string, duration?: number) =>
      showToast({ title, description, duration, variant: "error" }),
    warning: (title: string, description?: string, duration?: number) =>
      showToast({ title, description, duration, variant: "warning" }),
    loading: (title: string, description?: string) =>
      showToast({ title, description, duration: 0, variant: "loading" }),
    info: (title: string, description?: string, duration?: number) =>
      showToast({ title, description, duration, variant: "info" }),
    dismiss: toast.dismiss,
  };
}

export type {
  AppToastId,
  AppToastPayload,
  AppToastPromiseConfig,
  AppToastPromiseInput,
  AppToastPromiseLoadingState,
  AppToastVariant,
};
