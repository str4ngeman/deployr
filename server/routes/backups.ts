import { Router, type Request, type Response } from "express";
import {
  createBackup,
  listBackups,
  deleteBackup,
  listBackupablePaths,
} from "../lib/backup.js";
import { logActivity, addNotification } from "../lib/activity.js";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json({ backups: listBackups() });
});

router.get("/paths", async (_req: Request, res: Response) => {
  try {
    const paths = await listBackupablePaths();
    res.json({ paths });
  } catch {
    res.status(500).json({ error: "Failed to list paths" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  const { path: sourcePath } = req.body as { path?: string };
  if (!sourcePath) {
    res.status(400).json({ error: "Path is required" });
    return;
  }
  try {
    const backup = await createBackup(sourcePath);
    logActivity("backup", "create", sourcePath, "success", backup.filename);
    addNotification("Backup created", sourcePath, "success");
    res.json({ backup });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Backup failed" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await deleteBackup(parseInt(String(req.params.id), 10));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Delete failed" });
  }
});

export default router;
