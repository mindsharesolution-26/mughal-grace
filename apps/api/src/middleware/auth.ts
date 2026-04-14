import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from './error-handler';
import { logger } from '../utils/logger';

export interface TokenPayload {
  userId: number;
  tenantId: number;
  email: string;
  role: string;
  permissions: string[];
  type: 'access' | 'refresh';
}

// Development mode bypass user
const DEV_BYPASS_USER: TokenPayload = {
  userId: 1,
  tenantId: 1,
  email: 'dev@example.com',
  role: 'SUPER_ADMIN',
  permissions: [], // Role has all permissions
  type: 'access',
};

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  try {
    // Development mode bypass - requires secret token from environment
    // SECURITY: Never use in production. Set DEV_AUTH_SECRET to a random string in .env
    const devSecret = process.env.DEV_AUTH_SECRET;
    if (config.isDev && devSecret && req.headers['x-dev-auth'] === devSecret) {
      logger.debug('Development auth bypass enabled');
      req.user = DEV_BYPASS_USER;
      return next();
    }

    // Get token from header or cookie
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.access_token;

    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : cookieToken;

    if (!token) {
      throw AppError.unauthorized('Authentication token is required');
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;

    if (decoded.type !== 'access') {
      throw AppError.unauthorized('Invalid token type');
    }

    // Attach user to request
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid JWT token:', error.message);
      throw AppError.unauthorized('Invalid or expired token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Expired JWT token');
      throw AppError.unauthorized('Token has expired');
    }
    throw error;
  }
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.access_token;

    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : cookieToken;

    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
      if (decoded.type === 'access') {
        req.user = decoded;
      }
    }

    next();
  } catch {
    // Ignore errors for optional auth
    next();
  }
};
