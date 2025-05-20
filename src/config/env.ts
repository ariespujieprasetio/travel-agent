// src/config/env.ts (updated)

import dotenv from "dotenv";
dotenv.config();

// Environment variables
export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
  },
  google: {
    apiKey: process.env.GOOGLE_API_KEY || "",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "default-secret-key-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  server: {
    port: parseInt(process.env.PORT || "5600", 10),
    baseUrl: process.env.BASE_URL || "http://localhost:5600",
  },
  database: {
    url: process.env.DATABASE_URL || "",
  },
  security: {
    enableIpWhitelist: process.env.ENABLE_IP_WHITELIST === "true",
    // For development convenience, you can add default allowed IPs
    defaultAllowedIps: (process.env.DEFAULT_ALLOWED_IPS || "127.0.0.1,::1").split(",")
  },
  email: {
    host: process.env.EMAIL_HOST || "smtp.example.com",
    port: parseInt(process.env.EMAIL_PORT || "587", 10),
    secure: process.env.EMAIL_SECURE === "true",
    username: process.env.EMAIL_USERNAME || "",
    password: process.env.EMAIL_PASSWORD || "",
    fromAddress: process.env.EMAIL_FROM || "support@travelagent.com",
  }
};

// Validate environment variables
export function validateEnv() {
  const requiredEnvVars = [
    "OPENAI_API_KEY", 
    "GOOGLE_API_KEY", 
    "DATABASE_URL", 
    "JWT_SECRET"
  ];
  
  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );
  
  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(", ")}`
    );
  }
}