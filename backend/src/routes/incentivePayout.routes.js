import express from "express";

import {
  createIncentivePayout,
  getIncentivePayouts,
  getIncentivePayoutById,
  approveIncentivePayout,
  markIncentivePayoutPaid,
  getMonthlyIncentiveDashboard,
  getAdminIncentiveDashboard,
} from "../controllers/incentivePayout.controller.js";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

// ============================================================
// MONTHLY INCENTIVE PAYOUT ROUTES
// ============================================================

// Get all monthly incentive payouts
router.get(
  "/",
  authenticateToken,
  requirePermission("incentives.view"),
  getIncentivePayouts
);

router.get(
  "/dashboard/:bdeId",
  authenticateToken,
  requirePermission("incentives.view"),
  getMonthlyIncentiveDashboard
);

router.get(
  "/admin-dashboard",
  authenticateToken,
  requirePermission("incentives.view"),
  getAdminIncentiveDashboard
);

// Get single monthly incentive payout
router.get(
  "/:id",
  authenticateToken,
  requirePermission("incentives.view"),
  getIncentivePayoutById
);

// Create monthly incentive payout
router.post(
  "/",
  authenticateToken,
  requirePermission("incentives.create"),
  createIncentivePayout
);

// Approve monthly incentive payout
router.put(
  "/:id/approve",
  authenticateToken,
  requirePermission("incentives.approve"),
  approveIncentivePayout
);

// Mark monthly incentive payout as paid with salary
router.put(
  "/:id/paid",
  authenticateToken,
  requirePermission("incentives.approve"),
  markIncentivePayoutPaid
);

export default router;