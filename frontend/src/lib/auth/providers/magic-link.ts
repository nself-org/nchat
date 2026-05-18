/**
 * Magic Link Authentication Provider
 *
 * Passwordless authentication via email magic links:
 * - Send a unique link to user's email
 * - User clicks link to authenticate
 * - No password required
 */

import { nhost } from "@/lib/nhost";
import { logger } from "@/lib/logger";
import {
  AuthProvider,
  AuthProviderType,
  AuthResult,
  AuthError,
  MagicLinkCredentials,
  BaseProviderConfig,
} from "./types";

// ============================================================================
// Configuration
// ============================================================================

export interface MagicLinkProviderConfig extends BaseProviderConfig {
  linkExpiryMinutes: number;
  allowSignup: boolean;
  defaultRedirectUrl?: string;
}

export const defaultMagicLinkConfig: MagicLinkProviderConfig = {
  enabled: true,
  name: "magic-link",
  displayName: "Magic Link",
  icon: "wand",
  order: 2,
  linkExpiryMinutes: 15,
  allowSignup: true,
  defaultRedirectUrl: "/chat",
};

// ============================================================================
// Provider Implementation
// ============================================================================

export class MagicLinkProvider implements AuthProvider {
  type: AuthProviderType = "magic-link";
  name = "Magic Link";
  private config: MagicLinkProviderConfig;

  constructor(config: Partial<MagicLinkProviderConfig> = {}) {
    this.config = { ...defaultMagicLinkConfig, ...config };
  }

  isConfigured(): boolean {
    return this.config.enabled;
  }

  async authenticate(credentials?: MagicLinkCredentials): Promise<AuthResult> {
    if (!credentials || credentials.type !== "magic-link") {
      return {
        success: false,
        error: {
          code: "invalid_credentials",
          message: "Email is required",
        },
      };
    }

    return this.sendMagicLink(credentials.email);
  }

  async sendMagicLink(
    email: string,
    options?: {
      redirectTo?: string;
      allowedRoles?: string[];
    },
  ): Promise<AuthResult> {
    // Validate email
    if (!this.validateEmail(email)) {
      return {
        success: false,
        error: {
          code: "invalid_email",
          message: "Please enter a valid email address",
        },
      };
    }

    try {
      const { error } = await nhost.auth.signIn({
        email,
        options: {
          redirectTo: options?.redirectTo || this.config.defaultRedirectUrl,
          allowedRoles: options?.allowedRoles,
        },
      });

      if (error) {
        return {
          success: false,
          error: this.mapNhostError(error),
        };
      }

      // Magic link sent successfully - user needs to check email
      return {
        success: true,
        requiresVerification: true,
        user: {
          id: "",
          email,
          provider: "magic-link",
        },
      };
    } catch (err) {
      logger.error("MagicLinkProvider.sendMagicLink error:", err);
      return {
        success: false,
        error: {
          code: "unknown_error",
          message: "Failed to send magic link",
        },
      };
    }
  }

  async handleCallback(token: string): Promise<AuthResult> {
    try {
      // The token from the magic link URL should be handled by Nhost client
      // This method is called after the user clicks the link
      const session = nhost.auth.getSession();

      if (!session) {
        return {
          success: false,
          error: {
            code: "invalid_token",
            message: "Invalid or expired magic link",
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
            provider: "magic-link",
          },
        },
      };
    } catch (err) {
      logger.error("MagicLinkProvider.handleCallback error:", err);
      return {
        success: false,
        error: {
          code: "callback_error",
          message: "Failed to process magic link",
        },
      };
    }
  }

  async resendCode(
    email: string,
  ): Promise<{ success: boolean; error?: AuthError }> {
    const result = await this.sendMagicLink(email);
    return {
      success: result.success,
      error: result.error,
    };
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private mapNhostError(error: {
    message: string;
    status?: number;
  }): AuthError {
    const message = error.message.toLowerCase();

    if (message.includes("not found") || message.includes("doesn't exist")) {
      if (this.config.allowSignup) {
        // If signup is allowed, the user will be created
        return {
          code: "email_sent",
          message: "Check your email for the magic link",
        };
      }
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

    if (message.includes("rate") || message.includes("limit")) {
      return {
        code: "rate_limited",
        message: "Too many requests. Please try again later",
      };
    }

    return {
      code: "auth_error",
      message: error.message,
    };
  }

  getConfig(): MagicLinkProviderConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<MagicLinkProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const magicLinkProvider = new MagicLinkProvider();
