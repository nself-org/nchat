/**
 * Apple Sign In Authentication Provider
 *
 * Apple Sign In integration supporting:
 * - Sign in with Apple web flow
 * - Private email relay
 * - Name retrieval (first sign-in only)
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

export interface AppleProviderConfig extends OAuthProviderConfig {
  teamId?: string;
  keyId?: string;
  serviceId?: string;
  usePrivateEmail: boolean;
}

export const defaultAppleConfig: AppleProviderConfig = {
  enabled: false,
  name: "apple",
  displayName: "Apple",
  icon: "apple",
  order: 5,
  clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || "",
  scopes: ["name", "email"],
  usePrivateEmail: true,
};

// ============================================================================
// Provider Implementation
// ============================================================================

export class AppleProvider implements AuthProvider {
  type: AuthProviderType = "apple";
  name = "Apple";
  private config: AppleProviderConfig;

  constructor(config: Partial<AppleProviderConfig> = {}) {
    this.config = { ...defaultAppleConfig, ...config };
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
          message: "Sign in with Apple is not configured",
        },
      };
    }

    try {
      await nhost.auth.signIn({
        provider: "apple",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      return {
        success: true,
        requiresVerification: true,
      };
    } catch (err) {
      logger.error("AppleProvider.authenticate error:", err);
      return {
        success: false,
        error: {
          code: "oauth_error",
          message: "Failed to initiate Sign in with Apple",
        },
      };
    }
  }

  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.serviceId || this.config.clientId,
      redirect_uri: `${window.location.origin}/auth/callback`,
      response_type: "code id_token",
      response_mode: "form_post",
      scope: this.config.scopes?.join(" ") || "name email",
      state: state || this.generateState(),
    });

    return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
  }

  async handleCallback(code: string, state?: string): Promise<AuthResult> {
    try {
      const session = nhost.auth.getSession();

      if (!session) {
        return {
          success: false,
          error: {
            code: "callback_error",
            message: "Failed to complete Sign in with Apple",
          },
        };
      }

      // Apple only provides name on first sign-in
      // After that, we need to retrieve it from our database
      const displayName =
        session.user.displayName ||
        (session.user.metadata?.["name"] as string) ||
        this.extractNameFromMetadata(session.user.metadata);

      return {
        success: true,
        session: {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken ?? undefined,
          expiresAt: new Date(session.accessTokenExpiresIn * 1000 + Date.now()),
          user: {
            id: session.user.id,
            email: session.user.email ?? undefined,
            displayName,
            avatarUrl: session.user.avatarUrl ?? undefined,
            emailVerified: true, // Apple verifies emails
            provider: "apple",
            providerUserId: session.user.metadata?.["sub"] as string,
            metadata: {
              isPrivateEmail: session.user.email?.includes(
                "privaterelay.appleid.com",
              ),
            },
          },
        },
      };
    } catch (err) {
      logger.error("AppleProvider.handleCallback error:", err);
      return {
        success: false,
        error: {
          code: "callback_error",
          message: "Failed to complete Sign in with Apple",
        },
      };
    }
  }

  /**
   * Handle Apple's POST callback (form_post response mode)
   * This is called from an API route that receives Apple's POST
   */
  async handlePostCallback(params: {
    code: string;
    id_token: string;
    state?: string;
    user?: string; // JSON string with name on first sign-in
  }): Promise<AuthResult> {
    try {
      // Parse user info if provided (first sign-in only)
      let userName: { firstName?: string; lastName?: string } | undefined;
      if (params.user) {
        try {
          const userData = JSON.parse(params.user);
          userName = userData.name;
        } catch {
          // Ignore parse errors
        }
      }

      // Exchange code for session via backend
      const response = await fetch("/api/auth/apple/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: params.code,
          id_token: params.id_token,
          state: params.state,
          user: userName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: {
            code: "callback_error",
            message: data.message || "Failed to complete Sign in with Apple",
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
            emailVerified: true,
            provider: "apple",
          },
        },
      };
    } catch (err) {
      logger.error("AppleProvider.handlePostCallback error:", err);
      return {
        success: false,
        error: {
          code: "callback_error",
          message: "Failed to process Apple sign-in response",
        },
      };
    }
  }

  async linkAccount(userId: string): Promise<AuthResult> {
    try {
      await nhost.auth.signIn({
        provider: "apple",
        options: {
          redirectTo: `${window.location.origin}/settings/auth-methods?link=apple`,
        },
      });

      return {
        success: true,
        requiresVerification: true,
      };
    } catch (err) {
      logger.error("AppleProvider.linkAccount error:", err);
      return {
        success: false,
        error: {
          code: "link_error",
          message: "Failed to link Apple account",
        },
      };
    }
  }

  async unlinkAccount(
    userId: string,
  ): Promise<{ success: boolean; error?: AuthError }> {
    try {
      const response = await fetch("/api/auth/unlink-provider", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          provider: "apple",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: {
            code: "unlink_error",
            message: data.message || "Failed to unlink Apple account",
          },
        };
      }

      return { success: true };
    } catch (err) {
      logger.error("AppleProvider.unlinkAccount error:", err);
      return {
        success: false,
        error: {
          code: "unlink_error",
          message: "Failed to unlink Apple account",
        },
      };
    }
  }

  private extractNameFromMetadata(
    metadata?: Record<string, unknown>,
  ): string | undefined {
    if (!metadata) return undefined;

    const firstName = metadata["firstName"] || metadata["given_name"];
    const lastName = metadata["lastName"] || metadata["family_name"];

    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }

    return (firstName || lastName) as string | undefined;
  }

  private generateState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  }

  getConfig(): AppleProviderConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<AppleProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const appleProvider = new AppleProvider();
