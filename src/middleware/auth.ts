import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

/**
 * Middleware to authenticate requests using JWT
 */
export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized - No token provided" });
      return;
    }
    
    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);
    
    if (!payload) {
      res.status(401).json({ error: "Unauthorized - Invalid token" });
      return;
    }
    
    // Attach user info to request object
    req.user = {
      userId: payload.userId,
      email: payload.email,
    };
    
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
}