// src/middleware/ipWhitelist.ts

import { Request, Response, NextFunction } from "express";
import prisma from "../models/prisma";
import { config } from "../config/env";

/**
 * Middleware to check if the requesting IP is in the whitelist
 */
export async function checkIpWhitelist(
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  // Skip IP check if whitelist is disabled in config
  if (!config.security.enableIpWhitelist) {
    return next();
  }

  try {
    // Get client IP address
    const ip = getClientIp(req);
    
    if (!ip) {
      res.status(400).json({ error: "Could not determine client IP address" });
      return;
    }

    // Query the database for the IP address
    const whitelistedIp = await prisma.ipWhitelist.findFirst({
      where: {
        ipAddress: ip,
        active: true
      }
    });

    if (!whitelistedIp) {
      // IP is not in the whitelist
      console.log(`Access denied for IP: ${ip}`);
      res.status(403).json({ 
        error: "Access denied",
        message: "Your IP address is not whitelisted"
      });
      return;
    }

    // IP is whitelisted, proceed to the next middleware
    next();
  } catch (error) {
    console.error("IP whitelist check error:", error);
    // If there's an error checking the whitelist, default to allowing the request
    // You might want to change this behavior based on your security requirements
    next();
  }
}

/**
 * Helper function to get the client's IP address
 */
function getClientIp(req: Request): string | undefined {
  // Check X-Forwarded-For header (when behind a proxy like Nginx)
  const forwardedFor = req.headers['x-forwarded-for'];
  
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, the client IP is the first one
    const ips = Array.isArray(forwardedFor) 
      ? forwardedFor[0] 
      : forwardedFor.split(',')[0].trim();
    return ips;
  }
  
  // If no X-Forwarded-For header, use the connection's remote address
  return req.socket.remoteAddress;
}

/**
 * Socket.IO middleware for IP whitelist checks
 */
export async function socketIpWhitelist(
  socket: any,
  next: (err?: Error) => void
): Promise<void> {
  // Skip IP check if whitelist is disabled in config
  if (!config.security.enableIpWhitelist) {
    return next();
  }

  try {
    // Get client IP address
    const ip = socket.handshake.address;
    
    if (!ip) {
      return next(new Error("Could not determine client IP address"));
    }

    // Query the database for the IP address
    const whitelistedIp = await prisma.ipWhitelist.findFirst({
      where: {
        ipAddress: ip,
        active: true
      }
    });

    if (!whitelistedIp) {
      // IP is not in the whitelist
      console.log(`Socket connection denied for IP: ${ip}`);
      return next(new Error("Your IP address is not whitelisted"));
    }

    // IP is whitelisted, proceed
    next();
  } catch (error) {
    console.error("Socket IP whitelist check error:", error);
    // If there's an error checking the whitelist, default to allowing the connection
    // You might want to change this behavior based on your security requirements
    next();
  }
}