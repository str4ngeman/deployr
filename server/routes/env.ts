import { Router, type Request, type Response } from "express";
import { findEnvFiles, readEnvFile, writeEnvFile } from "../lib/env-file.js";

const router = Router();

router.get("/files", async (_req: Request, res: Response) => {
  try {
    const files = await findEnvFiles();
    res.json({ files });
  } catch {
    res.status(500).json({ error: "Failed to find env files" });
  }
});

router.get("/read", async (req: Request, res: Response) => {
  const filePath = req.query.path as string;
  if (!filePath) {
    res.status(400).json({ error: "Path required" });
    return;
  }
  try {
    const vars = await readEnvFile(filePath);
    res.json({ path: filePath, vars });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to read" });
  }
});

router.put("/write", async (req: Request, res: Response) => {
  const { path: filePath, vars } = req.body as {
    path?: string;
    vars?: Array<{ key: string; value: string }>;
  };
  if (!filePath || !vars) {
    res.status(400).json({ error: "Path and vars required" });
    return;
  }
  try {
    await writeEnvFile(filePath, vars.map((v) => ({ ...v, isSecret: false })));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to write" });
  }
});

export default router;
