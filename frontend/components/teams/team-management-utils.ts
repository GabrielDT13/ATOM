import type { TeamSummary } from "@/types/api";

export type TeamViewMode = "board" | "list";
export type TeamOwnerFilter = "all" | string;
export type TeamEntityFilter = "all" | string;

export type TeamRecord = TeamSummary & {
  canManage: boolean;
};

export function buildTeamRecords(
  teams: TeamSummary[],
  options?: { isAdmin?: boolean; sessionUsername?: string | null },
) {
  const isAdmin = options?.isAdmin === true;
  const sessionUsername = options?.sessionUsername?.trim() || null;

  return teams.map((team) => ({
    ...team,
    canManage: isAdmin || team.owner_username === sessionUsername,
  }));
}

export function filterTeams(
  teams: TeamRecord[],
  search: string,
  ownerFilter: TeamOwnerFilter,
  entityFilter: TeamEntityFilter,
) {
  const normalizedSearch = search.trim().toLowerCase();

  return teams.filter((team) => {
    if (ownerFilter !== "all" && team.owner_username !== ownerFilter) {
      return false;
    }

    if (entityFilter !== "all") {
      const entityName = team.entity_name?.trim() || "";
      if (entityName !== entityFilter) {
        return false;
      }
    }

    if (!normalizedSearch) {
      return true;
    }

    const searchable = [
      team.name,
      team.owner_username,
      team.entity_name ?? "",
      team.slug,
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(normalizedSearch);
  });
}

export function getTeamOwners(teams: TeamSummary[]) {
  return Array.from(
    new Set(teams.map((team) => team.owner_username).filter((value) => value.trim())),
  ).sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" }));
}

export function getTeamEntities(teams: TeamSummary[]) {
  return Array.from(
    new Set(
      teams
        .map((team) => team.entity_name?.trim() || "")
        .filter((value) => value.length > 0),
    ),
  ).sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" }));
}
