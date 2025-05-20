// src/services/passwordResetService.ts

import { randomBytes } from 'crypto';
import prisma from '../models/prisma';
import bcrypt from 'bcrypt';
import { sendPasswordResetEmail } from '../utils/emailService';
import { config } from '../config/env';

/**
 * Interface for password reset record
 */
interface PasswordResetData {
  email: string;
  token: string;
  expiresAt: Date;
}

/**
 * Generate and store a password reset token for a user
 */
export async function createPasswordResetToken(email: string): Promise<boolean> {
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal that the user doesn't exist for security reasons
      return false;
    }

    // Generate random token
    const token = randomBytes(32).toString('hex');
    
    // Set expiration (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Store in database
    await prisma.systemConfig.upsert({
      where: { key: `password_reset_${email}` },
      update: {
        value: JSON.stringify({ token, expiresAt }),
        updatedAt: new Date()
      },
      create: {
        key: `password_reset_${email}`,
        value: JSON.stringify({ token, expiresAt }),
        description: 'Password reset token',
        updatedAt: new Date()
      }
    });

    // Send email
    const resetUrl = `${config.server.baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    await sendPasswordResetEmail(email, resetUrl);

    return true;
  } catch (error) {
    console.error('Error creating password reset token:', error);
    return false;
  }
}

/**
 * Validate a password reset token
 */
export async function validatePasswordResetToken(email: string, token: string): Promise<boolean> {
  try {
    const resetRecord = await prisma.systemConfig.findUnique({
      where: { key: `password_reset_${email}` }
    });

    if (!resetRecord) {
      return false;
    }

    const resetData = JSON.parse(resetRecord.value) as { token: string, expiresAt: string };
    const expiresAt = new Date(resetData.expiresAt);

    // Check if token matches and is not expired
    if (resetData.token !== token || expiresAt < new Date()) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating password reset token:', error);
    return false;
  }
}

/**
 * Reset a user's password using a valid token
 */
export async function resetPassword(email: string, token: string, newPassword: string): Promise<boolean> {
  try {
    // Validate token first
    const isValid = await validatePasswordResetToken(email, token);
    
    if (!isValid) {
      return false;
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    // Delete the used token
    await prisma.systemConfig.delete({
      where: { key: `password_reset_${email}` }
    });

    return true;
  } catch (error) {
    console.error('Error resetting password:', error);
    return false;
  }
}