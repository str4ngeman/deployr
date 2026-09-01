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
  const res = await fetch(url, options);
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
