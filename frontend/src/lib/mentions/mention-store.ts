/**
 * Mention Store - Manages mention state for the nself-chat application
 *
 * Handles all mentions for the current user, unread counts, and mark as read operations.
 * Uses Zustand for state management with immer for immutable updates.
 *
 * @example
 * ```typescript
 * import { useMentionStore } from '@/lib/mentions/mention-store'
 *
 * function MentionsPanel() {
 *   const { mentions, unreadCount, markAsRead } = useMentionStore()
 *   // ...
 * }
 * ```
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

export type MentionType = "user" | "channel" | "everyone" | "here";

export interface MentionUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export interface MentionChannel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: "public" | "private" | "direct" | "group";
  is_private: boolean;
  is_archived: boolean;
  is_default: boolean;
}

export interface MentionMessage {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  type: string;
  is_edited: boolean;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
  edited_at: string | null;
  user: MentionUser;
  channel: MentionChannel;
}

export interface Mention {
  id: string;
  message_id: string;
  user_id: string;
  type: MentionType;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  message: MentionMessage;
}

export interface MentionPanelState {
  isOpen: boolean;
  filter: "all" | "unread";
}

export interface MentionState {
  // All mentions for the current user
  mentions: Map<string, Mention>;

  // Unread mention IDs for quick access
  unreadMentionIds: Set<string>;

  // Loading state
  isLoading: boolean;

  // Error state
  error: string | null;

  // Panel state
  panel: MentionPanelState;

  // Selected mention ID (for highlighting/navigation)
  selectedMentionId: string | null;
}

export interface MentionActions {
  // Mention CRUD operations
  setMentions: (mentions: Mention[]) => void;
  addMention: (mention: Mention) => void;
  removeMention: (mentionId: string) => void;
  updateMention: (mentionId: string, updates: Partial<Mention>) => void;

  // Mark as read operations
  markAsRead: (mentionId: string) => void;
  markMultipleAsRead: (mentionIds: string[]) => void;
  markAllAsRead: () => void;

  // Loading and error states
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Panel controls
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  setFilter: (filter: "all" | "unread") => void;

  // Selection
  selectMention: (mentionId: string | null) => void;

  // Computed getters
  getMention: (mentionId: string) => Mention | undefined;
  getMentionsByChannel: (channelId: string) => Mention[];
  getUnreadMentions: () => Mention[];
  getAllMentions: () => Mention[];
  getUnreadCount: () => number;

  // Utility
  reset: () => void;
}

export type MentionStore = MentionState & MentionActions;

// ============================================================================
// Initial State
// ============================================================================

const initialPanelState: MentionPanelState = {
  isOpen: false,
  filter: "all",
};

const initialState: MentionState = {
  mentions: new Map(),
  unreadMentionIds: new Set(),
  isLoading: false,
  error: null,
  panel: { ...initialPanelState },
  selectedMentionId: null,
};

// ============================================================================
// Store
// ============================================================================

export const useMentionStore = create<MentionStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // Mention CRUD operations
        setMentions: (mentions) =>
          set(
            (state) => {
              state.mentions = new Map();
              state.unreadMentionIds = new Set();
              for (const mention of mentions) {
                state.mentions.set(mention.id, mention);
                if (!mention.is_read) {
                  state.unreadMentionIds.add(mention.id);
                }
              }
            },
            false,
            "mentions/setMentions",
          ),

        addMention: (mention) =>
          set(
            (state) => {
              state.mentions.set(mention.id, mention);
              if (!mention.is_read) {
                state.unreadMentionIds.add(mention.id);
              }
            },
            false,
            "mentions/addMention",
          ),

        removeMention: (mentionId) =>
          set(
            (state) => {
              state.mentions.delete(mentionId);
              state.unreadMentionIds.delete(mentionId);
              if (state.selectedMentionId === mentionId) {
                state.selectedMentionId = null;
              }
            },
            false,
            "mentions/removeMention",
          ),

        updateMention: (mentionId, updates) =>
          set(
            (state) => {
              const mention = state.mentions.get(mentionId);
              if (mention) {
                const updatedMention = { ...mention, ...updates };
                state.mentions.set(mentionId, updatedMention);

                // Update unread tracking
                if (updates.is_read !== undefined) {
                  if (updates.is_read) {
                    state.unreadMentionIds.delete(mentionId);
                  } else {
                    state.unreadMentionIds.add(mentionId);
                  }
                }
              }
            },
            false,
            "mentions/updateMention",
          ),

        // Mark as read operations
        markAsRead: (mentionId) =>
          set(
            (state) => {
              const mention = state.mentions.get(mentionId);
              if (mention && !mention.is_read) {
                mention.is_read = true;
                mention.read_at = new Date().toISOString();
                state.unreadMentionIds.delete(mentionId);
              }
            },
            false,
            "mentions/markAsRead",
          ),

        markMultipleAsRead: (mentionIds) =>
          set(
            (state) => {
              const now = new Date().toISOString();
              for (const mentionId of mentionIds) {
                const mention = state.mentions.get(mentionId);
                if (mention && !mention.is_read) {
                  mention.is_read = true;
                  mention.read_at = now;
                  state.unreadMentionIds.delete(mentionId);
                }
              }
            },
            false,
            "mentions/markMultipleAsRead",
          ),

        markAllAsRead: () =>
          set(
            (state) => {
              const now = new Date().toISOString();
              for (const mention of state.mentions.values()) {
                if (!mention.is_read) {
                  mention.is_read = true;
                  mention.read_at = now;
                }
              }
              state.unreadMentionIds.clear();
            },
            false,
            "mentions/markAllAsRead",
          ),

        // Loading and error states
        setLoading: (loading) =>
          set(
            (state) => {
              state.isLoading = loading;
            },
            false,
            "mentions/setLoading",
          ),

        setError: (error) =>
          set(
            (state) => {
              state.error = error;
            },
            false,
            "mentions/setError",
          ),

        // Panel controls
        openPanel: () =>
          set(
            (state) => {
              state.panel.isOpen = true;
            },
            false,
            "mentions/openPanel",
          ),

        closePanel: () =>
          set(
            (state) => {
              state.panel.isOpen = false;
            },
            false,
            "mentions/closePanel",
          ),

        togglePanel: () =>
          set(
            (state) => {
              state.panel.isOpen = !state.panel.isOpen;
            },
            false,
            "mentions/togglePanel",
          ),

        setFilter: (filter) =>
          set(
            (state) => {
              state.panel.filter = filter;
            },
            false,
            "mentions/setFilter",
          ),

        // Selection
        selectMention: (mentionId) =>
          set(
            (state) => {
              state.selectedMentionId = mentionId;
            },
            false,
            "mentions/selectMention",
          ),

        // Computed getters
        getMention: (mentionId) => {
          return get().mentions.get(mentionId);
        },

        getMentionsByChannel: (channelId) => {
          const state = get();
          return Array.from(state.mentions.values())
            .filter((m) => m.message.channel_id === channelId)
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            );
        },

        getUnreadMentions: () => {
          const state = get();
          return Array.from(state.unreadMentionIds)
            .map((id) => state.mentions.get(id))
            .filter((m): m is Mention => m !== undefined)
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            );
        },

        getAllMentions: () => {
          const state = get();
          return Array.from(state.mentions.values()).sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );
        },

        getUnreadCount: () => {
          return get().unreadMentionIds.size;
        },

        // Utility
        reset: () =>
          set(
            () => ({
              ...initialState,
              mentions: new Map(),
              unreadMentionIds: new Set(),
              panel: { ...initialPanelState },
            }),
            false,
            "mentions/reset",
          ),
      })),
    ),
    { name: "mention-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectMentions = (state: MentionStore) =>
  Array.from(state.mentions.values());

export const selectUnreadMentions = (state: MentionStore) =>
  state.getUnreadMentions();

export const selectUnreadCount = (state: MentionStore) =>
  state.getUnreadCount();

export const selectMentionById = (mentionId: string) => (state: MentionStore) =>
  state.mentions.get(mentionId);

export const selectMentionsByChannel =
  (channelId: string) => (state: MentionStore) =>
    state.getMentionsByChannel(channelId);

export const selectIsPanelOpen = (state: MentionStore) => state.panel.isOpen;

export const selectPanelFilter = (state: MentionStore) => state.panel.filter;

export const selectSelectedMentionId = (state: MentionStore) =>
  state.selectedMentionId;

export const selectIsLoading = (state: MentionStore) => state.isLoading;

export const selectError = (state: MentionStore) => state.error;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get the display text for a mention type
 */
export function getMentionTypeLabel(type: MentionType): string {
  switch (type) {
    case "user":
      return "Direct mention";
    case "channel":
      return "@channel";
    case "everyone":
      return "@everyone";
    case "here":
      return "@here";
    default:
      return "Mention";
  }
}

/**
 * Get the icon/symbol for a mention type
 */
export function getMentionTypeIcon(type: MentionType): string {
  switch (type) {
    case "user":
      return "@";
    case "channel":
      return "#";
    case "everyone":
      return "@";
    case "here":
      return "@";
    default:
      return "@";
  }
}

/**
 * Check if a mention type is a group mention (affects multiple users)
 */
export function isGroupMention(type: MentionType): boolean {
  return type === "channel" || type === "everyone" || type === "here";
}

/**
 * Extract preview text from message content
 */
export function extractMentionPreview(
  content: string,
  maxLength: number = 100,
): string {
  // Remove extra whitespace
  const cleaned = content.replace(/\s+/g, " ").trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  // Truncate and add ellipsis
  return cleaned.substring(0, maxLength - 3) + "...";
}

/**
 * Normalize API mention response to store format
 */
export function normalizeMention(apiMention: any): Mention {
  return {
    id: apiMention.id,
    message_id: apiMention.message_id,
    user_id: apiMention.user_id,
    type: apiMention.type,
    is_read: apiMention.is_read ?? false,
    read_at: apiMention.read_at,
    created_at: apiMention.created_at,
    message: {
      id: apiMention.message.id,
      channel_id: apiMention.message.channel_id,
      user_id: apiMention.message.user_id,
      content: apiMention.message.content,
      type: apiMention.message.type,
      is_edited: apiMention.message.is_edited,
      is_pinned: apiMention.message.is_pinned,
      is_deleted: apiMention.message.is_deleted,
      created_at: apiMention.message.created_at,
      edited_at: apiMention.message.edited_at,
      user: {
        id: apiMention.message.user.id,
        username: apiMention.message.user.username,
        display_name: apiMention.message.user.display_name,
        avatar_url: apiMention.message.user.avatar_url,
      },
      channel: {
        id: apiMention.message.channel.id,
        name: apiMention.message.channel.name,
        slug: apiMention.message.channel.slug,
        description: apiMention.message.channel.description,
        type: apiMention.message.channel.type,
        is_private: apiMention.message.channel.is_private,
        is_archived: apiMention.message.channel.is_archived,
        is_default: apiMention.message.channel.is_default,
      },
    },
  };
}
