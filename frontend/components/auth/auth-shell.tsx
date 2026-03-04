import { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-dark px-6 py-12 font-display antialiased">
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-20 h-[34rem] w-[34rem] rounded-[44%_56%_58%_42%/40%_40%_60%_60%] bg-primary/20 animate-auth-float" />
        <div className="absolute -bottom-44 -left-28 h-[42rem] w-[42rem] rounded-[59%_41%_35%_65%/41%_50%_50%_59%] bg-white/5" />
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.14)_1px,transparent_0)] [background-size:20px_20px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {children}
        <p className="mt-8 text-center text-xs leading-5 text-white/40">
          (c) 2026 ATOM. Todos los derechos reservados.
          <br />
          Acceso seguro solo para personal autorizado.
        </p>
      </div>
    </main>
  );
}
