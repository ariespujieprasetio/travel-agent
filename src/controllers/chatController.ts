// src/controllers/chatController.ts

import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import * as chatService from "../services/chatService";
import prisma from "../models/prisma";

/**
 * Create a new chat session
 */
export async function createSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    const session = await chatService.createChatSession(req.user.userId);
    
    res.status(201).json(session);
  } catch (error: any) {
    console.error("Create session error:", error);
    res.status(500).json({ error: error.message || "Failed to create chat session" });
  }
}

/**
 * Get all chat sessions for the current user
 */
export async function getSessions(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    const sessions = await chatService.getChatSessions(req.user.userId);
    
    res.status(200).json(sessions);
  } catch (error: any) {
    console.error("Get sessions error:", error);
    res.status(500).json({ error: error.message || "Failed to get chat sessions" });
  }
}

/**
 * Get a specific chat session with messages
 */
export async function getSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    const { sessionId } = req.params;
    const session = await chatService.getChatSession(sessionId);
    
    if (!session) {
      res.status(404).json({ error: "Chat session not found" });
      return;
    }
    
    // Check if this session belongs to the current user
    if (session.userId !== req.user.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    
    res.status(200).json(session);
  } catch (error: any) {
    console.error("Get session error:", error);
    res.status(500).json({ error: error.message || "Failed to get chat session" });
  }
}

/**
 * Delete a chat session
 */
export async function deleteSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    const { sessionId } = req.params;
    const session = await chatService.getChatSession(sessionId);
    
    if (!session) {
      res.status(404).json({ error: "Chat session not found" });
      return;
    }
    
    // Check if this session belongs to the current user
    if (session.userId !== req.user.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    
    // Delete the session and all messages
    await prisma.message.deleteMany({
      where: { sessionId },
    });
    
    await prisma.chatSession.delete({
      where: { id: sessionId },
    });
    
    res.status(200).json({ message: "Chat session deleted" });
  } catch (error: any) {
    console.error("Delete session error:", error);
    res.status(500).json({ error: error.message || "Failed to delete chat session" });
  }
}

/**
 * Update a chat session's title and tagline manually
 */
export async function updateSessionTitle(req: AuthRequest, res: Response): Promise<void> {
  console.log("Request headers:", req.headers);
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    const { sessionId } = req.params;
    const { title, tagline } = req.body;
    
    if (!title && !tagline) {
      res.status(400).json({ error: "Title or tagline must be provided" });
      return;
    }
    
    const session = await chatService.getChatSession(sessionId);
    
    if (!session) {
      res.status(404).json({ error: "Chat session not found" });
      return;
    }
    
    // Check if this session belongs to the current user
    if (session.userId !== req.user.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    
    // Update fields that were provided
    const updateData: any = {};
    if (title) updateData.title = title;
    if (tagline) updateData.tagline = tagline;
    
    const updatedSession = await prisma.chatSession.update({
      where: { id: sessionId },
      data: updateData
    });
    
    res.status(200).json(updatedSession);
  } catch (error: any) {
    console.error("Update session title error:", error);
    res.status(500).json({ error: error.message || "Failed to update session title" });
  }
}


/**
 * Convert a temporary session to a permanent one
 * This endpoint specifically handles converting unsaved sessions to saved ones
 */
export async function saveTemporarySession(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    const { sessionId } = req.params;
    
    // First verify the session belongs to this user
    const session = await chatService.getChatSession(sessionId);
    
    if (!session) {
      res.status(404).json({ error: "Chat session not found" });
      return;
    }
    
    // Check if this session belongs to the current user
    if (session.userId !== req.user.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    
    // If the session is already saved, return a 400 error
    if (session.save) {
      res.status(400).json({ 
        error: "Session is already saved", 
        session: session 
      });
      return;
    }
    
    // Update the session to be saved
    const updatedSession = await chatService.saveTemporarySession(sessionId);
    
    if (!updatedSession) {
      res.status(400).json({ error: "Failed to save session" });
      return;
    }
    
    res.status(200).json({
      message: "Temporary session successfully saved",
      session: updatedSession
    });
  } catch (error: any) {
    console.error("Save temporary session error:", error);
    res.status(500).json({ error: error.message || "Failed to save temporary session" });
  }
}

/**
 * Toggle the save flag for a chat session
 * This endpoint toggles between saved (save=true) and temporary (save=false) states
 */
export async function toggleSessionSaveFlag(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    const { sessionId } = req.params;
    
    // First verify the session belongs to this user
    const session = await chatService.getChatSession(sessionId);
    
    if (!session) {
      res.status(404).json({ error: "Chat session not found" });
      return;
    }
    
    // Check if this session belongs to the current user
    if (session.userId !== req.user.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    
    // Toggle the session's save flag
    const updatedSession = await chatService.toggleSessionSaveFlag(sessionId);
    
    const statusMessage = updatedSession.save 
      ? "Session has been saved" 
      : "Session has been marked as temporary";
    
    res.status(200).json({
      message: statusMessage,
      session: updatedSession
    });
  } catch (error: any) {
    console.error("Toggle session save flag error:", error);
    res.status(500).json({ error: error.message || "Failed to toggle session save flag" });
  }
}