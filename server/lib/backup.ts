import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { getSetting } from "./db.js";
import { getDatabase } from "./db.js";
import { getFileRoot, resolveSafePath } from "./paths.js";

const execFileAsync = promisify(execFile);

function getBackupDir(): string {
  const dir = getSetting("backup.directory") || "./data/backups";
  return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
}

export interface BackupEntry {
  id: number;
  name: string;
  source_path: string;
  filename: string;
  size: number;
  created_at: string;
}

export async function createBackup(sourcePath: string): Promise<BackupEntry> {
  const resolved = resolveSafePath(sourcePath);
  if (!resolved) throw new Error("Invalid path");

  const backupDir = getBackupDir();
  await fs.mkdir(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = sourcePath.replace(/\//g, "_") || "root";
  const filename = `${baseName}_${timestamp}.tar.gz`;
  const archivePath = path.join(backupDir, filename);

  await execFileAsync("tar", ["-czf", archivePath, "-C", path.dirname(resolved), path.basename(resolved)], {
    timeout: 300000,
  });

  const stat = await fs.stat(archivePath);
  const info = getDatabase()
    .prepare("INSERT INTO backups (name, source_path, filename, size) VALUES (?, ?, ?, ?)")
    .run(baseName, sourcePath, filename, stat.size);

  return getDatabase()
    .prepare("SELECT id, name, source_path, filename, size, created_at FROM backups WHERE id = ?")
    .get(info.lastInsertRowid) as BackupEntry;
}

export function listBackups(): BackupEntry[] {
  return getDatabase()
    .prepare(
      "SELECT id, name, source_path, filename, size, created_at FROM backups ORDER BY id DESC LIMIT 50",
    )
    .all() as BackupEntry[];
}

export async function deleteBackup(id: number): Promise<void> {
  const row = getDatabase()
    .prepare("SELECT filename FROM backups WHERE id = ?")
    .get(id) as { filename: string } | undefined;
  if (!row) throw new Error("Backup not found");

  const filePath = path.join(getBackupDir(), row.filename);
  await fs.unlink(filePath).catch(() => {});
  getDatabase().prepare("DELETE FROM backups WHERE id = ?").run(id);
}

export function getBackupFilePath(filename: string): string {
  return path.join(getBackupDir(), filename);
}

export async function listBackupablePaths(): Promise<string[]> {
  const root = getFileRoot();
  const entries = await fs.readdir(root, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}
