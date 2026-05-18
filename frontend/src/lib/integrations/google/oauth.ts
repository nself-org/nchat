/**
 * Google OAuth Service
 *
 * Handles Google OAuth 2.0 authentication flow including
 * authorization URL generation, token exchange, and token refresh.
 */

import {
  GOOGLE_AUTH_URL,
  GOOGLE_TOKEN_URL,
  GOOGLE_USER_INFO_URL,
  GOOGLE_DRIVE_DEFAULT_SCOPES,
} from "./google-drive-client";

// ============================================================================
// Types
// ============================================================================

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

export interface GoogleOAuthState {
  nonce: string;
  returnUrl?: string;
  workspaceId?: string;
  userId?: string;
}

export interface GoogleOAuthResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
  idToken?: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email?: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  hd?: string; // hosted domain (G Suite)
}

export interface GoogleOAuthError {
  error: string;
  errorDescription?: string;
}

// ============================================================================
// OAuth State Management
// ============================================================================

const OAUTH_STATE_KEY = "google_oauth_state";
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
export function storeOAuthState(state: GoogleOAuthState): void {
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
export function retrieveOAuthState(nonce: string): GoogleOAuthState | null {
  if (typeof window === "undefined") return null;

  const stored = sessionStorage.getItem(OAUTH_STATE_KEY);
  if (!stored) return null;

  try {
    const stateData = JSON.parse(stored) as GoogleOAuthState & {
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
 * Build Google OAuth authorization URL
 */
export function buildGoogleAuthUrl(
  config: GoogleOAuthConfig,
  options?: {
    state?: string;
    prompt?: "none" | "consent" | "select_account";
    accessType?: "online" | "offline";
    loginHint?: string;
    includeGrantedScopes?: boolean;
  },
): string {
  const url = new URL(GOOGLE_AUTH_URL);

  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set(
    "scope",
    (config.scopes || GOOGLE_DRIVE_DEFAULT_SCOPES).join(" "),
  );
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", options?.accessType || "offline");
  url.searchParams.set("prompt", options?.prompt || "consent");

  if (options?.state) {
    url.searchParams.set("state", options.state);
  }

  if (options?.loginHint) {
    url.searchParams.set("login_hint", options.loginHint);
  }

  if (options?.includeGrantedScopes) {
    url.searchParams.set("include_granted_scopes", "true");
  }

  return url.toString();
}

/**
 * Initiate Google OAuth flow
 * Generates state, stores it, and returns authorization URL
 */
export function initiateGoogleOAuth(
  config: GoogleOAuthConfig,
  options?: {
    returnUrl?: string;
    workspaceId?: string;
    userId?: string;
    loginHint?: string;
  },
): {
  authUrl: string;
  state: string;
} {
  const nonce = generateOAuthState();

  const state: GoogleOAuthState = {
    nonce,
    returnUrl: options?.returnUrl,
    workspaceId: options?.workspaceId,
    userId: options?.userId,
  };

  storeOAuthState(state);

  const authUrl = buildGoogleAuthUrl(config, {
    state: nonce,
    loginHint: options?.loginHint,
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
  config: GoogleOAuthConfig,
  code: string,
): Promise<GoogleOAuthResult> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new GoogleOAuthException(data.error, data.error_description);
  }

  if (!data.access_token) {
    throw new GoogleOAuthException(
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
    idToken: data.id_token,
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  config: GoogleOAuthConfig,
  refreshToken: string,
): Promise<GoogleOAuthResult> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new GoogleOAuthException(data.error, data.error_description);
  }

  return {
    accessToken: data.access_token,
    refreshToken: refreshToken, // Google doesn't return a new refresh token
    expiresIn: data.expires_in,
    tokenType: data.token_type || "Bearer",
    scope: data.scope || "",
    idToken: data.id_token,
  };
}

/**
 * Get user information
 */
export async function getUserInfo(
  accessToken: string,
): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USER_INFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new GoogleOAuthException(
      "user_info_failed",
      "Failed to fetch user information",
    );
  }

  return response.json();
}

/**
 * Revoke access token
 */
export async function revokeToken(token: string): Promise<void> {
  const response = await fetch(
    `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  if (!response.ok) {
    throw new GoogleOAuthException("revoke_failed", "Failed to revoke token");
  }
}

/**
 * Handle OAuth callback
 * Validates state and exchanges code for token
 */
export async function handleGoogleOAuthCallback(
  config: GoogleOAuthConfig,
  callbackParams: {
    code?: string;
    state?: string;
    error?: string;
    errorDescription?: string;
  },
): Promise<{
  result: GoogleOAuthResult;
  state: GoogleOAuthState;
  userInfo: GoogleUserInfo;
}> {
  // Check for error response from Google
  if (callbackParams.error) {
    throw new GoogleOAuthException(
      callbackParams.error,
      callbackParams.errorDescription ||
        getGoogleErrorDescription(callbackParams.error),
    );
  }

  // Validate required parameters
  if (!callbackParams.code) {
    throw new GoogleOAuthException(
      "missing_code",
      "Authorization code is missing",
    );
  }

  if (!callbackParams.state) {
    throw new GoogleOAuthException(
      "missing_state",
      "State parameter is missing",
    );
  }

  // Validate state
  const state = retrieveOAuthState(callbackParams.state);
  if (!state) {
    throw new GoogleOAuthException(
      "invalid_state",
      "Invalid or expired state parameter. Please try again.",
    );
  }

  // Exchange code for token
  const result = await exchangeCodeForToken(config, callbackParams.code);

  // Get user info
  const userInfo = await getUserInfo(result.accessToken);

  return { result, state, userInfo };
}

// ============================================================================
// OAuth Exception
// ============================================================================

export class GoogleOAuthException extends Error {
  public readonly error: string;
  public readonly errorDescription?: string;

  constructor(error: string, errorDescription?: string) {
    super(errorDescription || error);
    this.name = "GoogleOAuthException";
    this.error = error;
    this.errorDescription = errorDescription;
  }

  toJSON(): GoogleOAuthError {
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
 * Check if an error is a Google OAuth exception
 */
export function isGoogleOAuthError(
  error: unknown,
): error is GoogleOAuthException {
  return error instanceof GoogleOAuthException;
}

/**
 * Get human-readable description for Google error codes
 */
export function getGoogleErrorDescription(error: string): string {
  const errorDescriptions: Record<string, string> = {
    access_denied: "The user denied the authorization request",
    invalid_client: "Invalid client ID or client secret",
    invalid_grant: "The authorization code is invalid or expired",
    invalid_request: "The request is missing required parameters",
    invalid_scope: "One or more scopes are invalid",
    unauthorized_client: "The client is not authorized for this grant type",
    unsupported_grant_type: "The grant type is not supported",
    org_internal:
      "The OAuth client is restricted to users within its organization",
    invalid_token: "The access token is invalid or expired",
    insufficient_scope: "The access token has insufficient scope",
  };

  return errorDescriptions[error] || `Google error: ${error}`;
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
 * Build Google Sign-In button URL for iframe embedding
 */
export function buildSignInButtonUrl(
  clientId: string,
  options?: {
    theme?: "outline" | "filled_blue" | "filled_black";
    size?: "large" | "medium" | "small";
    text?: "signin_with" | "signup_with" | "continue_with" | "signin";
    shape?: "rectangular" | "pill" | "circle" | "square";
    logo_alignment?: "left" | "center";
    width?: number;
    locale?: string;
  },
): string {
  const params: Record<string, string> = {
    client_id: clientId,
  };

  if (options) {
    if (options.theme) params.theme = options.theme;
    if (options.size) params.size = options.size;
    if (options.text) params.text = options.text;
    if (options.shape) params.shape = options.shape;
    if (options.logo_alignment) params.logo_alignment = options.logo_alignment;
    if (options.width !== undefined) params.width = String(options.width);
    if (options.locale) params.locale = options.locale;
  }

  return `https://accounts.google.com/gsi/button?${new URLSearchParams(params).toString()}`;
}
