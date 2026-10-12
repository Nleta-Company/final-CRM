import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes.js";
import rbacTestRoutes from "./routes/rbac-test.routes.js";
import userRoutes from "./routes/user.routes.js";
import leadRoutes from "./routes/lead.routes.js";
import clientRoutes from "./routes/client.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import psgaRoutes from "./routes/psga.routes.js";
import incentiveRoutes from "./routes/incentive.routes.js";
import incentivePayoutRoutes from "./routes/incentivePayout.routes.js";
import { startFollowUpNotificationJob } from "./jobs/followUpNotification.job.js";
import serviceCatalogRoutes from "./routes/serviceCatalog.routes.js";
import leadServiceSelectionRoutes from "./routes/leadServiceSelection.routes.js";
import clientServiceSelectionRoutes from "./routes/clientServiceSelection.routes.js";

import prisma from "./config/prisma.js";

const app = express();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";
const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:3000";

// ==========================================
// SECURITY
// ==========================================

app.disable("x-powered-by");

app.use(helmet());

// ==========================================
// CORS
// ==========================================

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

// ==========================================
// REQUEST PARSING
// ==========================================

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ==========================================
// LOGGING
// ==========================================

app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));

// ==========================================
// API RATE LIMITING
// ==========================================

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: NODE_ENV === "production" ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);

// ==========================================
// API ROUTES
// ==========================================

app.use("/api/auth", authRoutes);
app.use("/api/rbac-test", rbacTestRoutes);
app.use("/api/users", userRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/psga", psgaRoutes);
app.use("/api/incentives", incentiveRoutes);
app.use("/api/incentive-payouts", incentivePayoutRoutes);
app.use("/api/services", serviceCatalogRoutes);
app.use(
  "/api/lead-services",
  leadServiceSelectionRoutes
);
app.use(
  "/api/client-services",
  clientServiceSelectionRoutes
);
// ==========================================
// BASIC API HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "NLETA CRM API is running",
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// DATABASE HEALTH CHECK
// ==========================================

app.get("/api/health/db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      success: true,
      message: "NLETA CRM database connection is working",
    });
  } catch (error) {
    console.error("=================================");
    console.error("DATABASE CONNECTION ERROR");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Meta:", error.meta);
    console.error("=================================");

    return res.status(500).json({
      success: false,
      message: "Database connection failed",
      ...(NODE_ENV !== "production" && {
        error: error.message,
        code: error.code || null,
      }),
    });
  }
});

// ==========================================
// ROOT API
// ==========================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "NLETA CRM Backend API",
  });
});

// ==========================================
// 404 HANDLER
// ==========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});


startFollowUpNotificationJob();
// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`NLETA CRM API running on port ${PORT}`);
});