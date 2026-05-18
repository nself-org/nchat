/**
 * GraphQL Types Index
 *
 * Central export file for all GraphQL-related TypeScript types.
 */

// ============================================================================
// Common Types
// ============================================================================

export type {
  GqlUUID,
  GqlDateTime,
  GqlJson,
  OrderBy,
  WhereComparison,
  BoolExp,
} from "./operations.types";

// ============================================================================
// Entity Types
// ============================================================================

export type {
  // User types
  GqlUser,
  GqlProfile,
  GqlPresence,
  GqlUserSettings,
  // Channel types
  GqlChannel,
  GqlCategory,
  GqlChannelMember,
  // Message types
  GqlMessage,
  GqlThread,
  GqlThreadMember,
  GqlAttachment,
  GqlReaction,
  // Notification types
  GqlNotification,
} from "./operations.types";

// ============================================================================
// Query Types
// ============================================================================

export type {
  // User queries
  GetUserVars,
  GetUserResult,
  GetUsersVars,
  GetUsersResult,
  // Channel queries
  GetChannelVars,
  GetChannelResult,
  GetChannelsVars,
  GetChannelsResult,
  // Message queries
  GetMessageVars,
  GetMessageResult,
  GetMessagesVars,
  GetMessagesResult,
  // Notification queries
  GetNotificationsVars,
  GetNotificationsResult,
} from "./operations.types";

// ============================================================================
// Mutation Types
// ============================================================================

export type {
  // User mutations
  InsertUserVars,
  InsertUserResult,
  UpdateUserVars,
  UpdateUserResult,
  // Message mutations
  InsertMessageVars,
  InsertMessageResult,
  UpdateMessageVars,
  UpdateMessageResult,
  // Reaction mutations
  InsertReactionVars,
  InsertReactionResult,
  DeleteReactionVars,
  DeleteReactionResult,
  // Channel member mutations
  UpdateChannelMemberVars,
  UpdateChannelMemberResult,
  // Presence mutations
  UpdatePresenceVars,
  UpdatePresenceResult,
} from "./operations.types";

// ============================================================================
// Subscription Types
// ============================================================================

export type {
  MessagesSubscriptionVars,
  MessagesSubscriptionResult,
  TypingSubscriptionVars,
  TypingSubscriptionResult,
  PresenceSubscriptionVars,
  PresenceSubscriptionResult,
  NotificationsSubscriptionVars,
  NotificationsSubscriptionResult,
  ChannelMembersSubscriptionVars,
  ChannelMembersSubscriptionResult,
  ReactionsSubscriptionVars,
  ReactionsSubscriptionResult,
} from "./operations.types";
