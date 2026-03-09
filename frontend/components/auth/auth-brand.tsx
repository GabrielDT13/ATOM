import Image from "next/image";

export function AuthBrand() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 p-3">
        <Image
          alt="Logo de ATOM"
          className="h-full w-full object-contain"
          height={56}
          src="/images/logo.png"
          width={56}
        />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-primary">AT</span>
          <span className="text-accent">OM</span>
        </h1>
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Atlantic Omics
        </p>
      </div>
    </div>
  );
}
