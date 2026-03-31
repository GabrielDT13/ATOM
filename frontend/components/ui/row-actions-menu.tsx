"use client";

import type { ReactNode } from "react";

import { MoreHorizontalIcon } from "@/components/dashboard/dashboard-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type RowActionItem = {
  destructive?: boolean;
  icon?: ReactNode;
  label: string;
  onSelect: () => void;
  separatorBefore?: boolean;
};

type RowActionsMenuProps = {
  actions: RowActionItem[];
  ariaLabel: string;
};

export function RowActionsMenu({ actions, ariaLabel }: RowActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={ariaLabel}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          type="button"
        >
          <MoreHorizontalIcon className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-52">
        {actions.map((action, index) => (
          <div key={`${action.label}-${index}`}>
            {action.separatorBefore ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              className={
                action.destructive
                  ? "text-rose-600 hover:!bg-rose-50 hover:!text-rose-700"
                  : undefined
              }
              onSelect={action.onSelect}
            >
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
