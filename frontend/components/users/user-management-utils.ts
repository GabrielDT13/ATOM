import type { UserRecord } from "@/types/api";

export type UserRoleFilter = "all" | UserRecord["role"];

export function getDisplayName(user: UserRecord) {
  if (user.display_name?.trim()) {
    return user.display_name.trim();
  }

  const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  return fullName || user.username;
}

export function getRoleLabel(role: UserRecord["role"]) {
  return role === "admin" ? "Administrador" : "Usuario";
}

export function getDepartmentCount(users: UserRecord[]) {
  return new Set(users.map((user) => user.department).filter(Boolean)).size;
}

export function filterUsers(
  users: UserRecord[],
  search: string,
  roleFilter: UserRoleFilter,
) {
  const normalizedSearch = search.trim().toLowerCase();

  return users.filter((user) => {
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const haystack = [
      user.username,
      user.email,
      getDisplayName(user),
      user.department ?? "",
      getRoleLabel(user.role),
    ]
      .join(" ")
      .toLowerCase();

    return matchesRole && (!normalizedSearch || haystack.includes(normalizedSearch));
  });
}
