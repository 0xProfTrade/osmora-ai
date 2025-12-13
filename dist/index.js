// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

// server/routes/authRoutes.ts
import { Router } from "express";

// shared/const.ts
var AUTH_COOKIE_NAME = "osmora_auth";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/auth/jwt.ts
import jwt from "jsonwebtoken";
var JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
var JWT_EXPIRES_IN = "24h";
function createToken(payload) {
  try {
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });
    return token;
  } catch (error) {
    console.error("[JWT] Failed to create token:", error);
    throw new Error("Failed to create token");
  }
}
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error("[JWT] Failed to verify token:", error);
    return null;
  }
}

// server/auth/middleware.ts
function authMiddleware(req, res, next) {
  try {
    let token = "";
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
    if (!token && req.cookies) {
      token = req.cookies[AUTH_COOKIE_NAME] || req.cookies.token || req.cookies.jwt;
    }
    if (!token) {
      res.status(401).json({ error: "No token provided" });
      return;
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    console.error("[Auth Middleware] Error:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isSecureRequest(req)
  };
}

// server/db.ts
import { and, eq, gt, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

// drizzle/schema.ts
import { sql } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  username: varchar("username", { length: 255 }).unique(),
  name: varchar("name", { length: 255 }),
  passwordHash: text("password_hash").notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  // NULLABLE TIMESTAMP (jangan kasih default!)
  lastSignedIn: timestamp("last_signed_in", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull()
});
var sessions = mysqlTable(
  "sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    sessionToken: varchar("session_token", { length: 255 }).notNull(),
    refreshToken: varchar("refresh_token", { length: 255 }),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    revokedAt: timestamp("revoked_at", { mode: "string" }),
    lastSeenAt: timestamp("last_seen_at", { mode: "string" })
  },
  (table) => ({
    sessionTokenIdx: uniqueIndex("sessions_token_idx").on(table.sessionToken),
    refreshTokenIdx: uniqueIndex("sessions_refresh_idx").on(table.refreshToken),
    sessionUserIdx: index("sessions_user_idx").on(table.userId)
  })
);
var emailVerificationTokens = mysqlTable(
  "email_verification_tokens",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    code: varchar("code", { length: 6 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    used: boolean("used").default(false).notNull(),
    usedAt: timestamp("used_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull()
  },
  (table) => ({
    emailIdx: index("email_verification_email_idx").on(table.email),
    tokenIdx: uniqueIndex("email_verification_token_idx").on(table.token),
    codeIdx: index("email_verification_code_idx").on(table.code)
  })
);
var otpCodes = mysqlTable(
  "otp_codes",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    code: varchar("code", { length: 6 }).notNull(),
    purpose: varchar("purpose", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    used: boolean("used").default(false).notNull(),
    usedAt: timestamp("used_at", { mode: "string" }),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    attemptCount: int("attempt_count").default(0).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull()
  },
  (table) => ({
    otpUserPurposeIdx: index("otp_user_purpose_idx").on(table.userId, table.purpose)
  })
);
var passwordResetTokens = mysqlTable(
  "password_reset_tokens",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    otpCode: varchar("otp_code", { length: 6 }),
    expiresAt: timestamp("expires_at").notNull(),
    used: boolean("used").default(false).notNull(),
    usedAt: timestamp("used_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull()
  },
  (table) => ({
    passwordResetTokenIdx: uniqueIndex("password_reset_token_idx").on(table.token),
    passwordResetUserIdx: index("password_reset_user_idx").on(table.userId)
  })
);
var payments = mysqlTable(
  "payments",
  {
    id: int("id").autoincrement().primaryKey(),
    userEmail: varchar("user_email", { length: 320 }).notNull(),
    planName: varchar("plan_name", { length: 100 }).notNull(),
    priceUsd: int("price_usd").notNull(),
    coin: varchar("coin", { length: 50 }).notNull(),
    network: varchar("network", { length: 100 }).notNull(),
    amountCrypto: text("amount_crypto").notNull(),
    address: varchar("address", { length: 255 }).notNull(),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    rateUsd: decimal("rate_usd", { precision: 18, scale: 8 }),
    txHash: varchar("tx_hash", { length: 255 }),
    createdAt: timestamp("created_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull()
  },
  (table) => ({
    paymentsEmailIdx: index("payments_email_idx").on(table.userEmail)
  })
);

// server/db.ts
var pool = null;
var _db = null;
function buildConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const host = process.env.MYSQL_HOST ?? process.env.DB_HOST;
  const port = process.env.MYSQL_PORT ?? process.env.DB_PORT ?? "3306";
  const user = process.env.MYSQL_USER ?? process.env.DB_USER;
  const password = process.env.MYSQL_PASSWORD ?? process.env.DB_PASSWORD;
  const database = process.env.MYSQL_DATABASE ?? process.env.DB_NAME;
  if (host && user && password && database) {
    return `mysql://${user}:${password}@${host}:${port}/${database}`;
  }
  return null;
}
async function getDb() {
  if (_db) {
    return _db;
  }
  const connectionString = buildConnectionString();
  if (!connectionString) {
    throw new Error("Database connection is not configured");
  }
  pool = mysql.createPool({ uri: connectionString, connectionLimit: 10 });
  _db = drizzle(pool);
  return _db;
}
async function createUser(input) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const values = {
    email: input.email.toLowerCase(),
    username: input.username ?? null,
    name: input.name ?? null,
    passwordHash: input.passwordHash,
    role: input.role ?? "user",
    isVerified: false,
    lastSignedIn: /* @__PURE__ */ new Date()
  };
  await db.insert(users).values(values);
  const created = await getUserByEmail(input.email);
  if (!created) {
    throw new Error("Failed to create user");
  }
  return created;
}
async function getUserByEmail(email) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return result[0];
}
async function getUserByEmailOrUsername(identifier) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = identifier.toLowerCase();
  const result = await db.select().from(users).where(or(eq(users.email, id), eq(users.username, identifier))).limit(1);
  return result[0];
}
async function getUserById(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}
async function updateUserPassword(userId, passwordHash) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({
    passwordHash,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(users.id, userId));
}
async function updateUserVerified(userId, isVerified) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({
    isVerified,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(users.id, userId));
}
async function updateUserLastSignedIn(userId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({
    lastSignedIn: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(users.id, userId));
}
async function createSession(input) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(sessions).values({
    userId: input.userId,
    sessionToken: input.sessionToken,
    refreshToken: input.refreshToken ?? null,
    expiresAt: input.expiresAt,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent
  });
  const [session] = await db.select().from(sessions).where(eq(sessions.sessionToken, input.sessionToken)).limit(1);
  if (!session) {
    throw new Error("Failed to create session");
  }
  return session;
}
async function revokeSession(sessionToken) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(sessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(eq(sessions.sessionToken, sessionToken));
}
async function saveEmailVerificationToken(input) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.email, input.email.toLowerCase()));
  await db.insert(emailVerificationTokens).values({
    userId: input.userId,
    email: input.email.toLowerCase(),
    code: input.code,
    token: input.token,
    expiresAt: input.expiresAt,
    used: false
  });
  const [created] = await db.select().from(emailVerificationTokens).where(
    and(
      eq(emailVerificationTokens.email, input.email.toLowerCase()),
      eq(emailVerificationTokens.code, input.code),
      eq(emailVerificationTokens.used, false),
      gt(emailVerificationTokens.expiresAt, /* @__PURE__ */ new Date())
    )
  ).limit(1);
  if (!created) {
    throw new Error("Failed to create email verification token");
  }
  return created;
}
async function consumeEmailVerificationCode(input) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [token] = await db.select().from(emailVerificationTokens).where(
    and(
      eq(emailVerificationTokens.email, input.email.toLowerCase()),
      eq(emailVerificationTokens.code, input.code),
      eq(emailVerificationTokens.used, false),
      gt(emailVerificationTokens.expiresAt, /* @__PURE__ */ new Date())
    )
  ).limit(1);
  if (!token) return void 0;
  await db.update(emailVerificationTokens).set({ used: true, usedAt: /* @__PURE__ */ new Date() }).where(eq(emailVerificationTokens.id, token.id));
  return token;
}
async function createOtpCode(input) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(otpCodes).where(and(eq(otpCodes.userId, input.userId), eq(otpCodes.purpose, input.purpose)));
  await db.insert(otpCodes).values({
    userId: input.userId,
    code: input.code,
    purpose: input.purpose,
    expiresAt: input.expiresAt,
    used: false,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    attemptCount: 0
  });
  const created = await getActiveOtpCode({
    userId: input.userId,
    code: input.code,
    purpose: input.purpose
  });
  if (!created) {
    throw new Error("Failed to create OTP code");
  }
  return created;
}
async function getActiveOtpCode(input) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(otpCodes).where(
    and(
      eq(otpCodes.userId, input.userId),
      eq(otpCodes.code, input.code),
      eq(otpCodes.purpose, input.purpose),
      eq(otpCodes.used, false),
      gt(otpCodes.expiresAt, /* @__PURE__ */ new Date())
    )
  ).limit(1);
  return result[0];
}
async function markOtpUsed(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(otpCodes).set({
    used: true,
    usedAt: /* @__PURE__ */ new Date()
  }).where(eq(otpCodes.id, id));
}
async function clearOtpsForPurpose(userId, purpose) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(otpCodes).where(and(eq(otpCodes.userId, userId), eq(otpCodes.purpose, purpose)));
}
async function createPasswordResetEntry(input) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(passwordResetTokens).where(and(eq(passwordResetTokens.userId, input.userId), eq(passwordResetTokens.used, false)));
  await db.insert(passwordResetTokens).values({
    userId: input.userId,
    token: input.token,
    otpCode: input.otpCode,
    expiresAt: input.expiresAt,
    used: false
  });
  const result = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, input.userId)).limit(1);
  if (!result[0]) {
    throw new Error("Failed to create password reset entry");
  }
  return result[0];
}
async function getActivePasswordResetToken(input) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.select().from(passwordResetTokens).where(
    and(
      eq(passwordResetTokens.userId, input.userId),
      eq(passwordResetTokens.otpCode, input.otpCode),
      eq(passwordResetTokens.used, false),
      gt(passwordResetTokens.expiresAt, /* @__PURE__ */ new Date())
    )
  ).limit(1);
  return row;
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var BadRequestError = (msg) => new HttpError(400, msg);
var UnauthorizedError = (msg) => new HttpError(401, msg);
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/auth/captcha.ts
function validateSimpleCaptcha(payload) {
  if (!payload) {
    throw BadRequestError("Captcha verification is required");
  }
  const { a, b, answer } = payload;
  if (typeof a !== "number" || typeof b !== "number" || typeof answer !== "number" || Number.isNaN(a) || Number.isNaN(b) || Number.isNaN(answer)) {
    throw BadRequestError("Captcha values are invalid");
  }
  if (a + b !== answer) {
    throw BadRequestError("Captcha answer is incorrect");
  }
}

// server/services/authService.ts
import { nanoid } from "nanoid";

// server/auth/password.ts
import bcrypt from "bcrypt";
var SALT_ROUNDS = 12;
async function hashPassword(password) {
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return hash;
  } catch (error) {
    console.error("[Password] Failed to hash password:", error);
    throw new Error("Failed to hash password");
  }
}
async function verifyPassword(password, hash) {
  try {
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  } catch (error) {
    console.error("[Password] Failed to verify password:", error);
    return false;
  }
}
function validatePasswordStrength(password) {
  const errors = [];
  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}

// server/services/emailService.ts
import nodemailer from "nodemailer";
var transporter = null;
function getConfig() {
  const host = process.env.SMTP_HOST || "";
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER || process.env.SMTP_USERNAME || "";
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "";
  const from = process.env.SMTP_FROM || "noreply@osmora.xyz";
  return {
    host,
    port,
    user,
    pass,
    from,
    secure: port === 465 || process.env.SMTP_SECURE === "true"
  };
}
function getTransporter() {
  if (transporter) return transporter;
  const config = getConfig();
  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user && config.pass ? { user: config.user, pass: config.pass } : void 0
  });
  return transporter;
}
async function sendMail(input) {
  const tx = getTransporter();
  const config = getConfig();
  await tx.sendMail({
    from: config.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text
  });
}
var baseStyles = `
  body { font-family: Arial, sans-serif; background: #0b0c10; color: #e5e7eb; }
  .card { max-width: 520px; margin: 0 auto; padding: 24px; background: #111827; border-radius: 12px; border: 1px solid #1f2937; }
  .title { font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #22d3ee; }
  .subtitle { font-size: 15px; margin-bottom: 18px; color: #cbd5e1; }
  .otp { font-size: 32px; letter-spacing: 6px; font-weight: 700; padding: 16px; text-align: center; background: #0f172a; border: 1px solid #1f2937; border-radius: 10px; color: #22d3ee; }
  .footer { margin-top: 22px; font-size: 12px; color: #94a3b8; text-align: center; }
`;
async function sendVerificationOtp(email, code, expiresInHours) {
  const html = `
    <html>
      <head><style>${baseStyles}</style></head>
      <body>
        <div class="card">
          <div class="title">Verify your email</div>
          <div class="subtitle">
            Use the code below to verify your Osmora account. This code expires in ${expiresInHours} hour(s).
          </div>
          <div class="otp">${code}</div>
          <div class="footer">If you did not sign up, you can ignore this email.</div>
        </div>
      </body>
    </html>
  `;
  await sendMail({
    to: email,
    subject: "Osmora - Verify your email",
    html,
    text: `Your verification code is ${code}. It expires in ${expiresInHours} hour(s).`
  });
}
async function sendResetPasswordOtp(email, code, expiresInMinutes) {
  const html = `
    <html>
      <head><style>${baseStyles}</style></head>
      <body>
        <div class="card">
          <div class="title">Reset your password</div>
          <div class="subtitle">
            Enter this code to reset your Osmora password. It expires in ${expiresInMinutes} minute(s).
          </div>
          <div class="otp">${code}</div>
          <div class="footer">If you did not request this, please secure your account.</div>
        </div>
      </body>
    </html>
  `;
  await sendMail({
    to: email,
    subject: "Osmora - Password reset code",
    html,
    text: `Your password reset code is ${code}. It expires in ${expiresInMinutes} minute(s).`
  });
}
async function sendOwnerNotification(subject, content) {
  const to = process.env.NOTIFY_OWNER_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!to) {
    throw new Error("NOTIFY_OWNER_EMAIL or SMTP_FROM is required to send owner notifications");
  }
  const safeSubject = subject.trim().slice(0, 180) || "Osmora Notification";
  const body = content.trim();
  const html = `
    <html>
      <head><style>${baseStyles}</style></head>
      <body>
        <div class="card">
          <div class="title">New Notification</div>
          <div class="subtitle">${safeSubject}</div>
          <div style="white-space:pre-wrap; color:#e5e7eb; line-height:1.6;">${body}</div>
          <div class="footer">This message was generated by Osmora backend.</div>
        </div>
      </body>
    </html>
  `;
  await sendMail({
    to,
    subject: safeSubject,
    html,
    text: body
  });
}

// server/services/authService.ts
var OTP_PURPOSE_VERIFY_EMAIL = "verify_email";
var OTP_PURPOSE_RESET_PASSWORD = "reset_password";
var VERIFY_OTP_TTL_HOURS = 24;
var RESET_OTP_TTL_MINUTES = 10;
var generateOtp = (length = 6) => {
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
};
async function registerUser(input) {
  const email = input.email.toLowerCase().trim();
  const username = input.username?.trim() || void 0;
  if (!email || !input.password) {
    throw BadRequestError("Email and password are required");
  }
  const passwordValidation = validatePasswordStrength(input.password);
  if (!passwordValidation.isValid) {
    throw BadRequestError(passwordValidation.errors.join("; "));
  }
  if (await getUserByEmail(email)) {
    throw BadRequestError("Email already registered");
  }
  if (username && await getUserByEmailOrUsername(username)) {
    throw BadRequestError("Username already taken");
  }
  const passwordHash = await hashPassword(input.password);
  const user = await createUser({
    email,
    username,
    name: input.name || username || null,
    passwordHash
  });
  const code = generateOtp();
  await saveEmailVerificationToken({
    userId: user.id,
    email: user.email,
    code,
    token: nanoid(32),
    expiresAt: new Date(Date.now() + VERIFY_OTP_TTL_HOURS * 60 * 60 * 1e3)
  });
  await sendVerificationOtp(user.email, code, VERIFY_OTP_TTL_HOURS);
  return user;
}
async function verifyOtp(input) {
  const user = await getUserByEmail(input.email.toLowerCase());
  if (!user) {
    throw BadRequestError("Invalid code or email");
  }
  const purpose = input.purpose || OTP_PURPOSE_VERIFY_EMAIL;
  if (purpose === OTP_PURPOSE_VERIFY_EMAIL) {
    const token = await consumeEmailVerificationCode({
      email: user.email,
      code: input.code
    });
    if (!token) {
      throw BadRequestError("Invalid or expired code");
    }
    if (!user.isVerified) {
      await updateUserVerified(user.id, true);
    }
    return user;
  }
  const otp = await getActiveOtpCode({
    userId: user.id,
    code: input.code,
    purpose
  });
  if (!otp) {
    throw BadRequestError("Invalid or expired code");
  }
  await markOtpUsed(otp.id);
  return user;
}
async function loginUser(input) {
  const identifier = input.identifier.trim();
  const user = await getUserByEmailOrUsername(identifier);
  if (!user) {
    throw UnauthorizedError("Invalid email/username or password");
  }
  if (!user.passwordHash) {
    throw UnauthorizedError("This account is missing a password");
  }
  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw UnauthorizedError("Invalid email/username or password");
  }
  if (!user.isVerified) {
    throw ForbiddenError("Email is not verified");
  }
  await updateUserLastSignedIn(user.id);
  const token = createToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });
  await createSession({
    userId: user.id,
    sessionToken: token,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1e3)
  });
  return { token, user };
}
async function sendForgotPasswordCode(email) {
  const normalizedEmail = email.toLowerCase();
  const user = await getUserByEmail(normalizedEmail);
  if (!user) {
    return;
  }
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + RESET_OTP_TTL_MINUTES * 60 * 1e3);
  await createOtpCode({
    userId: user.id,
    code,
    purpose: OTP_PURPOSE_RESET_PASSWORD,
    expiresAt
  });
  await createPasswordResetEntry({
    userId: user.id,
    token: nanoid(48),
    otpCode: code,
    expiresAt
  });
  await sendResetPasswordOtp(user.email, code, RESET_OTP_TTL_MINUTES);
}
async function resendOtpCode(input) {
  const normalizedEmail = input.email.toLowerCase();
  const purpose = input.purpose || OTP_PURPOSE_VERIFY_EMAIL;
  if (purpose === OTP_PURPOSE_RESET_PASSWORD) {
    await sendForgotPasswordCode(normalizedEmail);
    return;
  }
  const user = await getUserByEmail(normalizedEmail);
  if (!user) {
    return;
  }
  if (user.isVerified) {
    throw BadRequestError("Email sudah terverifikasi");
  }
  const code = generateOtp();
  await saveEmailVerificationToken({
    userId: user.id,
    email: user.email,
    code,
    token: nanoid(32),
    expiresAt: new Date(Date.now() + VERIFY_OTP_TTL_HOURS * 60 * 60 * 1e3)
  });
  await sendVerificationOtp(user.email, code, VERIFY_OTP_TTL_HOURS);
}
async function resetPassword(input) {
  const user = await getUserByEmail(input.email.toLowerCase());
  if (!user) {
    throw BadRequestError("Invalid reset request");
  }
  const otp = await getActiveOtpCode({
    userId: user.id,
    code: input.code,
    purpose: OTP_PURPOSE_RESET_PASSWORD
  });
  const resetToken = await getActivePasswordResetToken({
    userId: user.id,
    otpCode: input.code
  });
  if (!otp && !resetToken) {
    throw BadRequestError("Invalid or expired code");
  }
  const passwordValidation = validatePasswordStrength(input.newPassword);
  if (!passwordValidation.isValid) {
    throw BadRequestError(passwordValidation.errors.join("; "));
  }
  const passwordHash = await hashPassword(input.newPassword);
  await updateUserPassword(user.id, passwordHash);
  if (otp) {
    await markOtpUsed(otp.id);
    await clearOtpsForPurpose(user.id, OTP_PURPOSE_RESET_PASSWORD);
  }
  if (resetToken) {
    await clearOtpsForPurpose(user.id, OTP_PURPOSE_RESET_PASSWORD);
  }
}
async function changePassword(input) {
  const user = await getUserById(input.userId);
  if (!user) throw UnauthorizedError("User not found");
  const isValid = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!isValid) throw UnauthorizedError("Invalid current password");
  const validation = validatePasswordStrength(input.newPassword);
  if (!validation.isValid) {
    throw BadRequestError(validation.errors.join("; "));
  }
  const passwordHash = await hashPassword(input.newPassword);
  await updateUserPassword(user.id, passwordHash);
}

// server/controllers/authController.ts
var AUTH_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1e3;
function setAuthCookie(req, res, token) {
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: AUTH_COOKIE_MAX_AGE_MS
  });
}
async function register(req, res, next) {
  try {
    const { email, password, passwordConfirm, username, name, captcha } = req.body;
    validateSimpleCaptcha(captcha);
    if (passwordConfirm && passwordConfirm !== password) {
      res.status(400).json({ error: "Password confirmation does not match" });
      return;
    }
    const user = await registerUser({ email, password, username, name });
    res.status(201).json({
      message: "User registered. Verification code sent to email.",
      email: user.email
    });
  } catch (error) {
    next(error);
  }
}
async function verifyEmail(req, res, next) {
  try {
    const { email, code } = req.body;
    await verifyOtp({ email, code, purpose: "verify_email" });
    res.status(200).json({ message: "Email verified" });
  } catch (error) {
    next(error);
  }
}
async function verifyOtpCode(req, res, next) {
  try {
    const { email, code, purpose } = req.body;
    await verifyOtp({ email, code, purpose });
    res.status(200).json({ message: "Verification successful" });
  } catch (error) {
    next(error);
  }
}
async function login(req, res, next) {
  try {
    const { email, username, password, captcha } = req.body;
    validateSimpleCaptcha(captcha);
    const identifier = email || username;
    if (!identifier || !password) {
      res.status(400).json({ error: "Email/username and password are required" });
      return;
    }
    const { token, user } = await loginUser({ identifier, password });
    setAuthCookie(req, res, token);
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
}
async function logout(req, res) {
  if (req.token) {
    await revokeSession(req.token);
  }
  res.clearCookie(AUTH_COOKIE_NAME, getSessionCookieOptions(req));
  res.status(200).json({ message: "Logout successful" });
}
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }
    await sendForgotPasswordCode(email);
    res.status(200).json({
      message: "If the email exists, a reset code has been sent."
    });
  } catch (error) {
    next(error);
  }
}
async function resetPasswordWithOtp(req, res, next) {
  try {
    const { email, code, newPassword } = req.body;
    await resetPassword({ email, code, newPassword });
    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    next(error);
  }
}
async function currentUser(req, res, next) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const user = await getUserById(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
}
async function changePasswordHandler(req, res, next) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Current and new passwords are required" });
      return;
    }
    await changePassword({ userId, currentPassword, newPassword });
    res.status(200).json({ message: "Password updated" });
  } catch (error) {
    next(error);
  }
}
async function resendOtp(req, res, next) {
  try {
    const { email, purpose } = req.body;
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }
    const normalizedPurpose = purpose === "verify_email" ? "verify_email" : "reset_password";
    await resendOtpCode({ email, purpose: normalizedPurpose });
    res.status(200).json({ message: "OTP dikirim ke email Anda" });
  } catch (error) {
    next(error);
  }
}

// server/routes/authRoutes.ts
var router = Router();
router.post("/register", register);
router.post("/verify-email", verifyEmail);
router.post("/verify-otp", verifyOtpCode);
router.post("/login", login);
router.post("/request-reset", forgotPassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPasswordWithOtp);
router.post("/resend-otp", resendOtp);
router.post("/logout", authMiddleware, logout);
router.get("/me", authMiddleware, currentUser);
router.post("/change-password", authMiddleware, changePasswordHandler);
var authRoutes_default = router;

// server/routers.ts
import { TRPCError as TRPCError3 } from "@trpc/server";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!process.env.NOTIFY_OWNER_EMAIL && !process.env.SMTP_FROM && !process.env.SMTP_USER) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification email is not configured."
    });
  }
  try {
    await sendOwnerNotification(title, content);
    return true;
  } catch (error) {
    console.warn("[Notification] Error sending owner notification:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router2 = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router2({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { z as z2 } from "zod";

// server/crypto.ts
var CRYPTO_WALLETS = {
  BTC: {
    name: "Bitcoin",
    symbol: "BTC",
    network: "Bitcoin mainnet",
    address: "bc1pevk65wxl7cgan87ve2zdxf0y03hk6dnmjjalx34g379dqtdlgh4q3umq86",
    coingeckoId: "bitcoin"
  },
  ETH: {
    name: "Ethereum",
    symbol: "ETH",
    network: "Ethereum / ERC-20",
    address: "0x9fe135eb7DFf3F57929d8a8585D80ca39dD1427d",
    coingeckoId: "ethereum"
  },
  USDT_ERC20: {
    name: "USDT",
    symbol: "USDT",
    network: "USDT ERC-20",
    address: "0x9fe135eb7DFf3F57929d8a8585D80ca39dD1427d",
    coingeckoId: "tether"
  },
  USDT_TRC20: {
    name: "USDT",
    symbol: "USDT",
    network: "USDT TRC-20",
    address: "TBgPfv3yWeaQ7MLwvN7Jz86TNCweVZsyo3",
    coingeckoId: "tether"
  },
  USDT_SOL: {
    name: "USDT",
    symbol: "USDT",
    network: "USDT SOL (Solana)",
    address: "U5FU5PqJnJ4ePqBCGbk8LC6WqJzSHBHZHT3PQQbVHAE",
    coingeckoId: "tether"
  }
};
function getCryptoConfig(coin) {
  const config = CRYPTO_WALLETS[coin];
  if (!config) {
    throw new Error(`Unknown crypto type: ${coin}`);
  }
  return config;
}
async function getCryptoPrice(coingeckoId) {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`
    );
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.statusText}`);
    }
    const data = await response.json();
    const price = data[coingeckoId]?.usd;
    if (!price) {
      throw new Error(`No price data for ${coingeckoId}`);
    }
    return price;
  } catch (error) {
    console.error("Failed to fetch crypto price:", error);
    throw error;
  }
}
function calculateCryptoAmount(priceUsd, cryptoPrice) {
  const amount = priceUsd / cryptoPrice;
  return amount.toFixed(8);
}

// server/routers.ts
async function notifyTelegramPayment(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" })
    });
  } catch (error) {
    console.error("[telegram] failed to notify", error);
  }
}
var appRouter = router2({
  system: systemRouter,
  auth: router2({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(AUTH_COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    }),
    sendPasswordReset: publicProcedure.input(z2.object({ email: z2.string().email() })).mutation(async ({ input }) => {
      try {
        await sendForgotPasswordCode(input.email);
        return { success: true, message: "Reset code sent to email" };
      } catch (error) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Failed to send reset code"
        });
      }
    }),
    verifyOTP: publicProcedure.input(
      z2.object({
        email: z2.string().email(),
        otp: z2.string().length(6),
        purpose: z2.enum(["verify_email", "reset_password"]).optional()
      })
    ).mutation(async ({ input }) => {
      try {
        await verifyOtp({
          email: input.email,
          code: input.otp,
          purpose: input.purpose ?? "reset_password"
        });
        return { success: true, message: "OTP verified" };
      } catch (error) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "OTP verification failed"
        });
      }
    }),
    resetPassword: publicProcedure.input(z2.object({ email: z2.string().email(), otp: z2.string().length(6), newPassword: z2.string().min(8) })).mutation(async ({ input }) => {
      try {
        await resetPassword({
          email: input.email,
          code: input.otp,
          newPassword: input.newPassword
        });
        return { success: true, message: "Password reset successfully" };
      } catch (error) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Password reset failed"
        });
      }
    })
  }),
  // Crypto payment routes
  crypto: router2({
    getQuote: publicProcedure.input(
      z2.object({
        planName: z2.string(),
        priceUsd: z2.number().positive(),
        coin: z2.enum(["BTC", "ETH", "USDT_TRC20", "USDT_ERC20", "USDT_SOL"])
      })
    ).mutation(async ({ input }) => {
      try {
        const config = getCryptoConfig(input.coin);
        const cryptoPrice = await getCryptoPrice(config.coingeckoId);
        const amountCrypto = calculateCryptoAmount(input.priceUsd, cryptoPrice);
        return {
          success: true,
          coin: input.coin,
          amount: amountCrypto,
          address: config.address,
          network: config.network,
          rateUsd: cryptoPrice
        };
      } catch (error) {
        console.error("Failed to get crypto quote:", error);
        return {
          success: false,
          error: "Failed to fetch crypto price. Please try again."
        };
      }
    }),
    submitPayment: publicProcedure.input(
      z2.object({
        userEmail: z2.string().email(),
        planName: z2.string(),
        priceUsd: z2.number().positive(),
        coin: z2.enum(["BTC", "ETH", "USDT_TRC20", "USDT_ERC20", "USDT_SOL"]),
        amountCrypto: z2.string()
      })
    ).mutation(async ({ input }) => {
      try {
        const config = getCryptoConfig(input.coin);
        const db = await getDb();
        if (!db) {
          return {
            success: false,
            error: "Database connection failed"
          };
        }
        const rateUsd = await getCryptoPrice(config.coingeckoId);
        const expectedAmount = calculateCryptoAmount(input.priceUsd, rateUsd);
        const provided = parseFloat(input.amountCrypto);
        const expected = parseFloat(expectedAmount);
        const tolerance = Math.max(expected * 0.02, 1e-8);
        if (Number.isNaN(provided) || Math.abs(provided - expected) > tolerance) {
          return {
            success: false,
            error: "Payment amount no longer matches the current rate. Refresh quote."
          };
        }
        await db.insert(payments).values({
          userEmail: input.userEmail,
          planName: input.planName,
          priceUsd: input.priceUsd,
          coin: input.coin,
          network: config.network,
          amountCrypto: expectedAmount,
          address: config.address,
          status: "pending",
          rateUsd
        });
        await notifyTelegramPayment(
          `\u{1F4B8} New crypto payment intent
Plan: *${input.planName}*
Coin: *${input.coin}*
Amount: *${expectedAmount}*
USD: $${input.priceUsd}
Network: ${config.network}
User: ${input.userEmail}`
        );
        return {
          success: true,
          message: "Payment recorded. Please send your transaction hash to Telegram: https://t.me/OxProfTradez",
          address: config.address,
          network: config.network
        };
      } catch (error) {
        console.error("Failed to submit payment:", error);
        return {
          success: false,
          error: "Failed to record payment. Please try again."
        };
      }
    })
  })
});

// server/_core/context.ts
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  const cookies = req.cookies || {};
  return cookies[AUTH_COOKIE_NAME] || cookies.token || cookies.jwt || null;
}
async function createContext(opts) {
  let user = null;
  try {
    const token = extractToken(opts.req);
    const payload = token ? verifyToken(token) : null;
    if (payload?.userId) {
      user = await getUserById(payload.userId) ?? null;
    }
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/middleware/errorHandler.ts
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }
  const statusCode = err instanceof HttpError ? err.statusCode : typeof err?.status === "number" ? err.status : 500;
  const message = err instanceof HttpError ? err.message : typeof err?.message === "string" ? err.message : "Internal server error";
  if (statusCode >= 500) {
    console.error("[Express] Unhandled error:", err);
  }
  res.status(statusCode).json({ error: message });
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid as nanoid2 } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
var plugins = [react(), tailwindcss()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      "osmora.xyz",
      ".osmora.xyz",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid2()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
var isDevEnv = process.env.NODE_ENV === "development" || process.argv.includes("--dev");
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  const allowedOrigins = (process.env.CORS_ORIGINS ?? process.env.FRONTEND_ORIGIN ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
  app.use(
    cors({
      origin: allowedOrigins.length ? allowedOrigins : true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    })
  );
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1e3,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many auth attempts, please try again later."
  });
  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.use("/auth", authLimiter, authRoutes_default);
  app.use("/api/auth", authLimiter, authRoutes_default);
  app.post("/api/crypto-quote", async (req, res) => {
    try {
      const { coin, priceUsd } = req.body;
      if (!coin || typeof priceUsd !== "number" || priceUsd <= 0) {
        res.status(400).json({ success: false, error: "coin and positive priceUsd are required" });
        return;
      }
      const config = getCryptoConfig(coin);
      const rateUsd = await getCryptoPrice(config.coingeckoId);
      const amount = calculateCryptoAmount(priceUsd, rateUsd);
      res.json({
        success: true,
        coin,
        amount,
        address: config.address,
        network: config.network,
        rateUsd
      });
    } catch (error) {
      console.error("[crypto-quote] failed", error);
      res.status(500).json({ success: false, error: "Unable to fetch quote" });
    }
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (isDevEnv) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  app.use(errorHandler);
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    const baseUrl = !isDevEnv ? "https://osmora.xyz" : `http://localhost:${port}`;
    console.log(`Server running on ${baseUrl}`);
  });
}
startServer().catch(console.error);
