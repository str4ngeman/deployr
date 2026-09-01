import { getDatabase } from "./db.js";

export interface ActivityEntry {
  id: number;
  type: "deploy" | "action" | "backup" | "schedule" | "alert" | "system";
  action: string;
  target: string;
  status: "success" | "error" | "info";
  message: string;
  created_at: string;
}

export function logActivity(
  type: ActivityEntry["type"],
  action: string,
  target: string,
  status: ActivityEntry["status"],
  message: string,
): void {
  getDatabase()
    .prepare(
      "INSERT INTO activity (type, action, target, status, message) VALUES (?, ?, ?, ?, ?)",
    )
    .run(type, action, target, status, message);
}

export function getActivity(limit = 50): ActivityEntry[] {
  return getDatabase()
    .prepare(
      "SELECT id, type, action, target, status, message, created_at FROM activity ORDER BY id DESC LIMIT ?",
    )
    .all(limit) as ActivityEntry[];
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: number;
  created_at: string;
}

export function addNotification(
  title: string,
  message: string,
  type: Notification["type"] = "info",
): void {
  getDatabase()
    .prepare("INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)")
    .run(title, message, type);
  logActivity("system", "notification", title, type === "error" ? "error" : "info", message);
}

export function getNotifications(limit = 30): Notification[] {
  return getDatabase()
    .prepare(
      "SELECT id, title, message, type, read, created_at FROM notifications ORDER BY id DESC LIMIT ?",
    )
    .all(limit) as Notification[];
}

export function getUnreadCount(): number {
  const row = getDatabase()
    .prepare("SELECT COUNT(*) as count FROM notifications WHERE read = 0")
    .get() as { count: number };
  return row.count;
}

export function markNotificationRead(id: number): void {
  getDatabase().prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(id);
}

export function markAllNotificationsRead(): void {
  getDatabase().prepare("UPDATE notifications SET read = 1 WHERE read = 0").run();
}
