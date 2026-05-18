/**
 * nself-chat Type Definitions
 *
 * Central export file for all TypeScript types used throughout the application.
 * Import types from this file for consistent typing across the codebase.
 *
 * @example
 * ```typescript
 * import type { User, Message, Channel, AppConfig } from '@/types';
 * ```
 */

// ============================================================================
// User Types
// ============================================================================

export type {
  // Core types
  User,
  UserRole,
  UserBasicInfo,
  UserWithPresence,
  MessageUser,
  // Profile types
  UserProfile,
  UserSocialLinks,
  // Presence types
  UserPresence,
  UserPresenceStatus,
  // Status types
  UserStatus,
  UserStatusPreset,
  // Permission types
  UserPermissions,
  // Settings types
  UserSettings,
  UserNotificationSettings,
  UserPrivacySettings,
  UserAppearanceSettings,
  // Auth types
  UserAuthMetadata,
  // Session types
  UserSession,
  // Relationship types
  UserBlock,
  UserContact,
  // Moderation types
  UserModerationAction,
  UserMute,
  UserBan,
  // Input types
  CreateUserInput,
  UpdateUserInput,
  UserFilter,
} from "./user";

export {
  UserRoleLevel,
  UserRoleLabels,
  UserRoleDescriptions,
  UserPresenceLabels,
  DefaultStatusPresets,
  DefaultRolePermissions,
} from "./user";

// ============================================================================
// Channel Types
// ============================================================================

export type {
  // Core types
  Channel,
  ChannelType,
  ChannelVisibility,
  DirectMessageChannel,
  GroupDMChannel,
  AnyChannel,
  Thread,
  // Category types
  ChannelCategory,
  CreateChannelCategoryInput,
  UpdateChannelCategoryInput,
  // Settings types
  ChannelSettings,
  SlowModeDuration,
  ChannelNotificationLevel,
  ChannelPermissionOverrides,
  ChannelPermissionFlags,
  // Member types
  ChannelMember,
  ChannelMemberBasic,
  // Invite types
  ChannelInvite,
  CreateChannelInviteInput,
  // State types
  ChannelWithMembership,
  ChannelListItem,
  // Input types
  CreateChannelInput,
  UpdateChannelInput,
  CreateDirectMessageInput,
  CreateGroupDMInput,
  // Filter types
  ChannelFilter,
  ChannelSortBy,
  ChannelSortOptions,
  // Event types
  ChannelUpdateType,
  ChannelUpdateEvent,
} from "./channel";

export {
  ChannelTypeLabels,
  ChannelTypeIcons,
  DefaultChannelSettings,
  isDirectMessage,
  isRegularChannel,
  getChannelDisplayName,
} from "./channel";

// ============================================================================
// Message Types
// ============================================================================

export type {
  // Core types
  Message,
  MessageType,
  // Thread types
  ThreadInfo,
  Thread as MessageThread,
  // Attachment types
  Attachment as MessageAttachment,
  AttachmentType as MessageAttachmentType,
  LinkPreview,
  // Mention types
  MentionType,
  MessageMention,
  // Reaction types
  Reaction as MessageReaction,
  ReactionEvent,
  // Voice message types
  VoiceMessageData,
  // Edit types
  MessageEditRecord,
  // Draft types
  MessageDraft,
  SendMessageInput,
  EditMessageInput,
  // Suggestion types
  MentionSuggestion,
  SlashCommand,
  SlashCommandArg,
  // List types
  MessageGroup,
  DateSeparator,
  UnreadIndicator,
  NewMessagesIndicator,
  MessageListItem,
  // System message types
  SystemMessageData,
  // Typing types
  TypingUser,
  ChannelTypingState,
  // Action types
  MessageAction,
  MessageActionPermissions,
  // Search types
  MessageSearchResult,
  MessageSearchFilters,
  // Read state types
  ChannelReadState,
  ReadStateUpdate,
} from "./message";

export {
  isSystemMessage,
  formatSystemMessage,
  formatTypingIndicator,
  getMessagePermissions,
} from "./message";

// ============================================================================
// Attachment Types
// ============================================================================

export type {
  // Core types
  Attachment,
  AttachmentType,
  AttachmentCategory,
  AnyAttachment,
  ImageAttachment,
  VideoAttachment,
  AudioAttachment,
  FileAttachment,
  // Metadata types
  FileMetadata,
  ImageMetadata,
  ImageExifData,
  VideoMetadata,
  AudioMetadata,
  AudioTags,
  // Upload types
  UploadProgress,
  UploadStatus,
  UploadQueueItem,
  UploadSettings,
  UploadFileInput,
  UploadFilesInput,
  PresignedUploadUrl,
} from "./attachment";

export {
  MimeTypeCategories,
  DefaultUploadSettings,
  getAttachmentType,
  getAttachmentCategory,
  formatFileSize,
  isFileTypeAllowed,
  getFileIcon,
} from "./attachment";

// ============================================================================
// Notification Types
// ============================================================================

export type {
  // Core types
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  NotificationStatus,
  GroupedNotification,
  // Content types
  NotificationContent,
  MessageNotificationContent,
  ReactionNotificationContent,
  ChannelNotificationContent,
  UserNotificationContent,
  SystemNotificationContent,
  IntegrationNotificationContent,
  // Preferences types
  NotificationPreferences,
  ChannelNotificationSettings,
  NotificationSchedule,
  EmailNotificationSettings,
  PushNotificationSettings,
  DesktopNotificationSettings,
  KeywordNotificationSettings,
  // Action types
  NotificationAction,
  BulkNotificationAction,
  // Query types
  NotificationFilter,
  NotificationSortOptions,
  NotificationCount,
  // Push token types
  PushToken,
  RegisterPushTokenInput,
  // Event types
  NotificationReceivedEvent,
  NotificationReadEvent,
  NotificationCountUpdatedEvent,
} from "./notification";

export { DefaultNotificationPreferences } from "./notification";

// ============================================================================
// Poll Types
// ============================================================================

export type {
  // Core types
  Poll,
  PollType,
  PollStatus,
  PollResultsVisibility,
  PollWithResults,
  // Option types
  PollOption,
  PollOptionInput,
  PollOptionResult,
  // Vote types
  PollVote,
  CastVoteInput,
  PollVoteDistribution,
  // Settings types
  PollSettings,
  // Input types
  CreatePollInput,
  UpdatePollInput,
  AddPollOptionInput,
  // Event types
  PollEventType,
  PollEvent,
  PollVoteEvent,
  // Query types
  PollFilter,
  PollSortOptions,
} from "./poll";

export {
  DefaultPollSettings,
  isPollOpen,
  canVoteInPoll,
  calculatePollPercentages,
  getWinningOptions,
  formatPollClosingTime,
} from "./poll";

// ============================================================================
// Emoji Types
// ============================================================================

export type {
  // Category types
  StandardEmojiCategory,
  EmojiCategory,
  EmojiCategoryInfo,
  // Core types
  SkinTone,
  Emoji,
  CustomEmoji,
  AnyEmoji,
  // Reaction types
  Reaction,
  ReactionWithUsers,
  ReactionSummary,
  // Picker types
  RecentEmoji,
  FrequentEmoji,
  EmojiSearchResult,
  EmojiPickerState,
  // Management types
  CreateCustomEmojiInput,
  UpdateCustomEmojiInput,
  EmojiUploadValidation,
  EmojiUploadConstraints,
  // Pack types
  EmojiPack,
  CreateEmojiPackInput,
  // Event types
  ReactionAddedEvent,
  ReactionRemovedEvent,
  ReactionsClearedEvent,
} from "./emoji";

export {
  EmojiCategories,
  SkinToneModifiers,
  DefaultEmojiUploadConstraints,
  formatEmojiShortName,
  parseEmojiShortName,
  isValidEmojiName,
  applyEmojiSkinTone,
  getEmojiLabel,
} from "./emoji";

// ============================================================================
// Search Types
// ============================================================================

export type {
  // Core types
  SearchResultType,
  SearchScope,
  SearchSortBy,
  SearchSortOrder,
  // Query types
  SearchQuery,
  AdvancedSearchQuery,
  SearchSortOptions,
  SearchPagination,
  // Filter types
  SearchFilters,
  DateRangeFilter,
  RelativeDateRange,
  MessageSearchFilters as SearchMessageFilters,
  FileSearchFilters,
  ChannelSearchFilters,
  UserSearchFilters,
  // Result types
  BaseSearchResult,
  SearchHighlight,
  MessageSearchResult as SearchMessageResult,
  UserSearchResult,
  ChannelSearchResult,
  FileSearchResult,
  ThreadSearchResult,
  SearchResult,
  // Response types
  SearchResponse,
  SearchResponsePagination,
  SearchMetadata,
  SearchFacets,
  // Suggestion types
  SearchSuggestion,
  QuickSearchResult,
  QuickSearchResponse,
  // History types
  SearchHistoryItem,
  SavedSearch,
  // Config types
  SearchConfig,
  SearchFilterPreset,
} from "./search";

export {
  DefaultSearchConfig,
  CommonSearchPresets,
  buildSearchUrl,
  parseSearchUrl,
} from "./search";

// ============================================================================
// Webhook Types
// ============================================================================

export type {
  // Core types
  Webhook,
  WebhookDirection,
  WebhookStatus,
  WebhookEventType,
  WebhookAuthMethod,
  IncomingWebhook,
  OutgoingWebhook,
  // Config types
  WebhookFilters,
  WebhookAuth,
  WebhookRateLimit,
  WebhookRetryConfig,
  // Payload types
  WebhookPayloadBase,
  WebhookPayload,
  MessageEventPayload,
  ReactionEventPayload,
  ChannelEventPayload,
  MemberEventPayload,
  UserEventPayload,
  FileEventPayload,
  IncomingWebhookPayload,
  IncomingWebhookAttachment,
  IncomingWebhookEmbed,
  // Delivery types
  WebhookDeliveryStatus,
  WebhookDelivery,
  WebhookDeliverySummary,
  // Input types
  CreateIncomingWebhookInput,
  CreateOutgoingWebhookInput,
  UpdateWebhookInput,
  // Event types
  WebhookCreatedEvent,
  WebhookDeliveryEvent,
} from "./webhook";

export {
  DefaultWebhookRetryConfig,
  generateWebhookSignature,
  verifyWebhookSignature,
  generateWebhookSignatureSync,
  verifyWebhookSignatureSync,
  getEventCategory,
  formatWebhookUrl,
} from "./webhook";

// ============================================================================
// Bot Types
// ============================================================================

export type {
  // Core types
  Bot,
  BotStatus,
  BotVisibility,
  BotCategory,
  BotWithInstallStatus,
  BotFlags,
  // Permission types
  BotPermissionScope,
  BotPermissions,
  BotChannelPermission,
  // Command types
  BotCommand,
  BotCommandOption,
  BotCommandOptionType,
  BotCommandChoice,
  BotCommandInvocation,
  // Installation types
  BotInstallation,
  InstallBotInput,
  // Interaction types
  BotInteractionType,
  BotInteraction,
  BotInteractionData,
  BotInteractionResponse,
  // Component types
  BotMessageComponentType,
  BotButtonStyle,
  BotButton,
  BotSelectMenu,
  BotSelectOption,
  BotTextInput,
  BotActionRow,
  BotMessageComponent,
  BotModal,
  BotMessageEmbed,
  // Input types
  CreateBotInput,
  UpdateBotInput,
  UpdateBotCommandsInput,
  // Token types
  BotToken,
  NewBotToken,
  // Analytics types
  BotAnalytics,
  // Event types
  BotStatusChangeEvent,
  BotInstalledEvent,
  BotUninstalledEvent,
} from "./bot";

export { BotPermissionScopeDescriptions } from "./bot";

// ============================================================================
// Sticker Types
// ============================================================================

export type {
  // Core types
  Sticker,
  StickerType,
  StickerFormat,
  StickerVisibility,
  StickerWithPack,
  // Pack types
  StickerPack,
  StickerPackBasic,
  StickerPackInstallation,
  // Usage types
  RecentSticker,
  FrequentSticker,
  StickerSuggestion,
  // Picker types
  StickerPickerCategory,
  StickerPickerState,
  // Search types
  StickerSearchQuery,
  StickerSearchResponse,
  TrendingSticker,
  // Input types
  CreateStickerPackInput,
  CreateStickerInput,
  UpdateStickerPackInput,
  UpdateStickerInput,
  ReorderStickersInput,
  // Upload types
  StickerUploadValidation,
  StickerUploadConstraints,
  // Event types
  StickerPackCreatedEvent,
  StickerPackUpdatedEvent,
  StickerPackInstalledEvent,
  StickerUsedEvent,
} from "./sticker";

export {
  DefaultStickerUploadConstraints,
  getStickerTypeFromFormat,
  isAnimatedStickerFormat,
  getStickerMimeType,
  isValidStickerName,
  isValidPackName,
  getStickerPackUrl,
  formatStickerSize,
} from "./sticker";

// ============================================================================
// API Types
// ============================================================================

export type {
  // Response types
  APIResponse,
  APIResponseMeta,
  APISuccessResponse,
  APIErrorResponse,
  // Error types
  APIError,
  APIErrorCode,
  APIFieldError,
  // Pagination types
  PaginationInput,
  PaginationMeta,
  PaginatedResponse,
  CursorPaginationInfo,
  Connection,
  Edge,
  // Filter types
  SortInput,
  FilterOperator,
  FilterCondition,
  FilterGroup,
  // GraphQL types
  GraphQLOperationType,
  GraphQLRequest,
  GraphQLResponse,
  GraphQLError,
  GraphQLErrorLocation,
  HasuraErrorExtensions,
  GraphQLSubscriptionOptions,
  // Request types
  RequestHeaders,
  RequestOptions,
  RetryOptions,
  // Rate limit types
  RateLimitInfo,
  // Client types
  APIClientConfig,
  APIEndpoint,
  // Utility types
  DeepPartial,
  ExtractAPIData,
  ExtractPaginatedItem,
} from "./api";

export {
  HTTPStatusToErrorCode,
  DefaultRetryOptions,
  RateLimitHeaders,
  isAPISuccess,
  isAPIError,
  createAPIError,
  buildPaginationParams,
} from "./api";

// ============================================================================
// Socket Types
// ============================================================================

export type {
  // Connection types
  SocketConnectionState,
  SocketConnectionInfo,
  SocketError,
  SocketConnectionOptions,
  // Event name types
  ClientToServerEvent,
  ServerToClientEvent,
  // Client payloads
  AuthenticatePayload,
  ChannelJoinPayload,
  ChannelLeavePayload,
  MessageSendPayload,
  MessageEditPayload,
  MessageDeletePayload,
  MessageReadPayload,
  TypingPayload,
  ReactionPayload,
  PresenceUpdatePayload,
  PresenceSubscribePayload,
  ThreadSubscribePayload,
  // Server payloads
  ConnectedPayload,
  AuthenticatedPayload,
  AuthenticationErrorPayload,
  MessageNewPayload,
  MessageUpdatedPayload,
  MessageDeletedPayload,
  TypingEventPayload,
  ReadReceiptPayload,
  ReactionAddedPayload,
  ReactionRemovedPayload,
  PresenceChangedPayload,
  PresenceBulkUpdatePayload,
  ChannelCreatedPayload,
  ChannelUpdatedPayload,
  ChannelMemberEventPayload,
  NotificationEventPayload,
  NotificationCountUpdatePayload,
  UserStatusChangedPayload,
  // Event maps
  ClientToServerEvents,
  ServerToClientEvents,
  // Response types
  SocketResponse,
  SocketAck,
  // State types
  SocketState,
  // Utility types
  SocketEventHandler,
  SocketEventCleanup,
  ExtractEventPayload,
} from "./socket";

export { DefaultSocketConnectionOptions } from "./socket";

// ============================================================================
// Config Types
// ============================================================================

export type {
  // Setup types
  SetupConfig,
  SetupStep,
  // Owner types
  OwnerConfig,
  // Branding types
  BrandingConfig,
  // Theme types
  ThemePreset,
  ColorScheme,
  ThemeColors,
  ThemeConfig,
  // Landing types
  LandingTheme,
  LandingMode,
  LandingPages,
  HomepageConfig,
  // Auth types
  IdMeConfig,
  AuthProvidersConfig,
  PermissionMode,
  IdMeRole,
  AuthPermissionsConfig,
  // Feature types
  FeatureFlags,
  // Integration types
  SlackIntegration,
  GitHubIntegration,
  JiraIntegration,
  GoogleDriveIntegration,
  WebhookIntegration,
  IntegrationsConfig,
  // Moderation types
  ModerationConfig,
  // SEO types
  SEOConfig,
  // Legal types
  LegalConfig,
  // Social types
  SocialLinksConfig,
  // Main config types
  AppConfig,
  ConfigUpdate,
  ConfigChangeEvent,
  // Environment types
  EnvironmentConfig,
} from "./config";

export {
  SetupSteps,
  DefaultThemeConfig,
  DefaultFeatureFlags,
  DefaultAppConfig,
  getEnvironmentConfig,
} from "./config";

// ============================================================================
// GIF Types (existing)
// ============================================================================

export type {
  GifProvider,
  Gif,
  GifVariants,
  GifImage,
  GifSearchParams,
  GifSearchResponse,
  GifPagination,
  GifTrendingParams,
  GifTrendingResponse,
  GifCategory,
  GifCategoriesResponse,
  GiphyGif,
  GiphySearchResponse,
  GiphyCategory,
  GiphyCategoriesResponse,
  TenorGif,
  TenorSearchResponse,
  TenorCategory,
  TenorCategoriesResponse,
  GifApiRequest,
  GifApiResponse,
  GifHistoryItem,
  GifSearchHistoryItem,
  GifPickerProps,
  GifGridProps,
  GifPreviewProps,
  GifSearchProps,
  GifCategoriesProps,
  GifPickerTriggerProps,
} from "./gif";

// ============================================================================
// Database Types
// ============================================================================

export type {
  // Enums
  UserStatus as DbUserStatus,
  PresenceStatus as DbPresenceStatus,
  ChannelType as DbChannelType,
  MessageType as DbMessageType,
  MemberRole,
  NotificationType as DbNotificationType,
  AttachmentType as DbAttachmentType,
  SubscriptionStatus as DbSubscriptionStatus,
  AuditAction,
  // Base types
  UUID,
  Timestamp,
  InetAddress,
  JsonObject,
  TimestampFields,
  SoftDeleteFields,
  // Tables
  DbUser,
  DbProfile,
  DbPresence,
  DbUserSettings,
  DbCategory,
  DbChannel,
  DbChannelMember,
  DbMessage,
  DbThread,
  DbThreadMember,
  DbReaction,
  DbCustomEmoji,
  DbAttachment,
  DbMedia,
  DbNotification,
  DbPushSubscription,
  DbWorkspace,
  DbWorkspaceMember,
  DbWorkspaceInvite,
  DbRole,
  DbUserRole,
  DbPermission,
  DbPlan,
  DbSubscription,
  DbInvoice,
  DbBookmark,
  DbPinnedMessage,
  DbSearchIndex,
  DbAuditLog,
  DbIntegration,
  DbWebhook,
  DbIncomingWebhook,
  DbBot,
  DbAppConfiguration,
  DbSession,
} from "./database";

export {
  // Enum arrays
  USER_STATUSES,
  PRESENCE_STATUSES,
  CHANNEL_TYPES,
  MESSAGE_TYPES,
  MEMBER_ROLES,
  NOTIFICATION_TYPES,
  ATTACHMENT_TYPES,
  SUBSCRIPTION_STATUSES,
  AUDIT_ACTIONS,
  // Labels
  PRESENCE_STATUS_LABELS,
  CHANNEL_TYPE_LABELS,
  MEMBER_ROLE_LEVELS,
  MEMBER_ROLE_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  AUDIT_ACTION_LABELS,
  MIME_TYPE_CATEGORIES,
  // Type guards
  isUserStatus,
  isPresenceStatus as isDbPresenceStatus,
  isChannelType as isDbChannelType,
  isMessageType as isDbMessageType,
  isMemberRole,
  isNotificationType as isDbNotificationType,
  isAttachmentType as isDbAttachmentType,
  isSubscriptionStatus,
  isAuditAction,
} from "./database";

// ============================================================================
// Subscription Types
// ============================================================================

export type {
  Plan,
  PlanTier,
  Currency,
  PlanFeatures,
  PlanDisplay,
  SubscriptionStatus,
  BillingInterval,
  Subscription,
  SubscriptionWithComputed,
  InvoiceStatus,
  Invoice,
  InvoiceLineItem,
  PaymentMethodType,
  PaymentMethod,
  SubscriptionUsage,
  UsageLimitWarning,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  CancelSubscriptionInput,
  AddPaymentMethodInput,
  SubscriptionEventType,
  SubscriptionEvent,
} from "./subscription.types";

export {
  FREE_PLAN_FEATURES,
  SUBSCRIPTION_STATUS_LABELS as SubscriptionStatusLabels,
  formatPrice,
  calculateYearlySavings,
  isSubscriptionActive,
  getDaysUntil,
} from "./subscription.types";

// ============================================================================
// Audit Types
// ============================================================================

export type {
  AuditActionCategory,
  AuthenticationAction,
  UserManagementAction,
  ChannelManagementAction,
  MessageManagementAction,
  ModerationAction,
  SettingsAction,
  BillingAction,
  IntegrationAction,
  SecurityAction,
  AuditAction as AuditActionType,
  AuditSeverity,
  AuditLog,
  AuditEntityType,
  AuditMetadata,
  AuditLocation,
  AuditLogFilter,
  AuditLogSortOptions,
  AuditLogSearchResult,
  AuditStatistics,
  UserActivitySummary,
  AuditExportFormat,
  AuditExportRequest,
  AuditExportStatus,
  SecurityEvent,
  SecurityIndicator,
} from "./audit.types";

export {
  getActionCategory,
  getSeverityLabel,
  getSeverityColor,
  formatAuditDescription,
  isSecuritySensitive,
} from "./audit.types";

// ============================================================================
// API Types (Extended)
// ============================================================================

export * from "./api";

// ============================================================================
// GraphQL Types
// ============================================================================

export * from "./graphql";

// ============================================================================
// Type Utilities
// ============================================================================

export * from "./utils";

// ============================================================================
// Presence Privacy Settings Types
// ============================================================================

export type {
  PresenceSettings,
  PresenceSettingsInput,
  PresenceVisibility,
  PresenceVisibilityResult,
} from "@/graphql/presence-settings";

export { DEFAULT_PRESENCE_SETTINGS } from "@/graphql/presence-settings";
