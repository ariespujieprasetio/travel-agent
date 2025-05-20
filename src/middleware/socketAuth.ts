// src/middleware/socketAuth.ts
import { Socket } from 'socket.io';
import prisma from '../utils/prisma';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';

const socketAuth = async (socket: Socket, next: (err?: Error) => void): Promise<void> => {
  try {
    // Extract token from the socket's handshake headers
    const authHeader = socket.handshake.auth.token || socket.handshake.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    // Verify the token
    const decoded = verifyToken(token);

    // Find the user in the database
    const user = await prisma.user.findUnique({
      where: { 
        id: decoded.sub 
      },
      select: {
        id: true,
        username: true
      }
    });

    if (!user) {
      return next(new Error('User not found'));
    }

    // Attach user to socket data
    socket.data.user = user;
    next();
  } catch (error) {
    // Handle different authentication errors
    if (error instanceof Error) {
      next(error);
    } else {
      next(new Error('Authentication failed'));
    }
  }
};

export default socketAuth;