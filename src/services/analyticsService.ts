import { Prisma } from "@prisma/client";
import prisma from "../models/prisma";

/**
 * Get message statistics by day
 */
export async function getMessageStatsByDay(days: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const messages = await prisma.message.findMany({
    where: {
      createdAt: {
        gte: startDate
      }
    },
    select: {
      createdAt: true,
      role: true
    }
  });
  
  // Group by day and role
  const stats = messages.reduce((acc: any, message) => {
    const day = message.createdAt.toISOString().split('T')[0];
    if (!acc[day]) {
      acc[day] = {
        date: day,
        total: 0,
        user: 0,
        assistant: 0,
        tool: 0
      };
    }
    
    acc[day].total += 1;
    
    if (message.role === 'user') {
      acc[day].user += 1;
    } else if (message.role === 'assistant') {
      acc[day].assistant += 1;
    } else if (message.role === 'tool') {
      acc[day].tool += 1;
    }
    
    return acc;
  }, {});
  
  return Object.values(stats).sort((a: any, b: any) => a.date.localeCompare(b.date));
}

/**
 * Get session statistics by day
 */
export async function getSessionStatsByDay(days: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const sessions = await prisma.chatSession.findMany({
    where: {
      createdAt: {
        gte: startDate
      }
    },
    select: {
      createdAt: true,
      userId: true
    }
  });
  
  // Group by day
  const stats = sessions.reduce((acc: any, session) => {
    const day = session.createdAt.toISOString().split('T')[0];
    if (!acc[day]) {
      acc[day] = {
        date: day,
        sessions: 0,
        uniqueUsers: new Set()
      };
    }
    
    acc[day].sessions += 1;
    acc[day].uniqueUsers.add(session.userId);
    
    return acc;
  }, {});
  
  // Convert sets to counts
  return Object.values(stats).map((day: any) => ({
    date: day.date,
    sessions: day.sessions,
    uniqueUsers: day.uniqueUsers.size
  })).sort((a: any, b: any) => a.date.localeCompare(b.date));
}

/**
 * Get count of active users in the last x days
 */
export async function getActiveUserCount(days: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const sessions = await prisma.chatSession.findMany({
    where: {
      createdAt: {
        gte: startDate
      }
    },
    select: {
      userId: true
    },
    distinct: ['userId']
  });
  
  return sessions.length;
}

/**
 * Get user activity statistics
 */
export async function getUserActivityStats(days: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      chatSessions: {
        where: {
          createdAt: {
            gte: startDate
          }
        },
        select: {
          createdAt: true,
          _count: {
            select: {
              messages: true
            }
          }
        }
      }
    }
  });
  
  return users.map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    sessionCount: user.chatSessions.length,
    messageCount: user.chatSessions.reduce((sum, session) => sum + session._count.messages, 0)
  })).sort((a, b) => b.sessionCount - a.sessionCount);
}

/**
 * Get tool usage statistics
 */
export async function getToolUsageStats(days: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const messages = await prisma.message.findMany({
    where: {
      createdAt: {
        gte: startDate
      },
      toolCalls: {
        not: Prisma.JsonNull  // Using Prisma.JsonNull instead of null
      }
    },
    select: {
      toolCalls: true
    }
  });
  
  // Extract function names from tool calls
  const toolCalls: any[] = [];
  messages.forEach(message => {
    if (message.toolCalls) {
      let toolCallsData: any;
      if (typeof message.toolCalls === 'string') {
        toolCallsData = JSON.parse(message.toolCalls);
      } else {
        toolCallsData = message.toolCalls;
      }
      
      if (Array.isArray(toolCallsData)) {
        toolCallsData.forEach(call => {
          if (call.function && call.function.name) {
            toolCalls.push(call.function.name);
          }
        });
      }
    }
  });
  
  // Count occurrences of each function name
  const counts: Record<string, number> = {};
  toolCalls.forEach(name => {
    counts[name] = (counts[name] || 0) + 1;
  });
  
  // Convert to array of objects
  return Object.entries(counts).map(([name, count]) => ({
    name,
    count
  })).sort((a, b) => b.count - a.count);
}