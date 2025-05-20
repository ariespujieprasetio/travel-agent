import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import * as analyticsService from "../services/analyticsService";
import * as userService from "../services/userService";
import prisma from "../models/prisma";

/**
 * Get dashboard summary
 */
export async function getDashboardSummary(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    // Get counts for key metrics
    const userCount = await userService.getUserCount();
    const sessionCount = await prisma.chatSession.count();
    const messageCount = await prisma.message.count();
    const ipWhitelistCount = await prisma.ipWhitelist.count();
    
    // Get active users in the last 7 days
    const activeUserCount = await analyticsService.getActiveUserCount(7);
    
    // Get message statistics for the last 30 days
    const messageStats = await analyticsService.getMessageStatsByDay(30);
    
    // Get session statistics for the last 30 days
    const sessionStats = await analyticsService.getSessionStatsByDay(30);
    
    res.status(200).json({
      totalUsers: userCount,
      totalSessions: sessionCount,
      totalMessages: messageCount,
      ipWhitelistEntries: ipWhitelistCount,
      activeUsers: activeUserCount,
      messageStats,
      sessionStats
    });
  } catch (error: any) {
    console.error("Dashboard summary error:", error);
    res.status(500).json({ error: error.message || "Failed to get dashboard data" });
  }
}

/**
 * Get recent activity
 */
export async function getRecentActivity(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    // Get recent sessions
    const recentSessions = await prisma.chatSession.findMany({
      take: 10,
      orderBy: {
        createdAt: "desc"
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });
    
    // Get recent IP whitelist changes
    const recentIpChanges = await prisma.ipWhitelist.findMany({
      take: 10,
      orderBy: {
        updatedAt: "desc"
      }
    });
    
    res.status(200).json({
      recentSessions,
      recentIpChanges
    });
  } catch (error: any) {
    console.error("Recent activity error:", error);
    res.status(500).json({ error: error.message || "Failed to get recent activity" });
  }
}