/**
 * Unified Email Service
 *
 * Provides a consistent interface for sending emails in all environments.
 * Uses SendGrid in production, SMTP/Mailpit in development.
 */

import { render } from "@react-email/render";
import { logger } from "@/lib/logger";

// Email templates
import EmailVerification from "@/emails/templates/email-verification";
import PasswordResetEmail from "@/emails/templates/password-reset";
import WelcomeEmail from "@/emails/templates/welcome";
import NewLoginEmail from "@/emails/templates/new-login";
import PasswordChangedEmail from "@/emails/templates/password-changed";

// ============================================================================
// Types
// ============================================================================

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailVerificationOptions {
  to: string;
  userName?: string;
  verificationUrl: string;
  verificationCode?: string;
  appName?: string;
  logoUrl?: string;
  expiresInHours?: number;
}

export interface PasswordResetOptions {
  to: string;
  userName?: string;
  resetUrl: string;
  appName?: string;
  logoUrl?: string;
  expiresInMinutes?: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface TwoFactorCodeOptions {
  to: string;
  userName?: string;
  code: string;
  appName?: string;
  logoUrl?: string;
  expiresInMinutes?: number;
}

export interface MagicLinkOptions {
  to: string;
  userName?: string;
  magicLinkUrl: string;
  appName?: string;
  logoUrl?: string;
  expiresInMinutes?: number;
}

export interface WelcomeEmailOptions {
  to: string;
  userName: string;
  appName?: string;
  logoUrl?: string;
  loginUrl?: string;
}

export interface NewLoginOptions {
  to: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  appName?: string;
  logoUrl?: string;
}

export interface PasswordChangedOptions {
  to: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
  appName?: string;
  logoUrl?: string;
}

// ============================================================================
// Email Service Class
// ============================================================================

class EmailService {
  private provider: "sendgrid" | "smtp" | "console";
  private fromEmail: string;
  private fromName: string;
  private appName: string;

  constructor() {
    // Determine provider based on environment
    const isDevelopment = process.env.NODE_ENV === "development";
    const hasResend = !!process.env.RESEND_API_KEY;
    const hasSendGrid = !!process.env.SENDGRID_API_KEY;
    const hasSmtp = !!process.env.SMTP_HOST;

    if (hasSendGrid) {
      this.provider = "sendgrid";
    } else if (hasSmtp) {
      this.provider = "smtp";
    } else if (isDevelopment) {
      this.provider = "console";
      logger.info("[Email] Using console provider in development mode");
    } else {
      this.provider = "console";
      logger.warn(
        "[Email] No email provider configured, using console fallback",
      );
    }

    this.fromEmail =
      process.env.EMAIL_FROM ||
      process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
      "noreply@nchat.app";
    this.fromName = process.env.EMAIL_FROM_NAME || "nChat";
    this.appName = process.env.NEXT_PUBLIC_APP_NAME || "nChat";

    logger.info(`[Email] Initialized with provider: ${this.provider}`);
  }

  /**
   * Send a generic email
   */
  async send(options: EmailOptions): Promise<boolean> {
    try {
      const from = options.from || `${this.fromName} <${this.fromEmail}>`;

      switch (this.provider) {
        case "sendgrid":
          return await this.sendWithSendGrid({ ...options, from });
        case "smtp":
          return await this.sendWithSMTP({ ...options, from });
        case "console":
          return await this.sendWithConsole({ ...options, from });
        default:
          logger.error("[Email] Unknown provider:", this.provider);
          return false;
      }
    } catch (error) {
      logger.error("[Email] Send error:", error);
      return false;
    }
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(
    options: EmailVerificationOptions,
  ): Promise<boolean> {
    try {
      const html = await render(
        EmailVerification({
          userName: options.userName,
          verificationUrl: options.verificationUrl,
          verificationCode: options.verificationCode,
          appName: options.appName || this.appName,
          logoUrl: options.logoUrl,
          expiresInHours: options.expiresInHours,
        }),
      );

      return await this.send({
        to: options.to,
        subject: `Verify your email for ${options.appName || this.appName}`,
        html,
      });
    } catch (error) {
      logger.error("[Email] Email verification send error:", error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(options: PasswordResetOptions): Promise<boolean> {
    try {
      const html = await render(
        PasswordResetEmail({
          userName: options.userName,
          resetUrl: options.resetUrl,
          appName: options.appName || this.appName,
          logoUrl: options.logoUrl,
          expiresInMinutes: options.expiresInMinutes,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
        }),
      );

      return await this.send({
        to: options.to,
        subject: `Reset your ${options.appName || this.appName} password`,
        html,
      });
    } catch (error) {
      logger.error("[Email] Password reset send error:", error);
      return false;
    }
  }

  /**
   * Send 2FA code
   */
  async send2FACode(options: TwoFactorCodeOptions): Promise<boolean> {
    try {
      // Generate simple HTML template for 2FA code
      const html = this.generate2FACodeHTML({
        userName: options.userName,
        code: options.code,
        appName: options.appName || this.appName,
        expiresInMinutes: options.expiresInMinutes || 10,
      });

      return await this.send({
        to: options.to,
        subject: `Your ${options.appName || this.appName} verification code`,
        html,
      });
    } catch (error) {
      logger.error("[Email] 2FA code send error:", error);
      return false;
    }
  }

  /**
   * Send magic link
   */
  async sendMagicLink(options: MagicLinkOptions): Promise<boolean> {
    try {
      const html = this.generateMagicLinkHTML({
        userName: options.userName,
        magicLinkUrl: options.magicLinkUrl,
        appName: options.appName || this.appName,
        expiresInMinutes: options.expiresInMinutes || 15,
      });

      return await this.send({
        to: options.to,
        subject: `Sign in to ${options.appName || this.appName}`,
        html,
      });
    } catch (error) {
      logger.error("[Email] Magic link send error:", error);
      return false;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(options: WelcomeEmailOptions): Promise<boolean> {
    try {
      const html = await render(
        WelcomeEmail({
          userName: options.userName,
          appName: options.appName || this.appName,
          logoUrl: options.logoUrl,
          loginUrl: options.loginUrl,
        }),
      );

      return await this.send({
        to: options.to,
        subject: `Welcome to ${options.appName || this.appName}!`,
        html,
      });
    } catch (error) {
      logger.error("[Email] Welcome email send error:", error);
      return false;
    }
  }

  /**
   * Send new login notification
   */
  async sendNewLoginNotification(options: NewLoginOptions): Promise<boolean> {
    try {
      const html = await render(
        NewLoginEmail({
          userName: options.userName,
          ipAddress: options.ipAddress,
          location: options.location as any,
          appName: options.appName || this.appName,
          logoUrl: options.logoUrl,
        }),
      );

      return await this.send({
        to: options.to,
        subject: `New login to your ${options.appName || this.appName} account`,
        html,
      });
    } catch (error) {
      logger.error("[Email] New login notification send error:", error);
      return false;
    }
  }

  /**
   * Send password changed notification
   */
  async sendPasswordChangedNotification(
    options: PasswordChangedOptions,
  ): Promise<boolean> {
    try {
      const html = await render(
        PasswordChangedEmail({
          userName: options.userName,
          ipAddress: options.ipAddress,
          appName: options.appName || this.appName,
          logoUrl: options.logoUrl,
        }),
      );

      return await this.send({
        to: options.to,
        subject: `Your ${options.appName || this.appName} password was changed`,
        html,
      });
    } catch (error) {
      logger.error("[Email] Password changed notification send error:", error);
      return false;
    }
  }

  // ==========================================================================
  // Provider-specific implementations
  // ==========================================================================

  /**
   * Send with SendGrid
   */
  private async sendWithSendGrid(options: EmailOptions): Promise<boolean> {
    try {
      const sgMail = await import("@sendgrid/mail");
      sgMail.default.setApiKey(process.env.SENDGRID_API_KEY!);

      const msg = {
        to: options.to,
        from: options.from || this.fromEmail,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
      };

      await sgMail.default.send(msg);
      logger.info("[Email] Sent via SendGrid", { to: options.to });
      return true;
    } catch (error) {
      logger.error("[Email] SendGrid error", error);
      return false;
    }
  }

  /**
   * Send with SMTP (Nodemailer)
   */
  private async sendWithSMTP(options: EmailOptions): Promise<boolean> {
    try {
      const nodemailer = await import("nodemailer");

      const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST || "localhost",
        port: parseInt(process.env.SMTP_PORT || "1025"),
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            }
          : undefined,
      });

      await transporter.sendMail({
        from: options.from || this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
      });

      logger.info("[Email] Sent via SMTP", { to: options.to });
      return true;
    } catch (error) {
      logger.error("[Email] SMTP error", error);
      return false;
    }
  }

  /**
   * Console fallback (development)
   */
  private async sendWithConsole(options: EmailOptions): Promise<boolean> {
    const toStr = Array.isArray(options.to)
      ? options.to.join(", ")
      : options.to;
    logger.info("[Email] Console mode - Email would be sent", {
      to: toStr,
      from: options.from,
      subject: options.subject,
      htmlLength: options.html.length,
    });

    // In development, also extract URLs from HTML for easy testing
    const urlMatches = options.html.match(/href="([^"]+)"/g);
    if (urlMatches) {
      const links: string[] = [];
      urlMatches.forEach((match) => {
        const url = match.match(/href="([^"]+)"/)?.[1];
        if (
          url &&
          (url.includes("verify") ||
            url.includes("reset") ||
            url.includes("magic"))
        ) {
          links.push(url);
        }
      });
      if (links.length > 0) {
        logger.info("[Email] Links found", { links });
      }
    }

    return true;
  }

  // ==========================================================================
  // HTML Template Generators (for templates not in React Email)
  // ==========================================================================

  /**
   * Generate 2FA code HTML
   */
  private generate2FACodeHTML(options: {
    userName?: string;
    code: string;
    appName: string;
    expiresInMinutes: number;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Verification Code</h1>
  </div>

  <div style="background: white; padding: 40px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    ${options.userName ? `<p style="font-size: 16px; margin: 0 0 20px;">Hi ${options.userName},</p>` : ""}

    <p style="font-size: 16px; margin: 0 0 20px;">
      Use this verification code to complete your two-factor authentication:
    </p>

    <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
      <div style="font-size: 48px; font-weight: bold; letter-spacing: 8px; color: #0f172a; font-family: 'Courier New', monospace;">
        ${options.code}
      </div>
    </div>

    <p style="font-size: 14px; color: #64748b; margin: 20px 0;">
      This code will expire in <strong>${options.expiresInMinutes} minutes</strong>.
    </p>

    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <p style="font-size: 14px; color: #92400e; margin: 0;">
        ⚠️ Never share this code with anyone. ${options.appName} will never ask you for this code.
      </p>
    </div>

    <p style="font-size: 16px; margin: 30px 0 0;">
      Best regards,<br>
      The ${options.appName} Security Team
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #64748b; font-size: 12px;">
    <p>This is an automated message from ${options.appName}</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate magic link HTML
   */
  private generateMagicLinkHTML(options: {
    userName?: string;
    magicLinkUrl: string;
    appName: string;
    expiresInMinutes: number;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to ${options.appName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Sign In to ${options.appName}</h1>
  </div>

  <div style="background: white; padding: 40px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    ${options.userName ? `<p style="font-size: 16px; margin: 0 0 20px;">Hi ${options.userName},</p>` : ""}

    <p style="font-size: 16px; margin: 0 0 20px;">
      Click the button below to sign in to your ${options.appName} account. This link will expire in ${options.expiresInMinutes} minutes.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${options.magicLinkUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Sign In Now
      </a>
    </div>

    <p style="font-size: 14px; color: #64748b; margin: 20px 0;">
      Or copy and paste this URL into your browser:
    </p>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin: 10px 0; word-break: break-all; font-family: monospace; font-size: 12px;">
      ${options.magicLinkUrl}
    </div>

    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <p style="font-size: 14px; color: #92400e; margin: 0;">
        ⚠️ If you didn't request this link, you can safely ignore this email.
      </p>
    </div>

    <p style="font-size: 16px; margin: 30px 0 0;">
      Best regards,<br>
      The ${options.appName} Team
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #64748b; font-size: 12px;">
    <p>This is an automated message from ${options.appName}</p>
  </div>
</body>
</html>
    `.trim();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const emailService = new EmailService();
