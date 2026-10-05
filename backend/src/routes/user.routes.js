import express from "express";

import {
    createUser,
    getUsers,
    updateUser,
    updateUserStatus,
    resetUserPassword,
} from "../controllers/user.controller.js";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.get(
    "/",
    authenticateToken,
    requirePermission("users.view"),
    getUsers
);

router.post(
    "/",
    authenticateToken,
    requirePermission("users.create"),
    createUser
);

router.put(
    "/:id",
    authenticateToken,
    requirePermission("users.edit"),
    updateUser
);

router.patch(
    "/:id/status",
    authenticateToken,
    requirePermission("users.edit"),
    updateUserStatus
);

router.patch(
    "/:id/password",
    authenticateToken,
    requirePermission("users.edit"),
    resetUserPassword
);

export default router;