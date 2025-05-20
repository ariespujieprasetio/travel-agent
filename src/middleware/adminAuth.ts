import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import prisma from "../models/prisma";

/**
 * Middleware to authenticate admin users
 */
export async function adminAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    // Check if user is an admin
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { isAdmin: true }
    });
    
    if (!user || !user.isAdmin) {
      res.status(403).json({ error: "Forbidden - Admin access required" });
      return;
    }
    
    next();
  } catch (error) {
    console.error("Admin authentication error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
}