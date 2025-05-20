// src/controllers/profileController.ts

import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import * as profileService from "../services/profileService";
import prisma from "../models/prisma";

/**
 * Change user's password
 */
export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Current password and new password are required" });
      return;
    }
    
    const result = await profileService.changePassword(
      req.user.userId,
      currentPassword,
      newPassword
    );
    
    if (result.success) {
      res.status(200).json({ message: result.message });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error: any) {
    console.error("Password change error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Update user profile
 */
export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    const { name, email } = req.body;
    
    if (!name && !email) {
      res.status(400).json({ error: "At least one field (name or email) must be provided" });
      return;
    }
    
    const result = await profileService.updateUserProfile(
      req.user.userId,
      { name, email }
    );
    
    if (result.success) {
      res.status(200).json({ 
        message: result.message,
        user: result.user
      });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error: any) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Get user profile
 */
export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        isAdmin: true
      }
    });
    
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    
    res.status(200).json({ user });
  } catch (error: any) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}