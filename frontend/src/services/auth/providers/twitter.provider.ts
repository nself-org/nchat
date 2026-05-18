/**
 * Twitter/X OAuth Authentication Provider
 *
 * OAuth 2.0 authentication with Twitter/X:
 * - Sign in with Twitter account
 * - Access to Twitter profile
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

export interface TwitterConfig extends AuthProviderConfig {
  authApiUrl?: string;
  forceLogin?: boolean;
  screenName?: string;
}

export class TwitterProvider extends BaseAuthProvider {
  readonly metadata: AuthProviderMetadata = {
    id: "twitter",
    name: "Twitter",
    type: "social",
    icon: "twitter",
    description: "Sign in with your Twitter/X account",
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

  private extendedConfig: TwitterConfig = {
    enabled: false,
    scopes: ["tweet.read", "users.read"],
    forceLogin: false,
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
          "Twitter authentication is not enabled",
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

    // Otherwise, redirect to Twitter
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
      provider: "twitter",
      redirectTo: state.redirectUri,
    });

    if (this.extendedConfig.forceLogin) {
      params.append("force_login", "true");
    }

    if (this.extendedConfig.screenName) {
      params.append("screen_name", this.extendedConfig.screenName);
    }

    return {
      url: `${this.getAuthApiUrl()}/signin/provider/twitter?${params.toString()}`,
      state,
    };
  }

  async handleCallback(params: URLSearchParams): Promise<AuthResult> {
    const error = params.get("error");
    if (error) {
      // Twitter-specific error handling
      if (error === "access_denied") {
        return this.createErrorResult(
          this.createError(
            "USER_DENIED",
            "You denied access to your Twitter account",
          ),
        );
      }
      return this.createErrorResult(
        this.createError(
          "OAUTH_ERROR",
          params.get("error_description") || "Twitter authentication failed",
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
              data.error?.message || "Failed to authenticate with Twitter",
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
        logger.error("Twitter callback error:", error);
        return this.createErrorResult(
          this.createError(
            "NETWORK_ERROR",
            "Failed to complete Twitter authentication",
          ),
        );
      }
    }

    // Twitter OAuth 1.0a uses oauth_token and oauth_verifier
    const oauthToken = params.get("oauth_token");
    const oauthVerifier = params.get("oauth_verifier");

    // Twitter OAuth 2.0 uses code
    const code = params.get("code");

    if (code || (oauthToken && oauthVerifier)) {
      try {
        const response = await fetch(
          `${this.getAuthApiUrl()}/signin/provider/twitter/callback`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              oauth_token: oauthToken,
              oauth_verifier: oauthVerifier,
              state: params.get("state"),
            }),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          return this.createErrorResult(
            this.createError(
              "AUTH_FAILED",
              data.error?.message || "Failed to authenticate with Twitter",
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
        logger.error("Twitter code exchange error:", error);
        return this.createErrorResult(
          this.createError(
            "NETWORK_ERROR",
            "Failed to complete Twitter authentication",
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

    // Check for both OAuth 1.0a and 2.0 parameters
    if (
      params.has("refreshToken") ||
      params.has("code") ||
      params.has("oauth_verifier")
    ) {
      this.handleCallback(params).then((result) => {
        if (result.success) {
          const url = new URL(window.location.href);
          url.search = "";
          window.history.replaceState({}, "", url.toString());
        }
      });
    }
  }

  private generateState(): OAuthState {
    const state = crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2);
    // Generate code verifier for PKCE (Twitter OAuth 2.0)
    const codeVerifier = this.generateCodeVerifier();
    return {
      state,
      codeVerifier,
      redirectUri: this.getRedirectUrl(),
      timestamp: Date.now(),
    };
  }

  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < 32; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
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
    // Twitter might not provide email in some cases
    const email =
      (userData.email as string) ||
      `${userData.displayName}@twitter.placeholder`;

    return {
      id: userData.id as string,
      email,
      username: (userData.displayName as string) || email.split("@")[0],
      displayName: (userData.displayName as string) || email.split("@")[0],
      avatarUrl: userData.avatarUrl as string | undefined,
      role: (userData.defaultRole as AuthUser["role"]) || "member",
      emailVerified: !!userData.email, // Only verified if email provided
      metadata: {
        ...((userData.metadata as Record<string, unknown>) || {}),
        provider: "twitter",
        twitterHandle: userData.displayName,
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
      "nchat-twitter-session",
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
      const stored = localStorage.getItem("nchat-twitter-session");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private clearSession(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("nchat-twitter-session");
  }

  private persistState(state: OAuthState): void {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("nchat-twitter-oauth-state", JSON.stringify(state));
  }

  private clearState(): void {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem("nchat-twitter-oauth-state");
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

export default TwitterProvider;
