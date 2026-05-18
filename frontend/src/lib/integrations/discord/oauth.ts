/**
 * Discord OAuth Service
 *
 * Handles Discord OAuth 2.0 authentication flow including
 * authorization URL generation, token exchange, and token refresh.
 */

import {
  DISCORD_AUTH_URL,
  DISCORD_TOKEN_URL,
  DISCORD_DEFAULT_SCOPES,
} from "./discord-client";

// ============================================================================
// Types
// ============================================================================

export interface DiscordOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
  botPermissions?: string;
}

export interface DiscordOAuthState {
  nonce: string;
  returnUrl?: string;
  workspaceId?: string;
  userId?: string;
}

export interface DiscordOAuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
}

export interface DiscordOAuthError {
  error: string;
  errorDescription?: string;
}

// ============================================================================
// OAuth State Management
// ============================================================================

const OAUTH_STATE_KEY = "discord_oauth_state";
const OAUTH_STATE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Generate a cryptographically secure random state value
 */
export function generateOAuthState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Store OAuth state in session storage
 */
export function storeOAuthState(state: DiscordOAuthState): void {
  if (typeof window === "undefined") return;

  const stateData = {
    ...state,
    expiresAt: Date.now() + OAUTH_STATE_TTL,
  };

  sessionStorage.setItem(OAUTH_STATE_KEY, JSON.stringify(stateData));
}

/**
 * Retrieve and validate OAuth state from session storage
 */
export function retrieveOAuthState(nonce: string): DiscordOAuthState | null {
  if (typeof window === "undefined") return null;

  const stored = sessionStorage.getItem(OAUTH_STATE_KEY);
  if (!stored) return null;

  try {
    const stateData = JSON.parse(stored) as DiscordOAuthState & {
      expiresAt: number;
    };

    // Check expiration
    if (Date.now() > stateData.expiresAt) {
      sessionStorage.removeItem(OAUTH_STATE_KEY);
      return null;
    }

    // Validate nonce
    if (stateData.nonce !== nonce) {
      return null;
    }

    // Clean up
    sessionStorage.removeItem(OAUTH_STATE_KEY);

    return {
      nonce: stateData.nonce,
      returnUrl: stateData.returnUrl,
      workspaceId: stateData.workspaceId,
      userId: stateData.userId,
    };
  } catch {
    sessionStorage.removeItem(OAUTH_STATE_KEY);
    return null;
  }
}

/**
 * Clear OAuth state from session storage
 */
export function clearOAuthState(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(OAUTH_STATE_KEY);
}

// ============================================================================
// OAuth URL Generation
// ============================================================================

/**
 * Build Discord OAuth authorization URL
 */
export function buildDiscordAuthUrl(
  config: DiscordOAuthConfig,
  options?: {
    state?: string;
    prompt?: "consent" | "none";
    guildId?: string;
    disableGuildSelect?: boolean;
  },
): string {
  const url = new URL(DISCORD_AUTH_URL);

  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    (config.scopes || DISCORD_DEFAULT_SCOPES).join(" "),
  );

  if (options?.state) {
    url.searchParams.set("state", options.state);
  }

  if (options?.prompt) {
    url.searchParams.set("prompt", options.prompt);
  }

  // Bot permissions (for adding bot to server)
  if (config.botPermissions) {
    url.searchParams.set("permissions", config.botPermissions);
  }

  // Pre-select a guild
  if (options?.guildId) {
    url.searchParams.set("guild_id", options.guildId);
    if (options?.disableGuildSelect) {
      url.searchParams.set("disable_guild_select", "true");
    }
  }

  return url.toString();
}

/**
 * Build bot invite URL
 */
export function buildBotInviteUrl(
  clientId: string,
  options?: {
    permissions?: string;
    guildId?: string;
    scopes?: string[];
  },
): string {
  const url = new URL(DISCORD_AUTH_URL);

  url.searchParams.set("client_id", clientId);
  url.searchParams.set(
    "scope",
    (options?.scopes || ["bot", "applications.commands"]).join(" "),
  );

  if (options?.permissions) {
    url.searchParams.set("permissions", options.permissions);
  }

  if (options?.guildId) {
    url.searchParams.set("guild_id", options.guildId);
    url.searchParams.set("disable_guild_select", "true");
  }

  return url.toString();
}

/**
 * Initiate Discord OAuth flow
 * Generates state, stores it, and returns authorization URL
 */
export function initiateDiscordOAuth(
  config: DiscordOAuthConfig,
  options?: {
    returnUrl?: string;
    workspaceId?: string;
    userId?: string;
    guildId?: string;
  },
): {
  authUrl: string;
  state: string;
} {
  const nonce = generateOAuthState();

  const state: DiscordOAuthState = {
    nonce,
    returnUrl: options?.returnUrl,
    workspaceId: options?.workspaceId,
    userId: options?.userId,
  };

  storeOAuthState(state);

  const authUrl = buildDiscordAuthUrl(config, {
    state: nonce,
    guildId: options?.guildId,
  });

  return { authUrl, state: nonce };
}

// ============================================================================
// Token Exchange
// ============================================================================

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  config: DiscordOAuthConfig,
  code: string,
): Promise<DiscordOAuthResult> {
  const response = await fetch(DISCORD_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new DiscordOAuthException(data.error, data.error_description);
  }

  if (!data.access_token) {
    throw new DiscordOAuthException(
      "invalid_response",
      "No access token in response",
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type || "Bearer",
    scope: data.scope || "",
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  config: DiscordOAuthConfig,
  refreshToken: string,
): Promise<DiscordOAuthResult> {
  const response = await fetch(DISCORD_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new DiscordOAuthException(data.error, data.error_description);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type || "Bearer",
    scope: data.scope || "",
  };
}

/**
 * Revoke access token
 */
export async function revokeToken(
  config: DiscordOAuthConfig,
  token: string,
): Promise<void> {
  const response = await fetch("https://discord.com/api/oauth2/token/revoke", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      token,
    }),
  });

  if (!response.ok) {
    throw new DiscordOAuthException("revoke_failed", "Failed to revoke token");
  }
}

/**
 * Handle OAuth callback
 * Validates state and exchanges code for token
 */
export async function handleDiscordOAuthCallback(
  config: DiscordOAuthConfig,
  callbackParams: {
    code?: string;
    state?: string;
    error?: string;
    errorDescription?: string;
    guildId?: string;
  },
): Promise<{
  result: DiscordOAuthResult;
  state: DiscordOAuthState;
  guildId?: string;
}> {
  // Check for error response from Discord
  if (callbackParams.error) {
    throw new DiscordOAuthException(
      callbackParams.error,
      callbackParams.errorDescription ||
        getDiscordErrorDescription(callbackParams.error),
    );
  }

  // Validate required parameters
  if (!callbackParams.code) {
    throw new DiscordOAuthException(
      "missing_code",
      "Authorization code is missing",
    );
  }

  if (!callbackParams.state) {
    throw new DiscordOAuthException(
      "missing_state",
      "State parameter is missing",
    );
  }

  // Validate state
  const state = retrieveOAuthState(callbackParams.state);
  if (!state) {
    throw new DiscordOAuthException(
      "invalid_state",
      "Invalid or expired state parameter. Please try again.",
    );
  }

  // Exchange code for token
  const result = await exchangeCodeForToken(config, callbackParams.code);

  return {
    result,
    state,
    guildId: callbackParams.guildId,
  };
}

// ============================================================================
// OAuth Exception
// ============================================================================

export class DiscordOAuthException extends Error {
  public readonly error: string;
  public readonly errorDescription?: string;

  constructor(error: string, errorDescription?: string) {
    super(errorDescription || error);
    this.name = "DiscordOAuthException";
    this.error = error;
    this.errorDescription = errorDescription;
  }

  toJSON(): DiscordOAuthError {
    return {
      error: this.error,
      errorDescription: this.errorDescription,
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if an error is a Discord OAuth exception
 */
export function isDiscordOAuthError(
  error: unknown,
): error is DiscordOAuthException {
  return error instanceof DiscordOAuthException;
}

/**
 * Get human-readable description for Discord error codes
 */
export function getDiscordErrorDescription(error: string): string {
  const errorDescriptions: Record<string, string> = {
    access_denied: "The user denied the authorization request",
    invalid_client: "Invalid client ID or client secret",
    invalid_grant: "The authorization code is invalid or expired",
    invalid_request: "The request is missing required parameters",
    invalid_scope: "One or more scopes are invalid",
    unauthorized_client: "The client is not authorized for this grant type",
    unsupported_grant_type: "The grant type is not supported",
    unsupported_response_type: "The response type is not supported",
  };

  return errorDescriptions[error] || `Discord error: ${error}`;
}

/**
 * Parse OAuth scopes from scope string
 */
export function parseScopes(scopeString: string): string[] {
  return scopeString.split(/\s+/).filter(Boolean);
}

/**
 * Check if token has required scopes
 */
export function hasRequiredScopes(
  tokenScopes: string,
  requiredScopes: string[],
): boolean {
  const scopes = parseScopes(tokenScopes);
  return requiredScopes.every((required) => scopes.includes(required));
}

/**
 * Calculate token expiry timestamp
 */
export function calculateTokenExpiry(expiresIn: number): Date {
  return new Date(Date.now() + expiresIn * 1000);
}

/**
 * Check if token is expired or about to expire
 */
export function isTokenExpired(
  expiresAt: Date,
  bufferSeconds: number = 300,
): boolean {
  const bufferMs = bufferSeconds * 1000;
  return Date.now() >= expiresAt.getTime() - bufferMs;
}

/**
 * Calculate bot permissions integer from permission names
 */
export function calculatePermissions(permissions: string[]): string {
  const permissionFlags: Record<string, bigint> = {
    CREATE_INSTANT_INVITE: 1n << 0n,
    KICK_MEMBERS: 1n << 1n,
    BAN_MEMBERS: 1n << 2n,
    ADMINISTRATOR: 1n << 3n,
    MANAGE_CHANNELS: 1n << 4n,
    MANAGE_GUILD: 1n << 5n,
    ADD_REACTIONS: 1n << 6n,
    VIEW_AUDIT_LOG: 1n << 7n,
    PRIORITY_SPEAKER: 1n << 8n,
    STREAM: 1n << 9n,
    VIEW_CHANNEL: 1n << 10n,
    SEND_MESSAGES: 1n << 11n,
    SEND_TTS_MESSAGES: 1n << 12n,
    MANAGE_MESSAGES: 1n << 13n,
    EMBED_LINKS: 1n << 14n,
    ATTACH_FILES: 1n << 15n,
    READ_MESSAGE_HISTORY: 1n << 16n,
    MENTION_EVERYONE: 1n << 17n,
    USE_EXTERNAL_EMOJIS: 1n << 18n,
    VIEW_GUILD_INSIGHTS: 1n << 19n,
    CONNECT: 1n << 20n,
    SPEAK: 1n << 21n,
    MUTE_MEMBERS: 1n << 22n,
    DEAFEN_MEMBERS: 1n << 23n,
    MOVE_MEMBERS: 1n << 24n,
    USE_VAD: 1n << 25n,
    CHANGE_NICKNAME: 1n << 26n,
    MANAGE_NICKNAMES: 1n << 27n,
    MANAGE_ROLES: 1n << 28n,
    MANAGE_WEBHOOKS: 1n << 29n,
    MANAGE_EMOJIS_AND_STICKERS: 1n << 30n,
    USE_APPLICATION_COMMANDS: 1n << 31n,
    REQUEST_TO_SPEAK: 1n << 32n,
    MANAGE_EVENTS: 1n << 33n,
    MANAGE_THREADS: 1n << 34n,
    CREATE_PUBLIC_THREADS: 1n << 35n,
    CREATE_PRIVATE_THREADS: 1n << 36n,
    USE_EXTERNAL_STICKERS: 1n << 37n,
    SEND_MESSAGES_IN_THREADS: 1n << 38n,
    USE_EMBEDDED_ACTIVITIES: 1n << 39n,
    MODERATE_MEMBERS: 1n << 40n,
  };

  let result = 0n;
  for (const perm of permissions) {
    const flag = permissionFlags[perm.toUpperCase()];
    if (flag) {
      result |= flag;
    }
  }

  return result.toString();
}
