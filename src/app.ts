// src/app.ts (updated)

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { validateEnv, config } from "./config/env";
import authRoutes from "./routes/authRoutes";
import chatRoutes from "./routes/chatRoutes";
import ipWhitelistRoutes from "./routes/ipWhitelistRoutes";
import passwordResetRoutes from "./routes/passwordResetRoutes";
import profileRoutes from "./routes/profileRoutes"; // Add profile routes
import { setupSocketHandlers } from "./utils/socketHandlers";
import { checkIpWhitelist, socketIpWhitelist } from "./middleware/ipWhitelist";
import dashboardRoutes from "./routes/dashboardRoutes";
import adminRoutes from "./routes/adminRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import systemRoutes from "./routes/systemRoutes";
import { initializeEmailService } from "./utils/emailService"; // Add email service initialization

// Validate environment variables
validateEnv();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize email service
initializeEmailService();

// Apply IP whitelist middleware if enabled
if (config.security.enableIpWhitelist) {
  console.log("IP Whitelist protection enabled");
  app.use(checkIpWhitelist);
}

// Serve static files
app.use(express.static(path.join(__dirname, "../public")));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/ip-whitelist", ipWhitelistRoutes);
app.use("/api/password-reset", passwordResetRoutes);
app.use("/api/profile", profileRoutes); // Add profile routes
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/system", systemRoutes);

// Basic route for the web interface
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Create HTTP server
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins in development
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Apply socket IP whitelist middleware if enabled
if (config.security.enableIpWhitelist) {
  io.use(socketIpWhitelist);
}

// Set up WebSocket handlers
setupSocketHandlers(io);

// Start the server
const PORT = config.server.port;
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`IP Whitelist protection: ${config.security.enableIpWhitelist ? "Enabled" : "Disabled"}`);
});

export { app, httpServer };