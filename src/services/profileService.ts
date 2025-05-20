// src/services/profileService.ts

import bcrypt from "bcrypt";
import prisma from "../models/prisma";
import { sendPasswordChangedEmail } from "../utils/emailService";

/**
 * Change user's password
 * @param userId User ID
 * @param currentPassword Current password for verification
 * @param newPassword New password to set
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message?: string }> {
  try {
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true
      }
    });
    
    if (!user) {
      return { 
        success: false, 
        message: "User not found" 
      };
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return { 
        success: false, 
        message: "Current password is incorrect" 
      };
    }
    
    // Validate new password
    if (newPassword.length < 8) {
      return { 
        success: false, 
        message: "New password must be at least 8 characters long" 
      };
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user's password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });
    
    // Send confirmation email
    await sendPasswordChangedEmail(user.email);
    
    return { 
      success: true,
      message: "Password changed successfully" 
    };
  } catch (error) {
    console.error("Error changing password:", error);
    return { 
      success: false, 
      message: "An error occurred while changing password" 
    };
  }
}

/**
 * Update user profile information
 * @param userId User ID
 * @param profileData Profile data to update
 */
export async function updateUserProfile(
  userId: string,
  profileData: {
    name?: string;
    email?: string;
  }
): Promise<{ success: boolean; message?: string; user?: any }> {
  try {
    // Validate input
    if (profileData.email) {
      // Check if email is valid
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profileData.email)) {
        return {
          success: false,
          message: "Invalid email format"
        };
      }
      
      // Check if email is already in use by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          email: profileData.email,
          id: { not: userId }
        }
      });
      
      if (existingUser) {
        return {
          success: false,
          message: "Email is already in use by another account"
        };
      }
    }
    
    // Update user data
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: profileData.name,
        email: profileData.email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        isAdmin: true
      }
    });
    
    return {
      success: true,
      message: "Profile updated successfully",
      user: updatedUser
    };
  } catch (error) {
    console.error("Error updating user profile:", error);
    return {
      success: false,
      message: "An error occurred while updating profile"
    };
  }
}