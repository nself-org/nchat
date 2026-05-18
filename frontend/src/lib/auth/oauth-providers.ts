/**
 * OAuth Provider Configuration and Utilities
 *
 * Centralized OAuth provider management for testing and production.
 */

import { authConfig } from "@/config/auth.config";

// ============================================================================
// OAuth Provider Types
// ============================================================================

export interface OAuthProvider {
  id: string;
  name: string;
  enabled: boolean;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  clientId?: string;
  clientSecret?: string;
  icon: string;
  color: string;
}

// ============================================================================
// OAuth Provider Configurations
// ============================================================================

export const oauthProviders: Record<string, OAuthProvider> = {
  google: {
    id: "google",
    name: "Google",
    enabled: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
    scopes: ["openid", "email", "profile"],
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    icon: "🔍",
    color: "#4285F4",
  },
  github: {
    id: "github",
    name: "GitHub",
    enabled: !!process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userInfoUrl: "https://api.github.com/user",
    scopes: ["read:user", "user:email"],
    clientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    icon: "🐙",
    color: "#181717",
  },
  microsoft: {
    id: "microsoft",
    name: "Microsoft",
    enabled: !!process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID,
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    userInfoUrl: "https://graph.microsoft.com/v1.0/me",
    scopes: ["openid", "profile", "email", "User.Read"],
    clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    icon: "🪟",
    color: "#00A4EF",
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    enabled: !!process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID,
    authUrl: "https://www.facebook.com/v12.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v12.0/oauth/access_token",
    userInfoUrl: "https://graph.facebook.com/me",
    scopes: ["email", "public_profile"],
    clientId: process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    icon: "📘",
    color: "#1877F2",
  },
  twitter: {
    id: "twitter",
    name: "Twitter",
    enabled: !!process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID,
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    userInfoUrl: "https://api.twitter.com/2/users/me",
    scopes: ["tweet.read", "users.read"],
    clientId: process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
    icon: "🐦",
    color: "#1DA1F2",
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    enabled: !!process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID,
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    userInfoUrl: "https://api.linkedin.com/v2/me",
    scopes: ["r_liteprofile", "r_emailaddress"],
    clientId: process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    icon: "💼",
    color: "#0A66C2",
  },
  apple: {
    id: "apple",
    name: "Apple",
    enabled: !!process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,
    authUrl: "https://appleid.apple.com/auth/authorize",
    tokenUrl: "https://appleid.apple.com/auth/token",
    userInfoUrl: "", // Apple doesn't have a userinfo endpoint
    scopes: ["name", "email"],
    clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,
    clientSecret: process.env.APPLE_CLIENT_SECRET,
    icon: "🍎",
    color: "#000000",
  },
  discord: {
    id: "discord",
    name: "Discord",
    enabled: !!process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
    authUrl: "https://discord.com/api/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    userInfoUrl: "https://discord.com/api/users/@me",
    scopes: ["identify", "email"],
    clientId: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    icon: "🎮",
    color: "#5865F2",
  },
  slack: {
    id: "slack",
    name: "Slack",
    enabled: !!process.env.NEXT_PUBLIC_SLACK_CLIENT_ID,
    authUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    userInfoUrl: "https://slack.com/api/users.identity",
    scopes: ["identity.basic", "identity.email"],
    clientId: process.env.NEXT_PUBLIC_SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
    icon: "💬",
    color: "#4A154B",
  },
  gitlab: {
    id: "gitlab",
    name: "GitLab",
    enabled: !!process.env.NEXT_PUBLIC_GITLAB_CLIENT_ID,
    authUrl: "https://gitlab.com/oauth/authorize",
    tokenUrl: "https://gitlab.com/oauth/token",
    userInfoUrl: "https://gitlab.com/api/v4/user",
    scopes: ["read_user"],
    clientId: process.env.NEXT_PUBLIC_GITLAB_CLIENT_ID,
    clientSecret: process.env.GITLAB_CLIENT_SECRET,
    icon: "🦊",
    color: "#FC6D26",
  },
  idme: {
    id: "idme",
    name: "ID.me",
    enabled: !!process.env.NEXT_PUBLIC_IDME_CLIENT_ID,
    authUrl: "https://api.id.me/oauth/authorize",
    tokenUrl: "https://api.id.me/oauth/token",
    userInfoUrl: "https://api.id.me/api/public/v3/attributes.json",
    scopes: ["military", "student", "responder"],
    clientId: process.env.NEXT_PUBLIC_IDME_CLIENT_ID,
    clientSecret: process.env.IDME_CLIENT_SECRET,
    icon: "🪪",
    color: "#E31F24",
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all enabled OAuth providers
 */
export function getEnabledProviders(): OAuthProvider[] {
  return Object.values(oauthProviders).filter((provider) => provider.enabled);
}

/**
 * Get provider by ID
 */
export function getProvider(providerId: string): OAuthProvider | undefined {
  return oauthProviders[providerId];
}

/**
 * Check if provider is enabled
 */
export function isProviderEnabled(providerId: string): boolean {
  const provider = getProvider(providerId);
  return provider?.enabled || false;
}

/**
 * Generate OAuth authorization URL
 */
export function generateAuthUrl(
  providerId: string,
  redirectUri: string,
  state?: string,
): string | null {
  const provider = getProvider(providerId);
  if (!provider || !provider.enabled) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: provider.clientId!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: provider.scopes.join(" "),
    ...(state && { state }),
  });

  return `${provider.authUrl}?${params.toString()}`;
}

/**
 * Validate OAuth callback
 */
export function validateOAuthCallback(
  providerId: string,
  code: string,
  state?: string,
): boolean {
  const provider = getProvider(providerId);
  if (!provider || !provider.enabled) {
    return false;
  }

  if (!code) {
    return false;
  }

  // Additional validation can be added here
  return true;
}

/**
 * Get OAuth provider status
 */
export function getProviderStatus() {
  const providers = Object.values(oauthProviders);
  const enabled = providers.filter((p) => p.enabled);
  const disabled = providers.filter((p) => !p.enabled);

  return {
    total: providers.length,
    enabled: enabled.length,
    disabled: disabled.length,
    providers: {
      enabled: enabled.map((p) => p.id),
      disabled: disabled.map((p) => p.id),
    },
  };
}

/**
 * Test OAuth provider configuration
 */
export async function testProviderConfig(providerId: string): Promise<{
  success: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  const provider = getProvider(providerId);

  if (!provider) {
    errors.push(`Provider '${providerId}' not found`);
    return { success: false, errors };
  }

  if (!provider.enabled) {
    errors.push(`Provider '${providerId}' is not enabled`);
  }

  if (!provider.clientId) {
    errors.push(`Missing client ID for ${provider.name}`);
  }

  if (!provider.clientSecret) {
    errors.push(`Missing client secret for ${provider.name}`);
  }

  if (!provider.authUrl) {
    errors.push(`Missing auth URL for ${provider.name}`);
  }

  if (!provider.tokenUrl) {
    errors.push(`Missing token URL for ${provider.name}`);
  }

  if (provider.scopes.length === 0) {
    errors.push(`No scopes configured for ${provider.name}`);
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Test all OAuth providers
 */
export async function testAllProviders(): Promise<
  Record<
    string,
    {
      success: boolean;
      errors: string[];
    }
  >
> {
  const results: Record<
    string,
    {
      success: boolean;
      errors: string[];
    }
  > = {};

  for (const [id, provider] of Object.entries(oauthProviders)) {
    results[id] = await testProviderConfig(id);
  }

  return results;
}

/**
 * Get OAuth callback URL
 */
export function getCallbackUrl(providerId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/api/auth/oauth/callback?provider=${providerId}`;
}

/**
 * Format provider for UI display
 */
export function formatProviderForUI(provider: OAuthProvider) {
  return {
    id: provider.id,
    name: provider.name,
    icon: provider.icon,
    color: provider.color,
    enabled: provider.enabled,
    configured: !!(provider.clientId && provider.clientSecret),
  };
}

/**
 * Get all providers formatted for UI
 */
export function getAllProvidersForUI() {
  return Object.values(oauthProviders).map(formatProviderForUI);
}
