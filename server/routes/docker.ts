import { Router, type Request, type Response } from "express";
import {
  checkDockerConnection,
  followContainerLogs,
  getContainerLogs,
  isDockerEnabled,
  listContainers,
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

router.get("/containers", async (_req: Request, res: Response) => {
  try {
    const containers = await listContainers();
    res.json({ containers });
  } catch {
    res.status(500).json({ error: "Failed to list containers" });
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
