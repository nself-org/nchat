/**
 * Integrations Module
 *
 * Unified exports for all external integration providers.
 * Provides clients, OAuth flows, formatters, and webhook handling
 * for GitHub, Jira, Slack, Google Drive, Discord, and Telegram.
 */

// ============================================================================
// Core Infrastructure
// ============================================================================

// Integration Manager
export {
  IntegrationManager,
  getIntegrationManager,
  resetIntegrationManager,
  // OAuth utilities
  generateOAuthState,
  buildAuthUrl,
  parseOAuthCallback,
  verifyOAuthState,
  storeOAuthState,
  getStoredOAuthState,
  clearOAuthState,
  // Token utilities
  tokenNeedsRefresh,
  calculateTokenExpiry,
  tokenResponseToCredentials,
} from "./integration-manager";

// Webhook Handler
export {
  WebhookHandlerManager,
  getWebhookHandlerManager,
  resetWebhookHandlerManager,
  // Signature verification
  computeHmacSignature,
  verifySignature,
  verifyGitHubSignature,
  verifySlackSignature,
  verifyJiraSignature,
  // Payload parsing
  parseWebhookPayload,
  detectWebhookSource,
  extractEventType,
  extractTimestamp,
  normalizeHeaders,
  // Handler factories
  createLoggingHandler,
  createCallbackHandler,
  type WebhookHandler,
  type WebhookHandlerResult,
  type ParsedWebhook,
  type SignatureAlgorithm,
  type SignatureConfig,
} from "./webhook-handler";

// ============================================================================
// Core Types
// ============================================================================

export type {
  // Integration types
  Integration,
  IntegrationProvider,
  IntegrationCredentials,
  IntegrationCategory,
  IntegrationStatus,
  IntegrationId,
  // OAuth types
  OAuthConfig,
  OAuthCallbackParams,
  OAuthTokenResponse,
  // Webhook types
  WebhookEventType,
  WebhookConfig,
  IncomingWebhookPayload,
  WebhookVerificationResult,
  // Store types
  IntegrationStoreState,
  SyncStatus,
  ChannelMapping,
  IntegrationSettings,
} from "./types";

// ============================================================================
// GitHub Integration
// ============================================================================

export {
  // Client
  GitHubApiClient,
  GitHubApiError,
  GitHubIntegrationProvider,
  createGitHubProvider,
  GITHUB_API_BASE,
  // OAuth
  buildGitHubAuthUrl,
  initiateGitHubOAuth,
  exchangeCodeForToken as exchangeGitHubCodeForToken,
  handleGitHubOAuthCallback,
  GitHubOAuthException,
  generateOAuthState as generateGitHubOAuthState,
  storeOAuthState as storeGitHubOAuthState,
  retrieveOAuthState as retrieveGitHubOAuthState,
  clearOAuthState as clearGitHubOAuthState,
  // Formatter
  formatGitHubNotification,
  formatNotificationAsMessage as formatGitHubNotificationAsMessage,
  parseGitHubUrl,
  // Types
  type GitHubClientConfig,
  type GitHubOAuthConfig,
  type GitHubOAuthState,
  type GitHubOAuthResult,
  type FormattedNotification as FormattedGitHubNotification,
  type NotificationIcon as GitHubNotificationIcon,
  type NotificationColor as GitHubNotificationColor,
  type NotificationMetadata as GitHubNotificationMetadata,
} from "./github";

// Re-export GitHub types from core types
export type {
  GitHubUser,
  GitHubRepository,
  GitHubIssue,
  GitHubPullRequest,
  GitHubCommit,
  GitHubWebhookPayload,
} from "./types";

// Export GitHub-specific types
export type {
  GitHubEventType,
  GitHubLabel,
  GitHubMilestone,
  GitHubReview,
  GitHubBranch,
  GitHubRelease,
  GitHubWorkflowRun,
  GitHubCheckRun,
  GitHubRepoNotificationSettings,
  GitHubUnfurlResult,
  GitHubIntegrationConfig,
} from "./github";

// ============================================================================
// Jira Integration
// ============================================================================

export {
  // Client
  JiraApiClient,
  JiraApiError,
  JiraIntegrationProvider,
  createJiraProvider,
  JIRA_AUTH_URL,
  // OAuth
  buildJiraAuthUrl,
  initiateJiraOAuth,
  exchangeCodeForToken as exchangeJiraCodeForToken,
  getAccessibleResources as getJiraAccessibleResources,
  refreshAccessToken as refreshJiraAccessToken,
  handleJiraOAuthCallback,
  JiraOAuthException,
  generateOAuthState as generateJiraOAuthState,
  storeOAuthState as storeJiraOAuthState,
  retrieveOAuthState as retrieveJiraOAuthState,
  clearOAuthState as clearJiraOAuthState,
  // Formatter
  formatJiraNotification,
  formatJiraNotificationAsMessage,
  formatJiraIssueUnfurl,
  // Types
  type JiraClientConfig,
  type JiraOAuthConfig,
  type JiraOAuthState,
  type JiraOAuthResult,
  type JiraAccessibleResource,
  type FormattedJiraNotification,
  type JiraNotificationIcon,
  type JiraNotificationColor,
  type JiraNotificationMetadata,
} from "./jira";

// Re-export Jira types from core types
export type {
  JiraUser,
  JiraProject,
  JiraIssueType,
  JiraPriority,
  JiraStatus,
  JiraIssue,
  JiraCreateIssueParams,
} from "./types";

// Export Jira-specific types
export type {
  JiraEventType,
  JiraIssueChange,
  JiraChangelog,
  JiraWebhookPayload,
  JiraComment,
  JiraDocContent,
  JiraSprint,
  JiraBoard,
  JiraWorklog,
  JiraTransition,
  JiraProjectNotificationSettings,
  JiraUnfurlResult,
  JiraIntegrationConfig,
} from "./jira";

// ============================================================================
// Slack Integration
// ============================================================================

export {
  // Client
  SlackApiClient,
  SlackApiError,
  SlackIntegrationProvider,
  createSlackProvider,
  SLACK_API_BASE,
  SLACK_AUTH_URL,
  SLACK_DEFAULT_SCOPES,
  // OAuth
  buildSlackAuthUrl,
  buildAddToSlackUrl,
  initiateSlackOAuth,
  exchangeCodeForToken as exchangeSlackCodeForToken,
  handleSlackOAuthCallback,
  SlackOAuthException,
  getSlackErrorDescription,
  generateOAuthState as generateSlackOAuthState,
  storeOAuthState as storeSlackOAuthState,
  retrieveOAuthState as retrieveSlackOAuthState,
  clearOAuthState as clearSlackOAuthState,
  // Formatter
  formatSlackNotification,
  convertSlackMessageToChat,
  convertChatMessageToSlack,
  convertMrkdwnToPlainText,
  convertMrkdwnToHtml,
  convertHtmlToMrkdwn,
  buildTextBlock,
  buildDividerBlock,
  buildHeaderBlock,
  buildContextBlock,
  buildImageBlock,
  // Types
  type SlackClientConfig,
  type SlackOAuthConfig,
  type SlackOAuthState,
  type SlackOAuthResult,
  type FormattedSlackNotification,
  type SlackNotificationIcon,
  type SlackNotificationColor,
  type SlackNotificationMetadata,
} from "./slack";

// Re-export Slack types from core types
export type {
  SlackChannel,
  SlackUser,
  SlackMessage,
  SlackFile,
  SlackImportOptions,
  SlackSyncResult,
} from "./types";

// Export Slack-specific types
export type {
  SlackEventType,
  SlackMessageSubtype,
  SlackEventWrapper,
  SlackEvent,
  SlackInteractivePayload,
  SlackBlock,
  SlackTextObject,
  SlackElement,
  SlackAttachment,
  SlackTeam,
  SlackConversation,
  SlackChannelNotificationSettings,
  SlackIntegrationConfig,
} from "./slack";

// ============================================================================
// Google Drive Integration
// ============================================================================

export {
  // Client
  GoogleDriveApiClient,
  GoogleDriveApiError,
  GoogleDriveIntegrationProvider,
  createGoogleDriveProvider,
  GOOGLE_DRIVE_API_BASE,
  GOOGLE_AUTH_URL,
  GOOGLE_TOKEN_URL,
  GOOGLE_DRIVE_DEFAULT_SCOPES as GOOGLE_DRIVE_SCOPES,
  // OAuth
  buildGoogleAuthUrl,
  initiateGoogleOAuth,
  exchangeCodeForToken as exchangeGoogleCodeForToken,
  refreshAccessToken as refreshGoogleAccessToken,
  getUserInfo as getGoogleUserInfo,
  revokeToken as revokeGoogleToken,
  handleGoogleOAuthCallback,
  buildSignInButtonUrl,
  GoogleOAuthException,
  generateOAuthState as generateGoogleOAuthState,
  storeOAuthState as storeGoogleOAuthState,
  retrieveOAuthState as retrieveGoogleOAuthState,
  clearOAuthState as clearGoogleOAuthState,
  // Formatter
  formatDriveFile,
  formatDriveFileForChat,
  formatDriveFolderForChat,
  formatDriveNotification,
  getFileType as getFileTypeFromMime,
  getEmbedUrl,
  parseGoogleDriveUrl,
  // Types
  type GoogleDriveClientConfig,
  type GoogleOAuthConfig,
  type GoogleOAuthState,
  type GoogleOAuthResult,
  type FormattedDriveFile,
  type FormattedDriveNotification as DriveNotification,
} from "./google";

// Re-export Google Drive types from core types
export type {
  GoogleDriveFile,
  GoogleDriveFolder,
  GoogleDrivePermission,
  GoogleDrivePickerConfig,
} from "./types";

// Export Google Drive-specific types
export type {
  GoogleDriveCapabilities,
  GoogleDriveFileMetadata,
  GoogleDriveUserInfo,
  GoogleDrivePermissionDetail,
  GoogleDriveRevision,
  GoogleDriveChange,
  GoogleDriveComment,
  GooglePickerViewOptions,
  GooglePickerResult,
  GoogleDriveIntegrationConfig,
  GoogleDriveUnfurlResult,
} from "./google";

export { GOOGLE_DRIVE_MIME_TYPES } from "./google";

// ============================================================================
// Discord Integration
// ============================================================================

export {
  // Client
  DiscordApiClient,
  DiscordApiError,
  DiscordIntegrationProvider,
  createDiscordProvider,
  DISCORD_API_BASE,
  DISCORD_AUTH_URL,
  DISCORD_TOKEN_URL,
  DISCORD_DEFAULT_SCOPES,
  // OAuth
  buildDiscordAuthUrl,
  buildBotInviteUrl,
  initiateDiscordOAuth,
  exchangeCodeForToken as exchangeDiscordCodeForToken,
  refreshAccessToken as refreshDiscordAccessToken,
  revokeToken as revokeDiscordToken,
  handleDiscordOAuthCallback,
  calculatePermissions,
  DiscordOAuthException,
  isDiscordOAuthError,
  getDiscordErrorDescription,
  parseScopes as parseDiscordScopes,
  hasRequiredScopes as hasRequiredDiscordScopes,
  calculateTokenExpiry as calculateDiscordTokenExpiry,
  isTokenExpired as isDiscordTokenExpired,
  generateOAuthState as generateDiscordOAuthState,
  storeOAuthState as storeDiscordOAuthState,
  retrieveOAuthState as retrieveDiscordOAuthState,
  clearOAuthState as clearDiscordOAuthState,
  // Formatter
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
  // Types
  type DiscordClientConfig,
  type DiscordOAuthConfig,
  type DiscordOAuthState,
  type DiscordOAuthResult,
  type DiscordOAuthError,
  type FormattedDiscordNotification,
  type DiscordNotificationIcon,
  type DiscordNotificationColor,
  type DiscordNotificationMetadata,
} from "./discord";

// Re-export Discord types from core types
export type {
  DiscordUser,
  DiscordGuild,
  DiscordChannel,
  DiscordMessage,
  DiscordImportOptions,
  DiscordSyncResult,
} from "./types";

// Export Discord-specific types
export { DiscordChannelType } from "./discord";

export type {
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
} from "./discord";

// ============================================================================
// Telegram Integration
// ============================================================================

export {
  // Client
  TelegramApiClient,
  TelegramApiError,
  TelegramIntegrationProvider,
  createTelegramProvider,
  TELEGRAM_API_BASE,
  verifyTelegramWebhook,
  // Formatter (Telegram uses Bot API, not OAuth)
  formatTelegramNotification,
  convertTelegramMessageToChat,
  convertChatMessageToTelegram,
  buildInlineKeyboard,
  buildUrlButton,
  buildCallbackButton,
  buildWebAppButton,
  TELEGRAM_COLORS,
  // Types
  type TelegramClientConfig,
  type FormattedTelegramNotification,
  type TelegramNotificationIcon,
  type TelegramNotificationColor,
  type TelegramNotificationMetadata,
} from "./telegram";

// Re-export Telegram types from core types
export type {
  TelegramUser,
  TelegramChat,
  TelegramMessage,
  TelegramImportOptions,
  TelegramSyncResult,
} from "./types";

// Export Telegram-specific types
export type {
  TelegramUpdateType,
  TelegramUpdate,
  TelegramInlineQuery,
  TelegramChosenInlineResult,
  TelegramCallbackQuery,
  TelegramShippingQuery,
  TelegramPreCheckoutQuery,
  TelegramPoll,
  TelegramPollAnswer,
  TelegramChatMemberUpdated,
  TelegramChatMember,
  TelegramChatInviteLink,
  TelegramChatJoinRequest,
  TelegramLocation,
  TelegramMessageEntity,
  TelegramReplyKeyboardMarkup,
  TelegramKeyboardButton,
  TelegramInlineKeyboardMarkup,
  TelegramInlineKeyboardButton,
  TelegramChatAdministratorRights,
  TelegramSticker,
  TelegramPhotoSize,
  TelegramFile,
  TelegramChatNotificationSettings,
  TelegramIntegrationConfig,
  TelegramUnfurlResult,
} from "./telegram";

// ============================================================================
// Integration Catalog (External Service Connectors)
// ============================================================================

export {
  // Base classes
  BaseConnector,
  ConnectorError,
  // Connectors
  CalendarConnector,
  TicketingConnector,
  CICDConnector,
  DocsConnector,
  CRMConnector,
  // Registry & Infrastructure
  IntegrationRegistry,
  CredentialVault,
  HealthMonitor,
  // Sync Engine
  SyncEngine,
} from "./catalog";

// Catalog Types
export type {
  IntegrationCatalogCategory,
  ConnectorCapability,
  SyncDirection,
  ConnectorStatus,
  ConnectorErrorCategory,
  ConnectorConfig,
  ConnectorCredentials,
  ConnectorRateLimit,
  RetryConfig,
  IntegrationEvent,
  IntegrationAction,
  ActionParameter,
  CatalogEntry,
  HealthCheckResult,
  IntegrationMetrics,
  ConnectorRequestLog,
  CalendarEvent,
  CalendarAttendee,
  CalendarRecurrence,
  CalendarReminder,
  CalendarAvailability,
  Ticket,
  TicketComment,
  TicketCreateParams,
  TicketUpdateParams,
  Pipeline,
  PipelineStatus,
  PipelineStage,
  DeployApproval,
  PipelineTrigger,
  Document as IntegrationDocument,
  DocumentPermission,
  DocumentCreateParams,
  DocumentSearchResult,
  CRMContact,
  CRMDeal,
  CRMActivity,
  CRMContactSearchParams,
  CRMLeadCreateParams,
  ConflictResolutionStrategy,
  SyncItemStatus,
  SyncQueueItem,
  SyncState,
  SyncConflict,
  SyncResult,
  InstalledIntegration,
  ConnectorEventType,
  ConnectorEventListener,
} from "./catalog";
