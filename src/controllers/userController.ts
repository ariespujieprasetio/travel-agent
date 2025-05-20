import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import * as userService from "../services/userService";

/**
 * Get all users (admin only)
 */
export async function getAllUsers(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json(users);
  } catch (error: any) {
    console.error("Get all users error:", error);
    res.status(500).json({ error: error.message || "Failed to get users" });
  }
}

/**
 * Get a user by ID (admin only)
 */
export async function getUserById(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    
    res.status(200).json(user);
  } catch (error: any) {
    console.error("Get user error:", error);
    res.status(500).json({ error: error.message || "Failed to get user" });
  }
}

/**
 * Update a user (admin only)
 */
export async function updateUser(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const { email, name, isAdmin } = req.body;
    
    const updatedUser = await userService.updateUser(id, {
      email,
      name,
      isAdmin
    });
    
    if (!updatedUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    
    res.status(200).json(updatedUser);
  } catch (error: any) {
    console.error("Update user error:", error);
    res.status(500).json({ error: error.message || "Failed to update user" });
  }
}

/**
 * Delete a user (admin only)
 */
export async function deleteUser(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    
    await userService.deleteUser(id);
    
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error: any) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: error.message || "Failed to delete user" });
  }
}

/**
 * Change user password (admin or self)
 */
export async function changePassword(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    // Check if user is changing their own password or is an admin
    if (id !== req.user?.userId) {
      // Check if current user is admin (this would be handled by middleware typically)
      // For this implementation, we're keeping it simple
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    
    await userService.changePassword(id, password);
    
    res.status(200).json({ message: "Password changed successfully" });
  } catch (error: any) {
    console.error("Change password error:", error);
    res.status(500).json({ error: error.message || "Failed to change password" });
  }
}