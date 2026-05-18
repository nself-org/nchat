/**
 * OAuth Provider Configuration
 *
 * Centralized configuration for all 11 OAuth providers.
 * Includes endpoints, scopes, and metadata for each provider.
 */

export interface OAuthProviderMetadata {
  name: string;
  displayName: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  enabled: boolean;
  icon?: string;
  color?: string;
}

export type OAuthProviderName =
  | "google"
  | "github"
  | "microsoft"
  | "facebook"
  | "twitter"
  | "linkedin"
  | "apple"
  | "discord"
  | "slack"
  | "gitlab"
  | "idme";

/**
 * Get base app URL for OAuth redirect URIs
 */
function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * OAuth Provider Configurations
 */
export const oauthProviders: Record<OAuthProviderName, OAuthProviderMetadata> =
  {
    google: {
      name: "google",
      displayName: "Google",
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: `${getAppUrl()}/api/auth/google/callback`,
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
      scopes: ["openid", "email", "profile"],
      enabled: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      icon: "google",
      color: "#4285F4",
    },

    github: {
      name: "github",
      displayName: "GitHub",
      clientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      redirectUri: `${getAppUrl()}/api/auth/github/callback`,
      authUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      userInfoUrl: "https://api.github.com/user",
      scopes: ["read:user", "user:email"],
      enabled: !!process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
      icon: "github",
      color: "#181717",
    },

    microsoft: {
      name: "microsoft",
      displayName: "Microsoft",
      clientId: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      redirectUri: `${getAppUrl()}/api/auth/microsoft/callback`,
      authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      userInfoUrl: "https://graph.microsoft.com/v1.0/me",
      scopes: ["openid", "profile", "email", "User.Read"],
      enabled: !!process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID,
      icon: "microsoft",
      color: "#00A4EF",
    },

    facebook: {
      name: "facebook",
      displayName: "Facebook",
      clientId: process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      redirectUri: `${getAppUrl()}/api/auth/facebook/callback`,
      authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
      tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
      userInfoUrl: "https://graph.facebook.com/me",
      scopes: ["email", "public_profile"],
      enabled: !!process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID,
      icon: "facebook",
      color: "#1877F2",
    },

    twitter: {
      name: "twitter",
      displayName: "X (Twitter)",
      clientId: process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
      redirectUri: `${getAppUrl()}/api/auth/twitter/callback`,
      authUrl: "https://twitter.com/i/oauth2/authorize",
      tokenUrl: "https://api.twitter.com/2/oauth2/token",
      userInfoUrl: "https://api.twitter.com/2/users/me",
      scopes: ["tweet.read", "users.read", "offline.access"],
      enabled: !!process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID,
      icon: "twitter",
      color: "#000000",
    },

    linkedin: {
      name: "linkedin",
      displayName: "LinkedIn",
      clientId: process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      redirectUri: `${getAppUrl()}/api/auth/linkedin/callback`,
      authUrl: "https://www.linkedin.com/oauth/v2/authorization",
      tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
      userInfoUrl: "https://api.linkedin.com/v2/me",
      scopes: ["r_liteprofile", "r_emailaddress"],
      enabled: !!process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID,
      icon: "linkedin",
      color: "#0A66C2",
    },

    apple: {
      name: "apple",
      displayName: "Apple",
      clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
      redirectUri: `${getAppUrl()}/api/auth/apple/callback`,
      authUrl: "https://appleid.apple.com/auth/authorize",
      tokenUrl: "https://appleid.apple.com/auth/token",
      userInfoUrl: "https://appleid.apple.com/auth/userinfo",
      scopes: ["name", "email"],
      enabled: !!process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,
      icon: "apple",
      color: "#000000",
    },

    discord: {
      name: "discord",
      displayName: "Discord",
      clientId: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      redirectUri: `${getAppUrl()}/api/auth/discord/callback`,
      authUrl: "https://discord.com/api/oauth2/authorize",
      tokenUrl: "https://discord.com/api/oauth2/token",
      userInfoUrl: "https://discord.com/api/users/@me",
      scopes: ["identify", "email"],
      enabled: !!process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
      icon: "discord",
      color: "#5865F2",
    },

    slack: {
      name: "slack",
      displayName: "Slack",
      clientId: process.env.NEXT_PUBLIC_SLACK_CLIENT_ID,
      clientSecret: process.env.SLACK_CLIENT_SECRET,
      redirectUri: `${getAppUrl()}/api/auth/slack/callback`,
      authUrl: "https://slack.com/oauth/v2/authorize",
      tokenUrl: "https://slack.com/api/oauth.v2.access",
      userInfoUrl: "https://slack.com/api/users.identity",
      scopes: ["identity.basic", "identity.email"],
      enabled: !!process.env.NEXT_PUBLIC_SLACK_CLIENT_ID,
      icon: "slack",
      color: "#4A154B",
    },

    gitlab: {
      name: "gitlab",
      displayName: "GitLab",
      clientId: process.env.NEXT_PUBLIC_GITLAB_CLIENT_ID,
      clientSecret: process.env.GITLAB_CLIENT_SECRET,
      redirectUri: `${getAppUrl()}/api/auth/gitlab/callback`,
      authUrl: "https://gitlab.com/oauth/authorize",
      tokenUrl: "https://gitlab.com/oauth/token",
      userInfoUrl: "https://gitlab.com/api/v4/user",
      scopes: ["read_user"],
      enabled: !!process.env.NEXT_PUBLIC_GITLAB_CLIENT_ID,
      icon: "gitlab",
      color: "#FC6D26",
    },

    idme: {
      name: "idme",
      displayName: "ID.me",
      clientId: process.env.NEXT_PUBLIC_IDME_CLIENT_ID,
      clientSecret: process.env.IDME_CLIENT_SECRET,
      redirectUri: `${getAppUrl()}/api/auth/idme/callback`,
      authUrl: "https://api.id.me/oauth/authorize",
      tokenUrl: "https://api.id.me/oauth/token",
      userInfoUrl: "https://api.id.me/api/public/v3/attributes.json",
      scopes: ["military", "responder", "student", "teacher"],
      enabled: !!process.env.NEXT_PUBLIC_IDME_CLIENT_ID,
      icon: "shield-check",
      color: "#1C3177",
    },
  };

/**
 * Get a specific OAuth provider configuration
 */
export function getOAuthProvider(
  provider: OAuthProviderName,
): OAuthProviderMetadata | null {
  return oauthProviders[provider] || null;
}

/**
 * Get all enabled OAuth providers
 */
export function getEnabledOAuthProviders(): OAuthProviderMetadata[] {
  return Object.values(oauthProviders).filter((provider) => provider.enabled);
}

/**
 * Get all OAuth provider names
 */
export function getAllOAuthProviderNames(): OAuthProviderName[] {
  return Object.keys(oauthProviders) as OAuthProviderName[];
}

/**
 * Check if a provider is enabled
 */
export function isOAuthProviderEnabled(provider: OAuthProviderName): boolean {
  return oauthProviders[provider]?.enabled || false;
}

/**
 * Validate OAuth provider configuration
 */
export interface OAuthProviderValidation {
  provider: OAuthProviderName;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateOAuthProvider(
  provider: OAuthProviderName,
): OAuthProviderValidation {
  const config = oauthProviders[provider];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config) {
    return {
      provider,
      valid: false,
      errors: ["Provider configuration not found"],
      warnings: [],
    };
  }

  // Check required fields
  if (!config.clientId) {
    errors.push(
      `Missing environment variable: NEXT_PUBLIC_${provider.toUpperCase()}_CLIENT_ID`,
    );
  }

  if (!config.clientSecret) {
    errors.push(
      `Missing environment variable: ${provider.toUpperCase()}_CLIENT_SECRET`,
    );
  }

  if (!config.redirectUri) {
    errors.push("Missing redirect URI");
  }

  if (!config.authUrl) {
    errors.push("Missing auth URL");
  }

  if (!config.tokenUrl) {
    errors.push("Missing token URL");
  }

  if (!config.userInfoUrl) {
    errors.push("Missing user info URL");
  }

  if (!config.scopes || config.scopes.length === 0) {
    warnings.push("No scopes defined");
  }

  // Check if redirect URI uses HTTPS in production
  if (
    process.env.NODE_ENV === "production" &&
    !config.redirectUri.startsWith("https://")
  ) {
    errors.push("Redirect URI must use HTTPS in production");
  }

  return {
    provider,
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate all OAuth providers
 */
export function validateAllOAuthProviders(): OAuthProviderValidation[] {
  return getAllOAuthProviderNames().map((provider) =>
    validateOAuthProvider(provider),
  );
}
