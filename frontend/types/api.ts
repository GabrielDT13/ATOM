export type SessionUser = {
  id: string;
  email: string;
  username: string;
  role: "admin" | "user";
  first_name?: string | null;
  last_name?: string | null;
  department?: string | null;
  display_name?: string | null;
};

export type SessionResponse = {
  authenticated: boolean;
  user: SessionUser | null;
};

export type ProfilePreferences = {
  email_notifications: boolean;
  security_alerts: boolean;
  dark_mode: boolean;
  interface_language: "es" | "en";
};

export type ProfileActivityRecord = {
  kind: string;
  title: string;
  description: string;
  created_at: string;
};

export type ProfileSummary = {
  active_projects: number;
  collaborations: number;
  pending_reviews: number;
};

export type ProfileOwnedProject = {
  id: string;
  name: string;
  status: string;
  updated_at: string;
  member_count: number;
};

export type ProfileCollaborationProject = {
  project_id: string;
  project_name: string;
  project_status: string;
  member_role: string;
  member_created_at: string;
};

export type ProfileProjectsPreview = {
  owned: ProfileOwnedProject[];
  collaborations: ProfileCollaborationProject[];
};

export type ProfileRecord = {
  id: string;
  email: string;
  username: string;
  display_name: string;
  role: "admin" | "user";
  department?: string | null;
  bio?: string | null;
  joined_at: string;
  updated_at: string;
  preferences: ProfilePreferences;
  summary: ProfileSummary;
  activity: ProfileActivityRecord[];
  projects_preview: ProfileProjectsPreview;
};

export type ProfileMutationResponse = {
  success: boolean;
  message: string;
  profile: ProfileRecord | null;
};

export type AnalysisRunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type AnalysisRun = {
  id: string;
  project_id: string;
  project_name: string;
  project_owner_username: string;
  requested_by_user_id: string;
  requested_by_username: string;
  status: AnalysisRunStatus;
  total_designs: number;
  processed_designs: number;
  successful_designs: number;
  failed_designs: number;
  current_design_id?: string | null;
  current_analysis_type?: string | null;
  error_message?: string | null;
  trigger_source: string;
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AnalysisRunMutationResponse = {
  created: boolean;
  run: AnalysisRun;
};

export type AnalysisRunEventType =
  | "run_started"
  | "run_completed"
  | "run_failed"
  | "design_started"
  | "design_completed"
  | "design_failed"
  | "cleanup_completed"
  | "cleanup_failed"
  | "log";

export type AnalysisRunEvent = {
  id: number;
  run_id: string;
  event_type: AnalysisRunEventType;
  level: "error" | "info" | "success" | "warning" | string;
  message: string;
  analysis_type?: string | null;
  design_id?: string | null;
  current_index?: number | null;
  total_designs?: number | null;
  duration_seconds?: number | null;
  exit_code?: number | null;
  created_at?: string | null;
};

export type AnalysisRunCollectionResponse = {
  items: AnalysisRun[];
};

export type AnalysisRunEventCollectionResponse = {
  items: AnalysisRunEvent[];
};

export type SidebarLink = {
  name: string;
  url: string;
  admin_only?: boolean;
};

export type SidebarTreeItem = {
  name: string;
  type: "folder" | "file";
  path: string;
  project_name?: string | null;
  username?: string | null;
  html_exists?: boolean | null;
  children?: SidebarTreeItem[] | null;
};

export type SidebarProjectItem = {
  access_role?: ProjectMemberRole | null;
  active_run?: AnalysisRun | null;
  can_run: boolean;
  file_count: number;
  html_count: number;
  id?: string | null;
  name: string;
  owner: string;
  route_ref: string;
  slug?: string | null;
  status: ProjectStatus;
  updated_at: string;
};

export type SidebarResponse<T> = {
  title: string;
  items: T[];
};

export type NotificationRecord = {
  action_label?: string | null;
  action_url?: string | null;
  actor_display_name?: string | null;
  actor_user_id?: string | null;
  actor_username?: string | null;
  created_at?: string | null;
  id: number;
  is_read: boolean;
  message: string;
  project_id?: string | null;
  project_name?: string | null;
  project_owner_username?: string | null;
  project_slug?: string | null;
  read_at?: string | null;
  title: string;
  type: string;
  user_id: string;
};

export type NotificationCollectionResponse = {
  items: NotificationRecord[];
  unread_count: number;
};

export type NotificationMutationResponse = {
  success: boolean;
  unread_count: number;
  updated_count: number;
};

export type UserRecord = {
  id: string;
  username: string;
  email: string;
  role: "admin" | "user";
  first_name?: string | null;
  last_name?: string | null;
  department?: string | null;
  display_name?: string | null;
};

export type DepartmentRecord = {
  id: string;
  name: string;
  slug: string;
};

export type MutationResponse = {
  success: boolean;
  message: string;
  temporary_password?: string | null;
  user?: UserRecord | null;
};

export type ProjectStatus = "configured" | "empty" | "results";

export type ProjectFileKind = "additional" | "result" | "template";

export type ProjectFileEntry = {
  extension: string;
  kind: ProjectFileKind;
  name: string;
  path: string;
  size_bytes: number;
};

export type ProjectSummary = {
  access_role?: ProjectMemberRole | null;
  active_run?: AnalysisRun | null;
  additional_files: string[];
  created_at: string;
  file_count: number;
  files: string[];
  html_files: string[];
  id?: string | null;
  name: string;
  owner: string;
  slug?: string | null;
  status: ProjectStatus;
  template_file: string | null;
  updated_at: string;
};

export type ProjectMapResponse = {
  items: ProjectSummary[];
  projects: Record<string, string[]>;
};

export type ProjectDetails = ProjectSummary & {
  file_entries: ProjectFileEntry[];
};

export type ProjectMutationResponse = {
  success: boolean;
  message: string;
  project: ProjectDetails | null;
};

export type ProjectMemberRole = "editor" | "owner" | "viewer";

export type ProjectMemberRecord = {
  avatar_url?: string | null;
  bio?: string | null;
  department?: string | null;
  display_name: string;
  email?: string | null;
  id: string;
  is_owner: boolean;
  member_role: ProjectMemberRole;
  username: string;
};

export type ProjectMembersResponse = {
  members: ProjectMemberRecord[];
};

export type ProjectShareCandidate = {
  avatar_url?: string | null;
  bio?: string | null;
  department?: string | null;
  display_name: string;
  email?: string | null;
  id: string;
  username: string;
};

export type ProjectShareCandidatesResponse = {
  users: ProjectShareCandidate[];
};

export type ProjectMemberMutationResponse = {
  success: boolean;
  member: ProjectMemberRecord | null;
  message: string;
};

export type FileContentResponse = {
  content: string;
  truncated: boolean;
};

export type AnalysisStreamEvent =
  | {
      type: "run_started";
      project_name: string;
      timestamp: string;
      total_designs: number;
    }
  | {
      type: "run_completed";
      project_name: string;
      timestamp: string;
      total_designs: number;
      processed_designs: number;
    }
  | {
      type: "run_failed";
      message: string;
      project_name?: string;
      timestamp: string;
    }
  | {
      type: "design_started";
      analysis_type: string;
      current_index: number;
      design_id: string;
      message: string;
      timestamp: string;
      total_designs: number;
    }
  | {
      type: "design_completed";
      analysis_type: string;
      current_index: number;
      design_id: string;
      duration_seconds: number;
      message: string;
      timestamp: string;
      total_designs: number;
    }
  | {
      type: "design_failed";
      analysis_type: string;
      current_index: number;
      design_id: string;
      message: string;
      timestamp: string;
      total_designs: number;
      duration_seconds?: number;
      exit_code?: number;
    }
  | {
      type: "cleanup_completed" | "cleanup_failed";
      analysis_type: string;
      current_index: number;
      design_id: string;
      message: string;
      timestamp: string;
      total_designs: number;
    }
  | {
      type: "log";
      message: string;
      level: "error" | "info" | "warning";
      timestamp: string;
      analysis_type?: string;
      current_index?: number;
      design_id?: string;
      total_designs?: number;
    };

export type DashboardSummary = {
  total_projects: number;
  results_ready: number;
  pending_analysis: number;
  empty_projects: number;
  total_files: number;
  example_files: number;
  workflow_count: number;
  distinct_owners: number;
  completion_rate: number;
};

export type DashboardTimelinePoint = {
  bucket_start: string;
  label: string;
  completed_analyses: number;
  total_events: number;
};

export type DashboardActivitySummary = {
  total_events: number;
  analyses_started: number;
  analyses_completed: number;
  analyses_failed: number;
  project_events: number;
  last_event_at: string | null;
};

export type DashboardStatusBreakdown = {
  status: ProjectStatus;
  label: string;
  value: number;
};

export type DashboardProjectHighlight = {
  access_role?: ProjectMemberRole | null;
  active_run?: AnalysisRun | null;
  file_count: number;
  highlight_files: string[];
  name: string;
  owner: string;
  result_count: number;
  status: ProjectStatus;
  template_file: string | null;
  updated_at: string;
};

export type DashboardActivityItem = {
  kind: "analysis" | "project" | "result";
  status: "info" | "running" | "success" | "warning";
  title: string;
  description: string;
  created_at: string;
  project_name?: string | null;
  owner?: string | null;
  analysis_type?: string | null;
  design_id?: string | null;
};

export type DashboardWorkflow = {
  key: string;
  title: string;
  description: string;
  image_path: string;
  script_name: string;
  project_matches: number;
};

export type DashboardExampleFile = {
  title: string;
  description: string;
  kind: "template" | "counts" | "other";
  name: string;
  relative_path: string;
  size_bytes: number;
  updated_at: string;
  public_url: string;
};

export type DashboardFileBreakdown = {
  additional: number;
  results: number;
  templates: number;
};

export type DashboardAccessSummary = {
  editable_projects: number;
  owned_projects: number;
  shared_projects: number;
};

export type DashboardQuickStartStep = {
  description: string;
  step: number;
  title: string;
};

export type DashboardOverview = {
  access_summary: DashboardAccessSummary;
  activity_summary: DashboardActivitySummary;
  summary: DashboardSummary;
  activity_timeline: DashboardTimelinePoint[];
  file_breakdown: DashboardFileBreakdown;
  status_breakdown: DashboardStatusBreakdown[];
  featured_projects: DashboardProjectHighlight[];
  recent_activity: DashboardActivityItem[];
  quick_start_steps: DashboardQuickStartStep[];
  workflows: DashboardWorkflow[];
  example_library: DashboardExampleFile[];
};
