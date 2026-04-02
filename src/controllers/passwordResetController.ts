import { Request, Response } from "express";
import * as passwordResetService from "../services/passwordResetService";
import * as emailService from "../utils/emailService";

export async function requestPasswordReset(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const success = await passwordResetService.createPasswordResetToken(email);

    res.status(200).json({ 
      message: "If a user with that email exists, a password reset link has been sent" 
    });
  } catch (error: any) {
    console.error("Password reset request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function validateResetToken(req: Request, res: Response): Promise<void> {
  try {
    const { email, token } = req.query as { email: string, token: string };

    if (!email || !token) {
      res.status(400).json({ error: "Email and token are required" });
      return;
    }

    const isValid = await passwordResetService.validatePasswordResetToken(email, token);

    if (isValid) {
      res.status(200).json({ valid: true });
    } else {
      res.status(400).json({ valid: false, error: "Invalid or expired token" });
    }
  } catch (error: any) {
    console.error("Token validation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      res.status(400).json({ error: "Email, token, and new password are required" });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters long" });
      return;
    }

    const success = await passwordResetService.resetPassword(email, token, newPassword);

    if (success) {
      await emailService.sendPasswordChangedEmail(email);
      res.status(200).json({ message: "Password has been reset successfully" });
    } else {
      res.status(400).json({ error: "Invalid or expired token" });
    }
  } catch (error: any) {
    console.error("Password reset error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}