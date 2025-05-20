// src/routes/systemRoutes.ts

import express from "express";
import * as systemController from "../controllers/systemController";
import { authenticate } from "../middleware/auth";
import { adminAuth } from "../middleware/adminAuth";

const router = express.Router();

// All system routes require authentication and admin privileges
router.use(authenticate);
router.use(adminAuth);

// System routes
router.get("/health", systemController.getSystemHealth);
router.get("/config", systemController.getSystemConfig);
router.put("/config", systemController.updateSystemConfig);
router.post("/maintenance", systemController.runDatabaseMaintenance);
router.post("/clear-expired", systemController.clearExpiredData);
router.get("/logs", systemController.getSystemLogs);

export default router;