import { Router, type Request, type Response } from "express";
import {
  getScheduledTasks,
  createScheduledTask,
  deleteScheduledTask,
  toggleScheduledTask,
} from "../lib/scheduler.js";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json({ tasks: getScheduledTasks() });
});

router.post("/", (req: Request, res: Response) => {
  const { name, cron, action, target } = req.body as {
    name?: string;
    cron?: string;
    action?: string;
    target?: string;
  };
  if (!name || !cron || !action || !target) {
    res.status(400).json({ error: "name, cron, action, and target are required" });
    return;
  }
  const task = createScheduledTask(name, cron, action, target);
  res.json({ task });
});

router.delete("/:id", (req: Request, res: Response) => {
  deleteScheduledTask(parseInt(String(req.params.id), 10));
  res.json({ ok: true });
});

router.patch("/:id", (req: Request, res: Response) => {
  const { enabled } = req.body as { enabled?: boolean };
  toggleScheduledTask(parseInt(String(req.params.id), 10), enabled ?? true);
  res.json({ ok: true });
});

export default router;
