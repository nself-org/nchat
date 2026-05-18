/**
 * Email/Password Authentication Provider
 *
 * Traditional email and password authentication with support for:
 * - User registration with email verification
 * - Sign in with email/password
 * - Password reset via email
 * - Password strength validation
 */

import { nhost } from "@/lib/nhost";
import { logger } from "@/lib/logger";
import {
  AuthProvider,
  AuthProviderType,
  AuthResult,
  AuthError,
  EmailPasswordCredentials,
  EmailProviderConfig,
} from "./types";

// ============================================================================
// Configuration
// ============================================================================

export const defaultEmailConfig: EmailProviderConfig = {
  enabled: true,
  name: "email",
  displayName: "Email & Password",
  icon: "mail",
  order: 1,
  requireVerification: true,
  allowSignup: true,
  minPasswordLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
};

// ============================================================================
// Password Validation
// ============================================================================

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: "weak" | "fair" | "good" | "strong";
}

export function validatePassword(
  password: string,
  config: EmailProviderConfig = defaultEmailConfig,
): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < config.minPasswordLength) {
    errors.push(
      `Password must be at least ${config.minPasswordLength} characters`,
    );
  }

  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (config.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (config.requireNumbers && !/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  // Calculate strength
  let strengthScore = 0;
  if (password.length >= 8) strengthScore++;
  if (password.length >= 12) strengthScore++;
  if (/[A-Z]/.test(password)) strengthScore++;
  if (/[a-z]/.test(password)) strengthScore++;
  if (/[0-9]/.test(password)) strengthScore++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strengthScore++;

  let strength: "weak" | "fair" | "good" | "strong" = "weak";
  if (strengthScore >= 5) strength = "strong";
  else if (strengthScore >= 4) strength = "good";
  else if (strengthScore >= 3) strength = "fair";

  return {
    valid: errors.length === 0,
    errors,
    strength,
  };
}

// ============================================================================
// Email Validation
// ============================================================================

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================================================
// Provider Implementation
// ============================================================================

export class EmailPasswordProvider implements AuthProvider {
  type: AuthProviderType = "email";
  name = "Email & Password";
  private config: EmailProviderConfig;

  constructor(config: Partial<EmailProviderConfig> = {}) {
    this.config = { ...defaultEmailConfig, ...config };
  }

  isConfigured(): boolean {
    return this.config.enabled;
  }

  async authenticate(
    credentials?: EmailPasswordCredentials,
  ): Promise<AuthResult> {
    if (!credentials || credentials.type !== "email") {
      return {
        success: false,
        error: {
          code: "invalid_credentials",
          message: "Email and password are required",
        },
      };
    }

    const { email, password } = credentials;

    // Validate email format
    if (!validateEmail(email)) {
      return {
        success: false,
        error: {
          code: "invalid_email",
          message: "Please enter a valid email address",
        },
      };
    }

    try {
      const { session, error } = await nhost.auth.signIn({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          error: this.mapNhostError(error),
        };
      }

      if (!session) {
        return {
          success: false,
          error: {
            code: "no_session",
            message: "Failed to create session",
          },
        };
      }

      return {
        success: true,
        session: {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken ?? undefined,
          expiresAt: new Date(session.accessTokenExpiresIn * 1000 + Date.now()),
          user: {
            id: session.user.id,
            email: session.user.email ?? undefined,
            displayName: session.user.displayName ?? undefined,
            avatarUrl: session.user.avatarUrl ?? undefined,
            emailVerified: session.user.emailVerified,
            provider: "email",
          },
        },
      };
    } catch (err) {
      logger.error("EmailPasswordProvider.authenticate error:", err);
      return {
        success: false,
        error: {
          code: "unknown_error",
          message: "An unexpected error occurred",
        },
      };
    }
  }

  async signUp(
    email: string,
    password: string,
    options?: {
      displayName?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<AuthResult> {
    if (!this.config.allowSignup) {
      return {
        success: false,
        error: {
          code: "signup_disabled",
          message: "Sign up is currently disabled",
        },
      };
    }

    // Validate email
    if (!validateEmail(email)) {
      return {
        success: false,
        error: {
          code: "invalid_email",
          message: "Please enter a valid email address",
        },
      };
    }

    // Validate password
    const passwordValidation = validatePassword(password, this.config);
    if (!passwordValidation.valid) {
      return {
        success: false,
        error: {
          code: "weak_password",
          message: passwordValidation.errors[0],
          details: { errors: passwordValidation.errors },
        },
      };
    }

    try {
      const { session, error } = await nhost.auth.signUp({
        email,
        password,
        options: {
          displayName: options?.displayName,
          metadata: options?.metadata,
        },
      });

      if (error) {
        return {
          success: false,
          error: this.mapNhostError(error),
        };
      }

      // If email verification is required and no session, user needs to verify
      if (this.config.requireVerification && !session) {
        return {
          success: true,
          requiresVerification: true,
          user: {
            id: "",
            email,
            provider: "email",
            emailVerified: false,
          },
        };
      }

      if (!session) {
        return {
          success: true,
          requiresVerification: true,
        };
      }

      return {
        success: true,
        session: {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken ?? undefined,
          expiresAt: new Date(session.accessTokenExpiresIn * 1000 + Date.now()),
          user: {
            id: session.user.id,
            email: session.user.email ?? undefined,
            displayName: session.user.displayName ?? undefined,
            avatarUrl: session.user.avatarUrl ?? undefined,
            emailVerified: session.user.emailVerified,
            provider: "email",
          },
        },
      };
    } catch (err) {
      logger.error("EmailPasswordProvider.signUp error:", err);
      return {
        success: false,
        error: {
          code: "unknown_error",
          message: "An unexpected error occurred during sign up",
        },
      };
    }
  }

  async resetPassword(
    email: string,
  ): Promise<{ success: boolean; error?: AuthError }> {
    if (!validateEmail(email)) {
      return {
        success: false,
        error: {
          code: "invalid_email",
          message: "Please enter a valid email address",
        },
      };
    }

    try {
      const { error } = await nhost.auth.resetPassword({
        email,
      });

      if (error) {
        return {
          success: false,
          error: this.mapNhostError(error),
        };
      }

      return { success: true };
    } catch (err) {
      logger.error("EmailPasswordProvider.resetPassword error:", err);
      return {
        success: false,
        error: {
          code: "unknown_error",
          message: "Failed to send password reset email",
        },
      };
    }
  }

  async changePassword(
    newPassword: string,
    ticket?: string,
  ): Promise<{ success: boolean; error?: AuthError }> {
    const passwordValidation = validatePassword(newPassword, this.config);
    if (!passwordValidation.valid) {
      return {
        success: false,
        error: {
          code: "weak_password",
          message: passwordValidation.errors[0],
          details: { errors: passwordValidation.errors },
        },
      };
    }

    try {
      const { error } = await nhost.auth.changePassword({
        newPassword,
        ticket,
      });

      if (error) {
        return {
          success: false,
          error: this.mapNhostError(error),
        };
      }

      return { success: true };
    } catch (err) {
      logger.error("EmailPasswordProvider.changePassword error:", err);
      return {
        success: false,
        error: {
          code: "unknown_error",
          message: "Failed to change password",
        },
      };
    }
  }

  async sendVerificationEmail(
    email: string,
  ): Promise<{ success: boolean; error?: AuthError }> {
    try {
      const { error } = await nhost.auth.sendVerificationEmail({
        email,
      });

      if (error) {
        return {
          success: false,
          error: this.mapNhostError(error),
        };
      }

      return { success: true };
    } catch (err) {
      logger.error("EmailPasswordProvider.sendVerificationEmail error:", err);
      return {
        success: false,
        error: {
          code: "unknown_error",
          message: "Failed to send verification email",
        },
      };
    }
  }

  private mapNhostError(error: {
    message: string;
    status?: number;
  }): AuthError {
    const message = error.message.toLowerCase();

    if (message.includes("invalid") || message.includes("incorrect")) {
      return {
        code: "invalid_credentials",
        message: "Invalid email or password",
      };
    }

    if (message.includes("already") || message.includes("exists")) {
      return {
        code: "email_exists",
        message: "An account with this email already exists",
      };
    }

    if (message.includes("not found") || message.includes("doesn't exist")) {
      return {
        code: "user_not_found",
        message: "No account found with this email",
      };
    }

    if (message.includes("disabled") || message.includes("blocked")) {
      return {
        code: "account_disabled",
        message: "This account has been disabled",
      };
    }

    if (message.includes("verify") || message.includes("unverified")) {
      return {
        code: "email_not_verified",
        message: "Please verify your email address",
      };
    }

    if (message.includes("rate") || message.includes("limit")) {
      return {
        code: "rate_limited",
        message: "Too many attempts. Please try again later",
      };
    }

    return {
      code: "auth_error",
      message: error.message,
    };
  }

  getConfig(): EmailProviderConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<EmailProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const emailPasswordProvider = new EmailPasswordProvider();
