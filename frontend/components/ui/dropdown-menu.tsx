"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type DropdownMenuContextValue = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
};

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext(componentName: string) {
  const context = React.useContext(DropdownMenuContext);

  if (!context) {
    throw new Error(`${componentName} debe usarse dentro de <DropdownMenu>.`);
  }

  return context;
}

function composeEventHandlers<EventType>(
  originalHandler: ((event: EventType) => void) | undefined,
  nextHandler: (event: EventType) => void,
) {
  return (event: EventType) => {
    originalHandler?.(event);
    nextHandler(event);
  };
}

const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-flex">{children}</div>
    </DropdownMenuContext.Provider>
  );
};

type DropdownMenuTriggerProps = {
  asChild?: boolean;
  children: React.ReactElement<{
    onClick?: (event: React.MouseEvent<HTMLElement>) => void;
    type?: "button" | "reset" | "submit";
  }>;
};

const DropdownMenuTrigger = React.forwardRef<HTMLElement, DropdownMenuTriggerProps>(
  ({ asChild = false, children }, forwardedRef) => {
    const { open, setOpen, triggerRef } = useDropdownMenuContext("DropdownMenuTrigger");

    const handleRef = (node: HTMLElement | null) => {
      triggerRef.current = node;

      if (!forwardedRef) {
        return;
      }

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
        return;
      }

      forwardedRef.current = node;
    };

    const triggerProps = {
      "aria-expanded": open,
      "aria-haspopup": "menu" as const,
      onClick: composeEventHandlers(children.props.onClick, () => {
        setOpen((current) => !current);
      }),
      ref: handleRef,
      type: children.props.type ?? "button",
    };

    if (asChild) {
      return React.cloneElement(children, triggerProps);
    }

    return <button {...triggerProps}>{children}</button>;
  },
);
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

type DropdownMenuContentProps = React.HTMLAttributes<HTMLDivElement> & {
  align?: "center" | "end" | "start";
  sideOffset?: number;
};

const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ align = "end", className, sideOffset = 10, ...props }, forwardedRef) => {
    const { open, setOpen, triggerRef } = useDropdownMenuContext("DropdownMenuContent");
    const contentRef = React.useRef<HTMLDivElement | null>(null);

    const handleRef = (node: HTMLDivElement | null) => {
      contentRef.current = node;

      if (!forwardedRef) {
        return;
      }

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
        return;
      }

      forwardedRef.current = node;
    };

    React.useEffect(() => {
      if (!open) {
        return;
      }

      function handlePointerDown(event: MouseEvent) {
        const target = event.target as Node | null;

        if (contentRef.current?.contains(target) || triggerRef.current?.contains(target)) {
          return;
        }

        setOpen(false);
      }

      function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") {
          setOpen(false);
        }
      }

      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("mousedown", handlePointerDown);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [open, setOpen, triggerRef]);

    if (!open) {
      return null;
    }

    return (
      <div
        className={cn(
          "absolute top-full z-50 mt-3 min-w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-950/10",
          align === "end" && "right-0",
          align === "start" && "left-0",
          align === "center" && "left-1/2 -translate-x-1/2",
          className,
        )}
        ref={handleRef}
        style={{ marginTop: sideOffset }}
        {...props}
      />
    );
  },
);
DropdownMenuContent.displayName = "DropdownMenuContent";

type DropdownMenuItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  inset?: boolean;
  onSelect?: () => void;
};

function DropdownMenuItem({
  children,
  className,
  disabled = false,
  inset = false,
  onSelect,
  onClick,
  type = "button",
  ...props
}: DropdownMenuItemProps) {
  const { setOpen } = useDropdownMenuContext("DropdownMenuItem");

  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 disabled:pointer-events-none disabled:opacity-50",
        inset && "pl-8",
        className,
      )}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || disabled) {
          return;
        }
        onSelect?.();
        setOpen(false);
      }}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

function DropdownMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("my-1 h-px bg-slate-200", className)} {...props} />;
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};
