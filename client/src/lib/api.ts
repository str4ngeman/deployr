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

export function getHealth(): Promise<{
  status: string;
  fileRoot: string;
  port: number;
}> {
  return apiFetch("/api/health");
}
