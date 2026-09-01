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
}

export function listContainers(): Promise<{ containers: ContainerInfo[] }> {
  return apiFetch("/api/docker/containers");
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
