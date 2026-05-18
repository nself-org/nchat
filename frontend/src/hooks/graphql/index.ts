/**
 * Apollo GraphQL Hooks for nself-chat
 *
 * Production-ready hooks that wrap GraphQL operations with:
 * - Type-safe interfaces
 * - Loading and error states
 * - Proper caching strategies
 * - Real-time subscriptions
 * - Optimistic updates
 * - Pagination support
 */

// ============================================================================
// MESSAGE HOOKS
// ============================================================================

export {
  // Main hooks
  useMessages,
  useMessage,
  useSendMessage,
  useEditMessage,
  useDeleteMessage,
  usePinMessage,
  useForwardMessage,
  usePinnedMessages,
  useMessagesAround,
  useMessageSubscription,
  // Types
  type Message,
  type MessageUser,
  type MessageAttachment,
  type MessageReaction,
  type MessageMention,
  type UseMessagesOptions,
  type UseMessagesReturn,
  type UseMessageReturn,
  type UseSendMessageReturn,
  type UseEditMessageReturn,
  type UseDeleteMessageReturn,
  type UsePinMessageReturn,
  type UseForwardMessageReturn,
  type UsePinnedMessagesReturn,
  type UseMessagesAroundReturn,
} from "./use-messages";

// ============================================================================
// CHANNEL HOOKS
// ============================================================================

export {
  // Main hooks
  useChannels,
  useChannelsByCategory,
  useChannel,
  useChannelMembers,
  useUserChannels,
  useCreateChannel,
  useUpdateChannel,
  useDeleteChannel,
  useChannelMembership,
  useDirectMessages,
  useChannelSubscription,
  // Types
  type Channel,
  type ChannelUser,
  type ChannelMember,
  type ChannelCategory,
  type ChannelSettings,
  type UserChannelMembership,
  type UseChannelsReturn,
  type UseChannelsByCategoryReturn,
  type UseChannelReturn,
  type UseChannelMembersReturn,
  type UseUserChannelsReturn,
  type UseCreateChannelReturn,
  type UseUpdateChannelReturn,
  type UseDeleteChannelReturn,
  type UseChannelMembershipReturn,
  type UseDirectMessageReturn,
} from "./use-channels";

// ============================================================================
// THREAD HOOKS
// ============================================================================

export {
  // Main hooks
  useThread,
  useThreadReplies,
  useCreateThread,
  useSendThreadReply,
  useChannelThreads,
  useUserThreads,
  useThreadSubscription,
  // Types
  type Thread,
  type ThreadUser,
  type ThreadMessage,
  type ThreadAttachment,
  type ThreadReaction,
  type ThreadParticipant,
  type ChannelThread,
  type UserThread,
  type UseThreadOptions,
  type UseThreadReturn,
  type UseThreadRepliesReturn,
  type UseCreateThreadReturn,
  type UseSendThreadReplyReturn,
  type UseChannelThreadsReturn,
  type UseUserThreadsReturn,
} from "./use-threads";

// ============================================================================
// REACTION HOOKS
// ============================================================================

export {
  // Main hooks
  useMessageReactions,
  useMessagesReactions,
  useAddReaction,
  useRemoveReaction,
  useToggleReaction,
  useReactions,
  usePopularReactions,
  useFrequentReactions,
  useChannelReactionsSubscription,
  // Types
  type Reaction,
  type ReactionUser,
  type GroupedReaction,
  type UseMessageReactionsReturn,
  type UseAddReactionReturn,
  type UseRemoveReactionReturn,
  type UseToggleReactionReturn,
  type UseReactionsReturn,
  type UsePopularReactionsReturn,
  type UseFrequentReactionsReturn,
} from "./use-reactions";

// ============================================================================
// USER HOOKS
// ============================================================================

export {
  // Main hooks
  useCurrentUser,
  useUser,
  useUserProfile,
  useUsers,
  useOnlineUsers,
  useUserPresence,
  useUsersPresence,
  useUsersByRole,
  useUpdateProfile,
  useUpdateStatus,
  useUpdatePresence,
  useUserSettings,
  useSearchUsersForMention,
  useUserAdminActions,
  // Types
  type User,
  type UserBasic,
  type UserProfile,
  type UserRole,
  type UserPresence,
  type UserStatus,
  type UseCurrentUserReturn,
  type UseUserReturn,
  type UseUsersReturn,
  type UseOnlineUsersReturn,
  type UseUserPresenceReturn,
  type UseUpdateProfileReturn,
  type UseUpdateStatusReturn,
  type UseUpdatePresenceReturn,
  type UseUserSettingsReturn,
  type UseSearchUsersForMentionReturn,
} from "./use-users";

// ============================================================================
// SEARCH HOOKS
// ============================================================================

export {
  // Main hooks
  useSearchMessages,
  useSearchMessagesFTS,
  useSearchUsers,
  useSearchChannels,
  useSearchFiles,
  useSearchAll,
  useQuickSearch,
  useSearchChannelMessages,
  useSearchUserMessages,
  useSearchMessagesByDate,
  useSearchHistory,
  // Types
  type SearchUser,
  type SearchChannel,
  type SearchMessage,
  type SearchFile,
  type SearchHistory,
  type SearchFilters,
  type UseSearchMessagesReturn,
  type UseSearchUsersReturn,
  type UseSearchChannelsReturn,
  type UseSearchFilesReturn,
  type UseSearchAllReturn,
  type UseQuickSearchReturn,
  type UseSearchHistoryReturn,
} from "./use-search";

// ============================================================================
// NOTIFICATION HOOKS
// ============================================================================

export {
  // Main hooks
  useNotifications,
  useUnreadCount,
  useUnreadByChannel,
  useNotificationsGrouped,
  useMarkAsRead,
  useNotificationPreferences,
  useDeleteNotifications,
  usePushNotifications,
  useNotificationStream,
  useChannelUnreadSubscription,
  useNotificationSubscription,
  // Types
  type Notification,
  type NotificationActor,
  type NotificationChannel,
  type NotificationMessage,
  type NotificationType,
  type UnreadCounts,
  type ChannelUnread,
  type NotificationPreferences,
  type MutedChannel,
  type UseNotificationsReturn,
  type UseUnreadCountReturn,
  type UseUnreadByChannelReturn,
  type UseMarkAsReadReturn,
  type UseNotificationPreferencesReturn,
  type UseDeleteNotificationsReturn,
  type UsePushNotificationsReturn,
} from "./use-notifications";
