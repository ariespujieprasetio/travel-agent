// src/routes/passwordResetRoutes.ts

import express from "express";
import * as passwordResetController from "../controllers/passwordResetController";

const router = express.Router();

// Route to request a password reset (sends email with reset link)
router.post("/request", passwordResetController.requestPasswordReset);

// Route to validate a reset token
router.get("/validate", passwordResetController.validateResetToken);

// Route to reset password with a valid token
router.post("/reset", passwordResetController.resetPassword);

export default router;