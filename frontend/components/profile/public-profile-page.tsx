"use client";

import Link from "next/link";

import { getProjectStatusMeta } from "@/components/projects/project-management-utils";
import { formatDate } from "@/components/projects/detail/project-detail-helpers";
import {
  CalendarIcon,
  DepartmentIcon,
  SparkIcon,
} from "@/components/profile/profile-icons";
import { useLocale } from "@/components/providers/locale-provider";
import {
  DetailRow,
  SectionCard,
  SectionHeading,
} from "@/components/profile/profile-primitives";
import { ButtonLink } from "@/components/ui/button-link";
import { buildPublicProfileHref } from "@/lib/profile";
import { buildProjectDetailHref, resolveProjectRouteRef } from "@/lib/projects";
import type { PublicProfileRecord } from "@/types/api";

function formatMonthYear(dateValue: string, locale: "en" | "es") {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return locale === "es" ? "Pendiente" : "Pending";
  }

  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatRelativeTime(dateValue: string, locale: "en" | "es") {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return locale === "es" ? "Sin fecha" : "No date";
  }

  const now = new Date();
  const diffMinutes = Math.round((date.getTime() - now.getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale === "es" ? "es" : "en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return rtf.format(diffDays, "day");
  }

  return formatDate(dateValue, locale);
}

export function PublicProfilePage({
  profile,
}: {
  profile: PublicProfileRecord | null;
}) {
  const { locale } = useLocale();

  if (!profile) {
    return (
      <section className="rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-rose-800 shadow-sm">
        <h1 className="text-lg font-semibold">
          {locale === "es" ? "No se pudo abrir perfil público" : "Could not open public profile"}
        </h1>
        <p className="mt-2 text-sm leading-6">
          {locale === "es"
            ? "Usuario no existe o perfil público no está disponible ahora mismo."
            : "User does not exist or public profile is not available right now."}
        </p>
        <div className="mt-5">
          <ButtonLink href="/dashboard/public-projects" variant="secondary">
            {locale === "es" ? "Volver a proyectos públicos" : "Back to public projects"}
          </ButtonLink>
        </div>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="page-hero-surface overflow-hidden rounded-[32px] border border-white/10 p-6 sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="page-hero-badge gap-2 rounded-full px-3 py-1">
              <SparkIcon className="h-4 w-4" />
              {locale === "es" ? "Perfil público" : "Public profile"}
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {profile.display_name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              {profile.bio?.trim() ||
                (locale === "es"
                  ? "Perfil visible para explorar proyectos públicos, actividad reciente y contexto profesional dentro de la plataforma."
                  : "Profile visible to explore public projects, recent activity, and professional context inside platform.")}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                @{profile.username}
              </span>
              {profile.department ? (
                <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                  {profile.department}
                </span>
              ) : null}
              <span className="inline-flex items-center rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                {locale === "es" ? "En ATOM desde" : "On ATOM since"} {formatMonthYear(profile.joined_at, locale)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/dashboard/public-projects" size="lg" tone="on-dark" variant="secondary">
              {locale === "es" ? "Ver proyectos públicos" : "View public projects"}
            </ButtonLink>
            <ButtonLink href={buildPublicProfileHref(profile.username)} size="lg" tone="on-dark" variant="ghost">
              {locale === "es" ? "Recargar perfil" : "Reload profile"}
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SectionCard className="bg-gradient-to-br from-sky-50 via-white to-sky-100">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {locale === "es" ? "Proyectos públicos" : "Public projects"}
          </p>
          <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            {profile.summary.public_projects}
          </p>
        </SectionCard>
        <SectionCard className="bg-gradient-to-br from-emerald-50 via-white to-emerald-100">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {locale === "es" ? "Resultados listos" : "Results ready"}
          </p>
          <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            {profile.summary.results_ready}
          </p>
        </SectionCard>
        <SectionCard className="bg-gradient-to-br from-amber-50 via-white to-amber-100">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {locale === "es" ? "Colaboradores visibles" : "Visible collaborators"}
          </p>
          <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            {profile.summary.member_connections}
          </p>
        </SectionCard>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SectionCard>
          <SectionHeading
            description={locale === "es"
              ? "Datos básicos visibles del investigador o coordinador detrás de los proyectos públicos."
              : "Basic visible data about researcher or coordinator behind public projects."}
            title={locale === "es" ? "Ficha pública" : "Public card"}
          />
          <div className="space-y-3">
            <DetailRow icon={<DepartmentIcon className="h-5 w-5" />} label={locale === "es" ? "Departamento" : "Department"} value={profile.department || (locale === "es" ? "Sin departamento" : "No department")} />
            <DetailRow icon={<CalendarIcon className="h-5 w-5" />} label={locale === "es" ? "Miembro desde" : "Member since"} value={formatMonthYear(profile.joined_at, locale)} />
            <DetailRow icon={<SparkIcon className="h-5 w-5" />} label={locale === "es" ? "Última actividad" : "Last activity"} value={formatDate(profile.updated_at, locale)} />
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading
            description={locale === "es"
              ? "Señales recientes asociadas al perfil y a sus proyectos públicos."
              : "Recent signals associated with profile and its public projects."}
            title={locale === "es" ? "Actividad visible" : "Visible activity"}
          />
          {profile.activity.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm leading-6 text-slate-500">
              {locale === "es" ? "Todavía no hay actividad pública reciente para mostrar." : "There is no recent public activity to show yet."}
            </div>
          ) : (
            <div className="space-y-4">
              {profile.activity.map((item) => (
                <article
                  className="flex gap-4 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4"
                  key={`${item.kind}-${item.created_at}-${item.title}`}
                >
                  <span className="mt-1 h-3 w-3 rounded-full bg-primary" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                      <span className="text-xs font-medium text-slate-400">
                        {formatRelativeTime(item.created_at, locale)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard>
        <SectionHeading
          description={locale === "es"
            ? "Repositorio público de trabajo visible para cualquier usuario autenticado de la plataforma."
            : "Public work repository visible to any authenticated user on platform."}
          title={locale === "es" ? "Proyectos públicos" : "Public projects"}
        />
        {profile.public_projects.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm leading-6 text-slate-500">
            {locale === "es" ? "Este perfil todavía no tiene proyectos públicos." : "This profile does not have public projects yet."}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {profile.public_projects.map((project) => {
              const routeRef = resolveProjectRouteRef(project) ?? project.id;
              const statusMeta = getProjectStatusMeta(project.status, undefined, locale);

              return (
                <article
                  className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
                  key={project.id}
                >
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badgeClassName}`}>
                      {statusMeta.label}
                    </span>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {locale === "es" ? "Público" : "Public"}
                    </span>
                  </div>
                  <Link
                    className="mt-4 block text-lg font-semibold text-slate-950 transition hover:text-primary"
                    href={buildProjectDetailHref(routeRef)}
                  >
                    {project.name}
                  </Link>
                  <p className="mt-2 text-sm text-slate-500">
                    {locale === "es" ? "Actualizado" : "Updated"} {formatDate(project.updated_at, locale)}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                      {project.member_count} {locale === "es" ? `miembro${project.member_count === 1 ? "" : "s"}` : `member${project.member_count === 1 ? "" : "s"}`}
                    </span>
                  </div>
                  <div className="mt-5">
                    <ButtonLink href={buildProjectDetailHref(routeRef)} variant="primary">
                      {locale === "es" ? "Abrir proyecto" : "Open project"}
                    </ButtonLink>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
