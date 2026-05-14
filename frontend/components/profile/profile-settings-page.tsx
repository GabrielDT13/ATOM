"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { UserIcon } from "@/components/dashboard/dashboard-icons";
import { useLocale } from "@/components/providers/locale-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  CreatableSelectField,
  type CreatableSelectOption,
} from "@/components/ui/creatable-select-field";
import { useAppToast } from "@/hooks/use-app-toast";
import { apiFetch } from "@/lib/api";
import { detectBrowserLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";
import type {
  DepartmentRecord,
  ProfileMutationResponse,
  ProfileRecord,
  SessionUser,
} from "@/types/api";

import {
  CalendarIcon,
  DepartmentIcon,
  KeyIcon,
  MailIcon,
  ShieldIcon,
  SparkIcon,
} from "@/components/profile/profile-icons";
import { buildEditableProfileFormValues } from "@/components/profile/profile-form";
import { buildProfileModel } from "@/components/profile/profile-model";
import {
  ProfilePasswordDialog,
  type ProfilePasswordValues,
} from "@/components/profile/profile-password-dialog";
import {
  DetailRow,
  PreferenceToggle,
  SectionCard,
  SectionHeading,
} from "@/components/profile/profile-primitives";
import { Button, buttonStyles } from "@/components/ui/button";

type ProfileSettingsPageProps = {
  profileData: ProfileRecord | null;
  user: SessionUser | null;
};

const EMPTY_PASSWORD_VALUES: ProfilePasswordValues = {
  confirmPassword: "",
  current_password: "",
  new_password: "",
};

export function ProfileSettingsPage({
  profileData,
  user,
}: ProfileSettingsPageProps) {
  const router = useRouter();
  const appToast = useAppToast();
  const { locale, syncProfileLocale } = useLocale();
  const { setThemePreference, syncProfileTheme, themeMode } = useTheme();
  const [resolvedProfileData, setResolvedProfileData] = useState<ProfileRecord | null>(
    profileData,
  );
  const profile = buildProfileModel(resolvedProfileData, user, locale);
  const editableValues = buildEditableProfileFormValues(resolvedProfileData, user);
  const informationSectionRef = useRef<HTMLElement | null>(null);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [displayName, setDisplayName] = useState(editableValues.displayName);
  const [username, setUsername] = useState(editableValues.username);
  const [email, setEmail] = useState(editableValues.email);
  const [department, setDepartment] = useState(editableValues.department);
  const [bio, setBio] = useState(editableValues.bio);
  const [emailNotifications, setEmailNotifications] = useState(
    editableValues.emailNotifications,
  );
  const [systemTheme, setSystemTheme] = useState(editableValues.systemTheme);
  const [systemThemeAuto, setSystemThemeAuto] = useState(editableValues.systemThemeAuto);
  const [loginAlerts, setLoginAlerts] = useState(editableValues.loginAlerts);
  const [interfaceLanguage, setInterfaceLanguage] = useState(
    editableValues.interfaceLanguage,
  );
  const [interfaceLanguageAuto, setInterfaceLanguageAuto] = useState(
    editableValues.interfaceLanguageAuto,
  );
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordConfirmOpen, setPasswordConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [passwordValues, setPasswordValues] = useState<ProfilePasswordValues>(
    EMPTY_PASSWORD_VALUES,
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const departmentOptions: CreatableSelectOption[] = departments.map((departmentOption) => ({
    label: departmentOption.name,
    value: departmentOption.name,
  }));
  const isAdmin = (resolvedProfileData?.role ?? user?.role) === "admin";

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const nextProfile = await apiFetch<ProfileRecord>("/api/profile/me");
        if (!cancelled) {
          setResolvedProfileData(nextProfile);
        }
      } catch {
        // La pantalla mantiene el fallback local si el perfil no se puede cargar.
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDepartments() {
      try {
        const nextDepartments = await apiFetch<DepartmentRecord[]>("/api/departments");
        if (!cancelled) {
          setDepartments(nextDepartments);
        }
      } catch {
        if (!cancelled) {
          setDepartments([]);
        }
      }
    }

    void loadDepartments();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setDisplayName(editableValues.displayName);
    setUsername(editableValues.username);
    setEmail(editableValues.email);
    setDepartment(editableValues.department);
    setBio(editableValues.bio);
    setEmailNotifications(editableValues.emailNotifications);
    setSystemTheme(editableValues.systemTheme);
    setSystemThemeAuto(editableValues.systemThemeAuto);
    setLoginAlerts(editableValues.loginAlerts);
    setInterfaceLanguage(editableValues.interfaceLanguage);
    setInterfaceLanguageAuto(editableValues.interfaceLanguageAuto);
  }, [
    editableValues.bio,
    editableValues.department,
    editableValues.displayName,
    editableValues.email,
    editableValues.emailNotifications,
    editableValues.interfaceLanguage,
    editableValues.interfaceLanguageAuto,
    editableValues.loginAlerts,
    editableValues.systemTheme,
    editableValues.systemThemeAuto,
    editableValues.username,
  ]);

  useEffect(() => {
    setThemePreference(systemThemeAuto ? "system" : systemTheme ? "dark" : "light");
  }, [setThemePreference, systemTheme, systemThemeAuto]);

  function scrollToInformationSection() {
    informationSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function resetForm() {
    setDisplayName(editableValues.displayName);
    setUsername(editableValues.username);
    setEmail(editableValues.email);
    setDepartment(editableValues.department);
    setBio(editableValues.bio);
    setEmailNotifications(editableValues.emailNotifications);
    setSystemTheme(editableValues.systemTheme);
    setSystemThemeAuto(editableValues.systemThemeAuto);
    setLoginAlerts(editableValues.loginAlerts);
    setInterfaceLanguage(editableValues.interfaceLanguage);
    setInterfaceLanguageAuto(editableValues.interfaceLanguageAuto);
  }

  function resetPasswordForm() {
    setPasswordValues(EMPTY_PASSWORD_VALUES);
  }

  function updateResolvedProfile(nextProfile: ProfileRecord | null) {
    if (!nextProfile) {
      return;
    }

    setResolvedProfileData(nextProfile);

    const nextDepartment = nextProfile.department?.trim();
    if (nextDepartment && !departments.some((item) => item.name === nextDepartment)) {
      setDepartments((current) => [
        ...current,
        {
          id: `profile-${nextDepartment}`,
          name: nextDepartment,
          slug: nextDepartment.toLowerCase().replace(/\s+/g, "-"),
        },
      ]);
    }
  }

  async function handleSaveProfile() {
    setSavingProfile(true);

    const request = apiFetch<ProfileMutationResponse>("/api/profile/me", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username.trim(),
        display_name: displayName.trim() || null,
        email: email.trim(),
        department: department.trim() || null,
        bio: bio.trim() || null,
        preferences: {
          email_notifications: emailNotifications,
          security_alerts: loginAlerts,
          dark_mode: systemTheme,
          dark_mode_auto: systemThemeAuto,
          interface_language: interfaceLanguageAuto ? detectBrowserLocale() : interfaceLanguage,
          interface_language_auto: interfaceLanguageAuto,
        },
      }),
    }).then((response) => {
      if (!response.success || !response.profile) {
        throw new Error(
          response.message || (locale === "es" ? "No se pudo actualizar el perfil" : "Could not update profile"),
        );
      }
      return response;
    });

    appToast.promise(request, {
      loading: {
        title: locale === "es" ? "Guardando perfil" : "Saving profile",
        description: locale === "es" ? "Estamos actualizando tu información." : "We are updating your information.",
      },
      success: {
        title: locale === "es" ? "Perfil actualizado" : "Profile updated",
        description: locale === "es" ? "Los cambios se han guardado correctamente." : "Changes were saved successfully.",
      },
      error: {
        title: (error) =>
          error instanceof Error ? error.message : locale === "es" ? "No se pudo actualizar el perfil" : "Could not update profile",
        description: locale === "es" ? "Revisa los datos e inténtalo de nuevo." : "Review data and try again.",
      },
    });

    try {
      const response = await request;
      updateResolvedProfile(response.profile);
      if (response.profile) {
        syncProfileTheme(response.profile.preferences);
        syncProfileLocale(response.profile.preferences);
      }
      router.refresh();
    } catch {
      // El feedback ya se muestra en el toast.
    } finally {
      setSavingProfile(false);
    }
  }

  function handlePasswordDialogOpenChange(open: boolean) {
    setPasswordDialogOpen(open);
    if (!open) {
      setPasswordConfirmOpen(false);
      resetPasswordForm();
    }
  }

  function requestPasswordConfirmation(values: ProfilePasswordValues) {
    if (!values.current_password.trim() || !values.new_password.trim() || !values.confirmPassword.trim()) {
      appToast.error(
        locale === "es" ? "Completa todos los campos" : "Complete all fields",
        locale === "es"
          ? "Introduce la contraseña actual y la nueva contraseña."
          : "Enter current password and new password.",
      );
      return;
    }

    if (values.new_password.trim().length < 8) {
      appToast.error(
        locale === "es" ? "Contraseña no válida" : "Invalid password",
        locale === "es"
          ? "La nueva contraseña debe tener al menos 8 caracteres."
          : "New password must be at least 8 characters long.",
      );
      return;
    }

    if (values.new_password !== values.confirmPassword) {
      appToast.error(
        locale === "es" ? "Las contraseñas no coinciden" : "Passwords do not match",
        locale === "es"
          ? "Repite la nueva contraseña para confirmar el cambio."
          : "Repeat new password to confirm change.",
      );
      return;
    }

    setPasswordConfirmOpen(true);
  }

  async function handleChangePassword() {
    setChangingPassword(true);

    const request = apiFetch<ProfileMutationResponse>("/api/profile/me/password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        current_password: passwordValues.current_password.trim(),
        new_password: passwordValues.new_password.trim(),
      }),
    }).then((response) => {
      if (!response.success) {
        throw new Error(
          response.message || (locale === "es" ? "No se pudo actualizar la contraseña" : "Could not update password"),
        );
      }
      return response;
    });

    appToast.promise(request, {
      loading: {
        title: locale === "es" ? "Actualizando contraseña" : "Updating password",
        description: locale === "es" ? "Estamos aplicando el cambio de seguridad." : "We are applying the security change.",
      },
      success: {
        title: locale === "es" ? "Contraseña actualizada" : "Password updated",
        description: locale === "es" ? "Tu contraseña se ha cambiado correctamente." : "Your password was changed successfully.",
      },
      error: {
        title: (error) =>
          error instanceof Error ? error.message : locale === "es" ? "No se pudo actualizar la contraseña" : "Could not update password",
        description: locale === "es" ? "Verifica la contraseña actual e inténtalo otra vez." : "Verify current password and try again.",
      },
    });

    try {
      await request;
      setPasswordConfirmOpen(false);
      setPasswordDialogOpen(false);
      resetPasswordForm();
    } catch {
      // El feedback ya se muestra en el toast.
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);

    const request = apiFetch<ProfileMutationResponse>("/api/profile/me", {
      method: "DELETE",
    }).then((response) => {
      if (!response.success) {
        throw new Error(
          response.message || (locale === "es" ? "No se pudo eliminar la cuenta" : "Could not delete account"),
        );
      }
      return response;
    });

    appToast.promise(request, {
      loading: {
        title: locale === "es" ? "Eliminando cuenta" : "Deleting account",
        description: locale === "es" ? "Estamos cerrando tu acceso y eliminando la cuenta." : "We are closing your access and deleting account.",
      },
      success: {
        title: locale === "es" ? "Cuenta eliminada" : "Account deleted",
        description: locale === "es" ? "Se ha cerrado tu sesión." : "Your session was closed.",
      },
      error: {
        title: (error) =>
          error instanceof Error ? error.message : locale === "es" ? "No se pudo eliminar la cuenta" : "Could not delete account",
        description: locale === "es" ? "La cuenta no se ha eliminado. Inténtalo de nuevo." : "Account was not deleted. Try again.",
      },
    });

    try {
      await request;
      setDeleteConfirmOpen(false);
      router.replace("/login");
      router.refresh();
    } catch {
      // El feedback ya se muestra en el toast.
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
    <>
      <div className="relative isolate">
        <section className="page-hero-surface relative overflow-hidden rounded-[32px] border border-white/10 shadow-[0_32px_90px_-52px_rgba(15,23,42,0.45)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.06),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_34%)]" />

          <div className="relative grid gap-8 px-6 py-8 sm:px-8 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center">
            <div className="flex items-center gap-5">
              <div className="flex h-28 w-28 items-center justify-center rounded-[30px] bg-gradient-to-br from-primary via-sky-500 to-cyan-400 p-[1px] shadow-[0_18px_40px_-24px_rgba(13,127,242,0.65)]">
                <div className="flex h-full w-full items-center justify-center rounded-[28px] bg-[linear-gradient(135deg,#0f172a_0%,#163b63_100%)] text-white">
                  <UserIcon className="h-12 w-12" />
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="page-hero-badge rounded-full px-3 py-1 font-medium">
                    {profile.roleDisplay}
                  </span>
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {profile.displayName}
                </h1>
                <p className="mt-2 text-base font-medium text-slate-200">
                  {profile.department}
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                  {profile.bio}
                </p>
              </div>
            </div>

            <div className="xl:justify-self-end">
              <div className="flex flex-wrap gap-3">
                <button
                  className={buttonStyles({ size: "lg", tone: "on-dark", variant: "secondary" })}
                  onClick={scrollToInformationSection}
                  type="button"
                >
                  {locale === "es" ? "Editar información" : "Edit information"}
                </button>

                <button
                  className={buttonStyles({ size: "lg", tone: "on-dark", variant: "ghost" })}
                  onClick={() => setPasswordDialogOpen(true)}
                  type="button"
                >
                  {locale === "es" ? "Cambiar contraseña" : "Change password"}
                </button>
              </div>
            </div>
          </div>

          <dl className="relative grid gap-px border-t border-slate-200 bg-slate-100/80 sm:grid-cols-2 xl:grid-cols-4">
            <div className="bg-white px-6 py-5">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {locale === "es" ? "Correo electrónico" : "Email"}
              </dt>
              <dd className="mt-2 text-sm font-medium text-slate-900">{profile.email}</dd>
            </div>
            <div className="bg-white px-6 py-5">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {locale === "es" ? "Departamento" : "Department"}
              </dt>
              <dd className="mt-2 text-sm font-medium text-slate-900">
                {profile.department}
              </dd>
            </div>
            <div className="bg-white px-6 py-5">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {locale === "es" ? "Rol" : "Role"}
              </dt>
              <dd className="mt-2 text-sm font-medium text-slate-900">
                {profile.roleDisplay}
              </dd>
            </div>
            <div className="bg-white px-6 py-5">
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {locale === "es" ? "Proyectos activos" : "Active projects"}
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
              <SectionHeading title={locale === "es" ? "Información profesional" : "Professional information"} />

              <div className="space-y-3">
                <DetailRow
                  icon={<DepartmentIcon className="h-5 w-5" />}
                  label={locale === "es" ? "Departamento" : "Department"}
                  value={profile.department}
                />
                <DetailRow
                  icon={<MailIcon className="h-5 w-5" />}
                  label={locale === "es" ? "Correo" : "Email"}
                  value={profile.email}
                />
                <DetailRow
                  icon={<ShieldIcon className="h-5 w-5" />}
                  label={locale === "es" ? "Rol asignado" : "Assigned role"}
                  value={profile.roleDisplay}
                />
                <DetailRow
                  icon={<CalendarIcon className="h-5 w-5" />}
                  label={locale === "es" ? "Cuenta creada" : "Account created"}
                  value={profile.joinedLabel}
                />
              </div>
            </SectionCard>

            <SectionCard className="overflow-hidden">
              <SectionHeading
                description={locale === "es"
                  ? "Consulta de un vistazo la carga de trabajo y la actividad asociada a tu cuenta."
                  : "See workload and activity associated with your account at a glance."}
                title={locale === "es" ? "Carga actual" : "Current load"}
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

            <SectionCard>
              <SectionHeading
                description={locale === "es"
                  ? "Gestiona las acciones sensibles relacionadas con la seguridad y el acceso a tu cuenta."
                  : "Manage sensitive actions related to security and access to your account."}
                title={locale === "es" ? "Acceso y contraseña" : "Access and password"}
              />

              <div className="space-y-4">
                <div className="rounded-[28px] border border-slate-200 bg-white p-5">
                  <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-primary">
                      <KeyIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-slate-950">{locale === "es" ? "Contraseña" : "Password"}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {profile.passwordDescription}
                      </p>
                    </div>
                  </div>

                  <Button
                    className="mt-5"
                    onClick={() => setPasswordDialogOpen(true)}
                    type="button"
                  >
                    {locale === "es" ? "Actualizar contraseña" : "Update password"}
                  </Button>
                </div>

                {!isAdmin ? (
                  <div className="rounded-[28px] border border-rose-200 bg-rose-50/80 p-5">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-rose-900">{locale === "es" ? "Eliminar cuenta" : "Delete account"}</p>
                      <p className="mt-2 text-sm leading-6 text-rose-700">
                        {locale === "es"
                          ? "Esta acción eliminará el acceso a la cuenta y requiere confirmación."
                          : "This action will remove account access and requires confirmation."}
                      </p>
                    </div>

                    <Button
                      className="mt-5"
                      onClick={() => setDeleteConfirmOpen(true)}
                      type="button"
                      variant="danger"
                    >
                      {locale === "es" ? "Eliminar cuenta" : "Delete account"}
                    </Button>
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </aside>

          <div className="space-y-6">
            <SectionCard>
              <section ref={informationSectionRef}>
                <SectionHeading
                  description={locale === "es"
                    ? "Actualiza la información principal que aparece asociada a tu perfil en la plataforma."
                    : "Update main information associated with your profile in the platform."}
                  title={locale === "es" ? "Información general" : "General information"}
                />

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">
                      {locale === "es" ? "Nombre para mostrar" : "Display name"}
                    </span>
                    <input
                      className="mt-2 block w-full rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:ring-primary"
                      onChange={(event) => setDisplayName(event.target.value)}
                      type="text"
                      value={displayName}
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">{locale === "es" ? "Usuario" : "Username"}</span>
                    <input
                      className="mt-2 block w-full rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:ring-primary"
                      onChange={(event) => setUsername(event.target.value)}
                      type="text"
                      value={username}
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">{locale === "es" ? "Correo" : "Email"}</span>
                    <input
                      className="mt-2 block w-full rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-primary focus:ring-primary"
                      onChange={(event) => setEmail(event.target.value)}
                      type="email"
                      value={email}
                    />
                  </label>

                  <div className="md:col-span-2">
                    <CreatableSelectField
                      createPlaceholder={locale === "es" ? "Escribe un nuevo departamento" : "Type a new department"}
                      label={locale === "es" ? "Departamento" : "Department"}
                      onChange={setDepartment}
                      options={departmentOptions}
                      value={department}
                    />
                  </div>

                  <label className="block md:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">{locale === "es" ? "Biografía" : "Biography"}</span>
                    <textarea
                      className="mt-2 block min-h-[140px] w-full rounded-3xl border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm transition focus:border-primary focus:ring-primary"
                      onChange={(event) => setBio(event.target.value)}
                      value={bio}
                    />
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={resetForm}
                    type="button"
                  >
                    {locale === "es" ? "Cancelar" : "Cancel"}
                  </Button>
                  <Button
                    disabled={savingProfile}
                    onClick={() => void handleSaveProfile()}
                    type="button"
                  >
                    {savingProfile
                      ? locale === "es"
                        ? "Guardando..."
                        : "Saving..."
                      : locale === "es"
                        ? "Guardar cambios"
                        : "Save changes"}
                  </Button>
                </div>
              </section>
            </SectionCard>

            <SectionCard>
              <SectionHeading
                description={
                  locale === "es"
                    ? "Configura cómo quieres recibir avisos y qué ajustes de experiencia prefieres para tu cuenta."
                    : "Configure how you want to receive alerts and which experience settings you prefer for your account."
                }
                title={locale === "es" ? "Preferencias" : "Preferences"}
              />

              <div className="grid gap-4">
                <PreferenceToggle
                  checked={emailNotifications}
                  description={
                    locale === "es"
                      ? "Recibe avisos importantes y recordatorios de actividad por correo."
                      : "Receive important alerts and activity reminders by email."
                  }
                  onCheckedChange={setEmailNotifications}
                  title={locale === "es" ? "Notificaciones por correo" : "Email notifications"}
                />
                <PreferenceToggle
                  checked={loginAlerts}
                  description={
                    locale === "es"
                      ? "Recibe avisos cuando se produzcan cambios sensibles en la cuenta o nuevos accesos."
                      : "Receive alerts when sensitive account changes or new sign-ins happen."
                  }
                  onCheckedChange={setLoginAlerts}
                  title={locale === "es" ? "Alertas de seguridad" : "Security alerts"}
                />
                <PreferenceToggle
                  checked={systemThemeAuto}
                  description={
                    locale === "es"
                      ? "Sigue automáticamente tema claro u oscuro de tu sistema o navegador."
                      : "Automatically follow your system or browser light/dark theme."
                  }
                  onCheckedChange={setSystemThemeAuto}
                  title={locale === "es" ? "Detectar tema automáticamente" : "Detect theme automatically"}
                />
                <PreferenceToggle
                  checked={systemTheme}
                  description={
                    locale === "es"
                      ? "Cuando desactivas modo automático, fijas manualmente modo claro u oscuro para tu cuenta."
                      : "When automatic mode is off, you manually fix light or dark mode for your account."
                  }
                  disabled={systemThemeAuto}
                  onCheckedChange={setSystemTheme}
                  title={locale === "es" ? "Activar modo oscuro" : "Enable dark mode"}
                />
              </div>

              <div className="mt-5">
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                      <SparkIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {locale === "es" ? "Configuración actual" : "Current configuration"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {systemThemeAuto
                          ? locale === "es"
                            ? `Tema automático activo: sistema en ${themeMode === "dark" ? "oscuro" : "claro"}.`
                            : `Automatic theme active: system in ${themeMode === "dark" ? "dark" : "light"} mode.`
                          : locale === "es"
                            ? `Tema manual activo: ${systemTheme ? "oscuro" : "claro"}.`
                            : `Manual theme active: ${systemTheme ? "dark" : "light"}.`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard>
              <SectionHeading
                description={locale === "es"
                  ? "Revisa las últimas acciones registradas en tu cuenta."
                  : "Review the latest actions registered in your account."}
                title={locale === "es" ? "Actividad reciente" : "Recent activity"}
              />

              <div className="relative space-y-6 border-l border-slate-200 pl-6">
                {profile.activity.map((item) => (
                  <article className="relative" key={item.key}>
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
        onConfirm={requestPasswordConfirmation}
        onOpenChange={handlePasswordDialogOpenChange}
        onValuesChange={setPasswordValues}
        open={passwordDialogOpen}
        submitting={changingPassword}
        values={passwordValues}
      />

      <ConfirmDialog
        actionLabel={locale === "es" ? "Confirmar cambio" : "Confirm change"}
        body={locale === "es" ? "Se actualizará la contraseña de tu cuenta." : "Your account password will be updated."}
        confirmDisabled={changingPassword}
        confirmVariant="primary"
        onConfirm={handleChangePassword}
        onOpenChange={setPasswordConfirmOpen}
        open={passwordConfirmOpen}
        title={locale === "es" ? "Confirmar cambio de contraseña" : "Confirm password change"}
      />

      <ConfirmDialog
        actionLabel={locale === "es" ? "Eliminar cuenta" : "Delete account"}
        body={locale === "es"
          ? "Esta acción no se puede deshacer. Se eliminará tu cuenta cuando confirmes."
          : "This action cannot be undone. Your account will be deleted when you confirm."}
        confirmDisabled={deletingAccount}
        confirmVariant="danger"
        onConfirm={handleDeleteAccount}
        onOpenChange={setDeleteConfirmOpen}
        open={deleteConfirmOpen}
        title={locale === "es" ? "Confirmar eliminación de cuenta" : "Confirm account deletion"}
      />
    </>
  );
}
