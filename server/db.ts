import { and, eq, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  passwordResetTokens,
  emailVerificationTokens,
  sessions,
  type User,
  type PasswordResetToken,
  type EmailVerificationToken,
  type Session,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// USER FUNCTIONS
// ============================================================================

/**
 * Create a new user with email and password hash
 */
export async function createUser(
  email: string,
  name: string,
  passwordHash: string
): Promise<User> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(users).values({
    email,
    name,
    passwordHash,
    loginMethod: "email",
    isEmailVerified: "false",
  });

  const newUser = await getUserByEmail(email);
  if (!newUser) {
    throw new Error("Failed to create user");
  }

  return newUser;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get user by ID
 */
export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Update user password
 */
export async function updateUserPassword(
  email: string,
  passwordHash: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.email, email));
}

/**
 * Update user email verification status
 */
export async function updateUserEmailVerified(
  email: string,
  isVerified: boolean
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(users)
    .set({
      isEmailVerified: isVerified ? "true" : "false",
      updatedAt: new Date(),
    })
    .where(eq(users.email, email));
}

/**
 * Update user last signed in
 */
export async function updateUserLastSignedIn(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(users)
    .set({
      lastSignedIn: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Upsert user for OAuth (existing function)
 */
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
      email: user.email || "",
      loginMethod: "oauth",
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined || value === null) return;
      values[field] = value;
      updateSet[field] = value;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

/**
 * Get user by OpenId (OAuth)
 */
export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// PASSWORD RESET TOKEN FUNCTIONS
// ============================================================================

/**
 * Create password reset token with OTP
 */
export async function createPasswordResetToken(
  email: string,
  otp: string,
  expiresAt: Date
): Promise<PasswordResetToken> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Delete any existing tokens for this email
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.email, email));

  const result = await db.insert(passwordResetTokens).values({
    email,
    otp,
    expiresAt,
    isVerified: "false",
  });

  const token = await getPasswordResetToken(email, otp);
  if (!token) {
    throw new Error("Failed to create password reset token");
  }

  return token;
}

/**
 * Get password reset token
 */
export async function getPasswordResetToken(
  email: string,
  otp: string
): Promise<PasswordResetToken | undefined> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.email, email),
        eq(passwordResetTokens.otp, otp),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Verify password reset token
 */
export async function verifyPasswordResetToken(
  email: string,
  otp: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(passwordResetTokens)
    .set({
      isVerified: "true",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(passwordResetTokens.email, email),
        eq(passwordResetTokens.otp, otp)
      )
    );
}

/**
 * Delete password reset token
 */
export async function deletePasswordResetToken(
  email: string,
  otp: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .delete(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.email, email),
        eq(passwordResetTokens.otp, otp)
      )
    );
}

// ============================================================================
// EMAIL VERIFICATION TOKEN FUNCTIONS
// ============================================================================

/**
 * Create email verification token
 */
export async function createEmailVerificationToken(
  email: string,
  code: string,
  expiresAt: Date
): Promise<EmailVerificationToken> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Delete any existing tokens for this email
  await db
    .delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.email, email));

  const result = await db.insert(emailVerificationTokens).values({
    email,
    code,
    expiresAt,
    isVerified: "false",
  });

  const token = await getEmailVerificationToken(email, code);
  if (!token) {
    throw new Error("Failed to create email verification token");
  }

  return token;
}

/**
 * Get email verification token
 */
export async function getEmailVerificationToken(
  email: string,
  code: string
): Promise<EmailVerificationToken | undefined> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.email, email),
        eq(emailVerificationTokens.code, code),
        gt(emailVerificationTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Verify email verification token
 */
export async function verifyEmailVerificationToken(
  email: string,
  code: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(emailVerificationTokens)
    .set({
      isVerified: "true",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(emailVerificationTokens.email, email),
        eq(emailVerificationTokens.code, code)
      )
    );
}

/**
 * Delete email verification token
 */
export async function deleteEmailVerificationToken(
  email: string,
  code: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .delete(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.email, email),
        eq(emailVerificationTokens.code, code)
      )
    );
}

// ============================================================================
// SESSION FUNCTIONS
// ============================================================================

/**
 * Create session
 */
export async function createSession(
  userId: number,
  token: string,
  expiresAt: Date,
  ipAddress?: string,
  userAgent?: string
): Promise<Session> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
    ipAddress,
    userAgent,
    isActive: "true",
  });

  const session = await getSession(token);
  if (!session) {
    throw new Error("Failed to create session");
  }

  return session;
}

/**
 * Get session by token
 */
export async function getSession(token: string): Promise<Session | undefined> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.token, token),
        eq(sessions.isActive, "true"),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Invalidate session
 */
export async function invalidateSession(token: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(sessions)
    .set({
      isActive: "false",
      updatedAt: new Date(),
    })
    .where(eq(sessions.token, token));
}

/**
 * Invalidate all user sessions
 */
export async function invalidateAllUserSessions(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(sessions)
    .set({
      isActive: "false",
      updatedAt: new Date(),
    })
    .where(eq(sessions.userId, userId));
}
