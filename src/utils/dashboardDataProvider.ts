// src/utils/dashboardDataProvider.ts

import prisma from "../models/prisma";
import { DashboardSummary, RecentActivity, SystemHealth } from "../models/dashboardModel";
import * as analyticsService from "../services/analyticsService";
import * as systemService from "../services/systemService";

/**
 * Generate complete dashboard data
 */
export async function generateDashboardData(): Promise<{
  summary: DashboardSummary;
  recentActivity: RecentActivity;
  systemHealth: SystemHealth;
}> {
  // Get dashboard summary
  const userCount = await prisma.user.count();
  const sessionCount = await prisma.chatSession.count();
  const messageCount = await prisma.message.count();
  const ipWhitelistCount = await prisma.ipWhitelist.count();
  const activeUserCount = await analyticsService.getActiveUserCount(7);
  const messageStats = await analyticsService.getMessageStatsByDay(30);
  const sessionStats = await analyticsService.getSessionStatsByDay(30);
  
  // Get recent activity
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
  
  // Get system health
  const systemHealth = await systemService.getSystemHealth();
  
  return {
    summary: {
      totalUsers: userCount,
      totalSessions: sessionCount,
      totalMessages: messageCount,
      ipWhitelistEntries: ipWhitelistCount,
      activeUsers: activeUserCount,
      messageStats,
      sessionStats
    },
    recentActivity: {
      recentSessions,
      recentIpChanges
    },
    systemHealth
  };
}

/**
 * Get basic dashboard metrics
 */
export async function getDashboardMetrics(): Promise<{
  users: number;
  sessions: number;
  messages: number;
  activeUsers: number;
}> {
  const userCount = await prisma.user.count();
  const sessionCount = await prisma.chatSession.count();
  const messageCount = await prisma.message.count();
  
  // Get active users in the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const activeUsers = await prisma.user.count({
    where: {
      chatSessions: {
        some: {
          createdAt: {
            gte: sevenDaysAgo
          }
        }
      }
    }
  });
  
  return {
    users: userCount,
    sessions: sessionCount,
    messages: messageCount,
    activeUsers
  };
}