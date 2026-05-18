/**
 * Zustand Store for Scheduled Messages
 *
 * Manages the state of scheduled messages in the application.
 * Provides actions for creating, updating, cancelling, and sending scheduled messages.
 *
 * @example
 * ```tsx
 * import { useScheduledStore } from '@/lib/scheduled/scheduled-store'
 *
 * function ScheduledList() {
 *   const { messages, isLoading } = useScheduledStore()
 *   // ...
 * }
 * ```
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import type { ScheduledMessage } from "@/graphql/scheduled";

// ============================================================================
// Types
// ============================================================================

export interface ScheduledMessageDraft {
  channelId: string;
  content: string;
  scheduledAt: Date;
  timezone: string;
  type?: "text" | "image" | "file" | "video" | "audio" | "code";
  metadata?: Record<string, unknown>;
}

export interface ScheduledMessagesState {
  // Data
  messages: ScheduledMessage[];
  messagesById: Record<string, ScheduledMessage>;
  messagesByChannel: Record<string, ScheduledMessage[]>;

  // UI State
  isLoading: boolean;
  error: string | null;
  selectedMessageId: string | null;
  isModalOpen: boolean;
  editingMessage: ScheduledMessage | null;

  // Draft for new scheduled message
  draft: ScheduledMessageDraft | null;

  // Actions - Data Management
  setMessages: (messages: ScheduledMessage[]) => void;
  addMessage: (message: ScheduledMessage) => void;
  updateMessage: (id: string, updates: Partial<ScheduledMessage>) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;

  // Actions - UI
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  selectMessage: (id: string | null) => void;
  openModal: (channelId?: string, content?: string) => void;
  closeModal: () => void;
  setEditingMessage: (message: ScheduledMessage | null) => void;

  // Actions - Draft
  setDraft: (draft: ScheduledMessageDraft | null) => void;
  updateDraft: (updates: Partial<ScheduledMessageDraft>) => void;
  clearDraft: () => void;

  // Selectors
  getMessageById: (id: string) => ScheduledMessage | undefined;
  getMessagesForChannel: (channelId: string) => ScheduledMessage[];
  getPendingCount: () => number;
  getNextScheduled: () => ScheduledMessage | undefined;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useScheduledStore = create<ScheduledMessagesState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Initial State
      messages: [],
      messagesById: {},
      messagesByChannel: {},
      isLoading: false,
      error: null,
      selectedMessageId: null,
      isModalOpen: false,
      editingMessage: null,
      draft: null,

      // Actions - Data Management
      setMessages: (messages) => {
        const messagesById: Record<string, ScheduledMessage> = {};
        const messagesByChannel: Record<string, ScheduledMessage[]> = {};

        for (const msg of messages) {
          messagesById[msg.id] = msg;
          if (!messagesByChannel[msg.channel_id]) {
            messagesByChannel[msg.channel_id] = [];
          }
          messagesByChannel[msg.channel_id].push(msg);
        }

        // Sort messages by scheduled_at within each channel
        for (const channelId of Object.keys(messagesByChannel)) {
          messagesByChannel[channelId].sort(
            (a, b) =>
              new Date(a.scheduled_at).getTime() -
              new Date(b.scheduled_at).getTime(),
          );
        }

        set({
          messages: messages.sort(
            (a, b) =>
              new Date(a.scheduled_at).getTime() -
              new Date(b.scheduled_at).getTime(),
          ),
          messagesById,
          messagesByChannel,
        });
      },

      addMessage: (message) => {
        set((state) => {
          const newMessages = [...state.messages, message].sort(
            (a, b) =>
              new Date(a.scheduled_at).getTime() -
              new Date(b.scheduled_at).getTime(),
          );

          const newMessagesById = {
            ...state.messagesById,
            [message.id]: message,
          };

          const channelMessages =
            state.messagesByChannel[message.channel_id] || [];
          const newMessagesByChannel = {
            ...state.messagesByChannel,
            [message.channel_id]: [...channelMessages, message].sort(
              (a, b) =>
                new Date(a.scheduled_at).getTime() -
                new Date(b.scheduled_at).getTime(),
            ),
          };

          return {
            messages: newMessages,
            messagesById: newMessagesById,
            messagesByChannel: newMessagesByChannel,
          };
        });
      },

      updateMessage: (id, updates) => {
        set((state) => {
          const existingMessage = state.messagesById[id];
          if (!existingMessage) return state;

          const updatedMessage = { ...existingMessage, ...updates };
          const newMessagesById = {
            ...state.messagesById,
            [id]: updatedMessage,
          };

          const newMessages = state.messages
            .map((msg) => (msg.id === id ? updatedMessage : msg))
            .sort(
              (a, b) =>
                new Date(a.scheduled_at).getTime() -
                new Date(b.scheduled_at).getTime(),
            );

          // Update channel grouping
          const newMessagesByChannel = { ...state.messagesByChannel };
          const channelId = updatedMessage.channel_id;

          if (newMessagesByChannel[channelId]) {
            newMessagesByChannel[channelId] = newMessagesByChannel[channelId]
              .map((msg) => (msg.id === id ? updatedMessage : msg))
              .sort(
                (a, b) =>
                  new Date(a.scheduled_at).getTime() -
                  new Date(b.scheduled_at).getTime(),
              );
          }

          return {
            messages: newMessages,
            messagesById: newMessagesById,
            messagesByChannel: newMessagesByChannel,
          };
        });
      },

      removeMessage: (id) => {
        set((state) => {
          const message = state.messagesById[id];
          if (!message) return state;

          const { [id]: removed, ...newMessagesById } = state.messagesById;
          const newMessages = state.messages.filter((msg) => msg.id !== id);

          const newMessagesByChannel = { ...state.messagesByChannel };
          if (newMessagesByChannel[message.channel_id]) {
            newMessagesByChannel[message.channel_id] = newMessagesByChannel[
              message.channel_id
            ].filter((msg) => msg.id !== id);
          }

          return {
            messages: newMessages,
            messagesById: newMessagesById,
            messagesByChannel: newMessagesByChannel,
            selectedMessageId:
              state.selectedMessageId === id ? null : state.selectedMessageId,
          };
        });
      },

      clearMessages: () => {
        set({
          messages: [],
          messagesById: {},
          messagesByChannel: {},
        });
      },

      // Actions - UI
      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      selectMessage: (id) => set({ selectedMessageId: id }),

      openModal: (channelId, content) => {
        const draft: ScheduledMessageDraft | null = channelId
          ? {
              channelId,
              content: content || "",
              scheduledAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              type: "text",
            }
          : null;

        set({
          isModalOpen: true,
          draft,
          editingMessage: null,
        });
      },

      closeModal: () => {
        set({
          isModalOpen: false,
          draft: null,
          editingMessage: null,
        });
      },

      setEditingMessage: (message) => {
        if (message) {
          set({
            editingMessage: message,
            isModalOpen: true,
            draft: {
              channelId: message.channel_id,
              content: message.content,
              scheduledAt: new Date(message.scheduled_at),
              timezone: message.timezone,
              type: message.type as ScheduledMessageDraft["type"],
              metadata: message.metadata,
            },
          });
        } else {
          set({
            editingMessage: null,
          });
        }
      },

      // Actions - Draft
      setDraft: (draft) => set({ draft }),

      updateDraft: (updates) => {
        set((state) => ({
          draft: state.draft ? { ...state.draft, ...updates } : null,
        }));
      },

      clearDraft: () => set({ draft: null }),

      // Selectors
      getMessageById: (id) => get().messagesById[id],

      getMessagesForChannel: (channelId) =>
        get().messagesByChannel[channelId] || [],

      getPendingCount: () =>
        get().messages.filter((msg) => msg.status === "pending").length,

      getNextScheduled: () => {
        const pending = get().messages.filter(
          (msg) => msg.status === "pending",
        );
        if (pending.length === 0) return undefined;
        return pending[0]; // Already sorted by scheduled_at
      },
    })),
    { name: "scheduled-messages" },
  ),
);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the user's current timezone
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Format a timezone offset string (e.g., "GMT-8")
 */
export function formatTimezoneOffset(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "short",
  });
  const parts = formatter.formatToParts(now);
  const timeZonePart = parts.find((p) => p.type === "timeZoneName");
  return timeZonePart?.value || timezone;
}

/**
 * Get common timezone options
 */
export function getCommonTimezones(): { value: string; label: string }[] {
  return [
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "America/Anchorage", label: "Alaska Time (AKT)" },
    { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
    { value: "Europe/London", label: "London (GMT/BST)" },
    { value: "Europe/Paris", label: "Paris (CET/CEST)" },
    { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)" },
    { value: "Asia/Shanghai", label: "Shanghai (CST)" },
    { value: "Asia/Singapore", label: "Singapore (SGT)" },
    { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
    { value: "UTC", label: "UTC" },
  ];
}

/**
 * Check if a scheduled time is in the past
 */
export function isScheduledInPast(scheduledAt: Date | string): boolean {
  const scheduled = new Date(scheduledAt);
  return scheduled.getTime() < Date.now();
}

/**
 * Get the default scheduled time (1 hour from now, rounded to next 15 min)
 */
export function getDefaultScheduledTime(): Date {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 15) * 15;
  now.setMinutes(roundedMinutes, 0, 0);
  now.setHours(now.getHours() + 1);
  return now;
}
