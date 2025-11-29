/**
 * OTP (One-Time Password) utilities for password reset flow
 */

/**
 * Generate a random 6-digit OTP code
 */
export function generateOTP(): string {
  const otp = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0");
  return otp;
}

/**
 * Calculate OTP expiration time (5 minutes from now)
 */
export function getOTPExpirationTime(): Date {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);
  return now;
}

/**
 * Verify if OTP is expired
 */
export function isOTPExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Send OTP email using Resend API
 * This is a placeholder - implement with your email service
 */
export async function sendOTPEmail(email: string, otp: string): Promise<boolean> {
  try {
    // TODO: Implement email sending via Resend, Mailgun, or SMTP
    // For now, this is a placeholder
    console.log(`Sending OTP ${otp} to ${email}`);
    return true;
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return false;
  }
}
