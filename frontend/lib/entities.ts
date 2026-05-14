import { apiFetch, apiUpload, buildApiUrl } from "@/lib/api";
import type { EntityMutationResponse, EntityRecord } from "@/types/api";

export function listEntities() {
  return apiFetch<EntityRecord[]>("/api/entities");
}

export function resolveEntityLogoUrl(logoUrl?: string | null) {
  if (!logoUrl) {
    return null;
  }
  return logoUrl.startsWith("/api/") ? buildApiUrl(logoUrl) : logoUrl;
}

type EntityMutationInput = {
  logoFile?: File | null;
  name: string;
  removeLogo?: boolean;
};

async function compressEntityLogo(file: File): Promise<File> {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("No se pudo leer el logo"));
      nextImage.src = imageUrl;
    });

    const maxSide = 512;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("No se pudo procesar el logo");
    }

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (nextBlob) => {
          if (nextBlob) {
            resolve(nextBlob);
            return;
          }
          reject(new Error("No se pudo comprimir el logo"));
        },
        "image/webp",
        0.82,
      );
    });

    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "entity-logo"}.webp`, {
      type: "image/webp",
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function buildEntityFormData(input: EntityMutationInput) {
  const formData = new FormData();
  formData.append("name", input.name.trim());

  if (input.removeLogo) {
    formData.append("remove_logo", "true");
  }

  if (input.logoFile) {
    formData.append("logo_file", await compressEntityLogo(input.logoFile));
  }

  return formData;
}

export async function createEntity(input: EntityMutationInput) {
  return apiUpload<EntityMutationResponse>(
    "/api/entities",
    await buildEntityFormData(input),
    { method: "POST" },
  );
}

export async function updateEntity(entityId: string, input: EntityMutationInput) {
  return apiUpload<EntityMutationResponse>(
    `/api/entities/${encodeURIComponent(entityId)}`,
    await buildEntityFormData(input),
    { method: "PUT" },
  );
}

export function deleteEntity(entityId: string) {
  return apiFetch<EntityMutationResponse>(`/api/entities/${encodeURIComponent(entityId)}`, {
    method: "DELETE",
  });
}
