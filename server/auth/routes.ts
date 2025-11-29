import { Router, Request, Response } from "express";
import {
  createUser,
  getUserByEmail,
  getUserById,
  updateUserPassword,
  updateUserEmailVerified,
  updateUserLastSignedIn,
  createPasswordResetToken,
  getPasswordResetToken,
  verifyPasswordResetToken,
  deletePasswordResetToken,
  createEmailVerificationToken,
  getEmailVerificationToken,
  verifyEmailVerificationToken,
  deleteEmailVerificationToken,
} from "../db";
import { hashPassword, verifyPassword, validatePasswordStrength } from "./password";
import {
  sendPasswordResetOTP,
  sendEmailVerificationCode,
  sendWelcomeEmail,
  generateOTP,
  isValidEmail,
} from "./email";
import { createToken, verifyToken } from "./jwt";
import { authMiddleware, requireAuth } from "./middleware";

const router = Router();

// ============================================================================
// REGISTER ENDPOINT
// ============================================================================

/**
 * POST /api/auth/register
 * Register a new user with email and password
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, name, password, passwordConfirm } = req.body;

    // Validate input
    if (!email || !name || !password || !passwordConfirm) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    if (password !== passwordConfirm) {
      res.status(400).json({ error: "Passwords do not match" });
      return;
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        error: "Password does not meet requirements",
        details: passwordValidation.errors,
      });
      return;
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await createUser(email, name, passwordHash);

    // Generate email verification code
    const verificationCode = generateOTP(6);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await createEmailVerificationToken(email, verificationCode, expiresAt);

    // Send verification email
    await sendEmailVerificationCode(email, verificationCode, 24);

    res.status(201).json({
      message: "User registered successfully. Please verify your email.",
      userId: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error("[Auth] Register error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// ============================================================================
// VERIFY EMAIL ENDPOINT
// ============================================================================

/**
 * POST /api/auth/verify-email
 * Verify user email with verification code
 */
router.post("/verify-email", async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({ error: "Email and code are required" });
      return;
    }

    // Get verification token
    const token = await getEmailVerificationToken(email, code);
    if (!token) {
      res.status(400).json({ error: "Invalid or expired verification code" });
      return;
    }

    // Verify token
    await verifyEmailVerificationToken(email, code);

    // Update user email verified status
    await updateUserEmailVerified(email, true);

    // Delete token
    await deleteEmailVerificationToken(email, code);

    // Send welcome email
    const user = await getUserByEmail(email);
    if (user) {
      await sendWelcomeEmail(email, user.name || "User");
    }

    res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("[Auth] Verify email error:", error);
    res.status(500).json({ error: "Email verification failed" });
  }
});

// ============================================================================
// LOGIN ENDPOINT
// ============================================================================

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    // Get user
    const user = await getUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Check if user has password (custom auth)
    if (!user.passwordHash) {
      res.status(401).json({ error: "This account uses OAuth. Please login with OAuth." });
      return;
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Check if email is verified
    if (user.isEmailVerified !== "true") {
      res.status(403).json({
        error: "Email not verified",
        message: "Please verify your email before logging in",
      });
      return;
    }

    // Update last signed in
    await updateUserLastSignedIn(user.id);

    // Create JWT token
    const token = createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("[Auth] Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// ============================================================================
// REQUEST PASSWORD RESET ENDPOINT
// ============================================================================

/**
 * POST /api/auth/request-reset
 * Request password reset by sending OTP to email
 */
router.post("/request-reset", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    // Check if user exists
    const user = await getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists (security best practice)
      res.status(200).json({
        message: "If the email exists, an OTP has been sent",
      });
      return;
    }

    // Generate OTP
    const otp = generateOTP(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create password reset token
    await createPasswordResetToken(email, otp, expiresAt);

    // Send OTP email
    await sendPasswordResetOTP(email, otp, 10);

    res.status(200).json({
      message: "OTP sent to email",
    });
  } catch (error) {
    console.error("[Auth] Request reset error:", error);
    res.status(500).json({ error: "Failed to send reset OTP" });
  }
});

// ============================================================================
// VERIFY OTP ENDPOINT
// ============================================================================

/**
 * POST /api/auth/verify-otp
 * Verify OTP for password reset
 */
router.post("/verify-otp", async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ error: "Email and OTP are required" });
      return;
    }

    // Get password reset token
    const token = await getPasswordResetToken(email, otp);
    if (!token) {
      res.status(400).json({ error: "Invalid or expired OTP" });
      return;
    }

    // Verify token
    await verifyPasswordResetToken(email, otp);

    res.status(200).json({
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("[Auth] Verify OTP error:", error);
    res.status(500).json({ error: "OTP verification failed" });
  }
});

// ============================================================================
// RESET PASSWORD ENDPOINT
// ============================================================================

/**
 * POST /api/auth/reset-password
 * Reset password with verified OTP
 */
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { email, otp, password, passwordConfirm } = req.body;

    if (!email || !otp || !password || !passwordConfirm) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (password !== passwordConfirm) {
      res.status(400).json({ error: "Passwords do not match" });
      return;
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        error: "Password does not meet requirements",
        details: passwordValidation.errors,
      });
      return;
    }

    // Get password reset token
    const token = await getPasswordResetToken(email, otp);
    if (!token) {
      res.status(400).json({ error: "Invalid or expired OTP" });
      return;
    }

    // Check if OTP is verified
    if (token.isVerified !== "true") {
      res.status(400).json({ error: "OTP not verified" });
      return;
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update password
    await updateUserPassword(email, passwordHash);

    // Delete password reset token
    await deletePasswordResetToken(email, otp);

    res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("[Auth] Reset password error:", error);
    res.status(500).json({ error: "Password reset failed" });
  }
});

// ============================================================================
// GET CURRENT USER ENDPOINT
// ============================================================================

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const user = await getUserById(req.user.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("[Auth] Get user error:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
});

// ============================================================================
// LOGOUT ENDPOINT
// ============================================================================

/**
 * POST /api/auth/logout
 * Logout user by clearing token cookie
 */
router.post("/logout", (req: Request, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.status(200).json({
    message: "Logout successful",
  });
});

// ============================================================================
// CHANGE PASSWORD ENDPOINT
// ============================================================================

/**
 * POST /api/auth/change-password
 * Change password for authenticated user
 */
router.post("/change-password", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { currentPassword, newPassword, newPasswordConfirm } = req.body;

    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      res.status(400).json({ error: "New passwords do not match" });
      return;
    }

    // Get user
    const user = await getUserById(req.user.userId);
    if (!user || !user.passwordHash) {
      res.status(400).json({ error: "User not found or uses OAuth" });
      return;
    }

    // Verify current password
    const isPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        error: "New password does not meet requirements",
        details: passwordValidation.errors,
      });
      return;
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await updateUserPassword(user.email, newPasswordHash);

    res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("[Auth] Change password error:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
});

export default router;
