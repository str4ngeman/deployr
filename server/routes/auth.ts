import { Router, type Request, type Response } from "express";
import { getSetting, setSetting } from "../lib/db.js";
import {
  deleteSession,
  hashPassword,
  isAuthEnabled,
  login,
  verifySession,
} from "../lib/auth.js";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "../lib/session-cookie.js";

const router = Router();

function readToken(req: Request): string | undefined {
  return (
    req.headers.authorization?.replace("Bearer ", "") ||
    (req as Request & { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE_NAME]
  );
}

function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
}

function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: SESSION_COOKIE_OPTIONS.httpOnly,
    sameSite: SESSION_COOKIE_OPTIONS.sameSite,
    path: SESSION_COOKIE_OPTIONS.path,
  });
}

router.get("/status", (_req: Request, res: Response) => {
  const hasPassword = !!getSetting("auth.password");
  res.json({
    enabled: isAuthEnabled(),
    username: getSetting("auth.username") || "admin",
    needsSetup: !hasPassword,
  });
});

router.get("/session", (req: Request, res: Response) => {
  const token = readToken(req);
  res.json({
    authenticated: !isAuthEnabled() || verifySession(token),
    username: getSetting("auth.username") || "admin",
  });
});

router.post("/login", (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  if (!isAuthEnabled()) {
    res.status(400).json({ error: "Authentication is not enabled" });
    return;
  }

  const token = login(username, password);
  if (!token) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  setSessionCookie(res, token);
  res.json({ ok: true });
});

router.post("/logout", (req: Request, res: Response) => {
  const token = readToken(req);
  if (token) deleteSession(token);
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.post("/setup", (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!password || password.length < 4) {
    res.status(400).json({ error: "Password must be at least 4 characters" });
    return;
  }
  setSetting("auth.username", username || "admin");
  setSetting("auth.password", hashPassword(password));
  setSetting("auth.enabled", "true");
  const token = login(username || "admin", password);
  if (token) setSessionCookie(res, token);
  res.json({ ok: true });
});

export default router;
