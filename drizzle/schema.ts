import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Users table - supports both custom email/password auth and OAuth
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  /** Email address - unique identifier for custom auth */
  email: varchar("email", { length: 320 }).notNull().unique(),
  /** User's full name */
  name: varchar("name", { length: 255 }),
  /** Bcrypt hashed password for custom auth (nullable for OAuth users) */
  passwordHash: text("passwordHash"),
  /** Manus OAuth identifier (openId) - nullable for custom auth users */
  openId: varchar("openId", { length: 64 }).unique(),
  /** Login method: 'email' for custom auth, 'oauth' for Manus OAuth */
  loginMethod: varchar("loginMethod", { length: 64 }).default("email").notNull(),
  /** User role */
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  /** Whether email is verified */
  isEmailVerified: varchar("isEmailVerified", { length: 5 }).default("false").notNull(),
  /** Last login timestamp */
  lastSignedIn: timestamp("lastSignedIn"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Password reset tokens with OTP verification
 */
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  otp: varchar("otp", { length: 6 }).notNull(),
  isVerified: varchar("isVerified", { length: 5 }).default("false").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

/**
 * Email verification tokens for new user signups
 */
export const emailVerificationTokens = mysqlTable("email_verification_tokens", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  isVerified: varchar("isVerified", { length: 5 }).default("false").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type InsertEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;

/**
 * Session tokens for JWT-based authentication
 */
export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  isActive: varchar("isActive", { length: 5 }).default("true").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

/**
 * Payments table for crypto payments
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userEmail: varchar("userEmail", { length: 320 }).notNull(),
  planName: varchar("planName", { length: 100 }).notNull(),
  priceUsd: int("priceUsd").notNull(),
  coin: varchar("coin", { length: 50 }).notNull(),
  network: varchar("network", { length: 100 }).notNull(),
  amountCrypto: text("amountCrypto").notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
