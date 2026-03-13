import { apiFetch, apiUpload } from "@/lib/api";
import type {
  ProjectDetails,
  ProjectMemberRole,
  ProjectMemberMutationResponse,
  ProjectMembersResponse,
  ProjectMapResponse,
  ProjectMutationResponse,
  ProjectShareCandidatesResponse,
} from "@/types/api";

type ProjectUploadOptions = {
  additionalFiles?: File[];
  name?: string;
  onProgress?: (progress: number) => void;
  templateFile?: File | null;
};

function buildProjectFormData({
  additionalFiles = [],
  name,
  templateFile,
}: ProjectUploadOptions): FormData {
  const formData = new FormData();

  if (name?.trim()) {
    formData.append("project_name", name.trim());
  }

  if (templateFile) {
    formData.append("template_file", templateFile);
  }

  additionalFiles.forEach((file) => {
    formData.append("additional_files", file);
  });

  return formData;
}

export function listProjects() {
  return apiFetch<ProjectMapResponse>("/api/projects");
}

export function getProject(owner: string, projectName: string) {
  return apiFetch<ProjectDetails>(
    `/api/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectName)}`,
  );
}

export function createProject({
  additionalFiles = [],
  name,
  onProgress,
  templateFile,
}: ProjectUploadOptions) {
  const formData = buildProjectFormData({
    additionalFiles,
    name,
    templateFile,
  });

  return apiUpload<ProjectMutationResponse>("/api/projects", formData, {
    method: "POST",
    onProgress,
  });
}

export function updateProject(
  owner: string,
  projectName: string,
  {
    additionalFiles = [],
    name,
    onProgress,
    templateFile,
  }: ProjectUploadOptions,
) {
  const formData = new FormData();

  if (name?.trim()) {
    formData.append("new_name", name.trim());
  }

  if (templateFile) {
    formData.append("excel_file", templateFile);
  }

  additionalFiles.forEach((file) => {
    formData.append("additional_files", file);
  });

  return apiUpload<ProjectMutationResponse>(
    `/api/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectName)}`,
    formData,
    {
      method: "PUT",
      onProgress,
    },
  );
}

export function deleteProject(owner: string, projectName: string) {
  return apiFetch<ProjectMutationResponse>(
    `/api/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectName)}`,
    { method: "DELETE" },
  );
}

export function listProjectMembers(owner: string, projectName: string) {
  return apiFetch<ProjectMembersResponse>(
    `/api/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectName)}/members`,
  );
}

export function searchProjectShareCandidates(owner: string, projectName: string, query: string, limit = 8) {
  const searchParams = new URLSearchParams({
    limit: String(limit),
    q: query,
  });
  return apiFetch<ProjectShareCandidatesResponse>(
    `/api/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectName)}/share-candidates?${searchParams.toString()}`,
  );
}

export function shareProjectWithUser(
  owner: string,
  projectName: string,
  username: string,
  memberRole: Extract<ProjectMemberRole, "editor" | "viewer"> = "viewer",
) {
  return apiFetch<ProjectMemberMutationResponse>(
    `/api/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectName)}/members/${encodeURIComponent(username)}`,
    {
      body: JSON.stringify({ member_role: memberRole }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PUT",
    },
  );
}

export function removeProjectAccess(owner: string, projectName: string, username: string) {
  return apiFetch<ProjectMemberMutationResponse>(
    `/api/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectName)}/members/${encodeURIComponent(username)}`,
    { method: "DELETE" },
  );
}

export function transferProjectOwnership(owner: string, projectName: string, username: string) {
  return apiFetch<ProjectMutationResponse>(
    `/api/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectName)}/transfer/${encodeURIComponent(username)}`,
    { method: "POST" },
  );
}
