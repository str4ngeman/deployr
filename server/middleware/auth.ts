import type { Request, Response, NextFunction } from "express";
import { isAuthEnabled, verifySession } from "../lib/auth.js";
import { SESSION_COOKIE_NAME } from "../lib/session-cookie.js";

const PUBLIC_PREFIXES = ["/api/health", "/api/auth"];

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Never block the SPA or static assets — only protect API routes
  if (!req.path.startsWith("/api")) {
    next();
    return;
  }

  if (!isAuthEnabled()) {
    next();
    return;
  }

  const path = req.path;
  if (PUBLIC_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    next();
    return;
  }

  const header = req.headers.authorization;
  const cookie = (req as Request & { cookies?: Record<string, string> }).cookies?.[SESSION_COOKIE_NAME];
  const token = header?.replace("Bearer ", "") || cookie;

  if (!verifySession(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
