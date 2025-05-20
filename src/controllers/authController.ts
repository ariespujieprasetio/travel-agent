import { Request, Response } from "express";
import * as authService from "../services/authService";
import { AuthRequest } from "../middleware/auth";

/**
 * Login a user
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, rememberMe } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    
    const result = await authService.loginUser(email, password, rememberMe);
    
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(401).json({ error: error.message || "Authentication failed" });
  }
}

/**
 * Register a new user
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name, rememberMe } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    
    const result = await authService.registerUser(email, password, name, rememberMe);
    
    res.status(201).json(result);
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(400).json({ error: error.message || "Registration failed" });
  }
}
/**
 * Get the current user's profile
 */
export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    // The user object is attached by the auth middleware
    const user = req.user;
    
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    res.status(200).json({ user });
  } catch (error: any) {
    console.error("Profile error:", error);
    res.status(500).json({ error: "Server error" });
  }
}