// src/services/systemService.ts

import { SystemHealth } from "../models/dashboardModel";
import prisma from "../models/prisma";
import os from "os";
import fs from "fs";
import path from "path";
import { config } from "../config/env";

/**
 * Get system health information
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  // Get CPU usage
  const cpus = os.cpus();
  const cpuUsage = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    const idle = cpu.times.idle;
    return acc + ((total - idle) / total);
  }, 0) / cpus.length;
  
  // Get memory usage
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const memoryUsage = (totalMemory - freeMemory) / totalMemory;
  
  // Get disk usage (this is a simplified version)
  let diskUsage = 0;
  try {
    // This is a very simplified disk usage check and won't work on all systems
    const stats = fs.statSync("/");
    diskUsage = stats.size / stats.blocks;
  } catch (error) {
    console.error("Error checking disk usage:", error);
    diskUsage = 0.5; // Default to 50% if we can't determine
  }
  
  // Get system uptime
  const uptime = os.uptime();
  
  return {
    status: memoryUsage > 0.9 || cpuUsage > 0.9 ? "warning" : "healthy",
    cpuUsage: cpuUsage * 100, // Convert to percentage
    memoryUsage: memoryUsage * 100, // Convert to percentage
    diskUsage: diskUsage * 100, // Convert to percentage
    uptime, // In seconds
    lastUpdate: new Date()
  };
}

/**
 * Get application configuration
 */
export async function getSystemConfig() {
  // Return a sanitized version of the config (no sensitive data)
  return {
    server: {
      port: config.server.port
    },
    security: {
      enableIpWhitelist: config.security.enableIpWhitelist
    },
    openai: {
      apiKeyConfigured: !!config.openai.apiKey
    },
    google: {
      apiKeyConfigured: !!config.google.apiKey
    },
    database: {
      urlConfigured: !!config.database.url
    }
  };
}

/**
 * Update application configuration
 * Note: This is a simplified version. In a real application, you would need to
 * update environment variables or a configuration file.
 */
export async function updateSystemConfig(newConfig: any) {
  // Update relevant configuration
  if (newConfig.security?.enableIpWhitelist !== undefined) {
    config.security.enableIpWhitelist = newConfig.security.enableIpWhitelist;
  }
  
  // Return the updated config
  return getSystemConfig();
}

/**
 * Run database maintenance
 */
export async function runDatabaseMaintenance() {
  // This is a simplified version. In a real application, you would run specific
  // maintenance tasks on your database.
  
  try {
    // Example: Delete empty chat sessions
    const emptySessions = await prisma.chatSession.findMany({
      where: {
        messages: {
          none: {}
        }
      },
      select: {
        id: true
      }
    });
    
    if (emptySessions.length > 0) {
      await prisma.chatSession.deleteMany({
        where: {
          id: {
            in: emptySessions.map(session => session.id)
          }
        }
      });
    }
    
    return {
      success: true,
      message: `Maintenance completed. Cleaned up ${emptySessions.length} empty chat sessions.`
    };
  } catch (error) {
    console.error("Database maintenance error:", error);
    throw new Error("Database maintenance failed");
  }
}

/**
 * Clear expired sessions and logs
 */
export async function clearExpiredData() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Example: Delete old chat sessions
    const oldSessions = await prisma.chatSession.findMany({
      where: {
        updatedAt: {
          lt: thirtyDaysAgo
        }
      },
      select: {
        id: true
      }
    });
    
    // Delete messages from old sessions
    await prisma.message.deleteMany({
      where: {
        sessionId: {
          in: oldSessions.map(session => session.id)
        }
      }
    });
    
    // Delete old sessions
    await prisma.chatSession.deleteMany({
      where: {
        id: {
          in: oldSessions.map(session => session.id)
        }
      }
    });
    
    return {
      success: true,
      message: `Cleared ${oldSessions.length} expired sessions and their messages.`
    };
  } catch (error) {
    console.error("Clear expired data error:", error);
    throw new Error("Failed to clear expired data");
  }
}

/**
 * Get system logs
 * Note: This is a simplified version. In a real application, you would
 * retrieve logs from a proper logging system.
 */
export async function getSystemLogs(
  level: string = "info",
  limit: number = 100,
  page: number = 1
): Promise<{ logs: any[]; total: number; page: number; limit: number }> {
  // This would typically read from a log file or database
  // For demonstration purposes, we'll return mock data
  
  const logs = [
    {
      timestamp: new Date().toISOString(),
      level: "info",
      message: "System started successfully"
    },
    {
      timestamp: new Date().toISOString(),
      level: "info",
      message: "User login successful"
    },
    {
      timestamp: new Date().toISOString(),
      level: "warning",
      message: "High CPU usage detected"
    },
    {
      timestamp: new Date().toISOString(),
      level: "error",
      message: "Database connection failed"
    }
  ];
  
  // Filter by level
  const filteredLogs = logs.filter(log => {
    if (level === "error") return log.level === "error";
    if (level === "warning") return log.level === "warning" || log.level === "error";
    return true; // "info" or other levels show all logs
  });
  
  // Paginate
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
  
  return {
    logs: paginatedLogs,
    total: filteredLogs.length,
    page,
    limit
  };
}