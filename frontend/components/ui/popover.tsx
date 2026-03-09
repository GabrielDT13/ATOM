"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type PopoverContextValue = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
};

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopoverContext(componentName: string) {
  const context = React.useContext(PopoverContext);

  if (!context) {
    throw new Error(`${componentName} debe usarse dentro de <Popover>.`);
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

const Popover = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-flex">{children}</div>
    </PopoverContext.Provider>
  );
};

type PopoverTriggerProps = {
  asChild?: boolean;
  children: React.ReactElement<{
    onClick?: (event: React.MouseEvent<HTMLElement>) => void;
    type?: "button" | "reset" | "submit";
  }>;
};

const PopoverTrigger = React.forwardRef<HTMLElement, PopoverTriggerProps>(
  ({ asChild = false, children }, forwardedRef) => {
    const { open, setOpen, triggerRef } = usePopoverContext("PopoverTrigger");

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
      "aria-haspopup": "dialog" as const,
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
PopoverTrigger.displayName = "PopoverTrigger";

const PopoverAnchor = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, ...props }, ref) => <div ref={ref} {...props}>{children}</div>,
);
PopoverAnchor.displayName = "PopoverAnchor";

type PopoverContentProps = React.HTMLAttributes<HTMLDivElement> & {
  align?: "center" | "end" | "start";
  sideOffset?: number;
};

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ align = "end", className, sideOffset = 10, ...props }, forwardedRef) => {
    const { open, setOpen, triggerRef } = usePopoverContext("PopoverContent");
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

        if (
          contentRef.current?.contains(target) ||
          triggerRef.current?.contains(target)
        ) {
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
          "absolute top-full z-50 mt-3 w-80 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/10 outline-none",
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
PopoverContent.displayName = "PopoverContent";

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger };
