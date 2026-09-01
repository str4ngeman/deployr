import { getScheduledTasks, shouldRunTask, updateTaskLastRun } from "../lib/scheduler.js";
import { composePull, composeUp } from "../lib/compose.js";
import { runHealthChecks } from "../lib/monitor.js";
import { addNotification, logActivity } from "../lib/activity.js";
import { getSettingNumber } from "../lib/db.js";
import { cleanupExpiredSessions } from "../lib/auth.js";

let healthInterval: ReturnType<typeof setInterval> | null = null;
let schedulerInterval: ReturnType<typeof setInterval> | null = null;

async function executeTask(action: string, target: string): Promise<void> {
  switch (action) {
    case "compose-pull":
      await composePull(target);
      break;
    case "compose-up":
      await composeUp(target);
      break;
    case "health-check":
      await runHealthChecks();
      break;
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

function runScheduler(): void {
  const tasks = getScheduledTasks();
  for (const task of tasks) {
    if (!shouldRunTask(task)) continue;
    executeTask(task.action, task.target)
      .then(() => {
        updateTaskLastRun(task.id);
        logActivity("schedule", task.action, task.target, "success", task.name);
        addNotification(`Scheduled: ${task.name}`, task.target, "success");
      })
      .catch((err) => {
        logActivity("schedule", task.action, task.target, "error", err.message);
        addNotification(`Schedule failed: ${task.name}`, err.message, "error");
      });
  }
}

export function startBackgroundServices(): void {
  cleanupExpiredSessions();

  const healthSeconds = getSettingNumber("monitor.health_interval", 60);
  healthInterval = setInterval(async () => {
    try {
      const checks = await runHealthChecks();
      const unhealthy = checks.filter((c) => !c.healthy);
      if (unhealthy.length > 0) {
        addNotification(
          `${unhealthy.length} container(s) unhealthy`,
          unhealthy.map((c) => c.container_name).join(", "),
          "warning",
        );
      }
    } catch {
      // ignore
    }
  }, healthSeconds * 1000);

  schedulerInterval = setInterval(runScheduler, 60 * 1000);

  runHealthChecks().catch(() => {});
}

export function stopBackgroundServices(): void {
  if (healthInterval) clearInterval(healthInterval);
  if (schedulerInterval) clearInterval(schedulerInterval);
}
