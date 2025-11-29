import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JWTPayload } from "./jwt";

/**
 * Extend Express Request to include user data
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      token?: string;
    }
  }
}

/**
 * Middleware to verify JWT token from Authorization header or cookies
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // Get token from Authorization header or cookies
    let token = "";

    // Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }

    // Fallback to cookies if no Authorization header
    if (!token && req.cookies) {
      token = req.cookies.token || req.cookies.jwt;
    }

    if (!token) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    // Attach user data to request
    req.user = decoded;
    req.token = token;

    next();
  } catch (error) {
    console.error("[Auth Middleware] Error:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
}

/**
 * Middleware to check if user is authenticated
 * Returns 401 if not authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

/**
 * Middleware to check if user is admin
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
}

/**
 * Middleware to check if user has specific role
 */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({ error: `${role} access required` });
      return;
    }

    next();
  };
}

/**
 * Middleware to optionally verify JWT token
 * Does not require token to be present
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    let token = "";

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }

    if (!token && req.cookies) {
      token = req.cookies.token || req.cookies.jwt;
    }

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        req.user = decoded;
        req.token = token;
      }
    }

    next();
  } catch (error) {
    console.error("[Optional Auth Middleware] Error:", error);
    next();
  }
}
