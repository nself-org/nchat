/**
 * Message Store - Manages all message-related state for the nself-chat application
 *
 * Handles messages, drafts, typing indicators, and message interactions
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  Message,
  MessageDraft,
  TypingUser,
  Reaction,
} from "@/types/message";

// ============================================================================
// Types
// ============================================================================

export interface EditingState {
  messageId: string;
  originalContent: string;
}

export interface ReplyingState {
  messageId: string;
  message: Message;
}

export interface MessageState {
  // Messages by channel
  messagesByChannel: Record<string, Message[]>;

  // Loading states
  loadingChannels: Set<string>;
  hasMoreByChannel: Record<string, boolean>;

  // Current input state
  currentChannelId: string | null;
  editingMessage: EditingState | null;
  replyingTo: ReplyingState | null;

  // Drafts
  drafts: Record<string, MessageDraft>; // keyed by channelId

  // Typing indicators
  typingUsers: Record<string, TypingUser[]>; // keyed by channelId

  // Unread tracking
  lastReadByChannel: Record<string, Date>;
  unreadCountByChannel: Record<string, number>;

  // Quick reactions
  recentEmojis: string[];
  quickReactions: string[];
}

export interface MessageActions {
  // Message operations
  setMessages: (channelId: string, messages: Message[]) => void;
  addMessage: (channelId: string, message: Message) => void;
  updateMessage: (
    channelId: string,
    messageId: string,
    updates: Partial<Message>,
  ) => void;
  removeMessage: (channelId: string, messageId: string) => void;
  prependMessages: (channelId: string, messages: Message[]) => void;

  // Loading
  setLoading: (channelId: string, loading: boolean) => void;
  setHasMore: (channelId: string, hasMore: boolean) => void;

  // Channel state
  setCurrentChannel: (channelId: string | null) => void;

  // Edit/Reply
  startEditing: (messageId: string, originalContent: string) => void;
  stopEditing: () => void;
  startReplying: (message: Message) => void;
  stopReplying: () => void;

  // Drafts
  saveDraft: (channelId: string, content: string, replyToId?: string) => void;
  clearDraft: (channelId: string) => void;
  getDraft: (channelId: string) => MessageDraft | undefined;

  // Typing
  setTypingUsers: (channelId: string, users: TypingUser[]) => void;
  addTypingUser: (channelId: string, user: TypingUser) => void;
  removeTypingUser: (channelId: string, userId: string) => void;

  // Unread
  markAsRead: (channelId: string) => void;
  setUnreadCount: (channelId: string, count: number) => void;

  // Reactions
  addReaction: (
    channelId: string,
    messageId: string,
    reaction: Reaction,
  ) => void;
  removeReaction: (
    channelId: string,
    messageId: string,
    emoji: string,
    userId: string,
  ) => void;
  updateRecentEmojis: (emoji: string) => void;

  // Utility
  clearChannel: (channelId: string) => void;
  reset: () => void;
}

export type MessageStore = MessageState & MessageActions;

// ============================================================================
// Initial State
// ============================================================================

const DEFAULT_QUICK_REACTIONS = [
  "thumbs_up",
  "heart",
  "smile",
  "tada",
  "thinking",
];

const initialState: MessageState = {
  messagesByChannel: {},
  loadingChannels: new Set(),
  hasMoreByChannel: {},
  currentChannelId: null,
  editingMessage: null,
  replyingTo: null,
  drafts: {},
  typingUsers: {},
  lastReadByChannel: {},
  unreadCountByChannel: {},
  recentEmojis: [],
  quickReactions: DEFAULT_QUICK_REACTIONS,
};

// ============================================================================
// Store
// ============================================================================

export const useMessageStore = create<MessageStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // Message operations
      setMessages: (channelId, messages) =>
        set(
          (state) => {
            state.messagesByChannel[channelId] = messages;
          },
          false,
          "messages/setMessages",
        ),

      addMessage: (channelId, message) =>
        set(
          (state) => {
            if (!state.messagesByChannel[channelId]) {
              state.messagesByChannel[channelId] = [];
            }
            state.messagesByChannel[channelId].push(message);
          },
          false,
          "messages/addMessage",
        ),

      updateMessage: (channelId, messageId, updates) =>
        set(
          (state) => {
            const messages = state.messagesByChannel[channelId];
            if (messages) {
              const index = messages.findIndex((m) => m.id === messageId);
              if (index !== -1) {
                Object.assign(messages[index], updates);
              }
            }
          },
          false,
          "messages/updateMessage",
        ),

      removeMessage: (channelId, messageId) =>
        set(
          (state) => {
            const messages = state.messagesByChannel[channelId];
            if (messages) {
              const index = messages.findIndex((m) => m.id === messageId);
              if (index !== -1) {
                messages.splice(index, 1);
              }
            }
          },
          false,
          "messages/removeMessage",
        ),

      prependMessages: (channelId, messages) =>
        set(
          (state) => {
            if (!state.messagesByChannel[channelId]) {
              state.messagesByChannel[channelId] = [];
            }
            state.messagesByChannel[channelId] = [
              ...messages,
              ...state.messagesByChannel[channelId],
            ];
          },
          false,
          "messages/prependMessages",
        ),

      // Loading
      setLoading: (channelId, loading) =>
        set(
          (state) => {
            if (loading) {
              state.loadingChannels.add(channelId);
            } else {
              state.loadingChannels.delete(channelId);
            }
          },
          false,
          "messages/setLoading",
        ),

      setHasMore: (channelId, hasMore) =>
        set(
          (state) => {
            state.hasMoreByChannel[channelId] = hasMore;
          },
          false,
          "messages/setHasMore",
        ),

      // Channel state
      setCurrentChannel: (channelId) =>
        set(
          (state) => {
            state.currentChannelId = channelId;
            // Clear editing/replying state when switching channels
            state.editingMessage = null;
            state.replyingTo = null;
          },
          false,
          "messages/setCurrentChannel",
        ),

      // Edit/Reply
      startEditing: (messageId, originalContent) =>
        set(
          (state) => {
            state.editingMessage = { messageId, originalContent };
            state.replyingTo = null; // Can't reply while editing
          },
          false,
          "messages/startEditing",
        ),

      stopEditing: () =>
        set(
          (state) => {
            state.editingMessage = null;
          },
          false,
          "messages/stopEditing",
        ),

      startReplying: (message) =>
        set(
          (state) => {
            state.replyingTo = { messageId: message.id, message };
            state.editingMessage = null; // Can't edit while replying
          },
          false,
          "messages/startReplying",
        ),

      stopReplying: () =>
        set(
          (state) => {
            state.replyingTo = null;
          },
          false,
          "messages/stopReplying",
        ),

      // Drafts
      saveDraft: (channelId, content, replyToId) =>
        set(
          (state) => {
            state.drafts[channelId] = {
              channelId,
              content,
              replyToId,
              savedAt: new Date(),
            };
          },
          false,
          "messages/saveDraft",
        ),

      clearDraft: (channelId) =>
        set(
          (state) => {
            delete state.drafts[channelId];
          },
          false,
          "messages/clearDraft",
        ),

      getDraft: (channelId) => get().drafts[channelId],

      // Typing
      setTypingUsers: (channelId, users) =>
        set(
          (state) => {
            state.typingUsers[channelId] = users;
          },
          false,
          "messages/setTypingUsers",
        ),

      addTypingUser: (channelId, user) =>
        set(
          (state) => {
            if (!state.typingUsers[channelId]) {
              state.typingUsers[channelId] = [];
            }
            // Don't add duplicates
            const existing = state.typingUsers[channelId].find(
              (u) => u.id === user.id,
            );
            if (!existing) {
              state.typingUsers[channelId].push(user);
            }
          },
          false,
          "messages/addTypingUser",
        ),

      removeTypingUser: (channelId, userId) =>
        set(
          (state) => {
            if (state.typingUsers[channelId]) {
              state.typingUsers[channelId] = state.typingUsers[
                channelId
              ].filter((u) => u.id !== userId);
            }
          },
          false,
          "messages/removeTypingUser",
        ),

      // Unread
      markAsRead: (channelId) =>
        set(
          (state) => {
            state.lastReadByChannel[channelId] = new Date();
            state.unreadCountByChannel[channelId] = 0;
          },
          false,
          "messages/markAsRead",
        ),

      setUnreadCount: (channelId, count) =>
        set(
          (state) => {
            state.unreadCountByChannel[channelId] = count;
          },
          false,
          "messages/setUnreadCount",
        ),

      // Reactions
      addReaction: (channelId, messageId, reaction) =>
        set(
          (state) => {
            const messages = state.messagesByChannel[channelId];
            if (messages) {
              const message = messages.find((m) => m.id === messageId);
              if (message) {
                if (!message.reactions) {
                  message.reactions = [];
                }
                const existing = message.reactions.find(
                  (r) => r.emoji === reaction.emoji,
                );
                if (existing) {
                  existing.count = reaction.count;
                  existing.users = reaction.users;
                  existing.hasReacted = reaction.hasReacted;
                } else {
                  message.reactions.push(reaction);
                }
              }
            }
          },
          false,
          "messages/addReaction",
        ),

      removeReaction: (channelId, messageId, emoji, userId) =>
        set(
          (state) => {
            const messages = state.messagesByChannel[channelId];
            if (messages) {
              const message = messages.find((m) => m.id === messageId);
              if (message && message.reactions) {
                const reactionIndex = message.reactions.findIndex(
                  (r) => r.emoji === emoji,
                );
                if (reactionIndex !== -1) {
                  const reaction = message.reactions[reactionIndex];
                  reaction.users = reaction.users.filter(
                    (u) => u.id !== userId,
                  );
                  reaction.count = reaction.users.length;
                  if (reaction.count === 0) {
                    message.reactions.splice(reactionIndex, 1);
                  }
                }
              }
            }
          },
          false,
          "messages/removeReaction",
        ),

      updateRecentEmojis: (emoji) =>
        set(
          (state) => {
            // Remove if already exists
            state.recentEmojis = state.recentEmojis.filter((e) => e !== emoji);
            // Add to beginning
            state.recentEmojis.unshift(emoji);
            // Keep only last 20
            if (state.recentEmojis.length > 20) {
              state.recentEmojis.pop();
            }
          },
          false,
          "messages/updateRecentEmojis",
        ),

      // Utility
      clearChannel: (channelId) =>
        set(
          (state) => {
            delete state.messagesByChannel[channelId];
            delete state.drafts[channelId];
            delete state.typingUsers[channelId];
            delete state.hasMoreByChannel[channelId];
            state.loadingChannels.delete(channelId);
          },
          false,
          "messages/clearChannel",
        ),

      reset: () => set(() => initialState, false, "messages/reset"),
    })),
    { name: "message-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectMessages = (channelId: string) => (state: MessageStore) =>
  state.messagesByChannel[channelId] ?? [];

export const selectIsLoading = (channelId: string) => (state: MessageStore) =>
  state.loadingChannels.has(channelId);

export const selectHasMore = (channelId: string) => (state: MessageStore) =>
  state.hasMoreByChannel[channelId] ?? true;

export const selectTypingUsers = (channelId: string) => (state: MessageStore) =>
  state.typingUsers[channelId] ?? [];

export const selectUnreadCount = (channelId: string) => (state: MessageStore) =>
  state.unreadCountByChannel[channelId] ?? 0;

export const selectIsEditing = (state: MessageStore) =>
  state.editingMessage !== null;

export const selectIsReplying = (state: MessageStore) =>
  state.replyingTo !== null;
