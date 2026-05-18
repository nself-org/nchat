/**
 * Magic Link Authentication Provider
 *
 * Passwordless authentication via email links:
 * - Send magic link to email
 * - User clicks link to authenticate
 * - No password required
 */

import { logger } from "@/lib/logger";
import {
  AuthProvider,
  AuthProviderMetadata,
  AuthProviderConfig,
  AuthCredentials,
  AuthResult,
  AuthUser,
  AuthError,
  AuthEventListener,
  MagicLinkCredentials,
  BaseAuthProvider,
} from "../auth-plugin.interface";

export interface MagicLinkConfig extends AuthProviderConfig {
  authApiUrl?: string;
  linkExpirationMinutes?: number;
  allowSignUp?: boolean;
}

export class MagicLinkProvider extends BaseAuthProvider {
  readonly metadata: AuthProviderMetadata = {
    id: "magic-link",
    name: "Magic Link",
    type: "passwordless",
    icon: "wand",
    description: "Sign in with a magic link sent to your email",
    requiresBackend: true,
    supportedFeatures: {
      signIn: true,
      signUp: true,
      signOut: true,
      tokenRefresh: true,
      passwordReset: false,
      emailVerification: true,
      phoneVerification: false,
      mfa: false,
      linkAccount: true,
    },
  };

  private extendedConfig: MagicLinkConfig = {
    enabled: false,
    linkExpirationMinutes: 60,
    allowSignUp: true,
  };

  private pendingEmail: string | null = null;

  async initialize(config: AuthProviderConfig): Promise<void> {
    await super.initialize(config);
    this.extendedConfig = { ...this.extendedConfig, ...config };
    await this.loadSession();
    this.checkForMagicLinkCallback();
  }

  async signIn(credentials: AuthCredentials): Promise<AuthResult> {
    // For magic link, signIn is used to handle the callback token
    // Use sendMagicLink to initiate the flow
    const creds = credentials as { token?: string; email?: string };

    if (creds.token) {
      return this.verifyMagicLink(creds.token);
    }

    if (creds.email) {
      const result = await this.sendMagicLink(creds.email);
      if (result.success) {
        return {
          success: true,
          // No user yet - they need to click the link
        };
      }
      return this.createErrorResult(result.error!);
    }

    return this.createErrorResult(
      this.createError("INVALID_CREDENTIALS", "Email or token is required"),
    );
  }

  async signUp(
    credentials: AuthCredentials,
    metadata?: Record<string, unknown>,
  ): Promise<AuthResult> {
    if (!this.extendedConfig.allowSignUp) {
      return this.createErrorResult(
        this.createError(
          "SIGNUP_DISABLED",
          "Sign up is not allowed with magic links",
        ),
      );
    }

    // For magic link, signUp is the same as signIn - just send a link
    const creds = credentials as MagicLinkCredentials;
    const result = await this.sendMagicLink(creds.email);

    if (result.success) {
      return {
        success: true,
        // Store metadata for when they verify
      };
    }

    return this.createErrorResult(result.error!);
  }

  async sendMagicLink(
    email: string,
  ): Promise<{ success: boolean; error?: AuthError }> {
    if (!this.isEnabled()) {
      return {
        success: false,
        error: this.createError(
          "PROVIDER_DISABLED",
          "Magic link authentication is not enabled",
        ),
      };
    }

    if (!this.validateEmail(email)) {
      return {
        success: false,
        error: this.createError(
          "INVALID_EMAIL",
          "Please enter a valid email address",
        ),
      };
    }

    try {
      const response = await fetch(
        `${this.getAuthApiUrl()}/signin/passwordless/email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            options: {
              redirectTo: this.getRedirectUrl(),
            },
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: this.createError(
            "SEND_FAILED",
            data.error?.message || "Failed to send magic link",
          ),
        };
      }

      this.pendingEmail = email;

      return { success: true };
    } catch (error) {
      logger.error("Magic link send error:", error);
      return {
        success: false,
        error: this.createError("NETWORK_ERROR", "Failed to send magic link"),
      };
    }
  }

  async signOut(): Promise<void> {
    try {
      await fetch(`${this.getAuthApiUrl()}/signout`, {
        method: "POST",
        headers: this.getAuthHeaders(),
      });
    } catch (error) {
      logger.error("Sign out error:", error);
    }

    this.pendingEmail = null;
    this.clearSession();
    await super.signOut();
  }

  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      const response = await fetch(`${this.getAuthApiUrl()}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.clearSession();
        return this.createErrorResult(
          this.createError("TOKEN_REFRESH_FAILED", "Failed to refresh token"),
        );
      }

      this.persistSession(data.session);

      this.emitEvent({
        type: "tokenRefresh",
        timestamp: Date.now(),
      });

      return this.createSuccessResult(
        this.currentUser!,
        data.session.accessToken,
        data.session.refreshToken,
      );
    } catch (error) {
      logger.error("Token refresh error:", error);
      return this.createErrorResult(
        this.createError("NETWORK_ERROR", "Failed to refresh token"),
      );
    }
  }

  async linkAccount(existingUserId: string): Promise<AuthResult> {
    return this.createErrorResult(
      this.createError(
        "NOT_IMPLEMENTED",
        "Account linking not yet implemented",
      ),
    );
  }

  private async verifyMagicLink(token: string): Promise<AuthResult> {
    try {
      const response = await fetch(
        `${this.getAuthApiUrl()}/signin/passwordless/email/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        return this.createErrorResult(
          this.createError(
            "VERIFICATION_FAILED",
            data.error?.message || "Magic link verification failed",
          ),
        );
      }

      const user = this.mapUserResponse(data.user);
      this.currentUser = user;
      this.authenticated = true;
      this.pendingEmail = null;
      this.persistSession(data.session);

      this.emitEvent({
        type: "signIn",
        user,
        timestamp: Date.now(),
      });

      return this.createSuccessResult(
        user,
        data.session.accessToken,
        data.session.refreshToken,
      );
    } catch (error) {
      logger.error("Magic link verification error:", error);
      return this.createErrorResult(
        this.createError("NETWORK_ERROR", "Failed to verify magic link"),
      );
    }
  }

  private checkForMagicLinkCallback(): void {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || params.get("oobCode");
    const type = params.get("type");

    if (token && type === "magicLink") {
      this.verifyMagicLink(token).then((result) => {
        if (result.success) {
          // Clean up URL
          const url = new URL(window.location.href);
          url.searchParams.delete("token");
          url.searchParams.delete("oobCode");
          url.searchParams.delete("type");
          window.history.replaceState({}, "", url.toString());
        }
      });
    }
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private getAuthApiUrl(): string {
    return (
      this.extendedConfig.authApiUrl ||
      process.env.NEXT_PUBLIC_AUTH_URL ||
      "http://localhost:4000/v1"
    );
  }

  private getRedirectUrl(): string {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/auth/callback?type=magicLink`;
    }
    return this.extendedConfig.redirectUri || "/auth/callback?type=magicLink";
  }

  private getAuthHeaders(): Record<string, string> {
    const session = this.getStoredSession();
    return {
      "Content-Type": "application/json",
      ...(session?.accessToken
        ? { Authorization: `Bearer ${session.accessToken}` }
        : {}),
    };
  }

  private mapUserResponse(userData: Record<string, unknown>): AuthUser {
    return {
      id: userData.id as string,
      email: userData.email as string,
      username:
        (userData.displayName as string)?.replace(/\s+/g, "_").toLowerCase() ||
        (userData.email as string).split("@")[0],
      displayName:
        (userData.displayName as string) ||
        (userData.email as string).split("@")[0],
      avatarUrl: userData.avatarUrl as string | undefined,
      role: (userData.defaultRole as AuthUser["role"]) || "member",
      emailVerified: true, // Magic link verifies email
      metadata: (userData.metadata as Record<string, unknown>) || {},
      createdAt: userData.createdAt as string,
      lastLoginAt: new Date().toISOString(),
    };
  }

  private persistSession(session: {
    accessToken: string;
    refreshToken: string;
  }): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      "nchat-magic-link-session",
      JSON.stringify({
        ...session,
        timestamp: Date.now(),
      }),
    );
  }

  private getStoredSession(): {
    accessToken: string;
    refreshToken: string;
  } | null {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("nchat-magic-link-session");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private clearSession(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("nchat-magic-link-session");
  }

  private async loadSession(): Promise<void> {
    const session = this.getStoredSession();
    if (session?.refreshToken) {
      const result = await this.refreshToken(session.refreshToken);
      if (result.success && result.user) {
        this.currentUser = result.user;
        this.authenticated = true;
      }
    }
  }
}

export default MagicLinkProvider;
