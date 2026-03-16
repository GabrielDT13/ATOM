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

export type SidebarResponse<T> = {
  title: string;
  items: T[];
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
  additional_files: string[];
  created_at: string;
  file_count: number;
  files: string[];
  html_files: string[];
  name: string;
  owner: string;
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
  label: string;
  completed_analyses: number;
  total_events: number;
};

export type DashboardStatusBreakdown = {
  status: ProjectStatus;
  label: string;
  value: number;
};

export type DashboardProjectHighlight = {
  access_role?: ProjectMemberRole | null;
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
  title: string;
  description: string;
  created_at: string;
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
