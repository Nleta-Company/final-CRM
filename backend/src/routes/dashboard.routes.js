import express from "express";

import {
  getDashboardSummary,
  getDashboardStats,
  getDashboardActionItems,
  getDashboardRecentActivity,
  getDashboardSalesPerformance,
  getDashboardLeadPipeline,
  getDashboardMonthlySales,
  getDashboardActivitySummary,
  getDashboardFollowUps,
} from "../controllers/dashboard.controller.js";

import { authenticateToken } from "../middleware/auth.middleware.js";

import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.get(
  "/summary",
  authenticateToken,
  requirePermission("dashboard.view"),
  getDashboardSummary
);

router.get(
  "/stats",
  authenticateToken,
  requirePermission("dashboard.view"),
  getDashboardStats
);

router.get(
  "/action-items",
  authenticateToken,
  requirePermission("dashboard.view"),
  getDashboardActionItems
);

router.get(
  "/recent-activity",
  authenticateToken,
  requirePermission("dashboard.view"),
  getDashboardRecentActivity
);

router.get(
  "/sales-performance",
  authenticateToken,
  requirePermission("dashboard.view"),
  getDashboardSalesPerformance
);

router.get(
  "/charts/lead-pipeline",
  authenticateToken,
  requirePermission("dashboard.view"),
  getDashboardLeadPipeline
);

router.get(
  "/charts/monthly-sales",
  authenticateToken,
  requirePermission("dashboard.view"),
  getDashboardMonthlySales
);

router.get(
  "/activity-summary",
  authenticateToken,
  requirePermission("dashboard.view"),
  getDashboardActivitySummary
);

router.get(
  "/follow-ups",
  authenticateToken,
  requirePermission("dashboard.view"),
  getDashboardFollowUps
);


export default router;