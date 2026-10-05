import express from "express";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.get(
  "/admin-only",
  authenticateToken,
  requirePermission("users.create"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "RBAC permission check successful",
      user: {
        id: req.user.userId,
        role: req.user.role,
      },
      permission: "users.create",
    });
  }
);

export default router;