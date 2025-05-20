// src/server.ts

import { createServer } from 'http';
import app from './app';
import { Server } from 'socket.io';
import socketAuth from './middleware/socketAuth';
import { handleChatMessage } from './controllers/chatController';
import { PORT } from './utils/config';

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5600',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Use authentication middleware for Socket.io
io.use(socketAuth);

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.data.user.username}`);

  socket.on('chat message', async (msg: string) => {
    await handleChatMessage(socket, msg);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.data.user.username}`);
  });
});

// Start the server
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
