/**
 * ID.me Authentication Provider
 *
 * Government-grade identity verification:
 * - Military verification
 * - First responder verification
 * - Government employee verification
 * - Student verification
 * - Teacher verification
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
  VerificationCredentials,
  BaseAuthProvider,
} from "../auth-plugin.interface";

export type IdMeGroup =
  | "military"
  | "veteran"
  | "military-family"
  | "first-responder"
  | "nurse"
  | "hospital"
  | "government"
  | "teacher"
  | "student";

export interface IdMeConfig extends AuthProviderConfig {
  authApiUrl?: string;
  idmeClientId?: string;
  idmeClientSecret?: string;
  allowedGroups?: IdMeGroup[];
  requireVerification?: boolean;
  verificationLevel?: "basic" | "enhanced" | "government";
  sandbox?: boolean;
}

export interface IdMeVerification {
  verified: boolean;
  groups: IdMeGroup[];
  verificationLevel: string;
  verifiedAt?: string;
  expiresAt?: string;
  attributes?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    birthDate?: string;
    affiliation?: string;
    branch?: string;
    status?: string;
  };
}

export class IdMeProvider extends BaseAuthProvider {
  readonly metadata: AuthProviderMetadata = {
    id: "idme",
    name: "ID.me",
    type: "verification",
    icon: "shield-check",
    description: "Verify your identity with ID.me",
    requiresBackend: true,
    supportedFeatures: {
      signIn: true,
      signUp: true,
      signOut: true,
      tokenRefresh: true,
      passwordReset: false,
      emailVerification: true,
      phoneVerification: false,
      mfa: true,
      linkAccount: true,
    },
  };

  private extendedConfig: IdMeConfig = {
    enabled: false,
    scopes: ["openid", "profile", "email"],
    allowedGroups: ["military", "veteran", "first-responder", "government"],
    requireVerification: true,
    verificationLevel: "enhanced",
    sandbox: process.env.NODE_ENV !== "production",
  };

  private pendingState: OAuthState | null = null;
  private verification: IdMeVerification | null = null;

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
          "ID.me authentication is not enabled",
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

    // If we have verification credentials
    const verifyCreds = credentials as VerificationCredentials;
    if (verifyCreds.verificationToken) {
      return this.verifyToken(verifyCreds.verificationToken);
    }

    // Otherwise, redirect to ID.me
    const { url } = await this.getAuthorizationUrl();
    if (typeof window !== "undefined") {
      window.location.href = url;
    }

    return {
      success: true,
      // User will be redirected to ID.me
    };
  }

  async signUp(
    credentials: AuthCredentials,
    metadata?: Record<string, unknown>,
  ): Promise<AuthResult> {
    // For ID.me, signUp is the same as signIn - they handle registration
    return this.signIn(credentials);
  }

  async getAuthorizationUrl(
    group?: IdMeGroup,
  ): Promise<{ url: string; state: OAuthState }> {
    const state = this.generateState();
    this.pendingState = state;
    this.persistState(state);

    const baseUrl = this.extendedConfig.sandbox
      ? "https://api.idmelabs.com"
      : "https://api.id.me";

    const scopes = [...(this.extendedConfig.scopes || [])];

    // Add group-specific scope if specified
    if (group) {
      scopes.push(`${group}:true`);
    }

    const params = new URLSearchParams({
      client_id:
        this.extendedConfig.idmeClientId ||
        process.env.NEXT_PUBLIC_IDME_CLIENT_ID ||
        "",
      redirect_uri: state.redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      state: state.state,
    });

    return {
      url: `${baseUrl}/oauth/authorize?${params.toString()}`,
      state,
    };
  }

  async handleCallback(params: URLSearchParams): Promise<AuthResult> {
    const error = params.get("error");
    if (error) {
      return this.createErrorResult(
        this.createError(
          "OAUTH_ERROR",
          params.get("error_description") || "ID.me authentication failed",
        ),
      );
    }

    const code = params.get("code");
    if (!code) {
      return this.createErrorResult(
        this.createError("INVALID_CALLBACK", "No authorization code received"),
      );
    }

    try {
      // Exchange code for tokens with our backend
      const response = await fetch(
        `${this.getAuthApiUrl()}/signin/idme/callback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            state: params.get("state"),
            redirectUri: this.pendingState?.redirectUri,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        return this.createErrorResult(
          this.createError(
            "AUTH_FAILED",
            data.error?.message || "Failed to authenticate with ID.me",
          ),
        );
      }

      // Validate verification if required
      if (this.extendedConfig.requireVerification) {
        const verificationResult = await this.validateVerification(
          data.verification,
        );
        if (!verificationResult.success) {
          return this.createErrorResult(verificationResult.error!);
        }
        this.verification = data.verification;
      }

      const user = this.mapUserResponse(data.user, data.verification);
      this.currentUser = user;
      this.authenticated = true;
      this.persistSession(data.session);
      this.clearState();

      this.emitEvent({
        type: "signIn",
        user,
        metadata: { verification: data.verification },
        timestamp: Date.now(),
      });

      return this.createSuccessResult(
        user,
        data.session.accessToken,
        data.session.refreshToken,
      );
    } catch (error) {
      logger.error("ID.me callback error:", error);
      return this.createErrorResult(
        this.createError(
          "NETWORK_ERROR",
          "Failed to complete ID.me authentication",
        ),
      );
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

    this.verification = null;
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

  /**
   * Get verification status for the current user
   */
  getVerification(): IdMeVerification | null {
    return this.verification;
  }

  /**
   * Check if user belongs to a specific group
   */
  isInGroup(group: IdMeGroup): boolean {
    return this.verification?.groups.includes(group) || false;
  }

  /**
   * Get all verified groups for the current user
   */
  getVerifiedGroups(): IdMeGroup[] {
    return this.verification?.groups || [];
  }

  /**
   * Initiate verification for a specific group
   */
  async verifyGroup(group: IdMeGroup): Promise<AuthResult> {
    if (!this.extendedConfig.allowedGroups?.includes(group)) {
      return this.createErrorResult(
        this.createError(
          "GROUP_NOT_ALLOWED",
          `Verification for ${group} is not enabled`,
        ),
      );
    }

    const { url } = await this.getAuthorizationUrl(group);
    if (typeof window !== "undefined") {
      window.location.href = url;
    }

    return { success: true };
  }

  private async verifyToken(token: string): Promise<AuthResult> {
    try {
      const response = await fetch(
        `${this.getAuthApiUrl()}/signin/idme/verify`,
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
            data.error?.message || "ID.me verification failed",
          ),
        );
      }

      const user = this.mapUserResponse(data.user, data.verification);
      this.currentUser = user;
      this.authenticated = true;
      this.verification = data.verification;
      this.persistSession(data.session);

      return this.createSuccessResult(
        user,
        data.session.accessToken,
        data.session.refreshToken,
      );
    } catch (error) {
      logger.error("ID.me token verification error:", error);
      return this.createErrorResult(
        this.createError("NETWORK_ERROR", "Failed to verify ID.me token"),
      );
    }
  }

  private validateVerification(verification: IdMeVerification): {
    success: boolean;
    error?: AuthError;
  } {
    if (!verification.verified) {
      return {
        success: false,
        error: this.createError(
          "NOT_VERIFIED",
          "ID.me verification is required to access this application",
        ),
      };
    }

    // Check if user belongs to any allowed group
    const allowedGroups = this.extendedConfig.allowedGroups || [];
    if (allowedGroups.length > 0) {
      const hasAllowedGroup = verification.groups.some((g) =>
        allowedGroups.includes(g),
      );
      if (!hasAllowedGroup) {
        return {
          success: false,
          error: this.createError(
            "GROUP_NOT_ALLOWED",
            `Access is restricted to: ${allowedGroups.join(", ")}`,
          ),
        };
      }
    }

    // Check verification expiration
    if (verification.expiresAt) {
      const expiresAt = new Date(verification.expiresAt);
      if (expiresAt < new Date()) {
        return {
          success: false,
          error: this.createError(
            "VERIFICATION_EXPIRED",
            "Your ID.me verification has expired. Please re-verify.",
          ),
        };
      }
    }

    return { success: true };
  }

  private checkForOAuthCallback(): void {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);

    if (params.has("code")) {
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
      return `${window.location.origin}/auth/callback/idme`;
    }
    return this.extendedConfig.redirectUri || "/auth/callback/idme";
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

  private mapUserResponse(
    userData: Record<string, unknown>,
    verification?: IdMeVerification,
  ): AuthUser {
    const groups = verification?.groups || [];

    // Determine role based on verified groups
    let role: AuthUser["role"] = "member";
    if (groups.includes("government")) {
      role = "admin"; // Government employees could have elevated privileges
    }

    return {
      id: userData.id as string,
      email:
        (userData.email as string) || verification?.attributes?.email || "",
      username:
        (userData.displayName as string)?.replace(/\s+/g, "_").toLowerCase() ||
        `${verification?.attributes?.firstName}_${verification?.attributes?.lastName}`.toLowerCase() ||
        (userData.email as string)?.split("@")[0],
      displayName:
        (userData.displayName as string) ||
        `${verification?.attributes?.firstName || ""} ${verification?.attributes?.lastName || ""}`.trim() ||
        (userData.email as string)?.split("@")[0],
      avatarUrl: userData.avatarUrl as string | undefined,
      role,
      emailVerified: true, // ID.me verifies email
      metadata: {
        ...((userData.metadata as Record<string, unknown>) || {}),
        provider: "idme",
        idmeGroups: groups,
        idmeVerified: verification?.verified,
        idmeVerificationLevel: verification?.verificationLevel,
        idmeVerifiedAt: verification?.verifiedAt,
        idmeExpiresAt: verification?.expiresAt,
        idmeAffiliation: verification?.attributes?.affiliation,
        idmeBranch: verification?.attributes?.branch,
        idmeStatus: verification?.attributes?.status,
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
      "nchat-idme-session",
      JSON.stringify({
        ...session,
        verification: this.verification,
        timestamp: Date.now(),
      }),
    );
  }

  private getStoredSession(): {
    accessToken: string;
    refreshToken: string;
    verification?: IdMeVerification;
  } | null {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("nchat-idme-session");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private clearSession(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("nchat-idme-session");
  }

  private persistState(state: OAuthState): void {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("nchat-idme-oauth-state", JSON.stringify(state));
  }

  private clearState(): void {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem("nchat-idme-oauth-state");
    this.pendingState = null;
  }

  private async loadSession(): Promise<void> {
    const session = this.getStoredSession();
    if (session?.refreshToken) {
      if (session.verification) {
        this.verification = session.verification;
      }
      const result = await this.refreshToken(session.refreshToken);
      if (result.success && result.user) {
        this.currentUser = result.user;
        this.authenticated = true;
      }
    }
  }
}

export default IdMeProvider;
