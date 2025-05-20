// src/routes/profileRoutes.ts

import express from "express";
import * as profileController from "../controllers/profileController";
import { authenticate } from "../middleware/auth";

const router = express.Router();

// All profile routes require authentication
router.use(authenticate);

// Get user profile
router.get("/", profileController.getProfile);

// Update user profile
router.put("/update", profileController.updateProfile);

// Change password
router.post("/change-password", profileController.changePassword);

export default router;