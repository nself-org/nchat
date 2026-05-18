/**
 * App Authentication
 *
 * OAuth2-style token issuance, validation, refresh, and revocation
 * for third-party app integrations.
 */

import type {
  AppToken,
  AppTokenType,
  AppScope,
  TokenRequest,
  TokenResponse,
  RegisteredApp,
  AppInstallation,
} from "./app-contract";
import { hasAllScopes, expandScopes } from "./app-contract";
import { generateId } from "./app-lifecycle";

// ============================================================================
// TOKEN STORE
// ============================================================================

/**
 * In-memory token store. Production would use a database with hashed tokens.
 */
export class AppTokenStore {
  private tokens: Map<string, AppToken> = new Map();
  private tokensByValue: Map<string, AppToken> = new Map();

  getToken(id: string): AppToken | undefined {
    return this.tokens.get(id);
  }

  getTokenByValue(tokenValue: string): AppToken | undefined {
    return this.tokensByValue.get(tokenValue);
  }

  listTokens(filter?: {
    appId?: string;
    installationId?: string;
    type?: AppTokenType;
    revoked?: boolean;
  }): AppToken[] {
    let tokens = Array.from(this.tokens.values());
    if (filter?.appId) {
      tokens = tokens.filter((t) => t.appId === filter.appId);
    }
    if (filter?.installationId) {
      tokens = tokens.filter((t) => t.installationId === filter.installationId);
    }
    if (filter?.type) {
      tokens = tokens.filter((t) => t.type === filter.type);
    }
    if (filter?.revoked !== undefined) {
      tokens = tokens.filter((t) => t.revoked === filter.revoked);
    }
    return tokens;
  }

  saveToken(token: AppToken): void {
    this.tokens.set(token.id, token);
    this.tokensByValue.set(token.token, token);
  }

  deleteToken(id: string): boolean {
    const token = this.tokens.get(id);
    if (token) {
      this.tokensByValue.delete(token.token);
    }
    return this.tokens.delete(id);
  }

  clear(): void {
    this.tokens.clear();
    this.tokensByValue.clear();
  }
}

// ============================================================================
// AUTH ERRORS
// ============================================================================

export class AppAuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 401,
  ) {
    super(message);
    this.name = "AppAuthError";
  }
}

// ============================================================================
// TOKEN CONFIGURATION
// ============================================================================

export interface TokenConfig {
  /** Access token TTL in seconds (default: 3600 = 1 hour) */
  accessTokenTTL: number;
  /** Refresh token TTL in seconds (default: 2592000 = 30 days) */
  refreshTokenTTL: number;
}

const DEFAULT_TOKEN_CONFIG: TokenConfig = {
  accessTokenTTL: 3600,
  refreshTokenTTL: 2592000,
};

// ============================================================================
// APP AUTH MANAGER
// ============================================================================

export class AppAuthManager {
  private tokenConfig: TokenConfig;

  constructor(
    private tokenStore: AppTokenStore,
    config?: Partial<TokenConfig>,
  ) {
    this.tokenConfig = { ...DEFAULT_TOKEN_CONFIG, ...config };
  }

  // ==========================================================================
  // TOKEN ISSUANCE
  // ==========================================================================

  /**
   * Issue access and refresh tokens for an app installation.
   * Validates client credentials and requested scopes.
   */
  issueTokens(
    request: TokenRequest,
    app: RegisteredApp,
    installation: AppInstallation,
  ): TokenResponse {
    // Validate client secret
    if (request.clientSecret !== app.clientSecret) {
      throw new AppAuthError("Invalid client secret", "INVALID_CLIENT_SECRET");
    }

    // Validate app matches
    if (request.appId !== app.id) {
      throw new AppAuthError("App ID mismatch", "APP_ID_MISMATCH");
    }

    // Validate installation matches
    if (request.installationId !== installation.id) {
      throw new AppAuthError(
        "Installation ID mismatch",
        "INSTALLATION_ID_MISMATCH",
      );
    }

    // Validate installation is active
    if (installation.status !== "installed") {
      throw new AppAuthError(
        "App installation is not active",
        "INSTALLATION_NOT_ACTIVE",
        403,
      );
    }

    // Determine scopes
    const requestedScopes = request.scopes ?? installation.grantedScopes;
    const grantedExpanded = expandScopes(installation.grantedScopes);

    // Validate requested scopes don't exceed granted scopes
    for (const scope of requestedScopes) {
      if (!hasAllScopes(grantedExpanded, [scope])) {
        throw new AppAuthError(
          `Scope "${scope}" exceeds granted permissions`,
          "SCOPE_EXCEEDED",
          403,
        );
      }
    }

    const now = new Date();
    const accessToken = this.createToken(
      "access_token",
      app.id,
      installation.id,
      requestedScopes,
      now,
      this.tokenConfig.accessTokenTTL,
    );
    const refreshToken = this.createToken(
      "refresh_token",
      app.id,
      installation.id,
      requestedScopes,
      now,
      this.tokenConfig.refreshTokenTTL,
    );

    return {
      accessToken: accessToken.token,
      refreshToken: refreshToken.token,
      tokenType: "Bearer",
      expiresIn: this.tokenConfig.accessTokenTTL,
      scopes: requestedScopes,
    };
  }

  /**
   * Refresh an access token using a refresh token.
   */
  refreshAccessToken(refreshTokenValue: string): TokenResponse {
    const refreshToken = this.tokenStore.getTokenByValue(refreshTokenValue);

    if (!refreshToken) {
      throw new AppAuthError("Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }

    if (refreshToken.type !== "refresh_token") {
      throw new AppAuthError(
        "Token is not a refresh token",
        "INVALID_TOKEN_TYPE",
      );
    }

    if (refreshToken.revoked) {
      throw new AppAuthError("Refresh token has been revoked", "TOKEN_REVOKED");
    }

    if (new Date(refreshToken.expiresAt) < new Date()) {
      throw new AppAuthError("Refresh token has expired", "TOKEN_EXPIRED");
    }

    // Issue a new access token with the same scopes
    const now = new Date();
    const newAccessToken = this.createToken(
      "access_token",
      refreshToken.appId,
      refreshToken.installationId,
      refreshToken.scopes,
      now,
      this.tokenConfig.accessTokenTTL,
    );

    return {
      accessToken: newAccessToken.token,
      refreshToken: refreshTokenValue, // Re-use same refresh token
      tokenType: "Bearer",
      expiresIn: this.tokenConfig.accessTokenTTL,
      scopes: refreshToken.scopes,
    };
  }

  // ==========================================================================
  // TOKEN VALIDATION
  // ==========================================================================

  /**
   * Validate an access token and return its details.
   */
  validateToken(tokenValue: string): AppToken {
    const token = this.tokenStore.getTokenByValue(tokenValue);

    if (!token) {
      throw new AppAuthError("Invalid token", "INVALID_TOKEN");
    }

    if (token.revoked) {
      throw new AppAuthError("Token has been revoked", "TOKEN_REVOKED");
    }

    if (new Date(token.expiresAt) < new Date()) {
      throw new AppAuthError("Token has expired", "TOKEN_EXPIRED");
    }

    return token;
  }

  /**
   * Validate that a token has specific scopes.
   */
  validateTokenScopes(
    tokenValue: string,
    requiredScopes: AppScope[],
  ): AppToken {
    const token = this.validateToken(tokenValue);
    const tokenScopesExpanded = expandScopes(token.scopes);

    if (!hasAllScopes(tokenScopesExpanded, requiredScopes)) {
      throw new AppAuthError(
        `Token lacks required scopes: ${requiredScopes.join(", ")}`,
        "INSUFFICIENT_SCOPE",
        403,
      );
    }

    return token;
  }

  // ==========================================================================
  // TOKEN REVOCATION
  // ==========================================================================

  /**
   * Revoke a specific token.
   */
  revokeToken(tokenValue: string): void {
    const token = this.tokenStore.getTokenByValue(tokenValue);
    if (!token) {
      throw new AppAuthError("Invalid token", "INVALID_TOKEN");
    }

    if (token.revoked) {
      return; // Already revoked, idempotent
    }

    token.revoked = true;
    token.revokedAt = new Date().toISOString();
    this.tokenStore.saveToken(token);
  }

  /**
   * Revoke all tokens for an app installation.
   */
  revokeAllTokens(appId: string, installationId?: string): number {
    const tokens = this.tokenStore.listTokens({
      appId,
      installationId,
      revoked: false,
    });

    let count = 0;
    for (const token of tokens) {
      token.revoked = true;
      token.revokedAt = new Date().toISOString();
      this.tokenStore.saveToken(token);
      count++;
    }

    return count;
  }

  // ==========================================================================
  // TOKEN QUERIES
  // ==========================================================================

  /**
   * List tokens for an app, optionally filtered.
   */
  listTokens(filter?: {
    appId?: string;
    installationId?: string;
    type?: AppTokenType;
    revoked?: boolean;
  }): AppToken[] {
    return this.tokenStore.listTokens(filter);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private createToken(
    type: AppTokenType,
    appId: string,
    installationId: string,
    scopes: AppScope[],
    now: Date,
    ttlSeconds: number,
  ): AppToken {
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    const token: AppToken = {
      id: generateId("tok"),
      token: generateId(`nchat_${type === "access_token" ? "at" : "rt"}`),
      type,
      appId,
      installationId,
      scopes,
      expiresAt: expiresAt.toISOString(),
      issuedAt: now.toISOString(),
      revoked: false,
    };

    this.tokenStore.saveToken(token);
    return token;
  }
}
