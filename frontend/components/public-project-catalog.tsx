"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { buildProjectDetailHref, listPublicProjects } from "@/lib/projects";
import {
  buildProjectRecords,
  getProjectStatusMeta,
  getProjectVisibilityMeta,
  type ProjectRecord,
} from "@/components/projects/project-management-utils";
import { ProjectStackIcon } from "@/components/projects/project-management-icons";
import { PublicProjectShareButton } from "@/components/projects/public-project-share-button";
import { useLocale } from "@/components/providers/locale-provider";
import { ButtonLink } from "@/components/ui/button-link";
import { BoardHeroArt } from "@/components/ui/board-hero-art";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { EntityLogo } from "@/components/ui/entity-logo";
import { useAppToast } from "@/hooks/use-app-toast";
import { buildPublicProfileHref } from "@/lib/profile";

const STATUS_OPTIONS = [
  { label: { en: "All", es: "Todos" }, value: "all" },
  { label: { en: "No files", es: "Sin archivos" }, value: "empty" },
  { label: { en: "Pending", es: "Pendientes" }, value: "configured" },
  { label: { en: "With results", es: "Con resultados" }, value: "results" },
] as const;

const PUBLIC_PROJECT_BOARD_HERO_IMAGE = "/images/project-hero-molecule.jpg";

export function PublicProjectCatalog() {
  const appToast = useAppToast();
  const { locale } = useLocale();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]["value"]>("all");

  useEffect(() => {
    let cancelled = false;

    void listPublicProjects()
      .then((payload) => {
        if (!cancelled) {
          setProjects(buildProjectRecords(payload.items));
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setProjects([]);
          appToast.error(
            locale === "es" ? "No se pudieron cargar los proyectos públicos" : "Could not load public projects",
            loadError instanceof Error ? loadError.message : undefined,
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [appToast, locale]);

  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return projects.filter((project) => {
      if (statusFilter !== "all" && project.status !== statusFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [project.name, project.owner, project.entity_name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [projects, search, statusFilter]);

  return (
    <div className="flex flex-col gap-6">
      <section className="page-hero-surface overflow-hidden rounded-[32px] border border-white/10 p-6 sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="page-hero-badge gap-2 rounded-full px-3 py-1">
              <ProjectStackIcon />
              {locale === "es" ? "Catálogo público" : "Public catalog"}
            </div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {locale === "es" ? "Proyectos públicos" : "Public projects"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              {locale === "es"
                ? "Explora los proyectos marcados como públicos y abre su detalle igual que harías con un repositorio visible para toda la plataforma."
                : "Explore projects marked as public and open their detail just like a repository visible to the whole platform."}
            </p>
          </div>

          <ButtonLink href="/dashboard/projects" size="lg" tone="on-dark" variant="secondary">
            {locale === "es" ? "Volver a mis proyectos" : "Back to my projects"}
          </ButtonLink>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700">{locale === "es" ? "Buscar" : "Search"}</span>
            <input
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-sky-100"
              onChange={(event) => setSearch(event.target.value)}
              placeholder={locale === "es" ? "Nombre, propietario o entidad" : "Name, owner, or entity"}
              value={search}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
              {locale === "es" ? "Estado" : "Status"}
              <InfoTooltip
                content={
                  locale === "es"
                    ? "Filtra solo proyectos públicos. Pendientes = con archivos pero sin resultados. Con resultados = ya tiene HTML."
                    : "Filter only public projects. Pending = files uploaded but no results. With results = already has HTML."
                }
              />
            </span>
            <select
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-sky-100"
              onChange={(event) => setStatusFilter(event.target.value as (typeof STATUS_OPTIONS)[number]["value"])}
              value={statusFilter}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label[locale]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {loading ? (
        <section className="rounded-[28px] border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          {locale === "es" ? "Cargando proyectos públicos..." : "Loading public projects..."}
        </section>
      ) : filteredProjects.length === 0 ? (
        <section className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-base font-semibold text-slate-900">
            {locale === "es" ? "No hay proyectos públicos que coincidan." : "No matching public projects."}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {locale === "es"
              ? "Cambia los filtros o marca algún proyecto como público desde la edición del proyecto."
              : "Change filters or mark a project as public from project editor."}
          </p>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filteredProjects.map((project) => {
            const statusMeta = getProjectStatusMeta(project.status, project.activeRun, locale);
            const visibilityMeta = getProjectVisibilityMeta(project.visibility, locale);

            return (
              <article
                className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
                key={project.id}
              >
                <BoardHeroArt
                  accentClassName="rounded-none border-0 border-b"
                  corner={
                    project.entity_name || project.entity_logo_url ? (
                      <EntityLogo
                        className="h-14 w-14 bg-white/95"
                        logoUrl={project.entity_logo_url}
                        name={project.entity_name ?? project.name}
                      />
                    ) : null
                  }
                  eyebrow={locale === "es" ? "Proyecto público" : "Public project"}
                  imagePath={PUBLIC_PROJECT_BOARD_HERO_IMAGE}
                  subtitle={project.entity_name ?? statusMeta.description}
                  title={project.name}
                />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badgeClassName}`}>
                          {statusMeta.label}
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${visibilityMeta.badgeClassName}`}>
                          {visibilityMeta.label}
                        </span>
                      </div>

                      <Link
                        className="mt-4 block truncate text-lg font-semibold text-slate-950 transition hover:text-primary"
                        href={buildProjectDetailHref(project.routeRef)}
                      >
                        {project.name}
                      </Link>
                      <Link
                        className="mt-1 inline-flex text-sm text-slate-500 transition hover:text-primary"
                        href={buildPublicProfileHref(project.owner)}
                      >
                        @{project.owner}
                      </Link>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-600">
                  {project.entity_name ? (
                    <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">
                      {project.entity_name}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                    {project.file_count}{" "}
                    {locale === "es"
                      ? `archivo${project.file_count === 1 ? "" : "s"}`
                      : `file${project.file_count === 1 ? "" : "s"}`}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                    {project.htmlFiles.length}{" "}
                    {locale === "es"
                      ? `informe${project.htmlFiles.length === 1 ? "" : "s"}`
                      : `report${project.htmlFiles.length === 1 ? "" : "s"}`}
                  </span>
                  </div>

                  <p className="mt-5 text-sm leading-6 text-slate-500">{visibilityMeta.helperText}</p>

                  <div className="mt-5">
                    <div className="flex flex-wrap gap-3">
                      <ButtonLink href={buildProjectDetailHref(project.routeRef)} variant="primary">
                        {locale === "es" ? "Abrir proyecto" : "Open project"}
                      </ButtonLink>
                      <PublicProjectShareButton project={project} projectRef={project.routeRef} />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
