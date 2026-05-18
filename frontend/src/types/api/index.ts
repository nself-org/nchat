/**
 * API Types Index
 *
 * Central export file for all API-related TypeScript types.
 */

// ============================================================================
// Request Types
// ============================================================================

export type {
  // Common
  PaginationParams,
  SortParams,
  DateRangeParams,
  SearchParams,
  // Auth
  LoginRequest,
  DeviceInfo,
  RegisterRequest,
  PasswordResetRequest,
  PasswordResetConfirmRequest,
  ChangePasswordRequest,
  OAuthLoginRequest,
  RefreshTokenRequest,
  MfaVerifyRequest,
  // User
  UpdateProfileRequest,
  UpdateSettingsRequest,
  UpdateStatusRequest,
  UpdatePresenceRequest,
  UserSearchRequest,
  // Channel
  CreateChannelRequest,
  ChannelSettingsInput,
  UpdateChannelRequest,
  CreateDMRequest,
  CreateGroupDMRequest,
  ChannelMemberActionRequest,
  CreateChannelInviteRequest,
  ChannelSearchRequest,
  // Message
  SendMessageRequest,
  EditMessageRequest,
  MessageSearchRequest,
  ReactionRequest,
  MarkReadRequest,
  BulkMessageActionRequest,
  // Thread
  CreateThreadRequest,
  UpdateThreadRequest,
  // File
  FileUploadRequest,
  CompleteUploadRequest,
  // Workspace
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  CreateWorkspaceInviteRequest,
  // Notification
  UpdateNotificationPreferencesRequest,
  MarkNotificationsReadRequest,
  // Webhook
  CreateWebhookRequest,
  UpdateWebhookRequest,
  CreateIncomingWebhookRequest,
  // Report
  ReportContentRequest,
  // Moderation
  ModerationActionRequest,
} from "./request.types";

// ============================================================================
// Response Types
// ============================================================================

export type {
  // Common
  ApiResponse,
  ResponseMeta,
  PaginatedResponse,
  PaginationInfo,
  CursorPaginationInfo,
  Connection,
  Edge,
  // Auth
  AuthResponse,
  TokenRefreshResponse,
  SessionResponse,
  // User
  UserResponse,
  UserListResponse,
  UserSearchResponse,
  UserProfileResponse,
  // Channel
  ChannelResponse,
  ChannelListResponse,
  ChannelListItem,
  DirectMessageItem,
  ChannelMembersResponse,
  ChannelMemberResponse,
  ChannelInviteResponse,
  // Message
  MessageResponse,
  ReactionWithUsers,
  ThreadSummary,
  MessagePreview,
  MessagesResponse,
  MessageSearchResponse,
  MessageSearchResult,
  // Thread
  ThreadResponse,
  ThreadListResponse,
  ThreadListItem,
  // Notification
  NotificationResponse,
  NotificationsResponse,
  NotificationPreferencesResponse,
  // Upload
  PresignedUploadResponse,
  UploadCompleteResponse,
  // Workspace
  WorkspaceResponse,
  WorkspaceInviteResponse,
  // Subscription
  SubscriptionResponse,
  PlansResponse,
  InvoicesResponse,
  CheckoutSessionResponse,
  PortalSessionResponse,
  // Audit
  AuditLogsResponse,
  AuditStatsResponse,
  // Health
  HealthResponse,
  RateLimitResponse,
} from "./response.types";

// ============================================================================
// Error Types
// ============================================================================

export type {
  HttpErrorCode,
  AppErrorCode,
  ErrorCode,
  ApiErrorResponse,
  ApiError,
  FieldError,
  RetryInfo,
} from "./error.types";

export {
  // Mappings
  HTTP_STATUS_TO_ERROR,
  ERROR_TO_HTTP_STATUS,
  RETRYABLE_ERRORS,
  ERROR_MESSAGES,
  // Classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  // Type guards
  isApiErrorResponse,
  isAppError,
  isRetryableError,
  isValidationError,
  isAuthError,
  // Utilities
  getErrorMessage,
  createApiError,
  extractFieldErrors,
} from "./error.types";
