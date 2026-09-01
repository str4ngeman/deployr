import { Router, type Request, type Response } from "express";
import {
  getContainerStats,
  getDiskUsage,
  getHealthStatuses,
  runHealthChecks,
  getSystemInfo,
} from "../lib/monitor.js";
import { scanGitRepos } from "../lib/git-info.js";
import { checkImageUpdates } from "../lib/scheduler.js";

const router = Router();

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const stats = await getContainerStats();
    res.json({ stats });
  } catch {
    res.status(500).json({ error: "Failed to get stats" });
  }
});

router.get("/disk", async (req: Request, res: Response) => {
  try {
    const path = (req.query.path as string) || "";
    const [entries, system] = await Promise.all([getDiskUsage(path), getSystemInfo()]);
    res.json({ entries, system });
  } catch {
    res.status(500).json({ error: "Failed to get disk usage" });
  }
});

router.get("/health", (_req: Request, res: Response) => {
  res.json({ checks: getHealthStatuses() });
});

router.post("/health/run", async (_req: Request, res: Response) => {
  try {
    const checks = await runHealthChecks();
    res.json({ checks });
  } catch {
    res.status(500).json({ error: "Health check failed" });
  }
});

router.get("/git", async (_req: Request, res: Response) => {
  try {
    const repos = await scanGitRepos();
    res.json({ repos });
  } catch {
    res.status(500).json({ error: "Failed to scan git repos" });
  }
});

router.get("/updates", async (_req: Request, res: Response) => {
  try {
    const updates = await checkImageUpdates();
    res.json({ updates });
  } catch {
    res.status(500).json({ error: "Failed to check updates" });
  }
});

export default router;
