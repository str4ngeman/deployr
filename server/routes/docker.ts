import { Router, type Request, type Response } from "express";
import {
  getHiddenContainerIds,
  getGhcrAuth,
} from "../lib/db.js";
import {
  checkDockerConnection,
  followContainerLogs,
  getContainerLogs,
  isDockerEnabled,
  listContainers,
  inspectContainer,
  pullAndRecreateContainer,
  pullImage,
  restartContainer,
  startContainer,
  stopContainer,
} from "../lib/docker.js";

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
  try {
    await restartContainer(String(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to restart" });
  }
});

router.post("/containers/:id/stop", async (req: Request, res: Response) => {
  try {
    await stopContainer(String(req.params.id));
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
  try {
    const containers = await listContainers({ all: true });
    const container = containers.find((c) => c.id === String(req.params.id));
    if (!container) {
      res.status(404).json({ error: "Container not found" });
      return;
    }

    const auth = container.isGhcr ? getGhcrAuth() : null;
    if (container.isGhcr && !auth) {
      res.status(400).json({ error: "GHCR credentials not configured in Settings" });
      return;
    }

    await pullImage(
      container.image,
      auth ? { username: auth.username, password: auth.token } : null,
    );
    res.json({ ok: true, message: `Pulled ${container.image}` });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to pull image" });
  }
});

router.post("/containers/:id/recreate", async (req: Request, res: Response) => {
  try {
    await pullAndRecreateContainer(String(req.params.id));
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
