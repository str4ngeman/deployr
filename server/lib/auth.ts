import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { getDatabase, getSetting, getSettingBool } from "./db.js";

export function isAuthEnabled(): boolean {
  return getSettingBool("auth.enabled") && !!getSetting("auth.password");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuffer = Buffer.from(hash, "hex");
  const test = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, test);
}

export function createSession(): string {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  getDatabase()
    .prepare("INSERT INTO sessions (token, expires_at) VALUES (?, ?)")
    .run(token, expires);
  return token;
}

export function verifySession(token: string | undefined): boolean {
  if (!token) return false;
  if (!isAuthEnabled()) return true;

  const row = getDatabase()
    .prepare("SELECT expires_at FROM sessions WHERE token = ?")
    .get(token) as { expires_at: string } | undefined;

  if (!row) return false;
  if (new Date(row.expires_at) < new Date()) {
    getDatabase().prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return false;
  }
  return true;
}

export function deleteSession(token: string): void {
  getDatabase().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function login(username: string, password: string): string | null {
  const expectedUser = getSetting("auth.username") || "admin";
  const storedHash = getSetting("auth.password");
  if (username !== expectedUser || !verifyPassword(password, storedHash)) {
    return null;
  }
  return createSession();
}

export function cleanupExpiredSessions(): void {
  getDatabase()
    .prepare("DELETE FROM sessions WHERE expires_at < datetime('now')")
    .run();
}
