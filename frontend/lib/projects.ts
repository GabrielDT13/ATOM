import { apiFetch, apiUpload } from "@/lib/api";
import type {
  ProjectAnalysisProfile,
  ProjectAnalysisVariant,
  ProjectLifecycleStatus,
  ProjectStudyType,
  ProjectDetails,
  ProjectMemberRole,
  ProjectMemberMutationResponse,
  ProjectMembersResponse,
  ProjectMapResponse,
  ProjectMutationResponse,
  ProjectShareCandidatesResponse,
  ProjectSummary,
  ProjectTeamCandidatesResponse,
  ProjectTeamMutationResponse,
  ProjectTeamsResponse,
  ProjectVisibility,
} from "@/types/api";

type ProjectUploadOptions = {
  additionalFiles?: File[];
  analysisProfile?: ProjectAnalysisProfile;
  enabledAnalysisVariants?: ProjectAnalysisVariant[];
  entityName?: string;
  name?: string;
  onProgress?: (progress: number) => void;
  primaryAnalysisVariant?: ProjectAnalysisVariant;
  projectState?: ProjectLifecycleStatus;
  studyType?: ProjectStudyType;
  teamId?: string;
  templateFile?: File | null;
  visibility?: ProjectVisibility;
};

function buildProjectFormData({
  additionalFiles = [],
  analysisProfile,
  enabledAnalysisVariants = [],
  entityName,
  name,
  primaryAnalysisVariant,
  projectState,
  studyType,
  teamId,
  templateFile,
  visibility,
}: ProjectUploadOptions): FormData {
  const formData = new FormData();

  if (name?.trim()) {
    formData.append("project_name", name.trim());
  }

  if (entityName !== undefined) {
    formData.append("entity_name", entityName.trim());
  }

  if (analysisProfile) {
    formData.append("analysis_profile", analysisProfile);
  }

  enabledAnalysisVariants.forEach((variant) => {
    formData.append("enabled_analysis_variants", variant);
  });

  if (primaryAnalysisVariant) {
    formData.append("primary_analysis_variant", primaryAnalysisVariant);
  }

  if (projectState) {
    formData.append("project_state", projectState);
  }

  if (studyType) {
    formData.append("study_type", studyType);
  }

  if (teamId?.trim()) {
    formData.append("team_id", teamId.trim());
  }

  if (visibility) {
    formData.append("visibility", visibility);
  }

  if (templateFile) {
    formData.append("template_file", templateFile);
  }

  additionalFiles.forEach((file) => {
    formData.append("additional_files", file);
  });

  return formData;
}

export function resolveProjectRouteRef(project: Pick<ProjectSummary, "id" | "slug">) {
  const normalizedSlug = project.slug?.trim();
  if (normalizedSlug) {
    return normalizedSlug;
  }

  const normalizedId = project.id?.trim();
  if (normalizedId) {
    return normalizedId;
  }

  return null;
}

export function buildProjectDetailHref(projectRef: string) {
  return `/dashboard/projects/${encodeURIComponent(projectRef)}`;
}

export function buildProjectReportHref(projectRef: string, reportPath: string) {
  return `/dashboard/project-report/${encodeURIComponent(projectRef)}?path=${encodeURIComponent(reportPath)}`;
}

export function buildProjectExecutionHref(
  projectRef: string,
  options?: { autoStart?: boolean; variant?: string | null; variants?: string[] | null },
) {
  const basePath = `/dashboard/project-execution/${encodeURIComponent(projectRef)}`;
  const searchParams = new URLSearchParams();
  if (options?.autoStart) {
    searchParams.set("start", "1");
  }
  const normalizedVariants = (options?.variants ?? [])
    .map((variant) => variant.trim())
    .filter(Boolean);
  if (normalizedVariants.length > 0) {
    searchParams.set("variants", normalizedVariants.join(","));
  }
  if (options?.variant?.trim()) {
    searchParams.set("variant", options.variant.trim());
  }
  if (!Array.from(searchParams.keys()).length) {
    return basePath;
  }
  return `${basePath}?${searchParams.toString()}`;
}

export function listProjects() {
  return apiFetch<ProjectMapResponse>("/api/projects");
}

export function listPublicProjects() {
  return apiFetch<ProjectMapResponse>("/api/projects/public");
}

export function getProject(owner: string, projectName: string) {
  return apiFetch<ProjectDetails>(
    `/api/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectName)}`,
  );
}

export function getProjectByRef(projectRef: string) {
  return apiFetch<ProjectDetails>(`/api/projects/by-ref/${encodeURIComponent(projectRef)}`);
}

export function createProject({
  additionalFiles = [],
  analysisProfile,
  enabledAnalysisVariants,
  entityName,
  name,
  onProgress,
  primaryAnalysisVariant,
  projectState,
  studyType,
  teamId,
  templateFile,
  visibility,
}: ProjectUploadOptions) {
  const formData = buildProjectFormData({
    additionalFiles,
    analysisProfile,
    enabledAnalysisVariants,
    entityName,
    name,
    primaryAnalysisVariant,
    projectState,
    studyType,
    teamId,
    templateFile,
    visibility,
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
    analysisProfile,
    enabledAnalysisVariants = [],
    entityName,
    name,
    onProgress,
    primaryAnalysisVariant,
    projectState,
    studyType,
    templateFile,
    visibility,
  }: ProjectUploadOptions,
) {
  const formData = new FormData();

  if (name?.trim()) {
    formData.append("new_name", name.trim());
  }

  if (entityName !== undefined) {
    formData.append("entity_name", entityName.trim());
  }

  if (analysisProfile) {
    formData.append("analysis_profile", analysisProfile);
  }

  enabledAnalysisVariants.forEach((variant) => {
    formData.append("enabled_analysis_variants", variant);
  });

  if (primaryAnalysisVariant) {
    formData.append("primary_analysis_variant", primaryAnalysisVariant);
  }

  if (projectState) {
    formData.append("project_state", projectState);
  }

  if (studyType) {
    formData.append("study_type", studyType);
  }

  if (visibility) {
    formData.append("visibility", visibility);
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

export function listProjectMembersByRef(projectRef: string) {
  return apiFetch<ProjectMembersResponse>(
    `/api/projects/by-ref/${encodeURIComponent(projectRef)}/members`,
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

export function listProjectTeams(owner: string, projectName: string) {
  return apiFetch<ProjectTeamsResponse>(
    `/api/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectName)}/teams`,
  );
}

export function searchProjectTeamCandidates(owner: string, projectName: string, query: string, limit = 8) {
  const searchParams = new URLSearchParams({
    limit: String(limit),
    q: query,
  });
  return apiFetch<ProjectTeamCandidatesResponse>(
    `/api/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectName)}/team-candidates?${searchParams.toString()}`,
  );
}

export function shareProjectWithTeam(
  owner: string,
  projectName: string,
  teamId: string,
  memberRole: Extract<ProjectMemberRole, "editor" | "viewer"> = "viewer",
) {
  return apiFetch<ProjectTeamMutationResponse>(
    `/api/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectName)}/teams/${encodeURIComponent(teamId)}`,
    {
      body: JSON.stringify({ member_role: memberRole }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PUT",
    },
  );
}

export function removeProjectTeamAccess(owner: string, projectName: string, teamId: string) {
  return apiFetch<ProjectTeamMutationResponse>(
    `/api/projects/${encodeURIComponent(owner)}/${encodeURIComponent(projectName)}/teams/${encodeURIComponent(teamId)}`,
    { method: "DELETE" },
  );
}
