import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import * as analyticsService from "../services/analyticsService";
import * as userService from "../services/userService";
import prisma from "../models/prisma";

export async function getDashboardSummary(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    const userCount = await userService.getUserCount();
    const sessionCount = await prisma.chatSession.count();
    const messageCount = await prisma.message.count();
    const ipWhitelistCount = await prisma.ipWhitelist.count();
    
    const activeUserCount = await analyticsService.getActiveUserCount(7);
    
    const messageStats = await analyticsService.getMessageStatsByDay(30);
    
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

export async function getRecentActivity(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
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