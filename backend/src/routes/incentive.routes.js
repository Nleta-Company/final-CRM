import express from "express";

import {
  getPSGAIncentives,
  createIncentive,
  updateIncentive,
  getIncentiveDashboard,
} from "../controllers/incentive.controller.js";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();


// ============================================================
// GET ALL INCENTIVES FOR A PSGA
// ============================================================

router.get(
  "/psga/:psgId",
  authenticateToken,
  requirePermission("incentives.view"),
  getPSGAIncentives
);

router.get(
  "/dashboard/:psgId",
  authenticateToken,
  requirePermission("incentives.view"),
  getIncentiveDashboard
);
// ============================================================
// CREATE SUPPORTING BDE INCENTIVE
// ============================================================

router.post(
  "/",
  authenticateToken,
  requirePermission("incentives.create"),
  createIncentive
);


// ============================================================
// UPDATE / APPROVE / PAY INCENTIVE
// ============================================================

router.put(
  "/:id",
  authenticateToken,
  requirePermission("incentives.edit"),
  updateIncentive
);


export default router;