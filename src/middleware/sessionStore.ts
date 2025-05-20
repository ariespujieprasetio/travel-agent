// src/middleware/sessionStore.ts
import session from 'express-session';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import prisma from '../utils/prisma';

const sessionStore = new PrismaSessionStore(prisma as any, {
  checkPeriod: 2 * 60 * 1000, // Remove expired sessions every 2 minutes
  dbRecordIdIsSessionId: true,
  dbRecordIdFunction: undefined,
});

export default sessionStore;