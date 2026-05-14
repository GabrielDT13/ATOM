import type { UserRecord } from "@/types/api";

import { useLocale } from "@/components/providers/locale-provider";
import { MetricCard } from "@/components/ui/metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayersIcon,
  ShieldIcon,
  UsersClusterIcon,
} from "@/components/users/user-management-icons";
import { getDepartmentCount } from "@/components/users/user-management-utils";

type UserManagementSummaryProps = {
  loading?: boolean;
  users: UserRecord[];
};

function UserSummarySkeletonCard() {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <Skeleton className="mb-4 h-12 w-12 rounded-2xl" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-9 w-20" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </article>
  );
}

export function UserManagementSummary({
  loading = false,
  users,
}: UserManagementSummaryProps) {
  const { locale } = useLocale();
  const t = locale === "es";
  if (loading) {
    return (
      <section className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <UserSummarySkeletonCard key={index} />
        ))}
      </section>
    );
  }

  const adminCount = users.filter((user) => user.role === "admin").length;
  const departmentCount = getDepartmentCount(users);

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <MetricCard
        accentClassName="bg-sky-100 text-sky-700"
        description={t ? "Cuentas dadas de alta en la plataforma." : "Accounts registered on platform."}
        icon={<UsersClusterIcon />}
        title={t ? "Total de usuarios" : "Total users"}
        value={String(users.length)}
      />
      <MetricCard
        accentClassName="bg-indigo-100 text-indigo-700"
        description={t ? "Perfiles con permisos elevados de gestión." : "Profiles with elevated management permissions."}
        icon={<ShieldIcon />}
        title={t ? "Administradores" : "Administrators"}
        value={String(adminCount)}
      />
      <MetricCard
        accentClassName="bg-emerald-100 text-emerald-700"
        description={t ? "Departamentos distintos representados en el panel." : "Distinct departments represented in panel."}
        icon={<LayersIcon />}
        title={t ? "Áreas activas" : "Active areas"}
        value={String(departmentCount)}
      />
    </section>
  );
}
