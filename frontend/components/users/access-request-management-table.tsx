"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import type { AccessRequestRecord } from "@/types/api";

function formatRequestDate(
  value: string | null | undefined,
  locale: "es" | "en",
) {
  if (!value) {
    return locale === "es" ? "Ahora" : "Now";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function getStatusLabel(status: AccessRequestRecord["status"], locale: "es" | "en") {
  if (locale === "en") {
    switch (status) {
      case "approved":
        return "Approved";
      case "denied":
        return "Denied";
      default:
        return "Pending";
    }
  }

  switch (status) {
    case "approved":
      return "Aprobada";
    case "denied":
      return "Denegada";
    default:
      return "Pendiente";
  }
}

function getStatusClasses(status: AccessRequestRecord["status"]) {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-700";
    case "denied":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

type AccessRequestManagementTableProps = {
  loading: boolean;
  onApprove: (request: AccessRequestRecord) => void;
  onDeny: (request: AccessRequestRecord) => void;
  requests: AccessRequestRecord[];
};

export function AccessRequestManagementTable({
  loading,
  onApprove,
  onDeny,
  requests,
}: AccessRequestManagementTableProps) {
  const { locale } = useLocale();
  const t = locale === "es";
  const columns: DataTableColumn<AccessRequestRecord>[] = [
    {
      cell: (request) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{request.full_name}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{request.email}</p>
        </div>
      ),
      header: t ? "Solicitud" : "Request",
      id: "request",
      sortValue: (request) => request.full_name.toLowerCase(),
    },
    {
      cell: (request) => (
        <span
          className={cn(
            "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
            getStatusClasses(request.status),
          )}
        >
          {getStatusLabel(request.status, locale)}
        </span>
      ),
      header: t ? "Estado" : "Status",
      id: "status",
      sortValue: (request) => request.status,
    },
    {
      cell: (request) => (
        <span className="text-sm text-slate-600">
          {formatRequestDate(request.created_at, locale)}
        </span>
      ),
      header: t ? "Recibida" : "Received",
      id: "created_at",
      sortValue: (request) => request.created_at ?? "",
    },
    {
      cell: (request) => (
        <span className="text-sm text-slate-600">
          {request.reviewed_by_display_name ||
            request.reviewed_by_username ||
            (request.status === "pending"
              ? t
                ? "Sin revisar"
                : "Pending review"
              : t
                ? "Sistema"
                : "System")}
        </span>
      ),
      header: t ? "Revisión" : "Review",
      id: "reviewed_by",
      sortValue: (request) =>
        request.reviewed_by_display_name ?? request.reviewed_by_username ?? "",
    },
    {
      cell: (request) =>
        request.status === "pending" ? (
          <div className="flex justify-end gap-2">
            <Button onClick={() => onApprove(request)} size="sm" variant="primary">
              {t ? "Aprobar" : "Approve"}
            </Button>
            <Button onClick={() => onDeny(request)} size="sm" variant="danger">
              {t ? "Denegar" : "Deny"}
            </Button>
          </div>
        ) : request.status === "approved" ? (
          <span className="text-sm text-slate-500">
            {request.approved_username ? `@${request.approved_username}` : t ? "Usuario creado" : "User created"}
          </span>
        ) : (
          <span className="text-sm text-slate-500">{t ? "Sin acciones" : "No actions"}</span>
        ),
      cellClassName: "w-[1%] whitespace-nowrap text-right",
      header: t ? "Acciones" : "Actions",
      headerClassName: "text-right",
      id: "actions",
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={requests}
      emptyState={
        <div className="mx-auto max-w-md text-center">
          <p className="text-base font-semibold text-slate-900">
            {t ? "No hay solicitudes registradas." : "No requests registered yet."}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {t
              ? "Cuando alguien solicite acceso desde el login, aparecerá aquí."
              : "When someone requests access from sign in, it will appear here."}
          </p>
        </div>
      }
      getRowKey={(request) => String(request.id)}
      initialSort={{ columnId: "created_at", direction: "desc" }}
      loading={loading}
      loadingLabel={t ? "Cargando solicitudes..." : "Loading requests..."}
      rowClassName={(request) =>
        request.status === "pending" ? "bg-amber-50/30" : undefined
      }
    />
  );
}
