import express from "express";

import {
  createPSGA,
  getPSGAs,
  getPSGAById,
  updatePSGA,
} from "../controllers/psga.controller.js";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();


// ============================================================
// PSGA ROUTES
// ============================================================

// View all PSGA
router.get(
  "/",
  authenticateToken,
  requirePermission("psga.view"),
  getPSGAs
);


// View single PSGA
router.get(
  "/:id",
  authenticateToken,
  requirePermission("psga.view"),
  getPSGAById
);


// Create PSGA tracking record
// Admin only because BDE does not have psga.create.
router.post(
  "/",
  authenticateToken,
  requirePermission("psga.create"),
  createPSGA
);


// Update PSGA tracking record
// Admin only because BDE does not have psga.edit.
router.put(
  "/:id",
  authenticateToken,
  requirePermission("psga.edit"),
  updatePSGA
);


export default router;