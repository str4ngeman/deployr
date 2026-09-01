export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  modified?: string;
}

export interface FileListResponse {
  path: string;
  entries: FileEntry[];
}

export interface FileReadResponse {
  path: string;
  content: string;
  size: number;
  modified: string;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...options });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data as T;
}

export function listFiles(dirPath = ""): Promise<FileListResponse> {
  const params = new URLSearchParams();
  if (dirPath) params.set("path", dirPath);
  return apiFetch(`/api/files/list?${params}`);
}

export function readFile(filePath: string): Promise<FileReadResponse> {
  const params = new URLSearchParams({ path: filePath });
  return apiFetch(`/api/files/read?${params}`);
}

export function writeFile(
  filePath: string,
  content: string,
): Promise<{ path: string; size: number; modified: string }> {
  return apiFetch("/api/files/write", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: filePath, content }),
  });
}

export function createFile(
  filePath: string,
): Promise<{ path: string; size: number; modified: string }> {
  return apiFetch("/api/files/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: filePath }),
  });
}

export function createDirectory(dirPath: string): Promise<{ path: string }> {
  return apiFetch("/api/files/mkdir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: dirPath }),
  });
}

export function renameItem(
  itemPath: string,
  newName: string,
): Promise<{ path: string; oldPath: string }> {
  return apiFetch("/api/files/rename", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: itemPath, newName }),
  });
}

export function copyFile(
  itemPath: string,
  destPath?: string,
): Promise<{ path: string; size: number; modified: string }> {
  return apiFetch("/api/files/copy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: itemPath, destPath }),
  });
}

export function deleteItem(itemPath: string): Promise<{ path: string }> {
  const params = new URLSearchParams({ path: itemPath });
  return apiFetch(`/api/files/delete?${params}`, { method: "DELETE" });
}

export function getHealth(): Promise<{
  status: string;
  fileRoot: string;
  port: number;
  docker: { enabled: boolean; connected: boolean };
}> {
  return apiFetch("/api/health");
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ports: string;
  isGhcr: boolean;
  hidden?: boolean;
}

export function listContainers(options?: {
  all?: boolean;
  includeHidden?: boolean;
}): Promise<{ containers: ContainerInfo[] }> {
  const params = new URLSearchParams();
  if (options?.all) params.set("all", "true");
  if (options?.includeHidden) params.set("includeHidden", "true");
  const query = params.toString();
  return apiFetch(`/api/docker/containers${query ? `?${query}` : ""}`);
}

export interface ContainerDetails {
  id: string;
  name: string;
  image: string;
  state: string;
  running: boolean;
  status: string;
  created: string;
  startedAt: string;
  finishedAt: string;
  restartCount: number;
  platform: string;
  ports: Array<{ host: string; container: string }>;
  labels: Record<string, string>;
  envCount: number;
  mounts: Array<{ source: string; destination: string; mode: string }>;
  isGhcr: boolean;
}

export function getContainerDetails(containerId: string): Promise<ContainerDetails> {
  return apiFetch(`/api/docker/containers/${containerId}`);
}

export function getContainerLogs(
  containerId: string,
  tail = 100,
): Promise<{ logs: string }> {
  const params = new URLSearchParams({ tail: String(tail) });
  return apiFetch(`/api/docker/containers/${containerId}/logs?${params}`);
}

export function streamContainerLogs(
  containerId: string,
  tail: number,
  onData: (text: string) => void,
  onError: (error: string) => void,
): () => void {
  const params = new URLSearchParams({ tail: String(tail) });
  const source = new EventSource(
    `/api/docker/containers/${containerId}/logs/stream?${params}`,
  );

  source.onmessage = (event) => {
    const data = JSON.parse(event.data) as { text?: string };
    if (data.text) onData(data.text);
  };

  source.addEventListener("error", (event) => {
    if (event instanceof MessageEvent && event.data) {
      const data = JSON.parse(event.data) as { error?: string };
      if (data.error) onError(data.error);
    }
  });

  source.onerror = () => {
    if (source.readyState === EventSource.CLOSED) return;
    onError("Log stream disconnected");
    source.close();
  };

  return () => source.close();
}

export function getDockerStatus(): Promise<{ enabled: boolean; connected: boolean }> {
  return apiFetch("/api/docker/status");
}

export function restartContainer(containerId: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/docker/containers/${containerId}/restart`, { method: "POST" });
}

export function stopContainer(containerId: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/docker/containers/${containerId}/stop`, { method: "POST" });
}

export function startContainer(containerId: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/docker/containers/${containerId}/start`, { method: "POST" });
}

export function pullContainerImage(
  containerId: string,
): Promise<{ ok: boolean; message: string }> {
  return apiFetch(`/api/docker/containers/${containerId}/pull`, { method: "POST" });
}

export function recreateContainer(
  containerId: string,
): Promise<{ ok: boolean; message: string }> {
  return apiFetch(`/api/docker/containers/${containerId}/recreate`, { method: "POST" });
}

export interface SettingItem {
  key: string;
  label: string;
  description: string;
  type: "string" | "number" | "boolean" | "secret";
  group: string;
  defaultValue: string;
  value: string;
  masked?: boolean;
}

export interface HiddenContainer {
  container_id: string;
  container_name: string;
  hidden_at: string;
}

export function getSettings(): Promise<{ settings: SettingItem[] }> {
  return apiFetch("/api/settings");
}

export function updateSettings(
  updates: Record<string, string>,
): Promise<{ settings: SettingItem[] }> {
  return apiFetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
}

export function getHiddenContainers(): Promise<{ containers: HiddenContainer[] }> {
  return apiFetch("/api/settings/hidden-containers");
}

export function hideContainer(
  containerId: string,
  containerName: string,
): Promise<{ ok: boolean }> {
  return apiFetch("/api/settings/hidden-containers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ containerId, containerName }),
  });
}

export function unhideContainer(containerId: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/settings/hidden-containers/${containerId}`, {
    method: "DELETE",
  });
}

// Auth
export function getAuthStatus(): Promise<{
  enabled: boolean;
  username: string;
  needsSetup: boolean;
}> {
  return apiFetch("/api/auth/status");
}

export function getAuthSession(): Promise<{
  authenticated: boolean;
  username: string;
}> {
  return apiFetch("/api/auth/session", { credentials: "include" });
}

export function login(username: string, password: string): Promise<{ ok: boolean }> {
  return apiFetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

export function logout(): Promise<{ ok: boolean }> {
  return apiFetch("/api/auth/logout", { method: "POST" });
}

export function setupAuth(username: string, password: string): Promise<{ ok: boolean }> {
  return apiFetch("/api/auth/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

// Compose
export interface ComposeProject {
  name: string;
  path: string;
  composeFile: string;
  services: string[];
  pendingDeploy?: boolean;
  git?: GitRepo | null;
}

export function listComposeProjects(): Promise<{ projects: ComposeProject[] }> {
  return apiFetch("/api/compose/projects");
}

function composeAction(projectPath: string, action: string): Promise<{ ok: boolean; message: string }> {
  return apiFetch(`/api/compose/projects/${encodeURIComponent(projectPath)}/${action}`, {
    method: "POST",
  });
}

export const composePull = (p: string) => composeAction(p, "pull");
export const composeUp = (p: string) => composeAction(p, "up");
export const composeDown = (p: string) => composeAction(p, "down");
export const composeRestart = (p: string) => composeAction(p, "restart");
export const composeDeploy = (p: string) => composeAction(p, "deploy");

// Monitor
export interface ContainerStat {
  id: string;
  name: string;
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
}

export interface DiskEntry {
  path: string;
  size: number;
  type: "directory" | "file";
}

export interface HealthCheck {
  container_id: string;
  container_name: string;
  healthy: boolean;
  checked_at: string;
}

export interface GitRepo {
  path: string;
  isRepo: boolean;
  branch?: string;
  commit?: string;
  dirty?: boolean;
  remote?: string;
  behindRemote?: number;
  aheadRemote?: number;
  pendingDeploy?: boolean;
}

export function getContainerStats(): Promise<{ stats: ContainerStat[] }> {
  return apiFetch("/api/monitor/stats");
}

export function getDiskUsage(path = ""): Promise<{
  entries: DiskEntry[];
  system: { total: number; used: number; available: number };
}> {
  const params = path ? `?path=${encodeURIComponent(path)}` : "";
  return apiFetch(`/api/monitor/disk${params}`);
}

export function getHealthChecks(): Promise<{ checks: HealthCheck[] }> {
  return apiFetch("/api/monitor/health");
}

export function runHealthChecks(): Promise<{ checks: HealthCheck[] }> {
  return apiFetch("/api/monitor/health/run", { method: "POST" });
}

export function getGitRepos(): Promise<{ repos: GitRepo[] }> {
  return apiFetch("/api/monitor/git");
}

// Backups
export interface BackupEntry {
  id: number;
  name: string;
  source_path: string;
  filename: string;
  size: number;
  created_at: string;
}

export function listBackups(): Promise<{ backups: BackupEntry[] }> {
  return apiFetch("/api/backups");
}

export function listBackupPaths(): Promise<{ paths: string[] }> {
  return apiFetch("/api/backups/paths");
}

export function createBackup(path: string): Promise<{ backup: BackupEntry }> {
  return apiFetch("/api/backups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
}

export function deleteBackup(id: number): Promise<{ ok: boolean }> {
  return apiFetch(`/api/backups/${id}`, { method: "DELETE" });
}

export async function downloadBackup(id: number, filename: string): Promise<void> {
  const res = await fetch(`/api/backups/${id}/download`, { credentials: "include" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Download failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function restoreBackup(id: number): Promise<{ ok: boolean; backup: BackupEntry }> {
  return apiFetch(`/api/backups/${id}/restore`, { method: "POST" });
}

// Scheduler
export interface ScheduledTask {
  id: number;
  name: string;
  cron: string;
  action: string;
  target: string;
  enabled: number;
  last_run: string | null;
  created_at: string;
}

export function getScheduledTasks(): Promise<{ tasks: ScheduledTask[] }> {
  return apiFetch("/api/scheduler");
}

export function createScheduledTask(data: {
  name: string;
  cron: string;
  action: string;
  target: string;
}): Promise<{ task: ScheduledTask }> {
  return apiFetch("/api/scheduler", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function deleteScheduledTask(id: number): Promise<{ ok: boolean }> {
  return apiFetch(`/api/scheduler/${id}`, { method: "DELETE" });
}

export function toggleScheduledTask(id: number, enabled: boolean): Promise<{ ok: boolean }> {
  return apiFetch(`/api/scheduler/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
}

// Activity
export interface ActivityEntry {
  id: number;
  type: string;
  action: string;
  target: string;
  status: string;
  message: string;
  created_at: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  read: number;
  created_at: string;
}

export function getActivityHistory(limit = 50): Promise<{ activity: ActivityEntry[] }> {
  return apiFetch(`/api/activity/history?limit=${limit}`);
}

export function getNotifications(limit = 30): Promise<{
  notifications: Notification[];
  unread: number;
}> {
  return apiFetch(`/api/activity/notifications?limit=${limit}`);
}

export function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  return apiFetch("/api/activity/notifications/read-all", { method: "POST" });
}

export function markNotificationRead(id: number): Promise<{ ok: boolean }> {
  return apiFetch(`/api/activity/notifications/${id}/read`, { method: "POST" });
}

// Env files
export interface EnvVar {
  key: string;
  value: string;
}

export function findEnvFiles(): Promise<{ files: string[] }> {
  return apiFetch("/api/env/files");
}

export function readEnvFile(path: string): Promise<{ path: string; vars: EnvVar[] }> {
  return apiFetch(`/api/env/read?path=${encodeURIComponent(path)}`);
}

export function writeEnvFile(path: string, vars: EnvVar[]): Promise<{ ok: boolean }> {
  return apiFetch("/api/env/write", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, vars }),
  });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
