import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import * as analyticsService from "../services/analyticsService";

/**
 * Get message statistics
 */
export async function getMessageStats(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { period = "30" } = req.query;
    const days = parseInt(period as string, 10);
    
    const stats = await analyticsService.getMessageStatsByDay(days);
    
    res.status(200).json(stats);
  } catch (error: any) {
    console.error("Message stats error:", error);
    res.status(500).json({ error: error.message || "Failed to get message statistics" });
  }
}

/**
 * Get session statistics
 */
export async function getSessionStats(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { period = "30" } = req.query;
    const days = parseInt(period as string, 10);
    
    const stats = await analyticsService.getSessionStatsByDay(days);
    
    res.status(200).json(stats);
  } catch (error: any) {
    console.error("Session stats error:", error);
    res.status(500).json({ error: error.message || "Failed to get session statistics" });
  }
}

/**
 * Get user activity statistics
 */
export async function getUserActivityStats(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { period = "30" } = req.query;
    const days = parseInt(period as string, 10);
    
    const stats = await analyticsService.getUserActivityStats(days);
    
    res.status(200).json(stats);
  } catch (error: any) {
    console.error("User activity stats error:", error);
    res.status(500).json({ error: error.message || "Failed to get user activity statistics" });
  }
}

/**
 * Get tool usage statistics
 */
export async function getToolUsageStats(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { period = "30" } = req.query;
    const days = parseInt(period as string, 10);
    
    const stats = await analyticsService.getToolUsageStats(days);
    
    res.status(200).json(stats);
  } catch (error: any) {
    console.error("Tool usage stats error:", error);
    res.status(500).json({ error: error.message || "Failed to get tool usage statistics" });
  }
}