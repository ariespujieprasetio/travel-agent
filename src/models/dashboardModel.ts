// src/models/dashboardModel.ts

// Dashboard summary data model
export interface DashboardSummary {
    totalUsers: number;
    totalSessions: number;
    totalMessages: number;
    ipWhitelistEntries: number;
    activeUsers: number;
    messageStats: MessageStatsByDay[];
    sessionStats: SessionStatsByDay[];
  }
  
  // Recent activity data model
  export interface RecentActivity {
    recentSessions: RecentSession[];
    recentIpChanges: RecentIpChange[];
  }
  
  // Recent session model
  export interface RecentSession {
    id: string;
    createdAt: Date;
    user: {
      id: string;
      email: string;
      name: string | null;
    };
  }
  
  // Recent IP whitelist change model
  export interface RecentIpChange {
    id: string;
    ipAddress: string;
    description: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }
  
  // User statistics model
  export interface UserStatistics {
    totalUsers: number;
    newUsers: number;
    activeUsers: number;
    averageSessionsPerUser: number;
    averageMessagesPerUser: number;
  }
  
  // System health model
  export interface SystemHealth {
    status: 'healthy' | 'warning' | 'error';
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    uptime: number;
    lastUpdate: Date;
  }