import { getDatabase } from "./db.js";
import { listContainers } from "./docker.js";

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

export function getScheduledTasks(): ScheduledTask[] {
  return getDatabase()
    .prepare("SELECT * FROM scheduled_tasks ORDER BY name")
    .all() as ScheduledTask[];
}

export function createScheduledTask(
  name: string,
  cron: string,
  action: string,
  target: string,
): ScheduledTask {
  const info = getDatabase()
    .prepare("INSERT INTO scheduled_tasks (name, cron, action, target) VALUES (?, ?, ?, ?)")
    .run(name, cron, action, target);
  return getDatabase()
    .prepare("SELECT * FROM scheduled_tasks WHERE id = ?")
    .get(info.lastInsertRowid) as ScheduledTask;
}

export function deleteScheduledTask(id: number): void {
  getDatabase().prepare("DELETE FROM scheduled_tasks WHERE id = ?").run(id);
}

export function toggleScheduledTask(id: number, enabled: boolean): void {
  getDatabase()
    .prepare("UPDATE scheduled_tasks SET enabled = ? WHERE id = ?")
    .run(enabled ? 1 : 0, id);
}

export function updateTaskLastRun(id: number): void {
  getDatabase()
    .prepare("UPDATE scheduled_tasks SET last_run = datetime('now') WHERE id = ?")
    .run(id);
}

// Simple interval matcher: supports "every:Nm" (minutes) or "every:Nh" (hours)
export function shouldRunTask(task: ScheduledTask): boolean {
  if (!task.enabled) return false;
  const cron = task.cron.trim();

  const minMatch = cron.match(/^every:(\d+)m$/);
  const hourMatch = cron.match(/^every:(\d+)h$/);

  if (!minMatch && !hourMatch) return false;

  const intervalMs = minMatch
    ? parseInt(minMatch[1], 10) * 60 * 1000
    : parseInt(hourMatch![1], 10) * 60 * 60 * 1000;

  if (!task.last_run) return true;
  const lastRun = new Date(task.last_run).getTime();
  return Date.now() - lastRun >= intervalMs;
}

export async function checkImageUpdates(): Promise<
  Array<{ id: string; name: string; image: string; updateAvailable: boolean }>
> {
  const containers = await listContainers({ all: false });
  return containers.map((c) => ({
    id: c.id,
    name: c.name,
    image: c.image,
    updateAvailable: false, // digest comparison would need registry API
  }));
}
