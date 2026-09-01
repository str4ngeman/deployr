import { Router, type Request, type Response } from "express";
import fs from "fs/promises";
import path from "path";
import { resolveSafePath, type FileEntry } from "../lib/paths.js";

const router = Router();

router.get("/list", async (req: Request, res: Response) => {
  const dirPath = (req.query.path as string) || "";
  const resolved = resolveSafePath(dirPath);

  if (!resolved) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  try {
    const stat = await fs.stat(resolved);
    if (!stat.isDirectory()) {
      res.status(400).json({ error: "Not a directory" });
      return;
    }

    const entries = await fs.readdir(resolved, { withFileTypes: true });
    const files: FileEntry[] = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(dirPath, entry.name);
        const fullPath = path.join(resolved, entry.name);
        const entryStat = await fs.stat(fullPath);

        return {
          name: entry.name,
          path: entryPath,
          type: entry.isDirectory() ? "directory" : "file",
          size: entry.isFile() ? entryStat.size : undefined,
          modified: entryStat.mtime.toISOString(),
        } satisfies FileEntry;
      }),
    );

    files.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    res.json({ path: dirPath, entries: files });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      res.status(404).json({ error: "Directory not found" });
      return;
    }
    res.status(500).json({ error: "Failed to read directory" });
  }
});

router.get("/read", async (req: Request, res: Response) => {
  const filePath = req.query.path as string;
  if (!filePath) {
    res.status(400).json({ error: "Path is required" });
    return;
  }

  const resolved = resolveSafePath(filePath);
  if (!resolved) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  try {
    const stat = await fs.stat(resolved);
    if (!stat.isFile()) {
      res.status(400).json({ error: "Not a file" });
      return;
    }

    if (stat.size > 5 * 1024 * 1024) {
      res.status(413).json({ error: "File too large (max 5MB)" });
      return;
    }

    const content = await fs.readFile(resolved, "utf-8");
    res.json({
      path: filePath,
      content,
      size: stat.size,
      modified: stat.mtime.toISOString(),
    });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      res.status(404).json({ error: "File not found" });
      return;
    }
    res.status(500).json({ error: "Failed to read file" });
  }
});

router.put("/write", async (req: Request, res: Response) => {
  const { path: filePath, content } = req.body as {
    path?: string;
    content?: string;
  };

  if (!filePath || typeof content !== "string") {
    res.status(400).json({ error: "Path and content are required" });
    return;
  }

  const resolved = resolveSafePath(filePath);
  if (!resolved) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  try {
    const stat = await fs.stat(resolved);
    if (!stat.isFile()) {
      res.status(400).json({ error: "Not a file" });
      return;
    }

    await fs.writeFile(resolved, content, "utf-8");
    const newStat = await fs.stat(resolved);

    res.json({
      path: filePath,
      size: newStat.size,
      modified: newStat.mtime.toISOString(),
    });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      res.status(404).json({ error: "File not found" });
      return;
    }
    res.status(500).json({ error: "Failed to write file" });
  }
});

export default router;
