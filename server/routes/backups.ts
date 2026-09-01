import { Router, type Request, type Response } from "express";
import {
  createBackup,
  listBackups,
  deleteBackup,
  listBackupablePaths,
  getBackupById,
  getBackupFilePath,
  restoreBackup,
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

router.get("/:id/download", async (req: Request, res: Response) => {
  try {
    const backup = getBackupById(parseInt(String(req.params.id), 10));
    if (!backup) {
      res.status(404).json({ error: "Backup not found" });
      return;
    }
    res.download(getBackupFilePath(backup.filename), backup.filename);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Download failed" });
  }
});

router.post("/:id/restore", async (req: Request, res: Response) => {
  try {
    const backup = await restoreBackup(parseInt(String(req.params.id), 10));
    logActivity("backup", "restore", backup.source_path, "success", backup.filename);
    addNotification("Backup restored", backup.source_path, "success");
    res.json({ ok: true, backup });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Restore failed" });
  }
});

export default router;
