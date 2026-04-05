import type { UserRecord } from "@/types/api";

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
        description="Cuentas dadas de alta en la plataforma."
        icon={<UsersClusterIcon />}
        title="Total de usuarios"
        value={String(users.length)}
      />
      <MetricCard
        accentClassName="bg-indigo-100 text-indigo-700"
        description="Perfiles con permisos elevados de gestión."
        icon={<ShieldIcon />}
        title="Administradores"
        value={String(adminCount)}
      />
      <MetricCard
        accentClassName="bg-emerald-100 text-emerald-700"
        description="Departamentos distintos representados en el panel."
        icon={<LayersIcon />}
        title="Áreas activas"
        value={String(departmentCount)}
      />
    </section>
  );
}
