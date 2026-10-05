import express from "express";

import {
  getNotifications,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../controllers/notification.controller.js";

import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/",
  authenticateToken,
  getNotifications
);

router.get(
  "/unread",
  authenticateToken,
  getUnreadNotifications
);

router.put(
  "/read-all",
  authenticateToken,
  markAllNotificationsAsRead
);

router.put(
  "/:id/read",
  authenticateToken,
  markNotificationAsRead
);

router.delete(
  "/:id",
  authenticateToken,
  deleteNotification
);

export default router;