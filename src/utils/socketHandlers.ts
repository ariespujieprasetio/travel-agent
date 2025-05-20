import { Server, Socket } from "socket.io";
import { verifyToken } from "./jwt";
import * as chatService from "../services/chatService";
import * as documentConverter from "./documentConverter";
import * as fs from 'fs';
import * as path from 'path';
import { generateSessionTitle } from "../services/titleGeneratorService";

interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    email: string;
  };
}

/**
 * Set up WebSocket connection handlers
 */
export function setupSocketHandlers(io: Server): void {
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log("A user connected with socket ID:", socket.id);

    // Attach authentication middleware to the socket
    authenticateSocket(socket);

    // Handle document uploads
    socket.on("upload_document", async (data: any) => {
      try {
        const { sessionId, fileData, fileName, fileType } = data;

        // Verify the user has access to this session
        const userData = socket.user;
        if (!userData) {
          socket.emit(`error-${sessionId}`, "Authentication required");
          return;
        }

        // Create a buffer from the base64 data
        const buffer = Buffer.from(fileData, 'base64');

        // Save the file to disk
        const filePath = path.join(uploadsDir, `${Date.now()}-${fileName}`);
        fs.writeFileSync(filePath, buffer);

        console.log(`File saved: ${filePath}`);

        // Check if this is a supported file type
        if (!documentConverter.isSupportedFileType(filePath)) {
          socket.emit(`error-${sessionId}`, `Unsupported file type: ${path.extname(fileName)}`);

          // Clean up the file
          fs.unlinkSync(filePath);
          return;
        }

        // Convert the document to text
        const text = await documentConverter.convertDocument(filePath, 'text');

        // Get file info
        const fileInfo = documentConverter.getFileInfo(filePath);

        // Create a message for the user's document upload
        const message = `[Uploaded ${fileInfo.extension.toUpperCase()} file: ${fileInfo.name}]\n\nContent:\n${text}`;

        // Process the message using chatService
        await chatService.processMessage(sessionId, message, (t, d) => io.emit(t, d));

        // Clean up the file after processing
        fs.unlinkSync(filePath);

        // Optionally remove the file after processing
        // fs.unlinkSync(filePath);
      } catch (error) {
        console.error("Error handling document upload:", error);
        socket.emit("error", "Failed to process document");
      }
    });

    // Handle chat messages (existing code)
    socket.on("chat message", async (data: string) => {
      try {
        const { id: sessionId, msg: message, updateTitle } = JSON.parse(data);

        // Verify the user has access to this session
        const userData = socket.user;
        if (!userData) {
          socket.emit(`error-${sessionId}`, "Authentication required");
          return;
        }

        // Check if this is a new session
        const isNewSession = await chatService.getChatSession(sessionId)
          .then(session => !session);

        if (updateTitle) {
          const title = await generateSessionTitle(message);

          await chatService.updateTitle(sessionId, title.title, title.tagline);

          io.emit(`update-title-tagline-${sessionId}`, title)
        }

        if (isNewSession) {


          // Initialize the chat with a system message
          await chatService.initializeChat(sessionId, (t, d) => {

            io.emit(t, d)
          });
        } else {
          // Process the message
          await chatService.processMessage(
            sessionId,
            message,
            (t, d) => io.emit(t, d)
          );
        }
      } catch (error) {
        console.error("Error handling chat message:", error);
        socket.emit("error", "Failed to process message");
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
}

/**
 * Authentication middleware for WebSocket connections
 */
function authenticateSocket(socket: AuthenticatedSocket): void {
  try {
    // Get token from headers or query parameters
    const token = socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.split(" ")[1] ||
      socket.handshake.query.token;

    if (!token) {
      console.log("No token provided for socket:", socket.id);
      return;
    }

    // Verify the token
    const payload = verifyToken(token as string);

    if (payload) {
      // Attach user data to the socket for later use
      socket.user = {
        userId: payload.userId,
        email: payload.email,
      };

      console.log(`Socket ${socket.id} authenticated for user ${payload.email}`);
    }
  } catch (error) {
    console.error("Socket authentication error:", error);
  }
}