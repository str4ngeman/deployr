import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { getFileRoot, resolveSafePath } from "./paths.js";

const execFileAsync = promisify(execFile);

export interface GitInfo {
  path: string;
  isRepo: boolean;
  branch?: string;
  commit?: string;
  remote?: string;
  dirty?: boolean;
}

export async function getGitInfo(dirPath: string): Promise<GitInfo> {
  const resolved = resolveSafePath(dirPath);
  if (!resolved) return { path: dirPath, isRepo: false };

  const gitDir = path.join(resolved, ".git");
  try {
    await execFileAsync("git", ["rev-parse", "--git-dir"], { cwd: resolved, timeout: 5000 });
  } catch {
    return { path: dirPath, isRepo: false };
  }

  const run = async (args: string[]) => {
    const { stdout } = await execFileAsync("git", args, { cwd: resolved, timeout: 5000 });
    return stdout.trim();
  };

  try {
    const [branch, commit, remote, status] = await Promise.all([
      run(["rev-parse", "--abbrev-ref", "HEAD"]),
      run(["rev-parse", "--short", "HEAD"]),
      run(["remote", "get-url", "origin"]).catch(() => ""),
      run(["status", "--porcelain"]),
    ]);

    return {
      path: dirPath,
      isRepo: true,
      branch,
      commit,
      remote: remote || undefined,
      dirty: status.length > 0,
    };
  } catch {
    return { path: dirPath, isRepo: true };
  }
}

export async function scanGitRepos(): Promise<GitInfo[]> {
  const root = getFileRoot();
  const { readdir } = await import("fs/promises");
  const entries = await readdir(root, { withFileTypes: true });
  const repos: GitInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const info = await getGitInfo(entry.name);
    if (info.isRepo) repos.push(info);
  }

  return repos;
}
