/**
 * Slack Integration
 *
 * Complete Slack integration for the chat platform.
 * Provides OAuth, API client, event handling, and message formatting.
 */

// Export client
export {
  SlackApiClient,
  SlackApiError,
  SlackIntegrationProvider,
  createSlackProvider,
  SLACK_API_BASE,
  SLACK_AUTH_URL,
  SLACK_TOKEN_URL,
  SLACK_DEFAULT_SCOPES,
  type SlackClientConfig,
} from "./slack-client";

// Export OAuth
export {
  buildSlackAuthUrl,
  initiateSlackOAuth,
  exchangeCodeForToken,
  handleSlackOAuthCallback,
  SlackOAuthException,
  isSlackOAuthError,
  getSlackErrorDescription,
  parseScopes,
  hasRequiredScopes,
  getMissingScopes,
  buildAddToSlackUrl,
  // State management
  generateOAuthState,
  storeOAuthState,
  retrieveOAuthState,
  clearOAuthState,
  type SlackOAuthConfig,
  type SlackOAuthState,
  type SlackOAuthResult,
  type SlackOAuthError,
} from "./oauth";

// Export formatter
export {
  formatSlackNotification,
  convertSlackMessageToChat,
  convertChatMessageToSlack,
  convertMrkdwnToPlainText,
  convertMrkdwnToHtml,
  convertHtmlToMrkdwn,
  // Block Kit builders
  buildTextBlock,
  buildDividerBlock,
  buildHeaderBlock,
  buildContextBlock,
  buildImageBlock,
  type FormattedSlackNotification,
  type SlackNotificationIcon,
  type SlackNotificationColor,
  type SlackNotificationMetadata,
} from "./formatter";

// Export types
export type {
  SlackChannel,
  SlackUser,
  SlackMessage,
  SlackFile,
  SlackImportOptions,
  SlackSyncResult,
  SlackEventType,
  SlackMessageSubtype,
  SlackEventWrapper,
  SlackEvent,
  SlackUrlVerification,
  SlackInteractivePayload,
  SlackBlockType,
  SlackBlock,
  SlackTextObject,
  SlackElement,
  SlackConfirmObject,
  SlackOptionObject,
  SlackAttachment,
  SlackTeam,
  SlackConversation,
  SlackChannelNotificationSettings,
  SlackIntegrationConfig,
} from "./types";
