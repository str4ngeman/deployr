import path from "path";

const FILE_ROOT = path.resolve(process.env.FILE_ROOT || "/opt");

export function getFileRoot(): string {
  return FILE_ROOT;
}

/**
 * Resolve a user-provided path and ensure it stays within FILE_ROOT.
 * Returns null if the path escapes the root.
 */
export function resolveSafePath(userPath: string): string | null {
  const normalized = path.normalize(userPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const resolved = path.resolve(FILE_ROOT, normalized);

  if (!resolved.startsWith(FILE_ROOT + path.sep) && resolved !== FILE_ROOT) {
    return null;
  }

  return resolved;
}

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  modified?: string;
}
