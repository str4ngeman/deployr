import { Router, type Request, type Response } from "express";
import {
  discoverComposeProjects,
  composePull,
  composeUp,
  composeDown,
  composeRestart,
  composePs,
} from "../lib/compose.js";
import { logActivity, addNotification } from "../lib/activity.js";

const router = Router();

router.get("/projects", async (_req: Request, res: Response) => {
  try {
    const projects = await discoverComposeProjects();
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to discover projects" });
  }
});

const projectPath = (req: Request) => decodeURIComponent(String(req.params.path));

router.get("/projects/:path/ps", async (req: Request, res: Response) => {
  try {
    const output = await composePs(projectPath(req));
    res.json({ output });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed" });
  }
});

async function runAction(
  projectPath: string,
  action: string,
  fn: () => Promise<string>,
  res: Response,
) {
  try {
    const output = await fn();
    logActivity("deploy", action, projectPath, "success", output.slice(0, 200));
    addNotification(`${action} complete`, projectPath, "success");
    res.json({ ok: true, message: output.slice(0, 500) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Action failed";
    logActivity("deploy", action, projectPath, "error", msg);
    res.status(500).json({ error: msg });
  }
}

router.post("/projects/:path/pull", (req, res) => {
  const p = projectPath(req);
  return runAction(p, "compose pull", () => composePull(p), res);
});

router.post("/projects/:path/up", (req, res) => {
  const p = projectPath(req);
  return runAction(p, "compose up", () => composeUp(p), res);
});

router.post("/projects/:path/down", (req, res) => {
  const p = projectPath(req);
  return runAction(p, "compose down", () => composeDown(p), res);
});

router.post("/projects/:path/restart", (req, res) => {
  const p = projectPath(req);
  return runAction(p, "compose restart", () => composeRestart(p), res);
});

export default router;
