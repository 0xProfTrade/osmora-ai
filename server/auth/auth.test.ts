import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateRandomPassword,
} from "./password";
import { generateOTP, isValidEmail } from "./email";
import { createToken, verifyToken, isTokenExpired, decodeToken } from "./jwt";

// ============================================================================
// PASSWORD TESTS
// ============================================================================

describe("Password Utilities", () => {
  describe("hashPassword", () => {
    it("should hash a password", async () => {
      const password = "SecurePass123!";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20); // Bcrypt hashes are long
    });

    it("should produce different hashes for same password", async () => {
      const password = "SecurePass123!";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // Different salts
    });
  });

  describe("verifyPassword", () => {
    it("should verify correct password", async () => {
      const password = "SecurePass123!";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const password = "SecurePass123!";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword("WrongPassword123!", hash);

      expect(isValid).toBe(false);
    });

    it("should be case sensitive", async () => {
      const password = "SecurePass123!";
      const hash = await hashPassword(password);
      const isValid = await verifyPassword("securepass123!", hash);

      expect(isValid).toBe(false);
    });
  });

  describe("validatePasswordStrength", () => {
    it("should accept strong password", () => {
      const result = validatePasswordStrength("SecurePass123!");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject password too short", () => {
      const result = validatePasswordStrength("Pass1!");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must be at least 8 characters long");
    });

    it("should reject password without uppercase", () => {
      const result = validatePasswordStrength("securepass123!");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one uppercase letter");
    });

    it("should reject password without lowercase", () => {
      const result = validatePasswordStrength("SECUREPASS123!");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one lowercase letter");
    });

    it("should reject password without number", () => {
      const result = validatePasswordStrength("SecurePass!");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must contain at least one number");
    });

    it("should reject password without special character", () => {
      const result = validatePasswordStrength("SecurePass123");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Password must contain at least one special character"
      );
    });

    it("should return multiple errors for weak password", () => {
      const result = validatePasswordStrength("pass");

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe("generateRandomPassword", () => {
    it("should generate password of specified length", () => {
      const password = generateRandomPassword(20);

      expect(password.length).toBe(20);
    });

    it("should generate strong password by default", () => {
      const password = generateRandomPassword();
      const validation = validatePasswordStrength(password);

      expect(validation.isValid).toBe(true);
    });

    it("should contain uppercase letter", () => {
      const password = generateRandomPassword();

      expect(/[A-Z]/.test(password)).toBe(true);
    });

    it("should contain lowercase letter", () => {
      const password = generateRandomPassword();

      expect(/[a-z]/.test(password)).toBe(true);
    });

    it("should contain number", () => {
      const password = generateRandomPassword();

      expect(/[0-9]/.test(password)).toBe(true);
    });

    it("should contain special character", () => {
      const password = generateRandomPassword();

      expect(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)).toBe(true);
    });
  });
});

// ============================================================================
// EMAIL UTILITIES TESTS
// ============================================================================

describe("Email Utilities", () => {
  describe("generateOTP", () => {
    it("should generate 6-digit OTP by default", () => {
      const otp = generateOTP();

      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    it("should generate OTP of specified length", () => {
      const otp = generateOTP(8);

      expect(otp).toHaveLength(8);
      expect(/^\d{8}$/.test(otp)).toBe(true);
    });

    it("should generate different OTPs", () => {
      const otp1 = generateOTP();
      const otp2 = generateOTP();

      expect(otp1).not.toBe(otp2);
    });

    it("should only contain digits", () => {
      for (let i = 0; i < 10; i++) {
        const otp = generateOTP();
        expect(/^\d+$/.test(otp)).toBe(true);
      }
    });
  });

  describe("isValidEmail", () => {
    it("should accept valid email", () => {
      expect(isValidEmail("user@example.com")).toBe(true);
      expect(isValidEmail("john.doe@company.co.uk")).toBe(true);
      expect(isValidEmail("test+tag@domain.org")).toBe(true);
    });

    it("should reject invalid email", () => {
      expect(isValidEmail("invalid.email")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
      expect(isValidEmail("user@")).toBe(false);
      expect(isValidEmail("user @example.com")).toBe(false);
    });

    it("should reject empty string", () => {
      expect(isValidEmail("")).toBe(false);
    });
  });
});

// ============================================================================
// JWT TESTS
// ============================================================================

describe("JWT Utilities", () => {
  describe("createToken", () => {
    it("should create a valid token", () => {
      const payload = {
        userId: 1,
        email: "user@example.com",
        role: "user",
      };

      const token = createToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3); // JWT has 3 parts
    });

    it("should include payload in token", () => {
      const payload = {
        userId: 1,
        email: "user@example.com",
        role: "user",
      };

      const token = createToken(payload);
      const decoded = decodeToken(token);

      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.email).toBe(payload.email);
      expect(decoded?.role).toBe(payload.role);
    });
  });

  describe("verifyToken", () => {
    it("should verify valid token", () => {
      const payload = {
        userId: 1,
        email: "user@example.com",
        role: "user",
      };

      const token = createToken(payload);
      const decoded = verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(1);
      expect(decoded?.email).toBe("user@example.com");
      expect(decoded?.role).toBe("user");
    });

    it("should reject invalid token", () => {
      const decoded = verifyToken("invalid.token.here");

      expect(decoded).toBeNull();
    });

    it("should reject tampered token", () => {
      const payload = {
        userId: 1,
        email: "user@example.com",
        role: "user",
      };

      const token = createToken(payload);
      const tamperedToken = token.slice(0, -5) + "xxxxx";
      const decoded = verifyToken(tamperedToken);

      expect(decoded).toBeNull();
    });
  });

  describe("decodeToken", () => {
    it("should decode valid token without verification", () => {
      const payload = {
        userId: 1,
        email: "user@example.com",
        role: "user",
      };

      const token = createToken(payload);
      const decoded = decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(1);
      expect(decoded?.email).toBe("user@example.com");
    });

    it("should return null for invalid token", () => {
      const decoded = decodeToken("invalid.token.here");

      expect(decoded).toBeNull();
    });
  });

  describe("isTokenExpired", () => {
    it("should return false for valid token", () => {
      const payload = {
        userId: 1,
        email: "user@example.com",
        role: "user",
      };

      const token = createToken(payload);
      const isExpired = isTokenExpired(token);

      expect(isExpired).toBe(false);
    });

    it("should return true for invalid token", () => {
      const isExpired = isTokenExpired("invalid.token.here");

      expect(isExpired).toBe(true);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("Authentication Flow Integration", () => {
  it("should complete full auth cycle: hash -> verify -> token", async () => {
    // 1. Hash password
    const password = "SecurePass123!";
    const hash = await hashPassword(password);

    // 2. Verify password
    const isPasswordValid = await verifyPassword(password, hash);
    expect(isPasswordValid).toBe(true);

    // 3. Create token
    const token = createToken({
      userId: 1,
      email: "user@example.com",
      role: "user",
    });

    // 4. Verify token
    const decoded = verifyToken(token);
    expect(decoded).toBeDefined();
    expect(decoded?.userId).toBe(1);
  });

  it("should validate email and generate OTP", () => {
    const email = "user@example.com";
    const isValid = isValidEmail(email);
    expect(isValid).toBe(true);

    const otp = generateOTP();
    expect(otp).toHaveLength(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);
  });

  it("should validate password strength and hash", async () => {
    const password = "SecurePass123!";

    const validation = validatePasswordStrength(password);
    expect(validation.isValid).toBe(true);

    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });
});
