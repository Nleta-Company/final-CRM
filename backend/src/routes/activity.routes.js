import express from "express";

import {
  createActivity,
  getActivities,
  getActivityById,
  updateActivity,
  deleteActivity,
} from "../controllers/activity.controller.js";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.get(
  "/",
  authenticateToken,
  requirePermission("activities.view"),
  getActivities
);

router.get(
  "/:id",
  authenticateToken,
  requirePermission("activities.view"),
  getActivityById
);

router.post(
  "/",
  authenticateToken,
  requirePermission("activities.create"),
  createActivity
);

router.put(
  "/:id",
  authenticateToken,
  requirePermission("activities.edit"),
  updateActivity
);

router.delete(
  "/:id",
  authenticateToken,
  requirePermission("activities.delete"),
  deleteActivity
);

export default router;