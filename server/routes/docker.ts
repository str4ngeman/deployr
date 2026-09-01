import { Router, type Request, type Response } from "express";
import {
  getHiddenContainerIds,
} from "../lib/db.js";
import { logActivity, addNotification } from "../lib/activity.js";
import {
  checkDockerConnection,
  followContainerLogs,
  getContainerLogs,
  inspectContainer,
  isDeployrContainer,
  isDockerEnabled,
  listContainers,
  pullAndRecreateContainer,
  pullImage,
  restartContainer,
  startContainer,
  stopContainer,
} from "../lib/docker.js";

function rejectDeployrSelfAction(
  res: Response,
  action: "stop" | "pull" | "recreate",
): boolean {
  res.status(400).json({
    error: `Cannot ${action} the Deployr container from the UI — it would kill this app. SSH to the server and run: cd /opt/deployr && docker compose pull && docker compose up -d`,
  });
  return true;
}

const router = Router();

router.use((_req, res, next) => {
  if (!isDockerEnabled()) {
    res.status(503).json({ error: "Docker is not enabled" });
    return;
  }
  next();
});

router.get("/status", async (_req: Request, res: Response) => {
  const connected = await checkDockerConnection();
  res.json({ enabled: true, connected });
});

router.get("/containers", async (req: Request, res: Response) => {
  try {
    const hiddenIds = getHiddenContainerIds();
    const includeHidden = req.query.includeHidden === "true";
    const all = req.query.all === "true";

    const containers = await listContainers({
      all,
      hiddenIds,
      includeHidden: includeHidden || req.query.includeHidden === "true",
    });
    res.json({ containers });
  } catch {
    res.status(500).json({ error: "Failed to list containers" });
  }
});

router.get("/containers/:id", async (req: Request, res: Response) => {
  try {
    const details = await inspectContainer(String(req.params.id));
    res.json(details);
  } catch {
    res.status(500).json({ error: "Failed to inspect container" });
  }
});

router.post("/containers/:id/restart", async (req: Request, res: Response) => {
  const id = String(req.params.id);
  try {
    await restartContainer(id);
    logActivity("action", "restart", id, "success", "Container restarted");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to restart" });
  }
});

router.post("/containers/:id/stop", async (req: Request, res: Response) => {
  try {
    const details = await inspectContainer(String(req.params.id));
    if (isDeployrContainer(details.name)) {
      rejectDeployrSelfAction(res, "stop");
      return;
    }
    await stopContainer(details.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to stop" });
  }
});

router.post("/containers/:id/start", async (req: Request, res: Response) => {
  try {
    await startContainer(String(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to start" });
  }
});

router.post("/containers/:id/pull", async (req: Request, res: Response) => {
  const id = String(req.params.id);
  try {
    const details = await inspectContainer(id);
    if (isDeployrContainer(details.name)) {
      rejectDeployrSelfAction(res, "pull");
      return;
    }
    await pullImage(details.image);
    logActivity("deploy", "pull", details.name, "success", details.image);
    addNotification("Image pulled", details.name, "success");
    res.json({ ok: true, message: `Pulled ${details.image}` });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to pull image" });
  }
});

router.post("/containers/:id/recreate", async (req: Request, res: Response) => {
  const id = String(req.params.id);
  try {
    const details = await inspectContainer(id);
    if (isDeployrContainer(details.name)) {
      rejectDeployrSelfAction(res, "recreate");
      return;
    }
    await pullAndRecreateContainer(id);
    logActivity("deploy", "recreate", id, "success", "Container recreated");
    addNotification("Container recreated", id.slice(0, 12), "success");
    res.json({ ok: true, message: "Container recreated with latest image" });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to recreate" });
  }
});

router.get("/containers/:id/logs", async (req: Request, res: Response) => {
  const containerId = String(req.params.id);
  const tail = Math.min(parseInt(req.query.tail as string) || 100, 1000);

  try {
    const logs = await getContainerLogs(containerId, tail);
    res.json({ logs });
  } catch {
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

router.get("/containers/:id/logs/stream", (req: Request, res: Response) => {
  const containerId = String(req.params.id);
  const tail = Math.min(parseInt(req.query.tail as string) || 100, 1000);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const cleanup = followContainerLogs(
    containerId,
    tail,
    (text) => {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    },
    (error) => {
      res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    },
  );

  req.on("close", () => {
    cleanup();
    res.end();
  });
});

export default router;
