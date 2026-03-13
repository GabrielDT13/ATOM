"use client";

import { useRef, useState } from "react";

import { UserIcon } from "@/components/dashboard/dashboard-icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types/api";

import {
  CalendarIcon,
  DepartmentIcon,
  KeyIcon,
  MailIcon,
  ShieldIcon,
  SparkIcon,
} from "@/components/profile/profile-icons";
import { buildProfileModel } from "@/components/profile/profile-model";
import { ProfilePasswordDialog } from "@/components/profile/profile-password-dialog";
import {
  DetailRow,
  PreferenceToggle,
  SectionCard,
  SectionHeading,
} from "@/components/profile/profile-primitives";

type ProfileSettingsPageProps = {
  user: SessionUser | null;
};

export function ProfileSettingsPage({ user }: ProfileSettingsPageProps) {
  const profile = buildProfileModel(user);
  const informationSectionRef = useRef<HTMLElement | null>(null);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [systemTheme, setSystemTheme] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [interfaceLanguage, setInterfaceLanguage] = useState("es");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordConfirmOpen, setPasswordConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  function scrollToInformationSection() {
    informationSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <>
      <div className="relative isolate">
        <div className="absolute inset-x-0 top-0 -z-10 h-72 rounded-[36px] bg-[radial-gradient(circle_at_top_left,_rgba(13,127,242,0.18),_transparent_46%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.14),_transparent_42%),linear-gradient(180deg,_rgba(255,255,255,0.9),_rgba(255,255,255,0))]" />

        <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_32px_90px_-52px_rgba(15,23,42,0.45)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(13,127,242,0.16),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_34%)]" />

          <div className="relative grid gap-8 px-6 py-8 sm:px-8 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center">
            <div className="flex items-center gap-5">
              <div className="flex h-28 w-28 items-center justify-center rounded-[30px] bg-gradient-to-br from-primary via-sky-500 to-cyan-400 p-[1px] shadow-[0_18px_40px_-24px_rgba(13,127,242,0.65)]">
                <div className="flex h-full w-full items-center justify-center rounded-[28px] bg-slate-950 text-white">
                  <UserIcon className="h-12 w-12" />
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600">
                    {profile.roleLabel}
                  </span>
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  {profile.displayName}
                </h1>
                <p className="mt-2 text-base text-slate-600">{profile.subtitle}</p>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">
                  {profile.focusLabel}
                </p>
              </div>
            </div>

            <div className="xl:justify-self-end">
              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                  onClick={scrollToInformationSection}
                  type="button"
                >
                  Editar información
                </button>

                <button
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  onClick={() => setPasswordDialogOpen(true)}
                  type="button"
                >
                  Cambiar contraseña
                </button>
              </div>
            </div>
          </div>

          <dl className="relative grid gap-px border-t border-slate-200 bg-slate-100/80 sm:grid-cols-2 xl:grid-cols-4">
            <div className="bg-white px-6 py-5">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Correo electrónico
              </dt>
              <dd className="mt-2 text-sm font-medium text-slate-900">{profile.email}</dd>
            </div>
            <div className="bg-white px-6 py-5">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Departamento
              </dt>
              <dd className="mt-2 text-sm font-medium text-slate-900">
                {profile.department}
              </dd>
            </div>
            <div className="bg-white px-6 py-5">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Rol
              </dt>
              <dd className="mt-2 text-sm font-medium text-slate-900">
                {profile.roleLabel}
              </dd>
            </div>
            <div className="bg-white px-6 py-5">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Proyectos activos
              </dt>
              <dd className="mt-2 text-sm font-medium text-slate-900">
                {profile.metrics[0]?.value ?? "0"}
              </dd>
            </div>
          </dl>
        </section>

        <div className="mt-10 grid gap-6 xl:grid-cols-[minmax(320px,360px)_minmax(0,1fr)]">
          <aside className="space-y-6">
            <SectionCard>
              <SectionHeading title="Información profesional" />

              <div className="space-y-3">
                <DetailRow
                  icon={<DepartmentIcon className="h-5 w-5" />}
                  label="Departamento"
                  value={profile.department}
                />
                <DetailRow
                  icon={<MailIcon className="h-5 w-5" />}
                  label="Correo"
                  value={profile.email}
                />
                <DetailRow
                  icon={<ShieldIcon className="h-5 w-5" />}
                  label="Rol asignado"
                  value={profile.roleLabel}
                />
                <DetailRow
                  icon={<CalendarIcon className="h-5 w-5" />}
                  label="Cuenta creada"
                  value={profile.joinedLabel}
                />
              </div>
            </SectionCard>

            <SectionCard className="overflow-hidden">
              <SectionHeading
                description="Consulta de un vistazo la carga de trabajo y la actividad asociada a tu cuenta."
                title="Carga actual"
              />

              <div className="grid gap-3">
                {profile.metrics.map((metric) => (
                  <div
                    className="rounded-3xl border border-slate-200 bg-slate-50/90 px-5 py-4"
                    key={metric.label}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard className="bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fbff_100%)]">
              <SectionHeading
                description="Gestiona las acciones sensibles relacionadas con la seguridad y el acceso a tu cuenta."
                title="Acceso y contraseña"
              />

              <div className="space-y-4">
                <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                  <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <KeyIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-slate-950">Contraseña</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Actualiza tu contraseña para mantener tu cuenta protegida.
                      </p>
                    </div>
                  </div>

                  <button
                    className="mt-5 inline-flex rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
                    onClick={() => setPasswordDialogOpen(true)}
                    type="button"
                  >
                    Actualizar contraseña
                  </button>
                </div>

                <div className="rounded-[28px] border border-rose-200 bg-rose-50/80 p-5">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-rose-900">Eliminar cuenta</p>
                    <p className="mt-2 text-sm leading-6 text-rose-700">
                      Esta acción eliminará el acceso a la cuenta y requiere confirmación.
                    </p>
                  </div>

                  <button
                    className="mt-5 inline-flex rounded-full border border-rose-300 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                    onClick={() => setDeleteConfirmOpen(true)}
                    type="button"
                  >
                    Eliminar cuenta
                  </button>
                </div>
              </div>
            </SectionCard>
          </aside>

          <div className="space-y-6">
            <SectionCard>
              <section ref={informationSectionRef}>
                <SectionHeading
                  description="Actualiza la información principal que aparece asociada a tu perfil en la plataforma."
                  title="Información general"
                />

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">
                      Nombre para mostrar
                    </span>
                    <input
                      className="mt-2 block w-full rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:ring-primary"
                      defaultValue={profile.displayName}
                      type="text"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Usuario</span>
                    <input
                      className="mt-2 block w-full rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:ring-primary"
                      defaultValue={profile.username}
                      type="text"
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">Correo</span>
                    <input
                      className="mt-2 block w-full rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:ring-primary"
                      defaultValue={profile.email}
                      type="email"
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">Departamento</span>
                    <input
                      className="mt-2 block w-full rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:ring-primary"
                      defaultValue={profile.department}
                      type="text"
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">Biografía</span>
                    <textarea
                      className="mt-2 block min-h-[140px] w-full rounded-3xl border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm transition focus:border-primary focus:ring-primary"
                      defaultValue={profile.bio}
                    />
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button
                    className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_-20px_rgba(13,127,242,0.85)] transition hover:bg-primary-dark"
                    type="button"
                  >
                    Guardar cambios
                  </button>
                </div>
              </section>
            </SectionCard>

            <SectionCard>
              <SectionHeading
                description="Configura cómo quieres recibir avisos y qué ajustes de experiencia prefieres para tu cuenta."
                title="Preferencias"
              />

              <div className="grid gap-4">
                <PreferenceToggle
                  checked={emailNotifications}
                  description="Recibe avisos importantes y recordatorios de actividad por correo."
                  onCheckedChange={setEmailNotifications}
                  title="Notificaciones por correo"
                />
                <PreferenceToggle
                  checked={loginAlerts}
                  description="Recibe avisos cuando se produzcan cambios sensibles en la cuenta o nuevos accesos."
                  onCheckedChange={setLoginAlerts}
                  title="Alertas de seguridad"
                />
                <PreferenceToggle
                  checked={systemTheme}
                  description="Activa la apariencia oscura cuando esta opción esté disponible."
                  onCheckedChange={setSystemTheme}
                  title="Activar modo oscuro"
                />
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">
                    Idioma de la interfaz
                  </span>
                  <select
                    className="mt-2 block w-full rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:ring-primary"
                    onChange={(event) => setInterfaceLanguage(event.target.value)}
                    value={interfaceLanguage}
                  >
                    <option value="es">Español</option>
                    <option value="en">Inglés</option>
                  </select>
                </label>

                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                      <SparkIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Configuración actual
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {interfaceLanguage === "es"
                          ? "La interfaz está configurada en español."
                          : "La interfaz está configurada en inglés."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard>
              <SectionHeading
                description="Revisa las últimas acciones registradas en tu cuenta."
                title="Actividad reciente"
              />

              <div className="relative space-y-6 border-l border-slate-200 pl-6">
                {profile.activity.map((item) => (
                  <article className="relative" key={`${item.title}-${item.timeLabel}`}>
                    <span
                      className={cn(
                        "absolute -left-[33px] top-1 h-4 w-4 rounded-full border-4 border-white shadow-sm",
                        item.accentClassName,
                      )}
                    />
                    <div className="rounded-3xl border border-slate-200 bg-slate-50/70 px-5 py-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {item.title}
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            {item.description}
                          </p>
                        </div>
                        <time className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {item.timeLabel}
                        </time>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>

      <ProfilePasswordDialog
        onConfirm={() => setPasswordConfirmOpen(true)}
        onOpenChange={setPasswordDialogOpen}
        open={passwordDialogOpen}
      />

      <ConfirmDialog
        actionLabel="Confirmar cambio"
        body="Se actualizará la contraseña de tu cuenta."
        confirmVariant="primary"
        onConfirm={() => {
          setPasswordConfirmOpen(false);
          setPasswordDialogOpen(false);
        }}
        onOpenChange={setPasswordConfirmOpen}
        open={passwordConfirmOpen}
        title="Confirmar cambio de contraseña"
      />

      <ConfirmDialog
        actionLabel="Eliminar cuenta"
        body="Esta acción no se puede deshacer. Se eliminará tu cuenta cuando confirmes."
        confirmVariant="danger"
        onConfirm={() => {
          setDeleteConfirmOpen(false);
        }}
        onOpenChange={setDeleteConfirmOpen}
        open={deleteConfirmOpen}
        title="Confirmar eliminación de cuenta"
      />
    </>
  );
}
