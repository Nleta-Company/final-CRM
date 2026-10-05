import express from "express";

import {
  getServices,
  getServiceById,
  createService,
  updateService,
  updateServiceStatus,
} from "../controllers/serviceCatalog.controller.js";

import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/",
  authenticateToken,
  getServices
);

router.get(
  "/:id",
  authenticateToken,
  getServiceById
);

router.post(
  "/",
  authenticateToken,
  createService
);

router.put(
  "/:id",
  authenticateToken,
  updateService
);

router.patch(
  "/:id/status",
  authenticateToken,
  updateServiceStatus
);

export default router;