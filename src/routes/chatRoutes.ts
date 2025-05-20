// src/routes/chatRoutes.ts

import express from "express";
import * as chatController from "../controllers/chatController";
import { authenticate } from "../middleware/auth";

const router = express.Router();

// All chat routes are protected
router.use(authenticate);

/**
 * @route POST /api/chat/sessions
 * @description Create a new chat session
 * @body {boolean} save - Whether to save this session (default: true)
 * @returns {object} The created chat session
 */
router.post("/sessions", (req, res) => chatController.createSession(req, res));

/**
 * @route GET /api/chat/sessions
 * @description Get chat sessions for the current user
 * @query {boolean} include_temp - Include temporary sessions (default: false)
 * @query {boolean} save - Filter by save status (true: saved only, false: temporary only, omit: based on include_temp)
 * @query {number} limit - Number of sessions to return for pagination
 * @query {number} offset - Offset for pagination
 * @returns {object} { sessions: [], totalCount: number, hasMore: boolean }
 */
router.get("/sessions", (req, res) => chatController.getSessions(req, res));

/**
 * @route GET /api/chat/sessions/:sessionId
 * @description Get a specific chat session with messages
 * @param {string} sessionId - The ID of the chat session
 * @returns {object} The chat session with messages
 */
router.get("/sessions/:sessionId", (req, res) => chatController.getSession(req, res));

/**
 * @route DELETE /api/chat/sessions/:sessionId
 * @description Delete a chat session
 * @param {string} sessionId - The ID of the chat session
 * @returns {object} Success message
 */
router.delete("/sessions/:sessionId", (req, res) => chatController.deleteSession(req, res));

/**
 * @route PATCH /api/chat/sessions/:sessionId/title
 * @description Update a chat session's title and tagline
 * @param {string} sessionId - The ID of the chat session
 * @body {string} title - The new title
 * @body {string} tagline - The new tagline
 * @returns {object} The updated chat session
 */
router.patch("/sessions/:sessionId", authenticate, (req, res) => chatController.updateSessionTitle(req, res));

/**
 * @route PATCH /api/chat/sessions/:sessionId/save
 * @description Update the save flag for a chat session
 * @param {string} sessionId - The ID of the chat session
 * @body {boolean} save - Whether to save this session
 * @returns {object} The updated chat session
 */

/**
 * @route POST /api/chat/sessions/:sessionId/save-temporary
 * @description Convert a temporary session (save=false) to a permanent one (save=true)
 * @param {string} sessionId - The ID of the chat session
 * @returns {object} The updated chat session
 */
router.post("/sessions/:sessionId/save-temporary", (req, res) => 
  chatController.saveTemporarySession(req, res)
);

router.put("/sessions/:sessionId/toggle-save", (req, res) => 
    chatController.toggleSessionSaveFlag(req, res)
  );

export default router;