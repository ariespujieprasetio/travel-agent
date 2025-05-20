import express from "express";
import * as authController from "../controllers/authController";
import { authenticate } from "../middleware/auth";

const router = express.Router();

// Public routes
router.post("/register", (req, res) => authController.register(req, res));
router.post("/login", (req, res) => authController.login(req, res));

// Protected routes
router.get("/profile", authenticate, (req, res) => authController.getProfile(req, res));

export default router;