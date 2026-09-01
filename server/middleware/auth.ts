import type { Request, Response, NextFunction } from "express";
import { isAuthEnabled, verifySession } from "../lib/auth.js";

const PUBLIC_PATHS = ["/api/auth/login", "/api/auth/status", "/api/health"];

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!isAuthEnabled()) {
    next();
    return;
  }

  if (PUBLIC_PATHS.some((p) => req.path === p || req.path.startsWith(p))) {
    next();
    return;
  }

  const header = req.headers.authorization;
  const cookie = (req as Request & { cookies?: Record<string, string> }).cookies?.deployr_token;
  const token = header?.replace("Bearer ", "") || cookie;

  if (!verifySession(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
