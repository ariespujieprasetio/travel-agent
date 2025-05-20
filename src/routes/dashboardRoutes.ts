import express from "express";
import * as dashboardController from "../controllers/dashboardController";
import { authenticate } from "../middleware/auth";
import { adminAuth } from "../middleware/adminAuth";

const router = express.Router();

// All dashboard routes require authentication and admin privileges
router.use(authenticate);
router.use(adminAuth);

// Dashboard routes
router.get("/summary", dashboardController.getDashboardSummary);
router.get("/recent-activity", dashboardController.getRecentActivity);

export default router;