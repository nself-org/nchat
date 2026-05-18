/**
 * Slack OAuth Service
 *
 * Handles Slack OAuth 2.0 authentication flow including
 * authorization URL generation, token exchange, and bot installation.
 */

import {
  SLACK_AUTH_URL,
  SLACK_TOKEN_URL,
  SLACK_DEFAULT_SCOPES,
} from "./slack-client";

// ============================================================================
// Types
// ============================================================================

export interface SlackOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
  userScopes?: string[];
}

export interface SlackOAuthState {
  nonce: string;
  returnUrl?: string;
  workspaceId?: string;
  userId?: string;
}

export interface SlackOAuthResult {
  accessToken: string;
  tokenType: string;
  scope: string;
  botUserId?: string;
  appId: string;
  team: {
    id: string;
    name: string;
  };
  authedUser?: {
    id: string;
    scope: string;
    accessToken: string;
    tokenType: string;
  };
  incomingWebhook?: {
    channel: string;
    channelId: string;
    configurationUrl: string;
    url: string;
  };
}

export interface SlackOAuthError {
  error: string;
  errorDescription?: string;
}

// ============================================================================
// OAuth State Management
// ============================================================================

const OAUTH_STATE_KEY = "slack_oauth_state";
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
export function storeOAuthState(state: SlackOAuthState): void {
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
export function retrieveOAuthState(nonce: string): SlackOAuthState | null {
  if (typeof window === "undefined") return null;

  const stored = sessionStorage.getItem(OAUTH_STATE_KEY);
  if (!stored) return null;

  try {
    const stateData = JSON.parse(stored) as SlackOAuthState & {
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
 * Build Slack OAuth authorization URL
 */
export function buildSlackAuthUrl(
  config: SlackOAuthConfig,
  options?: {
    state?: string;
    team?: string;
    userScopes?: string[];
  },
): string {
  const url = new URL(SLACK_AUTH_URL);

  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set(
    "scope",
    (config.scopes || SLACK_DEFAULT_SCOPES).join(","),
  );

  // User scopes for OAuth v2 (user token)
  const userScopes = options?.userScopes || config.userScopes;
  if (userScopes?.length) {
    url.searchParams.set("user_scope", userScopes.join(","));
  }

  if (options?.state) {
    url.searchParams.set("state", options.state);
  }

  // Pre-select a specific team
  if (options?.team) {
    url.searchParams.set("team", options.team);
  }

  return url.toString();
}

/**
 * Initiate Slack OAuth flow
 * Generates state, stores it, and returns authorization URL
 */
export function initiateSlackOAuth(
  config: SlackOAuthConfig,
  options?: {
    returnUrl?: string;
    workspaceId?: string;
    userId?: string;
    team?: string;
  },
): {
  authUrl: string;
  state: string;
} {
  const nonce = generateOAuthState();

  const state: SlackOAuthState = {
    nonce,
    returnUrl: options?.returnUrl,
    workspaceId: options?.workspaceId,
    userId: options?.userId,
  };

  storeOAuthState(state);

  const authUrl = buildSlackAuthUrl(config, {
    state: nonce,
    team: options?.team,
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
  config: SlackOAuthConfig,
  code: string,
): Promise<SlackOAuthResult> {
  const response = await fetch(SLACK_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    throw new SlackOAuthException(
      data.error,
      getSlackErrorDescription(data.error),
    );
  }

  if (!data.access_token) {
    throw new SlackOAuthException(
      "invalid_response",
      "No access token in response",
    );
  }

  return {
    accessToken: data.access_token,
    tokenType: data.token_type || "Bearer",
    scope: data.scope || "",
    botUserId: data.bot_user_id,
    appId: data.app_id,
    team: {
      id: data.team?.id || data.team_id,
      name: data.team?.name || data.team_name,
    },
    authedUser: data.authed_user
      ? {
          id: data.authed_user.id,
          scope: data.authed_user.scope,
          accessToken: data.authed_user.access_token,
          tokenType: data.authed_user.token_type,
        }
      : undefined,
    incomingWebhook: data.incoming_webhook
      ? {
          channel: data.incoming_webhook.channel,
          channelId: data.incoming_webhook.channel_id,
          configurationUrl: data.incoming_webhook.configuration_url,
          url: data.incoming_webhook.url,
        }
      : undefined,
  };
}

/**
 * Handle OAuth callback
 * Validates state and exchanges code for token
 */
export async function handleSlackOAuthCallback(
  config: SlackOAuthConfig,
  callbackParams: {
    code?: string;
    state?: string;
    error?: string;
    errorDescription?: string;
  },
): Promise<{
  result: SlackOAuthResult;
  state: SlackOAuthState;
}> {
  // Check for error response from Slack
  if (callbackParams.error) {
    throw new SlackOAuthException(
      callbackParams.error,
      callbackParams.errorDescription ||
        getSlackErrorDescription(callbackParams.error),
    );
  }

  // Validate required parameters
  if (!callbackParams.code) {
    throw new SlackOAuthException(
      "missing_code",
      "Authorization code is missing",
    );
  }

  if (!callbackParams.state) {
    throw new SlackOAuthException(
      "missing_state",
      "State parameter is missing",
    );
  }

  // Validate state
  const state = retrieveOAuthState(callbackParams.state);
  if (!state) {
    throw new SlackOAuthException(
      "invalid_state",
      "Invalid or expired state parameter. Please try again.",
    );
  }

  // Exchange code for token
  const result = await exchangeCodeForToken(config, callbackParams.code);

  return { result, state };
}

// ============================================================================
// OAuth Exception
// ============================================================================

export class SlackOAuthException extends Error {
  public readonly error: string;
  public readonly errorDescription?: string;

  constructor(error: string, errorDescription?: string) {
    super(errorDescription || error);
    this.name = "SlackOAuthException";
    this.error = error;
    this.errorDescription = errorDescription;
  }

  toJSON(): SlackOAuthError {
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
 * Check if an error is a Slack OAuth exception
 */
export function isSlackOAuthError(
  error: unknown,
): error is SlackOAuthException {
  return error instanceof SlackOAuthException;
}

/**
 * Get human-readable description for Slack error codes
 */
export function getSlackErrorDescription(error: string): string {
  const errorDescriptions: Record<string, string> = {
    access_denied: "The user denied the authorization request",
    invalid_client: "Invalid client ID or client secret",
    invalid_code: "The authorization code is invalid or expired",
    invalid_grant: "The authorization grant is invalid",
    invalid_redirect_uri: "The redirect URI does not match the one registered",
    invalid_scope: "One or more scopes are invalid",
    org_login_required:
      "This workspace requires users to sign in with an org account",
    team_added_to_org: "This workspace was added to an Enterprise Grid org",
    token_revoked: "The token has been revoked",
    channel_not_found: "The specified channel does not exist",
    missing_scope: "The token is missing required scopes",
    not_authed: "No authentication token provided",
    invalid_auth: "Invalid authentication token",
    account_inactive: "Authentication token is for a deleted user or workspace",
  };

  return errorDescriptions[error] || `Slack error: ${error}`;
}

/**
 * Parse OAuth scopes from scope string (comma or space separated)
 */
export function parseScopes(scopeString: string): string[] {
  return scopeString.split(/[,\s]+/).filter(Boolean);
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
 * Get missing scopes
 */
export function getMissingScopes(
  tokenScopes: string,
  requiredScopes: string[],
): string[] {
  const scopes = parseScopes(tokenScopes);
  return requiredScopes.filter((required) => !scopes.includes(required));
}

/**
 * Build the "Add to Slack" button URL
 */
export function buildAddToSlackUrl(config: SlackOAuthConfig): string {
  return buildSlackAuthUrl(config);
}
