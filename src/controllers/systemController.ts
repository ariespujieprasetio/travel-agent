// src/controllers/systemController.ts

import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import * as systemService from "../services/systemService";

/**
 * Get system health information
 */
export async function getSystemHealth(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const health = await systemService.getSystemHealth();
    res.status(200).json(health);
  } catch (error: any) {
    console.error("System health error:", error);
    res.status(500).json({ error: error.message || "Failed to get system health" });
  }
}

/**
 * Get application configuration
 */
export async function getSystemConfig(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const config = await systemService.getSystemConfig();
    res.status(200).json(config);
  } catch (error: any) {
    console.error("System config error:", error);
    res.status(500).json({ error: error.message || "Failed to get system configuration" });
  }
}

/**
 * Update application configuration
 */
export async function updateSystemConfig(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { config } = req.body;
    
    if (!config) {
      res.status(400).json({ error: "Configuration data is required" });
      return;
    }
    
    const updatedConfig = await systemService.updateSystemConfig(config);
    res.status(200).json(updatedConfig);
  } catch (error: any) {
    console.error("Update system config error:", error);
    res.status(500).json({ error: error.message || "Failed to update system configuration" });
  }
}

/**
 * Run database maintenance
 */
export async function runDatabaseMaintenance(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const result = await systemService.runDatabaseMaintenance();
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Database maintenance error:", error);
    res.status(500).json({ error: error.message || "Failed to run database maintenance" });
  }
}

/**
 * Clear expired sessions and logs
 */
export async function clearExpiredData(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const result = await systemService.clearExpiredData();
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Clear expired data error:", error);
    res.status(500).json({ error: error.message || "Failed to clear expired data" });
  }
}

/**
 * Get system logs
 */
export async function getSystemLogs(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { level = "info", limit = "100", page = "1" } = req.query;
    
    const logs = await systemService.getSystemLogs(
      level as string,
      parseInt(limit as string, 10),
      parseInt(page as string, 10)
    );
    
    res.status(200).json(logs);
  } catch (error: any) {
    console.error("Get system logs error:", error);
    res.status(500).json({ error: error.message || "Failed to get system logs" });
  }
}