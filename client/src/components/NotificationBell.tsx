import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from "../lib/api";
import { IconButton, Badge, cn } from "./ui";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = () => {
    getNotifications()
      .then((r) => {
        setNotifications(r.notifications);
        setUnread(r.unread);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleRead = async (id: number) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: 1 } : n)),
    );
    setUnread((u) => Math.max(0, u - 1));
  };

  const handleReadAll = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })));
    setUnread(0);
  };

  const variantMap: Record<string, "success" | "warning" | "danger" | "default"> = {
    success: "success",
    warning: "warning",
    error: "danger",
    info: "default",
  };

  return (
    <div className="relative" ref={ref}>
      <IconButton onClick={() => setOpen(!open)} title="Notifications">
        <div className="relative">
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
      </IconButton>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface-raised border border-border rounded-xl shadow-xl z-50 animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button onClick={handleReadAll} className="text-[10px] text-accent hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-8">No notifications</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.read && handleRead(n.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-border-subtle last:border-0 hover:bg-surface-overlay transition-colors",
                    !n.read && "bg-accent-muted/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium">{n.title}</span>
                    <Badge variant={variantMap[n.type] || "default"}>{n.type}</Badge>
                  </div>
                  <p className="text-[10px] text-text-muted mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-text-faint mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
