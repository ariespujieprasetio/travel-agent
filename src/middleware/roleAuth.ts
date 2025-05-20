// src/middleware/roleAuth.ts

import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import prisma from "../models/prisma";

/**
 * Factory function to create role-based authentication middleware
 * @param roles Array of roles allowed to access the route
 */
export function roleAuth(roles: string[]) {
  return async function(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      
      // Fetch user with roles
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { 
          isAdmin: true,
          roles: true
        }
      });
      
      if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
      }
      
      // Admin has access to everything
      if (user.isAdmin) {
        next();
        return;
      }
      
      // Check if user has any of the required roles
      const userRoles = user.roles as string[] || [];
      const hasRequiredRole = roles.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        res.status(403).json({ 
          error: "Forbidden - Insufficient permissions",
          requiredRoles: roles
        });
        return;
      }
      
      next();
    } catch (error) {
      console.error("Role authentication error:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  };
}

/**
 * Middleware to restrict access to specific features
 * @param features Array of features allowed to access
 */
export function featureAuth(features: string[]) {
  return async function(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      
      // Get user permissions
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { 
          isAdmin: true,
          permissions: true
        }
      });
      
      if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
      }
      
      // Admin has access to all features
      if (user.isAdmin) {
        next();
        return;
      }
      
      // Check if user has any of the required feature permissions
      const userPermissions = user.permissions as string[] || [];
      const hasRequiredPermission = features.some(feature => 
        userPermissions.includes(feature)
      );
      
      if (!hasRequiredPermission) {
        res.status(403).json({ 
          error: "Forbidden - Feature access denied",
          requiredFeatures: features
        });
        return;
      }
      
      next();
    } catch (error) {
      console.error("Feature authentication error:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  };
}