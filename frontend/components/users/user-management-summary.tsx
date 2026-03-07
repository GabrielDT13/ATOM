import type { UserRecord } from "@/types/api";

import { MetricCard } from "@/components/ui/metric-card";
import {
  LayersIcon,
  ShieldIcon,
  UsersClusterIcon,
} from "@/components/users/user-management-icons";
import { getDepartmentCount } from "@/components/users/user-management-utils";

type UserManagementSummaryProps = {
  users: UserRecord[];
};

export function UserManagementSummary({ users }: UserManagementSummaryProps) {
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
