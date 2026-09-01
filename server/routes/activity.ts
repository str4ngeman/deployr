import { Router, type Request, type Response } from "express";
import {
  getActivity,
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../lib/activity.js";

const router = Router();

router.get("/history", (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  res.json({ activity: getActivity(limit) });
});

router.get("/notifications", (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 30;
  res.json({ notifications: getNotifications(limit), unread: getUnreadCount() });
});

router.post("/notifications/read-all", (_req: Request, res: Response) => {
  markAllNotificationsRead();
  res.json({ ok: true });
});

router.post("/notifications/:id/read", (req: Request, res: Response) => {
  markNotificationRead(parseInt(String(req.params.id), 10));
  res.json({ ok: true });
});

export default router;
