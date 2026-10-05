import express from "express";

import {
    authenticateToken,
} from "../middleware/auth.middleware.js";

import {
    requirePermission,
} from "../middleware/permission.middleware.js";

import {
    getLeadServiceSelections,
    addLeadServiceSelection,
    updateLeadServiceSelection,
    deleteLeadServiceSelection,
} from "../controllers/leadServiceSelection.controller.js";

const router = express.Router();

// GET selected services
router.get(
    "/:leadId",
    authenticateToken,
    requirePermission("leads.view"),
    getLeadServiceSelections
);

// ADD service
router.post(
    "/:leadId",
    authenticateToken,
    requirePermission("leads.edit"),
    addLeadServiceSelection
);

// UPDATE service
router.put(
    "/:leadId/:selectionId",
    authenticateToken,
    requirePermission("leads.edit"),
    updateLeadServiceSelection
);

// DELETE service
router.delete(
    "/:leadId/:selectionId",
    authenticateToken,
    requirePermission("leads.edit"),
    deleteLeadServiceSelection
);

export default router;