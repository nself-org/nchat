/**
 * Apollo Cache Configuration
 *
 * Defines type policies, field policies, and pagination helpers
 * for the Apollo InMemoryCache.
 */

import {
  InMemoryCache,
  FieldPolicy,
  Reference,
  makeVar,
  FieldFunctionOptions,
} from "@apollo/client";
import { relayStylePagination } from "@apollo/client/utilities";

// Type for readField function from Apollo
type ReadFieldFunction = FieldFunctionOptions["readField"];

// =============================================================================
// Reactive Variables
// =============================================================================

/**
 * Current user ID reactive variable
 */
export const currentUserIdVar = makeVar<string | null>(null);

/**
 * Online user IDs reactive variable
 */
export const onlineUsersVar = makeVar<Set<string>>(new Set());

/**
 * Typing users by channel reactive variable
 */
export const typingUsersVar = makeVar<Record<string, string[]>>({});

/**
 * Unread counts by channel reactive variable
 */
export const unreadCountsVar = makeVar<Record<string, number>>({});

// =============================================================================
// Pagination Helpers
// =============================================================================

/**
 * Custom offset-based pagination for messages
 * Handles prepending older messages and appending newer ones
 */
function offsetPagination<T = Reference>(
  keyArgs: string[] | false = false,
): FieldPolicy<T[]> {
  return {
    keyArgs,
    merge(existing, incoming, { args }) {
      const existingArray = existing || [];
      const offset = args?.offset ?? 0;
      const merged = existingArray.slice(0);

      // Handle incoming items
      for (let i = 0; i < incoming.length; ++i) {
        merged[offset + i] = incoming[i];
      }

      return merged;
    },
  };
}

/**
 * Cursor-based pagination for messages
 * Messages are typically loaded newest first, then older messages are loaded
 */
function messagePagination(): FieldPolicy<Reference[]> {
  return {
    keyArgs: ["channel_id", "where"],
    merge(existing, incoming, { args, readField }) {
      const existingArray = existing || [];
      // If we have a cursor/offset, we're loading more (prepend)
      const offset = args?.offset ?? 0;

      if (offset === 0) {
        // Fresh load or refresh - incoming is newest
        return incoming;
      }

      // Loading older messages - prepend them
      const existingIds = new Set(
        existingArray.map((ref) => readField("id", ref)),
      );
      const newItems = incoming.filter(
        (ref) => !existingIds.has(readField("id", ref)),
      );

      return [...existingArray, ...newItems];
    },
  };
}

/**
 * Simple list merge that deduplicates by ID
 */
function deduplicatedListMerge(): FieldPolicy<Reference[]> {
  return {
    merge(existing, incoming, { readField, mergeObjects }) {
      const existingArray = existing || [];
      const existingMap = new Map<string, Reference>();

      existingArray.forEach((ref) => {
        const id = readField("id", ref) as string | undefined;
        if (id) existingMap.set(id, ref);
      });

      incoming.forEach((ref) => {
        const id = readField("id", ref) as string | undefined;
        if (id) {
          const existingRef = existingMap.get(id);
          if (existingRef) {
            existingMap.set(id, mergeObjects(existingRef, ref) as Reference);
          } else {
            existingMap.set(id, ref);
          }
        }
      });

      return Array.from(existingMap.values());
    },
  };
}

// =============================================================================
// Type Policies
// =============================================================================

const typePolicies = {
  Query: {
    fields: {
      // Channel queries
      nchat_channels: deduplicatedListMerge(),

      // Message queries with pagination
      nchat_messages: messagePagination(),

      // User queries
      nchat_users: deduplicatedListMerge(),

      // Thread queries
      nchat_threads: deduplicatedListMerge(),

      // Reaction queries
      nchat_reactions: deduplicatedListMerge(),

      // App config (singleton)
      app_configuration: {
        merge: true,
      },

      // Reactive variable fields
      currentUserId: {
        read() {
          return currentUserIdVar();
        },
      },
      onlineUsers: {
        read() {
          return onlineUsersVar();
        },
      },
      typingUsers: {
        read() {
          return typingUsersVar();
        },
      },
      unreadCounts: {
        read() {
          return unreadCountsVar();
        },
      },
    },
  },

  Subscription: {
    fields: {
      // Message subscriptions
      nchat_messages: {
        merge(
          existing: Reference[] | undefined,
          incoming: Reference[],
          { readField }: FieldFunctionOptions,
        ) {
          const existingArray = existing || [];
          // For subscriptions, prepend new messages
          const existingIds = new Set(
            existingArray.map((ref) => readField("id", ref)),
          );
          const newMessages = incoming.filter(
            (ref) => !existingIds.has(readField("id", ref)),
          );
          return [...newMessages, ...existingArray];
        },
      },
    },
  },

  // Channel type policy
  nchat_channels: {
    keyFields: ["id"],
    fields: {
      members: deduplicatedListMerge(),
      messages: messagePagination(),
      // Computed field: is muted
      isMuted: {
        read(_: unknown, { readField }: FieldFunctionOptions) {
          const id = readField("id") as string | undefined;
          // This would come from local state
          return false;
        },
      },
      // Computed field: unread count from reactive var
      localUnreadCount: {
        read(_: unknown, { readField }: FieldFunctionOptions) {
          const id = readField("id") as string | undefined;
          if (!id) return 0;
          const counts = unreadCountsVar();
          return counts[id] ?? 0;
        },
      },
    },
  },

  // Message type policy
  nchat_messages: {
    keyFields: ["id"],
    fields: {
      reactions: {
        merge(
          _existing: Reference[] | undefined,
          incoming: Reference[],
          _options: FieldFunctionOptions,
        ) {
          // Reactions should always be replaced, not merged
          return incoming;
        },
      },
      attachments: {
        merge(_existing: Reference[] | undefined, incoming: Reference[]) {
          // Attachments should always be replaced
          return incoming;
        },
      },
      // Computed field: time ago
      timeAgo: {
        read(_: unknown, { readField }: FieldFunctionOptions) {
          const createdAt = readField("created_at") as string | undefined;
          if (!createdAt) return "";
          const date = new Date(createdAt);
          const now = new Date();
          const diff = now.getTime() - date.getTime();
          const minutes = Math.floor(diff / 60000);
          const hours = Math.floor(minutes / 60);
          const days = Math.floor(hours / 24);

          if (minutes < 1) return "just now";
          if (minutes < 60) return `${minutes}m`;
          if (hours < 24) return `${hours}h`;
          if (days < 7) return `${days}d`;
          return date.toLocaleDateString();
        },
      },
    },
  },

  // User type policy
  nchat_users: {
    keyFields: ["id"],
    fields: {
      // Computed field: is online from reactive var
      isOnline: {
        read(_: unknown, { readField }: FieldFunctionOptions) {
          const id = readField("id") as string | undefined;
          if (!id) return false;
          return onlineUsersVar().has(id);
        },
      },
      // Full name computed field
      fullName: {
        read(_: unknown, { readField }: FieldFunctionOptions) {
          const displayName = readField("display_name") as string | undefined;
          const username = readField("username") as string | undefined;
          return displayName || username || "Unknown";
        },
      },
    },
  },

  // Reaction type policy
  nchat_reactions: {
    keyFields: ["id"],
    // Alternative: composite key
    // keyFields: ['message_id', 'user_id', 'emoji'],
  },

  // Attachment type policy
  nchat_attachments: {
    keyFields: ["id"],
    fields: {
      // Computed field: formatted file size
      formattedSize: {
        read(_: unknown, { readField }: FieldFunctionOptions) {
          const size = readField("file_size") as number | undefined;
          if (!size) return "";
          if (size < 1024) return `${size} B`;
          if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
          if (size < 1024 * 1024 * 1024)
            return `${(size / (1024 * 1024)).toFixed(1)} MB`;
          return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
        },
      },
    },
  },

  // Thread type policy
  nchat_threads: {
    keyFields: ["id"],
    fields: {
      messages: messagePagination(),
      participants: deduplicatedListMerge(),
    },
  },

  // Channel member type policy
  nchat_channel_members: {
    keyFields: ["channel_id", "user_id"],
  },

  // Role type policy
  nchat_roles: {
    keyFields: ["id"],
  },

  // App configuration (singleton)
  app_configuration: {
    keyFields: ["id"],
    merge: true,
  },
};

// =============================================================================
// Create Cache
// =============================================================================

export const cache = new InMemoryCache({
  typePolicies,
  // Possible types for union types (if any)
  possibleTypes: {},
});

// =============================================================================
// Cache Helpers
// =============================================================================

/**
 * Add a message to a channel's message list in cache
 */
export function addMessageToCache(
  cache: InMemoryCache,
  channelId: string,
  message: { id: string; [key: string]: unknown },
) {
  cache.modify({
    id: cache.identify({ __typename: "nchat_channels", id: channelId }),
    fields: {
      messages(existingMessages = [], { toReference }) {
        const newMessageRef = toReference({
          __typename: "nchat_messages",
          id: message.id,
        });
        return [newMessageRef, ...existingMessages];
      },
    },
  });
}

/**
 * Remove a message from cache
 */
export function removeMessageFromCache(
  cache: InMemoryCache,
  messageId: string,
) {
  cache.evict({
    id: cache.identify({ __typename: "nchat_messages", id: messageId }),
  });
  cache.gc();
}

/**
 * Update unread count for a channel
 */
export function updateUnreadCount(channelId: string, count: number) {
  const current = unreadCountsVar();
  unreadCountsVar({
    ...current,
    [channelId]: count,
  });
}

/**
 * Increment unread count for a channel
 */
export function incrementUnreadCount(channelId: string, amount = 1) {
  const current = unreadCountsVar();
  unreadCountsVar({
    ...current,
    [channelId]: (current[channelId] ?? 0) + amount,
  });
}

/**
 * Clear unread count for a channel
 */
export function clearUnreadCount(channelId: string) {
  const current = unreadCountsVar();
  const updated = { ...current };
  delete updated[channelId];
  unreadCountsVar(updated);
}

/**
 * Set online status for a user
 */
export function setUserOnline(userId: string, isOnline: boolean) {
  const current = onlineUsersVar();
  const updated = new Set(current);
  if (isOnline) {
    updated.add(userId);
  } else {
    updated.delete(userId);
  }
  onlineUsersVar(updated);
}

/**
 * Set typing users for a channel
 */
export function setTypingUsers(channelId: string, userIds: string[]) {
  const current = typingUsersVar();
  typingUsersVar({
    ...current,
    [channelId]: userIds,
  });
}

/**
 * Add a typing user to a channel
 */
export function addTypingUser(channelId: string, userId: string) {
  const current = typingUsersVar();
  const channelTyping = current[channelId] ?? [];
  if (!channelTyping.includes(userId)) {
    typingUsersVar({
      ...current,
      [channelId]: [...channelTyping, userId],
    });
  }
}

/**
 * Remove a typing user from a channel
 */
export function removeTypingUser(channelId: string, userId: string) {
  const current = typingUsersVar();
  const channelTyping = current[channelId] ?? [];
  typingUsersVar({
    ...current,
    [channelId]: channelTyping.filter((id) => id !== userId),
  });
}

// =============================================================================
// Export
// =============================================================================

export default cache;
