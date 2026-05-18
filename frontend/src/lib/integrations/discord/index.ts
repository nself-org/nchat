/**
 * Discord Integration
 *
 * Complete Discord integration for the chat platform.
 * Provides OAuth, API client, bot functionality, and message formatting.
 */

// Export client
export {
  DiscordApiClient,
  DiscordApiError,
  DiscordIntegrationProvider,
  createDiscordProvider,
  DISCORD_API_BASE,
  DISCORD_AUTH_URL,
  DISCORD_TOKEN_URL,
  DISCORD_DEFAULT_SCOPES,
  type DiscordClientConfig,
} from "./discord-client";

// Export OAuth
export {
  buildDiscordAuthUrl,
  buildBotInviteUrl,
  initiateDiscordOAuth,
  exchangeCodeForToken,
  refreshAccessToken,
  revokeToken,
  handleDiscordOAuthCallback,
  DiscordOAuthException,
  isDiscordOAuthError,
  getDiscordErrorDescription,
  parseScopes,
  hasRequiredScopes,
  calculateTokenExpiry,
  isTokenExpired,
  calculatePermissions,
  // State management
  generateOAuthState,
  storeOAuthState,
  retrieveOAuthState,
  clearOAuthState,
  type DiscordOAuthConfig,
  type DiscordOAuthState,
  type DiscordOAuthResult,
  type DiscordOAuthError,
} from "./oauth";

// Export formatter
export {
  formatDiscordNotification,
  convertDiscordMessageToChat,
  convertChatMessageToDiscord,
  convertDiscordMarkdownToPlainText,
  convertDiscordMarkdownToHtml,
  convertHtmlToDiscordMarkdown,
  buildEmbed,
  hexToDiscordColor,
  discordColorToHex,
  DISCORD_COLORS,
  type FormattedDiscordNotification,
  type DiscordNotificationIcon,
  type DiscordNotificationColor,
  type DiscordNotificationMetadata,
} from "./formatter";

// Export types
export type {
  DiscordUser,
  DiscordGuild,
  DiscordChannel,
  DiscordMessage,
  DiscordImportOptions,
  DiscordSyncResult,
  DiscordGatewayEventType,
  DiscordEmbed,
  DiscordRole,
  DiscordGuildMember,
  DiscordWebhook,
  DiscordInteraction,
  DiscordComponent,
  DiscordActivity,
  DiscordPresence,
  DiscordChannelNotificationSettings,
  DiscordIntegrationConfig,
  DiscordUnfurlResult,
} from "./types";

export { DiscordChannelType } from "./types";
