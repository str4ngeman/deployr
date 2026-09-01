import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import Docker from "dockerode";
import { getFileRoot } from "./paths.js";
import { getDatabase } from "./db.js";
import { isDockerEnabled } from "./docker.js";

const execFileAsync = promisify(execFile);

let docker: Docker | null = null;
function getClient(): Docker | null {
  if (!isDockerEnabled()) return null;
  if (!docker) docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || "/var/run/docker.sock" });
  return docker;
}

export interface ContainerStats {
  id: string;
  name: string;
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
}

export async function getContainerStats(): Promise<ContainerStats[]> {
  const client = getClient();
  if (!client) return [];

  const containers = await client.listContainers();
  const stats: ContainerStats[] = [];

  for (const c of containers.slice(0, 20)) {
    try {
      const container = client.getContainer(c.Id);
      const s = await container.stats({ stream: false });
      const name = c.Names[0]?.replace(/^\//, "") || c.Id.slice(0, 12);

      const cpuDelta =
        s.cpu_stats.cpu_usage.total_usage - (s.precpu_stats.cpu_usage?.total_usage || 0);
      const systemDelta =
        s.cpu_stats.system_cpu_usage - (s.precpu_stats.system_cpu_usage || 0);
      const cpuCount = s.cpu_stats.online_cpus || 1;
      const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * cpuCount * 100 : 0;

      const memUsage = s.memory_stats.usage || 0;
      const memLimit = s.memory_stats.limit || 1;
      const memPercent = (memUsage / memLimit) * 100;

      stats.push({
        id: c.Id,
        name,
        cpuPercent: Math.round(cpuPercent * 10) / 10,
        memoryUsage: memUsage,
        memoryLimit: memLimit,
        memoryPercent: Math.round(memPercent * 10) / 10,
      });
    } catch {
      // container may have stopped
    }
  }
  return stats;
}

export interface DiskEntry {
  path: string;
  size: number;
  type: "directory" | "file";
}

export async function getDiskUsage(subPath = "", limit = 20): Promise<DiskEntry[]> {
  const root = path.join(getFileRoot(), subPath);
  const entries: DiskEntry[] = [];

  let items;
  try {
    items = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const item of items) {
    if (item.name.startsWith(".")) continue;
    const full = path.join(root, item.name);
    const rel = subPath ? `${subPath}/${item.name}` : item.name;
    try {
      if (item.isDirectory()) {
        const { stdout } = await execFileAsync("du", ["-sb", full], { timeout: 10000 });
        const size = parseInt(stdout.split("\t")[0], 10) || 0;
        entries.push({ path: rel, size, type: "directory" });
      } else {
        const stat = await fs.stat(full);
        entries.push({ path: rel, size: stat.size, type: "file" });
      }
    } catch {
      // skip inaccessible
    }
  }

  return entries.sort((a, b) => b.size - a.size).slice(0, limit);
}

export interface HealthStatus {
  container_id: string;
  container_name: string;
  state: string;
  healthy: boolean;
  checked_at: string;
}

export async function runHealthChecks(): Promise<HealthStatus[]> {
  const client = getClient();
  if (!client) return [];

  const containers = await client.listContainers({ all: true });
  const results: HealthStatus[] = [];
  const now = new Date().toISOString();

  for (const c of containers) {
    const name = c.Names[0]?.replace(/^\//, "") || c.Id.slice(0, 12);
    const healthy = c.State === "running";
    results.push({
      container_id: c.Id,
      container_name: name,
      state: c.State,
      healthy,
      checked_at: now,
    });

    getDatabase()
      .prepare(
        `INSERT INTO health_checks (container_id, container_name, state, healthy, checked_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(container_id) DO UPDATE SET
           container_name = excluded.container_name,
           state = excluded.state,
           healthy = excluded.healthy,
           checked_at = excluded.checked_at`,
      )
      .run(c.Id, name, c.State, healthy ? 1 : 0, now);
  }

  return results;
}

export function getHealthStatuses(): HealthStatus[] {
  return getDatabase()
    .prepare(
      "SELECT container_id, container_name, state, healthy, checked_at FROM health_checks ORDER BY container_name",
    )
    .all()
    .map((r) => ({
      ...(r as HealthStatus),
      healthy: Boolean((r as { healthy: number }).healthy),
    }));
}

export async function getSystemInfo(): Promise<{
  total: number;
  used: number;
  available: number;
}> {
  try {
    const { stdout } = await execFileAsync("df", ["-B1", getFileRoot()], { timeout: 5000 });
    const line = stdout.trim().split("\n")[1];
    if (!line) return { total: 0, used: 0, available: 0 };
    const parts = line.split(/\s+/);
    return {
      total: parseInt(parts[1], 10) || 0,
      used: parseInt(parts[2], 10) || 0,
      available: parseInt(parts[3], 10) || 0,
    };
  } catch {
    return { total: 0, used: 0, available: 0 };
  }
}
