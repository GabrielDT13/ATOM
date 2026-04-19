import { apiFetch } from "@/lib/api";
import type { EntityMutationResponse, EntityRecord } from "@/types/api";

export function listEntities() {
  return apiFetch<EntityRecord[]>("/api/entities");
}

export function createEntity(name: string) {
  return apiFetch<EntityMutationResponse>("/api/entities", {
    body: JSON.stringify({ name: name.trim() }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export function updateEntity(entityId: string, name: string) {
  return apiFetch<EntityMutationResponse>(`/api/entities/${encodeURIComponent(entityId)}`, {
    body: JSON.stringify({ name: name.trim() }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
}

export function deleteEntity(entityId: string) {
  return apiFetch<EntityMutationResponse>(`/api/entities/${encodeURIComponent(entityId)}`, {
    method: "DELETE",
  });
}
