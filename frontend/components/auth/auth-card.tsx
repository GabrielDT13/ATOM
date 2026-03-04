import { ReactNode } from "react";

type AuthCardProps = {
  children: ReactNode;
};

export function AuthCard({ children }: AuthCardProps) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-2xl shadow-slate-950/50 transition-transform duration-500 hover:scale-[1.01]">
      <div className="p-8 sm:p-10">{children}</div>
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-300 via-primary to-blue-300" />
    </div>
  );
}
