/**
 * Generic OAuth Handler
 *
 * Provides reusable functions for OAuth initiation and callback handling.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getOAuthProvider,
  type OAuthProviderName,
} from "@/config/oauth-providers";
import { logger } from "@/lib/logger";

export interface OAuthInitiateParams {
  provider: OAuthProviderName;
  state?: Record<string, any>;
  redirectUri?: string;
}

export interface OAuthCallbackParams {
  provider: OAuthProviderName;
  code: string;
  state?: string;
}

export interface OAuthUserProfile {
  id: string;
  email: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
}

/**
 * Generate OAuth authorization URL
 */
export function generateOAuthUrl(params: OAuthInitiateParams): string {
  const config = getOAuthProvider(params.provider);

  if (!config || !config.enabled) {
    throw new Error(`OAuth provider ${params.provider} is not configured`);
  }

  const url = new URL(config.authUrl);

  // Add required OAuth parameters
  url.searchParams.set("client_id", config.clientId!);
  url.searchParams.set(
    "redirect_uri",
    params.redirectUri || config.redirectUri,
  );
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes.join(" "));

  // Add state parameter (base64 encoded JSON)
  const state = params.state || {};
  state.provider = params.provider;
  state.timestamp = Date.now();
  const stateParam = Buffer.from(JSON.stringify(state)).toString("base64");
  url.searchParams.set("state", stateParam);

  // Provider-specific parameters
  if (params.provider === "google") {
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
  }

  if (params.provider === "microsoft") {
    url.searchParams.set("response_mode", "query");
  }

  if (params.provider === "apple") {
    url.searchParams.set("response_mode", "form_post");
  }

  if (params.provider === "twitter") {
    url.searchParams.set("code_challenge", "challenge");
    url.searchParams.set("code_challenge_method", "plain");
  }

  return url.toString();
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  provider: OAuthProviderName,
  code: string,
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
  const config = getOAuthProvider(provider);

  if (!config || !config.enabled) {
    throw new Error(`OAuth provider ${provider} is not configured`);
  }

  const body: Record<string, string> = {
    grant_type: "authorization_code",
    code,
    client_id: config.clientId!,
    client_secret: config.clientSecret!,
    redirect_uri: config.redirectUri,
  };

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(body),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error(`[OAuth] Token exchange failed for ${provider}:`, error);
    throw new Error(
      `Failed to exchange code for token: ${response.statusText}`,
    );
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Fetch user profile from OAuth provider
 */
export async function fetchOAuthUserProfile(
  provider: OAuthProviderName,
  accessToken: string,
): Promise<OAuthUserProfile> {
  const config = getOAuthProvider(provider);

  if (!config || !config.enabled) {
    throw new Error(`OAuth provider ${provider} is not configured`);
  }

  const response = await fetch(config.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user profile: ${response.statusText}`);
  }

  const data = await response.json();

  // Normalize user data from different providers
  return normalizeUserProfile(provider, data);
}

/**
 * Normalize user profile data from different OAuth providers
 */
function normalizeUserProfile(
  provider: OAuthProviderName,
  data: any,
): OAuthUserProfile {
  switch (provider) {
    case "google":
      return {
        id: data.id || data.sub,
        email: data.email,
        name: data.name,
        username: data.email?.split("@")[0],
        avatarUrl: data.picture,
        emailVerified: data.email_verified,
      };

    case "github":
      return {
        id: String(data.id),
        email: data.email,
        name: data.name,
        username: data.login,
        avatarUrl: data.avatar_url,
        emailVerified: !!data.email,
      };

    case "microsoft":
      return {
        id: data.id,
        email: data.mail || data.userPrincipalName,
        name: data.displayName,
        username:
          data.mail?.split("@")[0] || data.userPrincipalName?.split("@")[0],
        avatarUrl: undefined, // Microsoft doesn't provide avatar in basic profile
        emailVerified: true,
      };

    case "facebook":
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        username: data.email?.split("@")[0],
        avatarUrl: data.picture?.data?.url,
        emailVerified: true,
      };

    case "twitter":
      return {
        id: data.data.id,
        email: data.data.email,
        name: data.data.name,
        username: data.data.username,
        avatarUrl: data.data.profile_image_url,
        emailVerified: !!data.data.email,
      };

    case "linkedin":
      return {
        id: data.id,
        email: data.email || data.emailAddress,
        name: `${data.localizedFirstName} ${data.localizedLastName}`,
        username: data.email?.split("@")[0],
        avatarUrl: data.profilePicture?.displayImage,
        emailVerified: true,
      };

    case "apple":
      return {
        id: data.sub,
        email: data.email,
        name: data.name
          ? `${data.name.firstName} ${data.name.lastName}`
          : undefined,
        username: data.email?.split("@")[0],
        avatarUrl: undefined,
        emailVerified: data.email_verified === "true",
      };

    case "discord":
      return {
        id: data.id,
        email: data.email,
        name: data.username,
        username: data.username,
        avatarUrl: data.avatar
          ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
          : undefined,
        emailVerified: data.verified,
      };

    case "slack":
      return {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        username: data.user.name,
        avatarUrl: data.user.image_192,
        emailVerified: true,
      };

    case "gitlab":
      return {
        id: String(data.id),
        email: data.email,
        name: data.name,
        username: data.username,
        avatarUrl: data.avatar_url,
        emailVerified: !!data.email,
      };

    case "idme":
      return {
        id: data.sub || data.uuid,
        email: data.email,
        name:
          data.fname && data.lname ? `${data.fname} ${data.lname}` : undefined,
        username: data.email?.split("@")[0],
        avatarUrl: undefined,
        emailVerified: data.verified,
      };

    default:
      throw new Error(`Unknown OAuth provider: ${provider}`);
  }
}

/**
 * Handle OAuth initiation request
 */
export async function handleOAuthInitiate(
  request: NextRequest,
  provider: OAuthProviderName,
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    // Generate OAuth URL
    const authUrl = generateOAuthUrl({
      provider,
      state: userId ? { userId } : undefined,
    });

    // Redirect to OAuth provider
    return NextResponse.redirect(authUrl);
  } catch (error) {
    logger.error(`[OAuth] Initiation error for ${provider}:`, error);

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const loginUrl = new URL("/login", baseUrl);
    loginUrl.searchParams.set("error", `OAuth setup failed for ${provider}`);

    return NextResponse.redirect(loginUrl);
  }
}

/**
 * Handle OAuth callback request
 */
export async function handleOAuthCallback(
  request: NextRequest,
  provider: OAuthProviderName,
): Promise<NextResponse> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  try {
    const { searchParams } = new URL(request.url);

    // Check for OAuth errors
    const error = searchParams.get("error");
    if (error) {
      const errorDescription =
        searchParams.get("error_description") || "OAuth authentication failed";
      logger.error(`[OAuth] ${provider} error: ${error} - ${errorDescription}`);

      const loginUrl = new URL("/login", baseUrl);
      loginUrl.searchParams.set("error", errorDescription);
      return NextResponse.redirect(loginUrl);
    }

    // Get authorization code
    const code = searchParams.get("code");
    if (!code) {
      throw new Error("No authorization code received");
    }

    // Get state parameter
    const state = searchParams.get("state");
    let stateData: any = {};
    if (state) {
      try {
        stateData = JSON.parse(Buffer.from(state, "base64").toString());
      } catch {
        logger.warn(`[OAuth] Failed to parse state parameter for ${provider}`);
      }
    }

    // Exchange code for token
    const { accessToken, refreshToken } = await exchangeCodeForToken(
      provider,
      code,
    );

    // Fetch user profile
    const userProfile = await fetchOAuthUserProfile(provider, accessToken);

    logger.info(
      `[OAuth] ${provider} authentication successful for user: ${userProfile.email}`,
    );

    // Forward to generic OAuth callback handler
    const callbackUrl = new URL("/api/auth/oauth/callback", baseUrl);
    callbackUrl.searchParams.set("provider", provider);
    callbackUrl.searchParams.set("code", code);
    callbackUrl.searchParams.set("state", state || "");

    // Store user profile temporarily (in production, use session/database)
    // For now, we'll redirect to the generic handler which will create the user

    return NextResponse.redirect(callbackUrl);
  } catch (error) {
    logger.error(`[OAuth] Callback error for ${provider}:`, error);

    const loginUrl = new URL("/login", baseUrl);
    loginUrl.searchParams.set("error", `${provider} authentication failed`);
    return NextResponse.redirect(loginUrl);
  }
}
