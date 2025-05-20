// src/models/analyticsModel.ts

// Message statistics by day
export interface MessageStatsByDay {
    date: string;
    total: number;
    user: number;
    assistant: number;
    tool: number;
  }
  
  // Session statistics by day
  export interface SessionStatsByDay {
    date: string;
    sessions: number;
    uniqueUsers: number;
  }
  
  // User activity statistics
  export interface UserActivityStat {
    id: string;
    email: string;
    name: string | null;
    createdAt: Date;
    sessionCount: number;
    messageCount: number;
  }
  
  // Tool usage statistics
  export interface ToolUsageStat {
    name: string;
    count: number;
  }
  
  // Chat duration statistics
  export interface ChatDurationStat {
    sessionId: string;
    userId: string;
    duration: number; // in minutes
    messageCount: number;
    date: string;
  }
  
  // IP whitelist statistics
  export interface IpWhitelistStat {
    total: number;
    active: number;
    inactive: number;
    recentAdditions: number;
    recentUpdates: number;
  }