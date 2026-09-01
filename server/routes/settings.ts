import { Router, type Request, type Response } from "express";
import {
  getAllSettings,
  getHiddenContainers,
  hideContainer,
  unhideContainer,
  updateSettings,
} from "../lib/db.js";
import { hashPassword } from "../lib/auth.js";
import { looksHashedPassword } from "../lib/session-cookie.js";

const router = Router();

function normalizeAuthUpdates(updates: Record<string, string>): Record<string, string> {
  const next = { ...updates };

  if (next["auth.password"] && next["auth.password"] !== "••••••••") {
    const password = next["auth.password"];
    if (!looksHashedPassword(password)) {
      next["auth.password"] = hashPassword(password);
    }
  }

  if (next["auth.enabled"] === "true" && !next["auth.password"]) {
    // Keep existing password when only toggling auth on.
    delete next["auth.password"];
  }

  return next;
}

router.get("/", (_req: Request, res: Response) => {
  res.json({ settings: getAllSettings() });
});

router.put("/", (req: Request, res: Response) => {
  const updates = req.body as Record<string, string>;
  if (!updates || typeof updates !== "object") {
    res.status(400).json({ error: "Invalid settings payload" });
    return;
  }

  const settings = updateSettings(normalizeAuthUpdates(updates));
  res.json({ settings });
});

router.get("/hidden-containers", (_req: Request, res: Response) => {
  res.json({ containers: getHiddenContainers() });
});

router.post("/hidden-containers", (req: Request, res: Response) => {
  const { containerId, containerName } = req.body as {
    containerId?: string;
    containerName?: string;
  };

  if (!containerId || !containerName) {
    res.status(400).json({ error: "containerId and containerName are required" });
    return;
  }

  hideContainer(containerId, containerName);
  res.json({ ok: true });
});

router.delete("/hidden-containers/:id", (req: Request, res: Response) => {
  unhideContainer(String(req.params.id));
  res.json({ ok: true });
});

export default router;
