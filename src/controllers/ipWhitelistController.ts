// src/controllers/ipWhitelistController.ts

import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../models/prisma";
import { config } from "../config/env";
import * as ipWhitelistService from "../services/ipWhitelistService";
import * as ipWhitelistBulkManager from "../utils/ipWhitelistBulkManager";
import fs from "fs";

/**
 * Get all whitelisted IP addresses
 */
export async function getWhitelistedIps(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const ips = await prisma.ipWhitelist.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    
    res.status(200).json(ips);
  } catch (error: any) {
    console.error("Error fetching IP whitelist:", error);
    res.status(500).json({ error: error.message || "Failed to fetch IP whitelist" });
  }
}

/**
 * Add an IP address to the whitelist
 */
export async function addIpToWhitelist(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { ipAddress, description } = req.body;
    
    if (!ipAddress) {
      res.status(400).json({ error: "IP address is required" });
      return;
    }
    
    // Validate IP format (basic validation)
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    if (!ipv4Regex.test(ipAddress) && !ipv6Regex.test(ipAddress)) {
      res.status(400).json({ error: "Invalid IP address format" });
      return;
    }
    
    // Check if IP already exists
    const existingIp = await prisma.ipWhitelist.findFirst({
      where: { ipAddress },
    });
    
    if (existingIp) {
      // Update the existing entry instead of creating a new one
      const updatedIp = await prisma.ipWhitelist.update({
        where: { id: existingIp.id },
        data: {
          description: description || existingIp.description,
          active: true, // Reactivate if it was disabled
          updatedAt: new Date(),
        },
      });
      
      res.status(200).json({
        message: "IP address already exists and has been updated",
        ip: updatedIp,
      });
      return;
    }
    
    // Create new whitelist entry
    const newIp = await prisma.ipWhitelist.create({
      data: {
        ipAddress,
        description,
        active: true,
      },
    });
    
    res.status(201).json({
      message: "IP address added to whitelist",
      ip: newIp,
    });
  } catch (error: any) {
    console.error("Error adding IP to whitelist:", error);
    res.status(500).json({ error: error.message || "Failed to add IP to whitelist" });
  }
}

/**
 * Remove an IP address from the whitelist
 */
export async function removeIpFromWhitelist(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({ error: "IP whitelist ID is required" });
      return;
    }
    
    const ip = await prisma.ipWhitelist.findUnique({
      where: { id },
    });
    
    if (!ip) {
      res.status(404).json({ error: "IP whitelist entry not found" });
      return;
    }
    
    // Delete the IP from the whitelist
    await prisma.ipWhitelist.delete({
      where: { id },
    });
    
    res.status(200).json({
      message: "IP address removed from whitelist",
    });
  } catch (error: any) {
    console.error("Error removing IP from whitelist:", error);
    res.status(500).json({ error: error.message || "Failed to remove IP from whitelist" });
  }
}

/**
 * Update an IP whitelist entry (activate/deactivate)
 */
export async function updateIpWhitelistStatus(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const { active, description } = req.body;
    
    if (!id) {
      res.status(400).json({ error: "IP whitelist ID is required" });
      return;
    }
    
    const ip = await prisma.ipWhitelist.findUnique({
      where: { id },
    });
    
    if (!ip) {
      res.status(404).json({ error: "IP whitelist entry not found" });
      return;
    }
    
    // Update the IP whitelist entry
    const updatedIp = await prisma.ipWhitelist.update({
      where: { id },
      data: {
        active: active !== undefined ? active : ip.active,
        description: description !== undefined ? description : ip.description,
        updatedAt: new Date(),
      },
    });
    
    res.status(200).json({
      message: "IP whitelist entry updated",
      ip: updatedIp,
    });
  } catch (error: any) {
    console.error("Error updating IP whitelist entry:", error);
    res.status(500).json({ error: error.message || "Failed to update IP whitelist entry" });
  }
}

/**
 * Get the whitelist status (enabled/disabled)
 */
export async function getWhitelistStatus(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    res.status(200).json({
      enabled: config.security.enableIpWhitelist,
    });
  } catch (error: any) {
    console.error("Error getting whitelist status:", error);
    res.status(500).json({ error: error.message || "Failed to get whitelist status" });
  }
}

/**
 * Bulk add IP addresses to the whitelist
 */
export async function bulkAddIpsToWhitelist(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { ips } = req.body;
    
    if (!Array.isArray(ips) || ips.length === 0) {
      res.status(400).json({ error: "Invalid IP address list" });
      return;
    }
    
    const results = await ipWhitelistService.bulkAddIpsToWhitelist(ips);
    
    res.status(200).json({
      message: `${results.length} IP addresses processed`,
      results
    });
  } catch (error: any) {
    console.error("Error bulk adding IPs to whitelist:", error);
    res.status(500).json({ error: error.message || "Failed to add IPs to whitelist" });
  }
}

/**
 * Bulk remove IP addresses from the whitelist
 */
export async function bulkRemoveIpsFromWhitelist(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "Invalid ID list" });
      return;
    }
    
    const result = await ipWhitelistService.bulkRemoveIpsFromWhitelist(ids);
    
    res.status(200).json({
      message: `${result.count} IP addresses removed`
    });
  } catch (error: any) {
    console.error("Error bulk removing IPs from whitelist:", error);
    res.status(500).json({ error: error.message || "Failed to remove IPs from whitelist" });
  }
}

/**
 * Bulk update IP whitelist status
 */
export async function bulkUpdateIpWhitelistStatus(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { ids, active } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0 || typeof active !== "boolean") {
      res.status(400).json({ error: "Invalid request parameters" });
      return;
    }
    
    const result = await ipWhitelistService.bulkUpdateIpWhitelistStatus(ids, { active });
    
    res.status(200).json({
      message: `${result.count} IP addresses updated`
    });
  } catch (error: any) {
    console.error("Error bulk updating IP whitelist status:", error);
    res.status(500).json({ error: error.message || "Failed to update IP whitelist status" });
  }
}

/**
 * Import IP addresses from file
 */
export async function importIpsFromFile(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    // This would typically be handled by a file upload middleware
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    
    const results = await ipWhitelistBulkManager.importIpsFromFile(req.file.path);
    
    res.status(200).json({
      message: `${results.length} IP addresses processed`,
      results
    });
  } catch (error: any) {
    console.error("Error importing IPs from file:", error);
    res.status(500).json({ error: error.message || "Failed to import IPs from file" });
  }
}

/**
 * Export IP addresses to file
 */
export async function exportIpsToFile(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const filePath = `ip_whitelist_export_${Date.now()}.csv`;
    
    const success = await ipWhitelistBulkManager.exportIpsToFile(filePath);
    
    if (success) {
      // Send the file as a download
      res.download(filePath, (err) => {
        if (err) {
          console.error("Error sending file:", err);
        }
        
        // Delete the file after sending
        fs.unlinkSync(filePath);
      });
    } else {
      res.status(500).json({ error: "Failed to export IPs to file" });
    }
  } catch (error: any) {
    console.error("Error exporting IPs to file:", error);
    res.status(500).json({ error: error.message || "Failed to export IPs to file" });
  }
}