/**
 * Socket.io Real-time System
 *
 * Complete client-side Socket.io integration for nself-chat.
 * Provides presence, typing indicators, real-time messages,
 * notifications, and read receipts.
 *
 * @example
 * ```tsx
 * // In your app layout
 * import { SocketProvider } from '@/lib/socket';
 *
 * function Layout({ children }) {
 *   const { token, userId } = useAuth();
 *
 *   return (
 *     <SocketProvider token={token} userId={userId}>
 *       {children}
 *     </SocketProvider>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // In a chat component
 * import {
 *   useSocketContext,
 *   usePresence,
 *   useTyping,
 *   useChannelEvents,
 *   useNotifications,
 *   useReadReceipts,
 * } from '@/lib/socket';
 *
 * function ChatChannel({ channelId }) {
 *   const { isConnected } = useSocketContext();
 *   const { status, setStatus } = usePresence({ userId: currentUserId });
 *   const { typingUsers, handleInputChange } = useTyping({ channelId, userId: currentUserId });
 *   const { recentMessages } = useChannelEvents({ channelId });
 *   const { notifications, unreadCount } = useNotifications();
 *   const { markAsRead } = useReadReceipts({ channelId });
 *
 *   // ... component implementation
 * }
 * ```
 */

// =============================================================================
// Client
// =============================================================================

export {
  // Socket client functions
  createSocket,
  connect,
  disconnect,
  getSocket,
  isConnected,
  getSocketId,
  updateAuthToken,
  emit,
  on,
  off,
  emitWithAck,
  cleanup,
  // Connection state
  subscribeToConnectionState,
  getConnectionState,
  // Types
  type ConnectionState,
  type TypedSocket,
} from "./client";

// =============================================================================
// Events
// =============================================================================

export {
  // Event constants
  SocketEvents,
  // Types
  type SocketEventName,
  type User,
  type Channel,
  // Presence types
  type PresenceStatus,
  type PresenceEvent,
  type PresenceSubscribeEvent,
  type PresenceBulkEvent,
  type PresenceSyncEvent,
  // Typing types
  type TypingEvent,
  type TypingStartEvent,
  type TypingStopEvent,
  type TypingChannelEvent,
  // Message types
  type MessageAttachment,
  type MessageMention,
  type MessageReaction,
  type MessageEvent,
  type MessageNewEvent,
  type MessageUpdateEvent,
  type MessageDeleteEvent,
  type MessageSendEvent,
  // Reaction types
  type ReactionEvent,
  type ReactionAddEvent,
  type ReactionRemoveEvent,
  // Channel types
  type ChannelEvent,
  type ChannelJoinEvent,
  type ChannelLeaveEvent,
  type ChannelUpdateEvent,
  type ChannelMemberEvent,
  type ChannelCreatedEvent,
  type ChannelDeletedEvent,
  // Notification types
  type NotificationType,
  type NotificationEvent,
  type NotificationReadEvent,
  type NotificationReadAllEvent,
  // Read receipt types
  type ReadReceiptEvent,
  type ReadChannelEvent,
  type ReadMessageEvent,
  // User status types
  type UserStatusEvent,
  type UserProfileUpdateEvent,
  // Thread types
  type ThreadEvent,
  type ThreadNewEvent,
  type ThreadUpdateEvent,
  type ThreadReplyEvent,
  // Error types
  type SocketError,
  // Event interfaces
  type ServerToClientEvents,
  type ClientToServerEvents,
} from "./events";

// =============================================================================
// Hooks
// =============================================================================

// Main socket hook
export {
  useSocket,
  useSocketEvent,
  useSocketEmit,
  type UseSocketOptions,
  type UseSocketReturn,
} from "./hooks/use-socket";

// Presence hooks
export {
  usePresence,
  useBulkPresence,
  useUserPresence,
  type UsePresenceOptions,
  type UsePresenceReturn,
} from "./hooks/use-presence";

// Typing hooks
export {
  useTyping,
  useTypingWatch,
  type TypingUser,
  type UseTypingOptions,
  type UseTypingReturn,
} from "./hooks/use-typing";

// Channel event hooks
export {
  useChannelEvents,
  useGlobalChannelEvents,
  useMultiChannelJoin,
  useGlobalMessages,
  type UseChannelEventsOptions,
  type UseChannelEventsReturn,
  type UseGlobalChannelEventsOptions,
} from "./hooks/use-channel-events";

// Notification hooks
export {
  useNotifications,
  useUnreadCount,
  useNotificationPreferences,
  type UseNotificationsOptions,
  type UseNotificationsReturn,
  type NotificationPreferences,
} from "./hooks/use-notifications";

// Read receipt hooks
export {
  useReadReceipts,
  useUnreadMessages,
  useAutoRead,
  type ReadReceipt,
  type UseReadReceiptsOptions,
  type UseReadReceiptsReturn,
  type UseUnreadMessagesOptions,
} from "./hooks/use-read-receipts";

// =============================================================================
// Providers
// =============================================================================

export {
  SocketProvider,
  useSocketContext,
  useSocketConnected,
  useConnectionState,
  ConnectionStatus,
  type SocketContextValue,
  type SocketProviderProps,
  type ConnectionStatusProps,
} from "./providers/socket-provider";

// =============================================================================
// Default Export
// =============================================================================

// Re-export provider as default for convenient importing
export { SocketProvider as default } from "./providers/socket-provider";
