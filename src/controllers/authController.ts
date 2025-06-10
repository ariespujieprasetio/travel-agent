import { Request, Response } from "express";
import * as authService from "../services/authService";
import { AuthRequest } from "../middleware/auth";
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); // Gantilah dengan Client ID Google Anda

// Fungsi untuk menangani autentikasi Google
export const handleGoogleAuth = async (req: Request, res: Response): Promise<void> => {
  const token = req.query.token as string;
const action = req.query.action as string;  // 'login' or 'register'

  if (!token) {
    res.status(400).json({ message: 'Token not provided' });
    return;
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.name) {
      res.status(400).json({ message: 'Invalid token payload' });
      return;
    }

    let user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      // You don't need to hash a password here if you're using Google login only
      user = await prisma.user.create({
        data: {
          name: payload.name,
          email: payload.email,
          password: '', // Optional, can leave as empty string if not using password
        },
      });
    }

    const authToken = jwt.sign(
      { userId: user.id, email: user.email },
      'q7Y2d3$eK1r@PqW!LxA0VsN5BmUzT8Jh',
      { expiresIn: '7h' }
    );

    res.json({
      success: true,
      message: 'User authenticated successfully',
      token: authToken,
      user: {
        name: user.name,
        email: user.email,
      },
    });

  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(400).json({ message: 'Invalid token' });
  }
};

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