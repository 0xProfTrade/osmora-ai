import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/**
 * Email sending utilities using NodeMailer
 * Supports SMTP configuration for sending OTP and verification emails
 */

let transporter: Transporter | null = null;

/**
 * Initialize email transporter
 * Configure with SMTP credentials from environment variables
 */
export function initializeEmailTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  // Get SMTP configuration from environment variables
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER || "";
  const smtpPassword = process.env.SMTP_PASSWORD || "";
  const smtpFrom = process.env.SMTP_FROM || "noreply@osmora.xyz";

  // Create transporter
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // Use TLS for port 587, SSL for port 465
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  return transporter;
}

/**
 * Get email transporter
 */
export function getEmailTransporter(): Transporter {
  if (!transporter) {
    return initializeEmailTransporter();
  }
  return transporter;
}

/**
 * Send OTP email for password reset
 */
export async function sendPasswordResetOTP(
  email: string,
  otp: string,
  expiresInMinutes: number = 10
): Promise<boolean> {
  try {
    const transporter = getEmailTransporter();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { padding: 20px; }
            .otp-box { background-color: #f0f0f0; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #667eea; }
            .footer { color: #666; font-size: 12px; text-align: center; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>OSMORA AI - Password Reset</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>You requested to reset your password. Use the OTP code below to proceed:</p>
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
              </div>
              <p><strong>This OTP will expire in ${expiresInMinutes} minutes.</strong></p>
              <p>If you didn't request this, please ignore this email.</p>
              <p>Best regards,<br>OSMORA AI Team</p>
            </div>
            <div class="footer">
              <p>© 2024 OSMORA AI. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@osmora.xyz",
      to: email,
      subject: "OSMORA AI - Password Reset OTP",
      html: htmlContent,
    });

    console.log("[Email] Password reset OTP sent to:", email, "Message ID:", result.messageId);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send password reset OTP:", error);
    return false;
  }
}

/**
 * Send email verification code for new signup
 */
export async function sendEmailVerificationCode(
  email: string,
  code: string,
  expiresInHours: number = 24
): Promise<boolean> {
  try {
    const transporter = getEmailTransporter();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { padding: 20px; }
            .code-box { background-color: #f0f0f0; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .code { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #667eea; }
            .footer { color: #666; font-size: 12px; text-align: center; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to OSMORA AI</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Thank you for signing up! Please verify your email address using the code below:</p>
              <div class="code-box">
                <div class="code">${code}</div>
              </div>
              <p><strong>This code will expire in ${expiresInHours} hours.</strong></p>
              <p>If you didn't create this account, please ignore this email.</p>
              <p>Best regards,<br>OSMORA AI Team</p>
            </div>
            <div class="footer">
              <p>© 2024 OSMORA AI. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@osmora.xyz",
      to: email,
      subject: "OSMORA AI - Verify Your Email",
      html: htmlContent,
    });

    console.log("[Email] Email verification code sent to:", email, "Message ID:", result.messageId);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send email verification code:", error);
    return false;
  }
}

/**
 * Send welcome email after successful registration
 */
export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  try {
    const transporter = getEmailTransporter();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { padding: 20px; }
            .footer { color: #666; font-size: 12px; text-align: center; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to OSMORA AI</h1>
            </div>
            <div class="content">
              <p>Hello ${name},</p>
              <p>Welcome to OSMORA AI! Your account has been successfully created.</p>
              <p>You can now log in and start exploring our AI services.</p>
              <p>If you have any questions, feel free to contact our support team.</p>
              <p>Best regards,<br>OSMORA AI Team</p>
            </div>
            <div class="footer">
              <p>© 2024 OSMORA AI. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@osmora.xyz",
      to: email,
      subject: "Welcome to OSMORA AI",
      html: htmlContent,
    });

    console.log("[Email] Welcome email sent to:", email, "Message ID:", result.messageId);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send welcome email:", error);
    return false;
  }
}

/**
 * Generate a random OTP code
 * @param length - Length of OTP (default 6 digits)
 */
export function generateOTP(length: number = 6): string {
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
}

/**
 * Verify email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
