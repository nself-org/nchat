/**
 * GitHub OAuth Authentication Provider
 *
 * OAuth 2.0 authentication with GitHub:
 * - Sign in with GitHub account
 * - Access to GitHub profile and email
 * - Token refresh support
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
  OAuthCredentials,
  OAuthState,
  BaseAuthProvider,
} from "../auth-plugin.interface";

export interface GitHubConfig extends AuthProviderConfig {
  authApiUrl?: string;
  allowPrivateEmails?: boolean;
}

export class GitHubProvider extends BaseAuthProvider {
  readonly metadata: AuthProviderMetadata = {
    id: "github",
    name: "GitHub",
    type: "social",
    icon: "github",
    description: "Sign in with your GitHub account",
    requiresBackend: true,
    supportedFeatures: {
      signIn: true,
      signUp: true,
      signOut: true,
      tokenRefresh: true,
      passwordReset: false,
      emailVerification: false,
      phoneVerification: false,
      mfa: false,
      linkAccount: true,
    },
  };

  private extendedConfig: GitHubConfig = {
    enabled: false,
    scopes: ["read:user", "user:email"],
    allowPrivateEmails: true,
  };

  private pendingState: OAuthState | null = null;

  async initialize(config: AuthProviderConfig): Promise<void> {
    await super.initialize(config);
    this.extendedConfig = { ...this.extendedConfig, ...config };
    await this.loadSession();
    this.checkForOAuthCallback();
  }

  async signIn(credentials: AuthCredentials): Promise<AuthResult> {
    if (!this.isEnabled()) {
      return this.createErrorResult(
        this.createError(
          "PROVIDER_DISABLED",
          "GitHub authentication is not enabled",
        ),
      );
    }

    // If we have OAuth credentials (from callback), process them
    const oauthCreds = credentials as OAuthCredentials;
    if (oauthCreds.code && oauthCreds.state) {
      return this.handleCallback(
        new URLSearchParams({
          code: oauthCreds.code,
          state: oauthCreds.state,
        }),
      );
    }

    // Otherwise, redirect to GitHub
    const { url } = await this.getAuthorizationUrl();
    if (typeof window !== "undefined") {
      window.location.href = url;
    }

    return {
      success: true,
      // User will be redirected
    };
  }

  async signUp(
    credentials: AuthCredentials,
    metadata?: Record<string, unknown>,
  ): Promise<AuthResult> {
    // For OAuth, signUp is the same as signIn
    return this.signIn(credentials);
  }

  async getAuthorizationUrl(): Promise<{ url: string; state: OAuthState }> {
    const state = this.generateState();
    this.pendingState = state;
    this.persistState(state);

    // Use Nhost OAuth endpoint
    const params = new URLSearchParams({
      provider: "github",
      redirectTo: state.redirectUri,
    });

    return {
      url: `${this.getAuthApiUrl()}/signin/provider/github?${params.toString()}`,
      state,
    };
  }

  async handleCallback(params: URLSearchParams): Promise<AuthResult> {
    const error = params.get("error");
    if (error) {
      return this.createErrorResult(
        this.createError(
          "OAUTH_ERROR",
          params.get("error_description") || "GitHub authentication failed",
        ),
      );
    }

    const refreshToken = params.get("refreshToken");

    // If we got tokens directly (Nhost style)
    if (refreshToken) {
      try {
        const response = await fetch(`${this.getAuthApiUrl()}/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        const data = await response.json();

        if (!response.ok) {
          return this.createErrorResult(
            this.createError(
              "AUTH_FAILED",
              data.error?.message || "Failed to authenticate with GitHub",
            ),
          );
        }

        const user = this.mapUserResponse(data.user);
        this.currentUser = user;
        this.authenticated = true;
        this.persistSession(data.session);
        this.clearState();

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
        logger.error("GitHub callback error:", error);
        return this.createErrorResult(
          this.createError(
            "NETWORK_ERROR",
            "Failed to complete GitHub authentication",
          ),
        );
      }
    }

    // If we need to exchange a code
    const code = params.get("code");
    if (code) {
      try {
        const response = await fetch(
          `${this.getAuthApiUrl()}/signin/provider/github/callback`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              state: params.get("state"),
            }),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          return this.createErrorResult(
            this.createError(
              "AUTH_FAILED",
              data.error?.message || "Failed to authenticate with GitHub",
            ),
          );
        }

        const user = this.mapUserResponse(data.user);
        this.currentUser = user;
        this.authenticated = true;
        this.persistSession(data.session);
        this.clearState();

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
        logger.error("GitHub code exchange error:", error);
        return this.createErrorResult(
          this.createError(
            "NETWORK_ERROR",
            "Failed to complete GitHub authentication",
          ),
        );
      }
    }

    return this.createErrorResult(
      this.createError("INVALID_CALLBACK", "Invalid OAuth callback parameters"),
    );
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

    this.clearSession();
    this.clearState();
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
    const { url } = await this.getAuthorizationUrl();
    if (typeof window !== "undefined") {
      window.location.href = url;
    }
    return { success: true };
  }

  private checkForOAuthCallback(): void {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));

    if (
      params.has("refreshToken") ||
      params.has("code") ||
      hash.has("access_token")
    ) {
      const allParams = new URLSearchParams([
        ...Array.from(params.entries()),
        ...Array.from(hash.entries()),
      ]);

      this.handleCallback(allParams).then((result) => {
        if (result.success) {
          const url = new URL(window.location.href);
          url.search = "";
          url.hash = "";
          window.history.replaceState({}, "", url.toString());
        }
      });
    }
  }

  private generateState(): OAuthState {
    const state = crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2);
    return {
      state,
      redirectUri: this.getRedirectUrl(),
      timestamp: Date.now(),
    };
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
      return `${window.location.origin}/auth/callback`;
    }
    return this.extendedConfig.redirectUri || "/auth/callback";
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
        (userData.displayName as string) ||
        (userData.email as string).split("@")[0],
      displayName:
        (userData.displayName as string) ||
        (userData.email as string).split("@")[0],
      avatarUrl: userData.avatarUrl as string | undefined,
      role: (userData.defaultRole as AuthUser["role"]) || "member",
      emailVerified: true,
      metadata: {
        ...((userData.metadata as Record<string, unknown>) || {}),
        provider: "github",
      },
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
      "nchat-github-session",
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
      const stored = localStorage.getItem("nchat-github-session");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private clearSession(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("nchat-github-session");
  }

  private persistState(state: OAuthState): void {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("nchat-github-oauth-state", JSON.stringify(state));
  }

  private clearState(): void {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem("nchat-github-oauth-state");
    this.pendingState = null;
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

export default GitHubProvider;
