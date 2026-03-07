"use client";

import Link from "next/link";

const DASHBOARD_LABELS: Record<string, string> = {
  create_project: "Crear proyecto",
  dashboard: "Dashboard",
  edit_project: "Editar proyecto",
  edit_projects: "Editar proyectos",
  edit_user: "Editar usuario",
  edit_users: "Editar usuarios",
  profile: "Perfil",
  projects: "Proyectos",
  register: "Registrar usuario",
  users: "Usuarios",
};

export type DashboardBreadcrumbItem = {
  href?: string;
  label: string;
};

function ChevronRightIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 text-slate-400"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 6L15 12L9 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}

function formatSegment(segment: string) {
  const decoded = decodeURIComponent(segment);
  const mapped = DASHBOARD_LABELS[decoded];

  if (mapped) {
    return mapped;
  }

  return decoded
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function buildDashboardBreadcrumbs(pathname: string): DashboardBreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const items: DashboardBreadcrumbItem[] = [];
  let currentPath = "";

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    items.push({
      href: index === segments.length - 1 ? undefined : currentPath,
      label: formatSegment(segment),
    });
  });

  return items;
}

type DashboardBreadcrumbProps = {
  items: DashboardBreadcrumbItem[];
};

export function DashboardBreadcrumb({ items }: DashboardBreadcrumbProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="bg-transparent">
      <div className="px-4 pb-0 pt-4 sm:px-8 sm:pt-6">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          {items.map((item, index) => (
            <li className="flex items-center gap-2" key={`${item.label}-${index}`}>
              {item.href ? (
                <Link
                  className="rounded-md px-1 py-0.5 font-medium transition hover:text-primary"
                  href={item.href}
                >
                  {item.label}
                </Link>
              ) : (
                <span className="rounded-md px-1 py-0.5 font-semibold text-slate-900">{item.label}</span>
              )}

              {index < items.length - 1 ? <ChevronRightIcon /> : null}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
