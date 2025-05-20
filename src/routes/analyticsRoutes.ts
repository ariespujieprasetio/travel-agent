import express from "express";
import * as analyticsController from "../controllers/analyticsController";
import { authenticate } from "../middleware/auth";
import { adminAuth } from "../middleware/adminAuth";

const router = express.Router();

// All analytics routes require authentication and admin privileges
router.use(authenticate);
router.use(adminAuth);

// Analytics routes
router.get("/messages", analyticsController.getMessageStats);
router.get("/sessions", analyticsController.getSessionStats);
router.get("/user-activity", analyticsController.getUserActivityStats);
router.get("/tool-usage", analyticsController.getToolUsageStats);

export default router;