// src/types/express-session/index.d.ts

import 'express-session';

declare module 'express-session' {
  interface SessionData {
    passport?: { user: number }; // Adjust 'number' to the actual type of your user ID
  }
}