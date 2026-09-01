import { Router, type Request, type Response } from "express";
import { getSetting, setSetting } from "../lib/db.js";
import {
  deleteSession,
  hashPassword,
  isAuthEnabled,
  login,
} from "../lib/auth.js";

const router = Router();

router.get("/status", (_req: Request, res: Response) => {
  const hasPassword = !!getSetting("auth.password");
  res.json({
    enabled: isAuthEnabled(),
    username: getSetting("auth.username") || "admin",
    needsSetup: !hasPassword,
  });
});

router.post("/login", (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const token = login(username, password);
  if (!token) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  res.cookie("deployr_token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ ok: true, token });
});

router.post("/logout", (req: Request, res: Response) => {
  const token =
    req.headers.authorization?.replace("Bearer ", "") ||
    (req as Request & { cookies?: Record<string, string> }).cookies?.deployr_token;
  if (token) deleteSession(token);
  res.clearCookie("deployr_token");
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
  if (token) {
    res.cookie("deployr_token", token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
  res.json({ ok: true, token });
});

export default router;
