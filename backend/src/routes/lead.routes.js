import express from "express";

import {
    getLeads,
    createLead,
    getLeadById,
    updateLead,
    deleteLead,
    convertLeadToClient,
    getLeadStats,
    updateLeadStage,
    assignLeadBde,
} from "../controllers/lead.controller.js";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();


// ============================================================
// GET LEAD STATS
// IMPORTANT: Must come BEFORE /:id
// ============================================================

router.get(
    "/stats",
    authenticateToken,
    requirePermission("leads.view"),
    getLeadStats
);


// ============================================================
// GET ALL LEADS
// ============================================================

router.get(
    "/",
    authenticateToken,
    requirePermission("leads.view"),
    getLeads
);


// ============================================================
// CREATE LEAD
//
// ADMIN:
// - Can create a lead
// - Can optionally assign it to a BDE
//
// BDE/Sales:
// - Can create a lead
// - Backend automatically assigns the lead to the
//   logged-in BDE
// - BDE cannot assign it to another BDE
// ============================================================

router.post(
    "/",
    authenticateToken,
    requirePermission("leads.create"),
    createLead
);


// ============================================================
// CONVERT LEAD → CLIENT
// ============================================================

router.post(
    "/:id/convert-to-client",
    authenticateToken,
    requirePermission("clients.create"),
    convertLeadToClient
);


// ============================================================
// ASSIGN / REASSIGN LEAD TO BDE
//
// Only Admin is allowed by the controller.
//
// Route permission alone is NOT the security boundary.
// assignLeadBde() also checks req.user.role === "Admin".
// ============================================================

router.patch(
    "/:id/assign-bde",
    authenticateToken,
    requirePermission("leads.edit"),
    assignLeadBde
);


// ============================================================
// UPDATE LEAD STAGE
// ============================================================

router.patch(
    "/:id/stage",
    authenticateToken,
    requirePermission("leads.edit"),
    updateLeadStage
);


// ============================================================
// UPDATE LEAD
// ============================================================

router.put(
    "/:id",
    authenticateToken,
    requirePermission("leads.edit"),
    updateLead
);


// ============================================================
// DELETE LEAD
// ============================================================

router.delete(
    "/:id",
    authenticateToken,
    requirePermission("leads.delete"),
    deleteLead
);


// ============================================================
// GET SINGLE LEAD
// IMPORTANT:
// Keep this AFTER all specific /:id/... routes.
// ============================================================

router.get(
    "/:id",
    authenticateToken,
    requirePermission("leads.view"),
    getLeadById
);


export default router;