import { Router, type Request, type Response } from "express";
import {
  discoverComposeProjects,
  composePull,
  composeUp,
  composeDown,
  composeRestart,
  composeDeploy,
  composePs,
} from "../lib/compose.js";
import { getGitInfo } from "../lib/git-info.js";
import { logActivity, addNotification } from "../lib/activity.js";

const router = Router();

router.get("/projects", async (_req: Request, res: Response) => {
  try {
    const projects = await discoverComposeProjects();
    const enriched = await Promise.all(
      projects.map(async (project) => {
        const git = await getGitInfo(project.path);
        return {
          ...project,
          git: git.isRepo ? git : null,
          pendingDeploy: git.isRepo ? !!git.pendingDeploy : false,
        };
      }),
    );
    res.json({ projects: enriched });
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

router.post("/projects/:path/deploy", (req, res) => {
  const p = projectPath(req);
  return runAction(p, "compose deploy", () => composeDeploy(p), res);
});

export default router;
