import type { EntityRecord } from "@/types/api";

export type EntityViewMode = "board" | "list";

export function filterEntities(entities: EntityRecord[], search: string) {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return entities;
  }

  return entities.filter((entity) => {
    const searchable = [entity.name, entity.slug].join(" ").toLowerCase();
    return searchable.includes(normalizedSearch);
  });
}
