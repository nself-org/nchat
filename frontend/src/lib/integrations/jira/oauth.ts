/**
 * Jira OAuth Service
 *
 * Handles Jira/Atlassian OAuth 2.0 authentication flow including
 * authorization URL generation, token exchange, and token refresh.
 */

import {
  JIRA_AUTH_URL,
  JIRA_TOKEN_URL,
  JIRA_RESOURCES_URL,
  JIRA_DEFAULT_SCOPES,
} from "./jira-client";

// ============================================================================
// Types
// ============================================================================

export interface JiraOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

export interface JiraOAuthState {
  nonce: string;
  returnUrl?: string;
  workspaceId?: string;
  userId?: string;
}

export interface JiraOAuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
}

export interface JiraAccessibleResource {
  id: string;
  url: string;
  name: string;
  scopes: string[];
  avatarUrl: string;
}

export interface JiraOAuthError {
  error: string;
  errorDescription?: string;
}

// ============================================================================
// OAuth State Management
// ============================================================================

const OAUTH_STATE_KEY = "jira_oauth_state";
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
export function storeOAuthState(state: JiraOAuthState): void {
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
export function retrieveOAuthState(nonce: string): JiraOAuthState | null {
  if (typeof window === "undefined") return null;

  const stored = sessionStorage.getItem(OAUTH_STATE_KEY);
  if (!stored) return null;

  try {
    const stateData = JSON.parse(stored) as JiraOAuthState & {
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
 * Build Jira OAuth authorization URL
 */
export function buildJiraAuthUrl(
  config: JiraOAuthConfig,
  options?: {
    state?: string;
    prompt?: "consent" | "none";
  },
): string {
  const url = new URL(JIRA_AUTH_URL);

  url.searchParams.set("audience", "api.atlassian.com");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set(
    "scope",
    (config.scopes || JIRA_DEFAULT_SCOPES).join(" "),
  );
  url.searchParams.set("response_type", "code");
  url.searchParams.set("prompt", options?.prompt || "consent");

  if (options?.state) {
    url.searchParams.set("state", options.state);
  }

  return url.toString();
}

/**
 * Initiate Jira OAuth flow
 * Generates state, stores it, and returns authorization URL
 */
export function initiateJiraOAuth(
  config: JiraOAuthConfig,
  options?: {
    returnUrl?: string;
    workspaceId?: string;
    userId?: string;
  },
): {
  authUrl: string;
  state: string;
} {
  const nonce = generateOAuthState();

  const state: JiraOAuthState = {
    nonce,
    returnUrl: options?.returnUrl,
    workspaceId: options?.workspaceId,
    userId: options?.userId,
  };

  storeOAuthState(state);

  const authUrl = buildJiraAuthUrl(config, { state: nonce });

  return { authUrl, state: nonce };
}

// ============================================================================
// Token Exchange
// ============================================================================

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  config: JiraOAuthConfig,
  code: string,
): Promise<JiraOAuthResult> {
  const response = await fetch(JIRA_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new JiraOAuthException(data.error, data.error_description);
  }

  if (!data.access_token) {
    throw new JiraOAuthException(
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
  config: JiraOAuthConfig,
  refreshToken: string,
): Promise<JiraOAuthResult> {
  const response = await fetch(JIRA_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new JiraOAuthException(data.error, data.error_description);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
    tokenType: data.token_type || "Bearer",
    scope: data.scope || "",
  };
}

/**
 * Get accessible Jira resources (cloud sites)
 */
export async function getAccessibleResources(
  accessToken: string,
): Promise<JiraAccessibleResource[]> {
  const response = await fetch(JIRA_RESOURCES_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new JiraOAuthException(
      "resource_fetch_failed",
      "Failed to fetch accessible Jira sites",
    );
  }

  return response.json();
}

/**
 * Handle OAuth callback
 * Validates state and exchanges code for token
 */
export async function handleJiraOAuthCallback(
  config: JiraOAuthConfig,
  callbackParams: {
    code?: string;
    state?: string;
    error?: string;
    errorDescription?: string;
  },
): Promise<{
  result: JiraOAuthResult;
  state: JiraOAuthState;
  resources: JiraAccessibleResource[];
}> {
  // Check for error response from Jira
  if (callbackParams.error) {
    throw new JiraOAuthException(
      callbackParams.error,
      callbackParams.errorDescription,
    );
  }

  // Validate required parameters
  if (!callbackParams.code) {
    throw new JiraOAuthException(
      "missing_code",
      "Authorization code is missing",
    );
  }

  if (!callbackParams.state) {
    throw new JiraOAuthException("missing_state", "State parameter is missing");
  }

  // Validate state
  const state = retrieveOAuthState(callbackParams.state);
  if (!state) {
    throw new JiraOAuthException(
      "invalid_state",
      "Invalid or expired state parameter. Please try again.",
    );
  }

  // Exchange code for token
  const result = await exchangeCodeForToken(config, callbackParams.code);

  // Fetch accessible resources
  const resources = await getAccessibleResources(result.accessToken);

  return { result, state, resources };
}

// ============================================================================
// OAuth Exception
// ============================================================================

export class JiraOAuthException extends Error {
  public readonly error: string;
  public readonly errorDescription?: string;

  constructor(error: string, errorDescription?: string) {
    super(errorDescription || error);
    this.name = "JiraOAuthException";
    this.error = error;
    this.errorDescription = errorDescription;
  }

  toJSON(): JiraOAuthError {
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
 * Check if an error is a Jira OAuth exception
 */
export function isJiraOAuthError(error: unknown): error is JiraOAuthException {
  return error instanceof JiraOAuthException;
}

/**
 * Parse OAuth scopes from scope string
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
