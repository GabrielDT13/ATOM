"use client";

import { FormEvent, forwardRef, type ButtonHTMLAttributes, useEffect, useState } from "react";

import type { DepartmentRecord, UserRecord } from "@/types/api";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CreatableSelectField,
  type CreatableSelectOption,
} from "@/components/ui/creatable-select-field";

export type UserFormValues = {
  department: string;
  email: string;
  password?: string;
  role: UserRecord["role"];
  username: string;
};

type UserFormDialogProps = {
  departmentOptions: DepartmentRecord[];
  mode: "create" | "edit";
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: UserFormValues) => Promise<void> | void;
  open: boolean;
  submitting?: boolean;
  user?: UserRecord | null;
};

const SecondaryButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, className = "", type = "button", ...props }, ref) => (
  <button
    className={`inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 ${className}`}
    ref={ref}
    type={type}
    {...props}
  >
    {children}
  </button>
));
SecondaryButton.displayName = "SecondaryButton";

const PrimaryButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, className = "", type = "button", ...props }, ref) => (
  <button
    className={`inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300 ${className}`}
    ref={ref}
    type={type}
    {...props}
  >
    {children}
  </button>
));
PrimaryButton.displayName = "PrimaryButton";

function InputField({
  autoFocus = false,
  label,
  onChange,
  placeholder,
  required = false,
  type = "text",
  value,
}: {
  autoFocus?: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        autoFocus={autoFocus}
        className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-sky-100"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

export function UserFormDialog({
  departmentOptions,
  mode,
  onOpenChange,
  onSubmit,
  open,
  submitting = false,
  user,
}: UserFormDialogProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRecord["role"]>("user");
  const [department, setDepartment] = useState("");
  const normalizedDepartmentOptions: CreatableSelectOption[] = departmentOptions.map(
    (departmentOption) => ({
      label: departmentOption.name,
      value: departmentOption.name,
    }),
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setUsername(user?.username ?? "");
    setEmail(user?.email ?? "");
    setRole(user?.role ?? "user");
    setDepartment(user?.department ?? "");
    setPassword("");
  }, [open, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSubmit({
      department: department.trim(),
      email: email.trim(),
      password: isCreateMode ? password : undefined,
      role,
      username: username.trim(),
    });
  }

  const isCreateMode = mode === "create";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="overflow-hidden">
        <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_38%),linear-gradient(180deg,_#ffffff_0%,_#f8fbff_100%)] px-6 pb-6 pt-7 sm:px-8">
          <DialogHeader className="pr-10">
            <DialogTitle>{isCreateMode ? "Crear nuevo usuario" : "Editar usuario"}</DialogTitle>
            <DialogDescription>
              {isCreateMode
                ? "Alta rápida para nuevos accesos del panel de administración."
                : "Actualiza los datos visibles del usuario sin salir de la tabla."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form className="px-6 pb-6 sm:px-8" onSubmit={(event) => void handleSubmit(event)}>
          <div className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <InputField
                autoFocus
                label="Nombre de usuario"
                onChange={setUsername}
                placeholder="ej. usuario_laboratorio"
                required
                value={username}
              />
              <InputField
                label="Email"
                onChange={setEmail}
                placeholder="usuario@empresa.com"
                required
                type="email"
                value={email}
              />
            </div>

            {isCreateMode ? (
              <InputField
                label="Contraseña temporal"
                onChange={setPassword}
                placeholder="Define una contraseña inicial"
                required
                type="password"
                value={password}
              />
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">Rol</span>
                <select
                  className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-sky-100"
                  onChange={(event) => setRole(event.target.value as UserRecord["role"])}
                  value={role}
                >
                  <option value="admin">Administrador</option>
                  <option value="user">Usuario estándar</option>
                </select>
              </label>

              <CreatableSelectField
                createPlaceholder="Escribe un nuevo departamento"
                label="Departamento"
                onChange={setDepartment}
                options={normalizedDepartmentOptions}
                value={department}
              />
            </div>
          </div>

          <DialogFooter className="mt-8">
            <DialogClose asChild>
              <SecondaryButton>Cancelar</SecondaryButton>
            </DialogClose>
            <PrimaryButton disabled={submitting} type="submit">
              {submitting
                ? isCreateMode
                  ? "Creando..."
                  : "Guardando..."
                : isCreateMode
                  ? "Crear usuario"
                  : "Guardar cambios"}
            </PrimaryButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
