import express from "express";

import {
    createClient,
    createCompleteClient,
    getClients,
    getClientById,
    updateClient,
    deleteClient,
    assignClientBde,
    getClientStats,
    updateClientProcess,
} from "../controllers/client.controller.js";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| GET ALL CLIENTS
|--------------------------------------------------------------------------
*/

router.get(
    "/",
    authenticateToken,
    requirePermission("clients.view"),
    getClients
);

/*
|--------------------------------------------------------------------------
| CLIENT STATS
|--------------------------------------------------------------------------
*/

router.get(
    "/stats",
    authenticateToken,
    requirePermission("clients.view"),
    getClientStats
);

/*
|--------------------------------------------------------------------------
| GET SINGLE CLIENT
|--------------------------------------------------------------------------
*/

router.get(
    "/:id",
    authenticateToken,
    requirePermission("clients.view"),
    getClientById
);

/*
|--------------------------------------------------------------------------
| ADMIN: ASSIGN / REASSIGN CLIENT TO BDE
|--------------------------------------------------------------------------
*/

router.patch(
    "/:id/assign-bde",
    authenticateToken,
    requirePermission("clients.edit"),
    assignClientBde
);

/*
|--------------------------------------------------------------------------
| UPDATE CLIENT PROCESS
|--------------------------------------------------------------------------
|
| FSO / PSGA are generated in the separate external dashboard.
|
| CRM only tracks:
|
| CLIENT_CREATED
| FSO_GENERATED
| PSGA_GENERATED
| PSGA_COMPLETED
|
*/

router.patch(
    "/:id/process",
    authenticateToken,
    requirePermission("clients.edit"),
    updateClientProcess
);

/*
|--------------------------------------------------------------------------
| CREATE COMPLETE CLIENT
|--------------------------------------------------------------------------
|
| BDE Client Form uses this endpoint.
|
| Client + services = ONE transaction.
|
*/

router.post(
    "/complete",
    authenticateToken,
    requirePermission("clients.create"),
    createCompleteClient
);

/*
|--------------------------------------------------------------------------
| CREATE SIMPLE CLIENT
|--------------------------------------------------------------------------
*/

router.post(
    "/",
    authenticateToken,
    requirePermission("clients.create"),
    createClient
);

/*
|--------------------------------------------------------------------------
| UPDATE CLIENT
|--------------------------------------------------------------------------
*/

router.put(
    "/:id",
    authenticateToken,
    requirePermission("clients.edit"),
    updateClient
);

/*
|--------------------------------------------------------------------------
| DELETE CLIENT
|--------------------------------------------------------------------------
|
| Permanently deletes the client and related data.
|
*/

router.delete(
    "/:id",
    authenticateToken,
    requirePermission("clients.delete"),
    deleteClient
);

export default router;