import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import {
  SETTING_DEFINITIONS,
  type SettingDefinition,
} from "./settings-schema.js";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "deployr.db");

let db: Database.Database | null = null;

export function initDatabase(): Database.Database {
  if (db) return db;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hidden_containers (
      container_id TEXT PRIMARY KEY,
      container_name TEXT NOT NULL,
      hidden_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scheduled_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cron TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_run TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS health_checks (
      container_id TEXT PRIMARY KEY,
      container_name TEXT NOT NULL,
      state TEXT NOT NULL,
      healthy INTEGER NOT NULL,
      checked_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      source_path TEXT NOT NULL,
      filename TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  for (const setting of SETTING_DEFINITIONS) {
    const existing = db
      .prepare("SELECT value FROM settings WHERE key = ?")
      .get(setting.key) as { value: string } | undefined;
    if (!existing) {
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
        setting.key,
        setting.defaultValue,
      );
    }
  }

  return db;
}

export function getDatabase(): Database.Database {
  return initDatabase();
}

export function getSetting(key: string): string {
  const row = getDatabase()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  const def = SETTING_DEFINITIONS.find((s) => s.key === key);
  return row?.value ?? def?.defaultValue ?? "";
}

export function getSettingBool(key: string): boolean {
  return getSetting(key) === "true";
}

export function getSettingNumber(key: string, fallback: number): number {
  const value = Number(getSetting(key));
  return Number.isFinite(value) ? value : fallback;
}

export function setSetting(key: string, value: string): void {
  getDatabase()
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .run(key, value);
}

export function getAllSettings(): Array<
  SettingDefinition & { value: string; masked?: boolean }
> {
  return SETTING_DEFINITIONS.map((def) => {
    const value = getSetting(def.key);
    if (def.type === "secret" && value) {
      return { ...def, value: "••••••••", masked: true };
    }
    return { ...def, value };
  });
}

export function updateSettings(
  updates: Record<string, string>,
): Array<SettingDefinition & { value: string; masked?: boolean }> {
  const validKeys = new Set(SETTING_DEFINITIONS.map((s) => s.key));

  for (const [key, value] of Object.entries(updates)) {
    if (!validKeys.has(key)) continue;
    const def = SETTING_DEFINITIONS.find((s) => s.key === key)!;
    if (def.type === "secret" && value === "••••••••") continue;
    setSetting(key, value);
  }

  return getAllSettings();
}

export interface HiddenContainer {
  container_id: string;
  container_name: string;
  hidden_at: string;
}

export function getHiddenContainers(): HiddenContainer[] {
  return getDatabase()
    .prepare(
      "SELECT container_id, container_name, hidden_at FROM hidden_containers ORDER BY container_name",
    )
    .all() as HiddenContainer[];
}

export function getHiddenContainerIds(): Set<string> {
  const rows = getDatabase()
    .prepare("SELECT container_id FROM hidden_containers")
    .all() as Array<{ container_id: string }>;
  return new Set(rows.map((r) => r.container_id));
}

export function hideContainer(containerId: string, containerName: string): void {
  getDatabase()
    .prepare(
      "INSERT INTO hidden_containers (container_id, container_name) VALUES (?, ?) ON CONFLICT(container_id) DO UPDATE SET container_name = excluded.container_name",
    )
    .run(containerId, containerName);
}

export function unhideContainer(containerId: string): void {
  getDatabase()
    .prepare("DELETE FROM hidden_containers WHERE container_id = ?")
    .run(containerId);
}

export function getGhcrAuth(): { username: string; token: string } | null {
  const username = getSetting("ghcr.username");
  const token = getSetting("ghcr.token");
  if (!username || !token) return null;
  return { username, token };
}
