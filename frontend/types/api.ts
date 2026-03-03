export type SessionUser = {
  username: string;
  role: "admin" | "user";
};

export type SessionResponse = {
  authenticated: boolean;
  user: SessionUser | null;
};

export type MessageItem = {
  id: number;
  text: string;
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
  username: string;
  email: string;
  role: "admin" | "user";
};

export type MutationResponse = {
  success: boolean;
  message: string;
};

export type ProjectMapResponse = {
  projects: Record<string, string[]>;
};

export type ProjectDetails = {
  owner: string;
  name: string;
  files: string[];
};

export type FileContentResponse = {
  content: string;
  truncated: boolean;
};
