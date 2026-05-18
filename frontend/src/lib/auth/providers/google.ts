/**
 * Google OAuth Authentication Provider
 *
 * Google Sign-In integration supporting:
 * - OAuth 2.0 flow
 * - Google One Tap
 * - Profile data retrieval
 */

import { nhost } from "@/lib/nhost";
import {
  AuthProvider,
  AuthProviderType,
  AuthResult,
  AuthError,
  OAuthProviderConfig,
} from "./types";

import { logger } from "@/lib/logger";

// ============================================================================
// Configuration
// ============================================================================

export interface GoogleProviderConfig extends OAuthProviderConfig {
  oneTapEnabled: boolean;
  hostedDomain?: string; // Restrict to specific Google Workspace domain
  prompt?: "none" | "consent" | "select_account";
}

export const defaultGoogleConfig: GoogleProviderConfig = {
  enabled: false,
  name: "google",
  displayName: "Google",
  icon: "google",
  order: 3,
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
  scopes: ["openid", "email", "profile"],
  oneTapEnabled: true,
  prompt: "select_account",
};

// ============================================================================
// Provider Implementation
// ============================================================================

export class GoogleProvider implements AuthProvider {
  type: AuthProviderType = "google";
  name = "Google";
  private config: GoogleProviderConfig;

  constructor(config: Partial<GoogleProviderConfig> = {}) {
    this.config = { ...defaultGoogleConfig, ...config };
  }

  isConfigured(): boolean {
    return this.config.enabled && !!this.config.clientId;
  }

  async authenticate(): Promise<AuthResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: {
          code: "provider_not_configured",
          message: "Google Sign-In is not configured",
        },
      };
    }

    try {
      // Nhost handles the OAuth flow - this redirects the user
      await nhost.auth.signIn({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      // This won't be reached as the user is redirected
      return {
        success: true,
        requiresVerification: true,
      };
    } catch (err) {
      logger.error("GoogleProvider.authenticate error:", err);
      return {
        success: false,
        error: {
          code: "oauth_error",
          message: "Failed to initiate Google Sign-In",
        },
      };
    }
  }

  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: `${window.location.origin}/auth/callback`,
      response_type: "code",
      scope: this.config.scopes?.join(" ") || "openid email profile",
      state: state || this.generateState(),
      access_type: "offline",
      prompt: this.config.prompt || "select_account",
    });

    if (this.config.hostedDomain) {
      params.set("hd", this.config.hostedDomain);
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleCallback(code: string, state?: string): Promise<AuthResult> {
    try {
      // Nhost handles the callback automatically
      // This method is for manual handling if needed
      const session = nhost.auth.getSession();

      if (!session) {
        return {
          success: false,
          error: {
            code: "callback_error",
            message: "Failed to complete Google Sign-In",
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
            emailVerified: true, // Google accounts are verified
            provider: "google",
            providerUserId: session.user.metadata?.["sub"] as string,
          },
        },
      };
    } catch (err) {
      logger.error("GoogleProvider.handleCallback error:", err);
      return {
        success: false,
        error: {
          code: "callback_error",
          message: "Failed to complete Google Sign-In",
        },
      };
    }
  }

  async linkAccount(userId: string): Promise<AuthResult> {
    try {
      // Initiate OAuth flow for linking
      await nhost.auth.signIn({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/settings/auth-methods?link=google`,
        },
      });

      return {
        success: true,
        requiresVerification: true,
      };
    } catch (err) {
      logger.error("GoogleProvider.linkAccount error:", err);
      return {
        success: false,
        error: {
          code: "link_error",
          message: "Failed to link Google account",
        },
      };
    }
  }

  async unlinkAccount(
    userId: string,
  ): Promise<{ success: boolean; error?: AuthError }> {
    try {
      // This would require a backend API call to unlink the provider
      // Nhost doesn't have a built-in unlink method
      const response = await fetch("/api/auth/unlink-provider", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          provider: "google",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: {
            code: "unlink_error",
            message: data.message || "Failed to unlink Google account",
          },
        };
      }

      return { success: true };
    } catch (err) {
      logger.error("GoogleProvider.unlinkAccount error:", err);
      return {
        success: false,
        error: {
          code: "unlink_error",
          message: "Failed to unlink Google account",
        },
      };
    }
  }

  /**
   * Handle Google One Tap callback
   */
  async handleOneTapCallback(credential: string): Promise<AuthResult> {
    try {
      // Send the ID token to the backend for verification
      const response = await fetch("/api/auth/google-one-tap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ credential }),
      });

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: {
            code: "one_tap_error",
            message: data.message || "Failed to sign in with Google One Tap",
          },
        };
      }

      const data = await response.json();

      return {
        success: true,
        session: {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: {
            id: data.user.id,
            email: data.user.email,
            displayName: data.user.displayName,
            avatarUrl: data.user.avatarUrl,
            emailVerified: true,
            provider: "google",
          },
        },
      };
    } catch (err) {
      logger.error("GoogleProvider.handleOneTapCallback error:", err);
      return {
        success: false,
        error: {
          code: "one_tap_error",
          message: "Failed to sign in with Google One Tap",
        },
      };
    }
  }

  private generateState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  }

  getConfig(): GoogleProviderConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<GoogleProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const googleProvider = new GoogleProvider();
