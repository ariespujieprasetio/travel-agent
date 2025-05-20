import jwt from "jsonwebtoken";
import { config } from "../config/env";
import ms, { StringValue } from 'ms';


// This function will only accept a string compatible with `ms`.
export interface TokenPayload {
  userId: string;
  email: string;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: TokenPayload, rememberMe: boolean = false): string {
  const expires = rememberMe ? '30d' : config.jwt.expiresIn ?? '1d';
  const expiresIn = ms(expires as StringValue);
  
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: expiresIn
  });
}

/**
 * Verify a JWT token and return its payload
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, config.jwt.secret) as TokenPayload;
  } catch (error) {
    return null;
  }
}