/**
 * GitHub OAuth Service
 *
 * Handles GitHub OAuth authentication flow including authorization URL generation,
 * token exchange, and token refresh.
 */

import {
  GITHUB_AUTH_URL,
  GITHUB_TOKEN_URL,
  GITHUB_DEFAULT_SCOPES,
} from "./github-client";

// ============================================================================
// Types
// ============================================================================

export interface GitHubOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

export interface GitHubOAuthState {
  nonce: string;
  returnUrl?: string;
  workspaceId?: string;
  userId?: string;
}

export interface GitHubOAuthResult {
  accessToken: string;
  tokenType: string;
  scope: string;
}

export interface GitHubOAuthError {
  error: string;
  errorDescription?: string;
  errorUri?: string;
}

// ============================================================================
// OAuth State Management
// ============================================================================

const OAUTH_STATE_KEY = "github_oauth_state";
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
export function storeOAuthState(state: GitHubOAuthState): void {
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
export function retrieveOAuthState(nonce: string): GitHubOAuthState | null {
  if (typeof window === "undefined") return null;

  const stored = sessionStorage.getItem(OAUTH_STATE_KEY);
  if (!stored) return null;

  try {
    const stateData = JSON.parse(stored) as GitHubOAuthState & {
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
 * Build GitHub OAuth authorization URL
 */
export function buildGitHubAuthUrl(
  config: GitHubOAuthConfig,
  options?: {
    state?: string;
    login?: string;
    allowSignup?: boolean;
  },
): string {
  const url = new URL(GITHUB_AUTH_URL);

  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set(
    "scope",
    (config.scopes || GITHUB_DEFAULT_SCOPES).join(" "),
  );

  if (options?.state) {
    url.searchParams.set("state", options.state);
  }

  if (options?.login) {
    url.searchParams.set("login", options.login);
  }

  url.searchParams.set(
    "allow_signup",
    options?.allowSignup !== false ? "true" : "false",
  );

  return url.toString();
}

/**
 * Initiate GitHub OAuth flow
 * Generates state, stores it, and returns authorization URL
 */
export function initiateGitHubOAuth(
  config: GitHubOAuthConfig,
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

  const state: GitHubOAuthState = {
    nonce,
    returnUrl: options?.returnUrl,
    workspaceId: options?.workspaceId,
    userId: options?.userId,
  };

  storeOAuthState(state);

  const authUrl = buildGitHubAuthUrl(config, { state: nonce });

  return { authUrl, state: nonce };
}

// ============================================================================
// Token Exchange
// ============================================================================

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  config: GitHubOAuthConfig,
  code: string,
): Promise<GitHubOAuthResult> {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new GitHubOAuthException(
      data.error,
      data.error_description,
      data.error_uri,
    );
  }

  if (!data.access_token) {
    throw new GitHubOAuthException(
      "invalid_response",
      "No access token in response",
    );
  }

  return {
    accessToken: data.access_token,
    tokenType: data.token_type || "Bearer",
    scope: data.scope || "",
  };
}

/**
 * Handle OAuth callback
 * Validates state and exchanges code for token
 */
export async function handleGitHubOAuthCallback(
  config: GitHubOAuthConfig,
  callbackParams: {
    code?: string;
    state?: string;
    error?: string;
    errorDescription?: string;
  },
): Promise<{
  result: GitHubOAuthResult;
  state: GitHubOAuthState;
}> {
  // Check for error response from GitHub
  if (callbackParams.error) {
    throw new GitHubOAuthException(
      callbackParams.error,
      callbackParams.errorDescription,
    );
  }

  // Validate required parameters
  if (!callbackParams.code) {
    throw new GitHubOAuthException(
      "missing_code",
      "Authorization code is missing",
    );
  }

  if (!callbackParams.state) {
    throw new GitHubOAuthException(
      "missing_state",
      "State parameter is missing",
    );
  }

  // Validate state
  const state = retrieveOAuthState(callbackParams.state);
  if (!state) {
    throw new GitHubOAuthException(
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

export class GitHubOAuthException extends Error {
  public readonly error: string;
  public readonly errorDescription?: string;
  public readonly errorUri?: string;

  constructor(error: string, errorDescription?: string, errorUri?: string) {
    super(errorDescription || error);
    this.name = "GitHubOAuthException";
    this.error = error;
    this.errorDescription = errorDescription;
    this.errorUri = errorUri;
  }

  toJSON(): GitHubOAuthError {
    return {
      error: this.error,
      errorDescription: this.errorDescription,
      errorUri: this.errorUri,
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if an error is a GitHub OAuth exception
 */
export function isGitHubOAuthError(
  error: unknown,
): error is GitHubOAuthException {
  return error instanceof GitHubOAuthException;
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
 * Get missing scopes
 */
export function getMissingScopes(
  tokenScopes: string,
  requiredScopes: string[],
): string[] {
  const scopes = parseScopes(tokenScopes);
  return requiredScopes.filter((required) => !scopes.includes(required));
}
