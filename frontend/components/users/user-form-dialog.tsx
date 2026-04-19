"use client";

import { FormEvent, useEffect, useState } from "react";

import type { DepartmentRecord, EntityRecord, UserRecord } from "@/types/api";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CreatableSelectField,
  type CreatableSelectOption,
} from "@/components/ui/creatable-select-field";
import { Button } from "@/components/ui/button";
import { DialogHero } from "@/components/ui/dialog-hero";

export type UserFormValues = {
  department: string;
  email: string;
  entityName: string;
  role: UserRecord["role"];
  username: string;
};

type UserFormDialogProps = {
  departmentOptions: DepartmentRecord[];
  entityOptions: EntityRecord[];
  mode: "create" | "edit";
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: UserFormValues) => Promise<void> | void;
  open: boolean;
  submitting?: boolean;
  user?: UserRecord | null;
};

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
  entityOptions,
  mode,
  onOpenChange,
  onSubmit,
  open,
  submitting = false,
  user,
}: UserFormDialogProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRecord["role"]>("user");
  const [department, setDepartment] = useState("");
  const [entityName, setEntityName] = useState("");
  const normalizedDepartmentOptions: CreatableSelectOption[] = departmentOptions.map(
    (departmentOption) => ({
      label: departmentOption.name,
      value: departmentOption.name,
    }),
  );
  const normalizedEntityOptions: CreatableSelectOption[] = entityOptions.map((entityOption) => ({
    label: entityOption.name,
    value: entityOption.name,
  }));

  useEffect(() => {
    if (!open) {
      return;
    }

    setUsername(user?.username ?? "");
    setEmail(user?.email ?? "");
    setRole(user?.role ?? "user");
    setDepartment(user?.department ?? "");
    setEntityName(user?.entity_name ?? "");
  }, [open, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSubmit({
      department: department.trim(),
      email: email.trim(),
      entityName: entityName.trim(),
      role,
      username: username.trim(),
    });
  }

  const isCreateMode = mode === "create";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="overflow-hidden">
        <DialogHero
          description={
            isCreateMode
              ? "Alta rápida para nuevos accesos del panel de administración."
              : "Actualiza los datos visibles del usuario sin salir de la tabla."
          }
          title={isCreateMode ? "Crear nuevo usuario" : "Editar usuario"}
        />

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
              <div className="rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-3 text-sm text-slate-700">
                La contraseña temporal se genera automáticamente al crear el usuario y se muestra
                al administrador al finalizar el alta.
              </div>
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

            <CreatableSelectField
              allowCreate={false}
              createPlaceholder="Escribe una nueva entidad"
              label="Entidad"
              onChange={setEntityName}
              options={normalizedEntityOptions}
              value={entityName}
            />
          </div>

          <DialogFooter className="mt-8">
            <DialogClose asChild>
              <Button variant="secondary">Cancelar</Button>
            </DialogClose>
            <Button disabled={submitting} type="submit">
              {submitting
                ? isCreateMode
                  ? "Creando..."
                  : "Guardando..."
                : isCreateMode
                  ? "Crear usuario"
                  : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
