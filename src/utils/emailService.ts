// src/utils/emailService.ts

import nodemailer from 'nodemailer';
import { config } from '../config/env';

// Create reusable transporter
let transporter: nodemailer.Transporter;

/**
 * Initialize the email transporter
 */
export function initializeEmailService(): void {
  // Create transporter based on configuration
  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
      user: config.email.username,
      pass: config.email.password,
    },
  });
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  try {
    // Make sure transporter is initialized
    if (!transporter) {
      initializeEmailService();
    }

    const mailOptions = {
      from: `"Travel Agent Support" <${config.email.fromAddress}>`,
      to,
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #4CAF50; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 4px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p>If you didn't request to reset your password, you can safely ignore this email.</p>
          <p>This link will expire in 1 hour for security reasons.</p>
          <hr>
          <p style="font-size: 12px; color: #666;">
            Travel Agent Support Team<br>
            This is an automated message, please do not reply.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

/**
 * Send a password changed confirmation email
 */
export async function sendPasswordChangedEmail(to: string): Promise<boolean> {
  try {
    // Make sure transporter is initialized
    if (!transporter) {
      initializeEmailService();
    }

    const mailOptions = {
      from: `"Travel Agent Support" <${config.email.fromAddress}>`,
      to,
      subject: 'Your Password Has Been Changed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Changed Successfully</h2>
          <p>Your password for the Travel Agent application has been successfully changed.</p>
          <p>If you didn't make this change, please contact our support team immediately.</p>
          <hr>
          <p style="font-size: 12px; color: #666;">
            Travel Agent Support Team<br>
            This is an automated message, please do not reply.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending password changed email:', error);
    return false;
  }
}