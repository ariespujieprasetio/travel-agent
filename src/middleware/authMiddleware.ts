import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Augment the Request interface to include user information
declare global {
  namespace Express {
    interface Request {
      // @ts-ignore
      user?: {
        sub: string;
        username: string;
        iat?: number;
        exp?: number;
      };
    }
  }
}

/**
 * Authentication Middleware for JWT Token Verification
 * 
 * Methodology:
 * 1. Extract JWT token from Authorization header
 * 2. Verify token authenticity and validity
 * 3. Attach decoded user information to request object
 * 4. Proceed to next middleware or route handler
 * 
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 * @returns JSON error response or proceeds to next middleware
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // Verify token presence in Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ 
      message: 'Authentication Error',
      details: 'No authorization token provided'
    });
  }

  // Extract token (expecting "Bearer <token>")
  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    return res.status(401).json({
      message: 'Authentication Error',
      details: 'Invalid authorization header format'
    });
  }

  const token = tokenParts[1];

  try {
    // Verify token using secret key
    const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key';
    const decoded = jwt.verify(token, JWT_SECRET) as {
      sub: string;
      username: string;
      iat: number;
      exp: number;
    };

    // Attach decoded user information to request
    req.user = {
      sub: decoded.sub,
      username: decoded.username,
      iat: decoded.iat,
      exp: decoded.exp
    };

    // Proceed to next middleware
    return next();
  } catch (error) {
    // Handle different types of JWT verification errors
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        message: 'Authentication Error',
        details: 'Token has expired'
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        message: 'Authentication Error',
        details: 'Invalid token'
      });
    }

    // Generic error handling for unexpected verification failures
    return res.status(500).json({
      message: 'Internal Server Error',
      details: 'Token verification failed'
    });
  }
}

/**
 * Optional: Passport.js Compatibility Method
 * Maintains compatibility with existing Passport.js authentication checks
 * 
 * @param req Express Request object
 * @returns Boolean indicating authentication status
 */
export function isAuthenticatedPassport(req: Request): boolean {
  // Check if JWT token exists and is valid
  return !!(req.headers.authorization && 
    req.headers.authorization.split(' ')[0] === 'Bearer');
}