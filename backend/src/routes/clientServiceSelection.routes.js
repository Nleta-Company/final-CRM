import express from "express";

import {
    getClientServiceSelections,
    createClientServiceSelection,
    updateClientServiceSelection,
    deleteClientServiceSelection,
} from "../controllers/clientServiceSelection.controller.js";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.get(
    "/:clientId",
    authenticateToken,
    requirePermission("clients.view"),
    getClientServiceSelections
);

router.post(
    "/:clientId",
    authenticateToken,
    requirePermission("clients.edit"),
    createClientServiceSelection
);

router.put(
    "/:clientId/:selectionId",
    authenticateToken,
    requirePermission("clients.edit"),
    updateClientServiceSelection
);

router.delete(
    "/:clientId/:selectionId",
    authenticateToken,
    requirePermission("clients.edit"),
    deleteClientServiceSelection
);

export default router;