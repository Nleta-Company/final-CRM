import express from "express";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

import {
    getEligibleClients,
    getClientIncentives,
    getIncentiveDashboard,
    getPSGAIncentives,
    createIncentive,
    updateIncentive,
} from "../controllers/incentive.controller.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Incentive Eligible Clients
|--------------------------------------------------------------------------
|
| Clients automatically appear when:
| processStage === "PSGA_COMPLETED"
|
| No separate PSGA record is required.
|
*/

router.get(
    "/eligible-clients",
    authenticateToken,
    requirePermission("incentives.view"),
    getEligibleClients
);

/*
|--------------------------------------------------------------------------
| Incentives for a Client
|--------------------------------------------------------------------------
*/

router.get(
    "/client/:clientId",
    authenticateToken,
    requirePermission("incentives.view"),
    getClientIncentives
);

/*
|--------------------------------------------------------------------------
| Incentive Dashboard for a Client
|--------------------------------------------------------------------------
*/

router.get(
    "/dashboard/client/:clientId",
    authenticateToken,
    requirePermission("incentives.view"),
    getIncentiveDashboard
);

/*
|--------------------------------------------------------------------------
| Existing PSGA Compatibility Endpoint
|--------------------------------------------------------------------------
|
| Used only when an actual PSGA record exists.
|
*/

router.get(
    "/psga/:psgId",
    authenticateToken,
    requirePermission("incentives.view"),
    getPSGAIncentives
);

/*
|--------------------------------------------------------------------------
| Create Incentive Allocation
|--------------------------------------------------------------------------
*/

router.post(
    "/",
    authenticateToken,
    requirePermission("incentives.create"),
    createIncentive
);

/*
|--------------------------------------------------------------------------
| Update Incentive Allocation
|--------------------------------------------------------------------------
*/

router.put(
    "/:id",
    authenticateToken,
    requirePermission("incentives.edit"),
    updateIncentive
);

export default router;