"use client";

import { useEffect, useMemo, useState } from "react";

import {
  buildProjectFileUrl,
  buildProjectFilePreviewPath,
  getExecutionDeliverables,
  getExecutionPreviewableFiles,
  getProjectDeliverablesLayout,
  isPreviewableTextFile,
} from "@/components/projects/detail/project-detail-helpers";
import {
  buildProjectPreviewState,
  getPreferredExecutionGroup,
  getPreferredPrimaryPreviewFile,
} from "@/components/projects/detail/project-detail-preview";
import {
  ProjectDetailErrorState,
  ProjectDetailHero,
  ProjectDetailLoadingState,
  ProjectPrimaryReport,
  ProjectQuickActions,
  ProjectResultsSections,
  ProjectSidebar,
} from "@/components/projects/detail/project-detail-sections";
import type { PreviewState } from "@/components/projects/detail/project-detail-types";
import {
  buildProjectDetailModel,
} from "@/components/projects/project-detail-utils";
import {
  parseProjectReportHtml,
  resolveRelativeReportAssetPath,
  type ParsedProjectReport,
} from "@/components/projects/project-report-utils";
import { getProjectStatusMeta } from "@/components/projects/project-management-utils";
import { useAppToast } from "@/hooks/use-app-toast";
import { apiFetch, fetchSession } from "@/lib/api";
import {
  buildProjectExecutionHref,
  buildProjectReportHref,
  getProject,
  getProjectByRef,
  listProjectMembers,
  listProjectTeams,
  listProjectMembersByRef,
  resolveProjectRouteRef,
} from "@/lib/projects";
import type {
  FileContentResponse,
  ProjectDetails,
  ProjectMemberRecord,
  ProjectSharedTeam,
  SessionResponse,
} from "@/types/api";

type ProjectDetailPageProps =
  | {
      owner: string;
      projectName: string;
      projectRef?: never;
    }
  | {
      owner?: never;
      projectName?: never;
      projectRef: string;
    };

export function ProjectDetailPage({
  owner,
  projectName,
  projectRef,
}: ProjectDetailPageProps) {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [members, setMembers] = useState<ProjectMemberRecord[]>([]);
  const [teams, setTeams] = useState<ProjectSharedTeam[]>([]);
  const [reportPreview, setReportPreview] = useState<PreviewState | null>(null);
  const [filePreview, setFilePreview] = useState<PreviewState | null>(null);
  const [activeReport, setActiveReport] = useState<ParsedProjectReport | null>(null);
  const [activeExecutionDirectory, setActiveExecutionDirectory] = useState<string | null>(null);
  const [activePrimaryPreviewPath, setActivePrimaryPreviewPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportPreviewLoading, setReportPreviewLoading] = useState(false);
  const [filePreviewLoading, setFilePreviewLoading] = useState(false);
  const appToast = useAppToast();

  async function loadProjectState(isCancelled: () => boolean = () => false) {
    setLoading(true);
    setError(null);
    setTeams([]);

    try {
      const projectRequest =
        typeof projectRef === "string"
          ? getProjectByRef(projectRef)
          : getProject(owner, projectName);
      const membersRequest =
        typeof projectRef === "string"
          ? listProjectMembersByRef(projectRef)
          : listProjectMembers(owner, projectName);

      const [sessionResponse, projectResponse, membersResponse] = await Promise.all([
        fetchSession(),
        projectRequest,
        membersRequest,
      ]);

      if (isCancelled()) {
        return;
      }

      setSession(sessionResponse);
      setProject(projectResponse);
      setMembers(membersResponse.members);
      try {
        const teamsResponse = await listProjectTeams(projectResponse.owner, projectResponse.name);
        if (!isCancelled()) {
          setTeams(teamsResponse.teams);
        }
      } catch {
        if (!isCancelled()) {
          setTeams([]);
        }
      }
    } catch (loadError) {
      if (isCancelled()) {
        return;
      }

      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el detalle del proyecto.",
      );
    } finally {
      if (!isCancelled()) {
        setLoading(false);
      }
    }
  }

  const detailModel = useMemo(
    () => (project ? buildProjectDetailModel(project) : null),
    [project],
  );
  const resolvedProjectRef = project ? resolveProjectRouteRef(project) : null;

  const activeExecutionGroup =
    detailModel?.executionGroups.find((group) => group.directory === activeExecutionDirectory) ??
    detailModel?.executionGroups[0] ??
    null;

  async function loadPreview(
    file: NonNullable<typeof activeExecutionGroup>["files"][number],
    kind: "file" | "report",
    currentProjectName = project?.name,
    currentProjectOwner = project?.owner,
  ) {
    if (!currentProjectName || !currentProjectOwner) {
      return;
    }

    const setLoadingState = kind === "report" ? setReportPreviewLoading : setFilePreviewLoading;
    const setPreviewState = kind === "report" ? setReportPreview : setFilePreview;
    const errorTitle =
      kind === "report"
        ? "No se pudo cargar la vista previa principal"
        : "No se pudo cargar la vista previa";

    setLoadingState(true);

    try {
      const nextPreview = await buildProjectPreviewState({
        file,
        owner: currentProjectOwner,
        projectName: currentProjectName,
      });

      setPreviewState(nextPreview);
    } catch (previewError) {
      appToast.error(
        errorTitle,
        previewError instanceof Error ? previewError.message : undefined,
      );
    } finally {
      setLoadingState(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    void loadProjectState(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, [owner, projectName, projectRef]);

  useEffect(() => {
    if (!detailModel?.executionGroups.length) {
      setActiveExecutionDirectory(null);
      return;
    }

    const stillExists = detailModel.executionGroups.some(
      (group) => group.directory === activeExecutionDirectory,
    );

    if (!stillExists) {
      setActiveExecutionDirectory(getPreferredExecutionGroup(detailModel.executionGroups)?.directory ?? null);
    }
  }, [activeExecutionDirectory, detailModel]);

  useEffect(() => {
    if (!activeExecutionGroup) {
      setActivePrimaryPreviewPath(null);
      return;
    }

    const previewFiles = getExecutionPreviewableFiles(activeExecutionGroup);
    const stillExists = previewFiles.some((file) => file.path === activePrimaryPreviewPath);

    if (!stillExists) {
      setActivePrimaryPreviewPath(getPreferredPrimaryPreviewFile(activeExecutionGroup)?.path ?? null);
    }
  }, [activeExecutionGroup, activePrimaryPreviewPath]);

  useEffect(() => {
    if (!project || !activeExecutionGroup) {
      return;
    }

    const previewFile = getExecutionPreviewableFiles(activeExecutionGroup).find(
      (file) => file.path === activePrimaryPreviewPath,
    );

    if (previewFile) {
      void loadPreview(previewFile, "report", project.name, project.owner);
    }
  }, [activeExecutionGroup, activePrimaryPreviewPath, project]);

  useEffect(() => {
    if (!project || !activeExecutionGroup?.htmlFile) {
      setActiveReport(null);
      return;
    }

    const htmlFile = activeExecutionGroup.htmlFile;

    void (async () => {
      try {
        const fileContent = await apiFetch<FileContentResponse>(
          buildProjectFilePreviewPath(project.owner, project.name, htmlFile.path),
        );
        setActiveReport(
          parseProjectReportHtml(fileContent.content, {
            resolveImageSrc: (src) =>
              buildProjectFileUrl(
                project.owner,
                project.name,
                resolveRelativeReportAssetPath(htmlFile.path, src),
              ),
          }),
        );
      } catch {
        setActiveReport(null);
      }
    })();
  }, [activeExecutionGroup, project]);

  useEffect(() => {
    if (filePreview) {
      return;
    }

    if (!project || !detailModel) {
      setFilePreview(null);
      return;
    }

    const firstPreviewableSupportFile =
      detailModel.supportFiles.find((file) => isPreviewableTextFile(file)) ?? null;

    if (!firstPreviewableSupportFile) {
      setFilePreview(null);
      return;
    }

    void loadPreview(firstPreviewableSupportFile, "file", project.name, project.owner);
  }, [detailModel, filePreview, project]);

  const executionHref = project
    ? resolvedProjectRef
      ? buildProjectExecutionHref(resolvedProjectRef, {
          autoStart: !(project.active_run?.status === "queued" || project.active_run?.status === "running"),
        })
      : `/dashboard/project-execution/${encodeURIComponent(project.owner)}/${encodeURIComponent(project.name)}${
          project.active_run?.status === "queued" || project.active_run?.status === "running" ? "" : "?start=1"
        }`
    : null;

  useEffect(() => {
    if (project?.active_run?.status !== "queued" && project?.active_run?.status !== "running") {
      return;
    }

    let cancelled = false;

    async function refreshProjectState() {
      await loadProjectState(() => cancelled);
    }

    function handleVisibilityRefresh() {
      if (document.visibilityState === "visible") {
        void refreshProjectState();
      }
    }

    function handleWindowFocus() {
      void refreshProjectState();
    }

    const intervalId = window.setInterval(() => {
      void refreshProjectState();
    }, 5000);

    document.addEventListener("visibilitychange", handleVisibilityRefresh);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [project?.active_run?.status, owner, projectName, projectRef]);

  if (loading) {
    return <ProjectDetailLoadingState />;
  }

  if (error || !project || !detailModel) {
    return <ProjectDetailErrorState message={error ?? "El proyecto solicitado no existe."} />;
  }

  const statusMeta = getProjectStatusMeta(project.status, project.active_run);
  const projectReportHref =
    resolvedProjectRef && activeExecutionGroup?.htmlFile
      ? buildProjectReportHref(resolvedProjectRef, activeExecutionGroup.htmlFile.path)
      : activeExecutionGroup?.htmlFile
        ? `/dashboard/project-report/${encodeURIComponent(project.owner)}/${encodeURIComponent(project.name)}?path=${encodeURIComponent(activeExecutionGroup.htmlFile.path)}`
        : null;
  const accessRole =
    session?.user?.role === "admin"
      ? project.access_role === "owner"
        ? "owner"
        : "editor"
      : project.access_role ?? (session?.user?.username === project.owner ? "owner" : "viewer");
  const canEdit =
    session?.user?.role === "admin" || accessRole === "owner" || accessRole === "editor";
  const canRegenerate = session?.user?.username === project.owner;
  const activeDeliverables = activeExecutionGroup ? getExecutionDeliverables(activeExecutionGroup) : [];
  const { featuredDeliverable, secondaryDeliverables } =
    getProjectDeliverablesLayout(activeDeliverables);
  const downloadZipFile =
    activeDeliverables.find((file) => file.extension.toLowerCase() === ".zip") ??
    detailModel.executionGroups
      .flatMap((group) => getExecutionDeliverables(group))
      .find((file) => file.extension.toLowerCase() === ".zip") ??
    null;
  const htmlCount = detailModel.executionGroups.filter((group) => group.htmlFile).length;

  return (
    <div className="flex flex-col gap-6">
      <ProjectDetailHero accessRole={accessRole} canEdit={canEdit} project={project} teamCount={teams.length} />

      <ProjectQuickActions
        activeRun={project.active_run ?? null}
        activeDeliverablesCount={activeDeliverables.length}
        canRegenerate={canRegenerate}
        downloadZipFile={downloadZipFile}
        executionHref={executionHref}
        executionCount={detailModel.executionGroups.length}
        htmlCount={htmlCount}
        project={project}
        supportFileCount={detailModel.supportFiles.length + (detailModel.templateFile ? 1 : 0)}
      />

      <div className="grid items-stretch gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <ProjectSidebar
          activeExecutionGroup={activeExecutionGroup}
          executionGroups={detailModel.executionGroups}
          members={members}
          onSelectExecution={setActiveExecutionDirectory}
          project={project}
          statusBadgeClassName={statusMeta.badgeClassName}
          statusLabel={statusMeta.label}
          teams={teams}
        />

        <ProjectPrimaryReport
          activeDeliverables={activeDeliverables}
          activeExecutionGroup={activeExecutionGroup}
          activePreviewPath={activePrimaryPreviewPath}
          onSelectPreviewFile={(file) => setActivePrimaryPreviewPath(file.path)}
          preview={reportPreview}
          previewLoading={reportPreviewLoading}
          projectReportHref={projectReportHref}
        />
      </div>

      <ProjectResultsSections
        activeReport={activeReport}
        featuredDeliverable={featuredDeliverable}
        filePreview={filePreview}
        filePreviewLoading={filePreviewLoading}
        onPreviewFile={(file) => void loadPreview(file, "file")}
        owner={project.owner}
        project={project}
        projectRef={resolvedProjectRef}
        secondaryDeliverables={secondaryDeliverables}
        supportFiles={detailModel.supportFiles}
        templateFile={detailModel.templateFile}
      />
    </div>
  );
}
