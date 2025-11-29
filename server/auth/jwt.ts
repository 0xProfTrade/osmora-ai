import jwt from "jsonwebtoken";

/**
 * JWT token utilities for session management
 * Handles creation and verification of JWT tokens
 */

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d"; // Token expires in 7 days

/**
 * Create a JWT token
 */
export function createToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  try {
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
    return token;
  } catch (error) {
    console.error("[JWT] Failed to create token:", error);
    throw new Error("Failed to create token");
  }
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error("[JWT] Failed to verify token:", error);
    return null;
  }
}

/**
 * Decode token without verification (use with caution)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload | null;
    return decoded;
  } catch (error) {
    console.error("[JWT] Failed to decode token:", error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
}

/**
 * Get token expiration time
 */
export function getTokenExpirationTime(token: string): Date | null {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return null;
  }

  return new Date(decoded.exp * 1000);
}

/**
 * Create refresh token (longer expiration)
 */
export function createRefreshToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  try {
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: "30d", // Refresh token expires in 30 days
    });
    return token;
  } catch (error) {
    console.error("[JWT] Failed to create refresh token:", error);
    throw new Error("Failed to create refresh token");
  }
}
