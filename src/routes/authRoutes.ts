import express from "express";
import * as authController from "../controllers/authController";
import { authenticate } from "../middleware/auth";

const router = express.Router();

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);

// Protected routes
router.get("/profile", authenticate, authController.getProfile);

// Google Auth callback
router.get("/google/callback", authController.handleGoogleAuth);

export default router;
