/**
 * Draft Store - Manages message draft state for the nself-chat application
 *
 * Handles message drafts with localStorage persistence
 * Drafts are preserved across page refreshes and browser sessions
 */

import { create } from "zustand";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ============================================================================
// Types
// ============================================================================

export interface DraftAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  localUrl: string; // blob URL for preview
  file?: File; // Original file object (not persisted)
}

export interface MessageDraft {
  content: string;
  contentHtml?: string;
  replyToMessageId: string | null;
  replyToPreview?: {
    userId: string;
    userName: string;
    content: string;
  };
  attachmentIds: string[]; // References to attachment store
  mentions: Array<{
    type: "user" | "channel" | "everyone" | "here";
    id?: string;
    name: string;
  }>;
  selectionStart: number;
  selectionEnd: number;
  lastModified: number; // timestamp
}

export interface DraftState {
  // Drafts by context key (channel:{id}, thread:{id}, dm:{id})
  drafts: Record<string, MessageDraft>;

  // Currently focused draft
  activeDraftContext: string | null;

  // Attachments pending upload (in memory, not persisted)
  pendingAttachments: Record<string, DraftAttachment[]>;

  // Auto-save configuration
  autoSaveEnabled: boolean;
  autoSaveDebounce: number; // ms
}

export interface DraftActions {
  // Draft CRUD
  setDraft: (contextKey: string, draft: Partial<MessageDraft>) => void;
  getDraft: (contextKey: string) => MessageDraft | undefined;
  clearDraft: (contextKey: string) => void;
  clearAllDrafts: () => void;

  // Content shortcuts
  setDraftContent: (contextKey: string, content: string) => void;
  appendToDraft: (contextKey: string, text: string) => void;

  // Reply management
  setReplyTo: (
    contextKey: string,
    messageId: string,
    preview: { userId: string; userName: string; content: string },
  ) => void;
  clearReplyTo: (contextKey: string) => void;

  // Mentions
  addMention: (
    contextKey: string,
    mention: {
      type: "user" | "channel" | "everyone" | "here";
      id?: string;
      name: string;
    },
  ) => void;
  clearMentions: (contextKey: string) => void;

  // Selection/cursor state
  setSelection: (contextKey: string, start: number, end: number) => void;

  // Attachments (in memory)
  addPendingAttachment: (
    contextKey: string,
    attachment: DraftAttachment,
  ) => void;
  removePendingAttachment: (contextKey: string, attachmentId: string) => void;
  clearPendingAttachments: (contextKey: string) => void;
  getPendingAttachments: (contextKey: string) => DraftAttachment[];

  // Active draft
  setActiveDraftContext: (contextKey: string | null) => void;

  // Configuration
  setAutoSaveEnabled: (enabled: boolean) => void;
  setAutoSaveDebounce: (debounce: number) => void;

  // Utility
  hasDraft: (contextKey: string) => boolean;
  getDraftCount: () => number;
  getOldDrafts: (olderThanMs: number) => string[];
  cleanupOldDrafts: (olderThanMs: number) => void;
  reset: () => void;
}

export type DraftStore = DraftState & DraftActions;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a context key for a channel draft
 */
export const getChannelDraftKey = (channelId: string): string =>
  `channel:${channelId}`;

/**
 * Create a context key for a thread draft
 */
export const getThreadDraftKey = (threadId: string): string =>
  `thread:${threadId}`;

/**
 * Create a context key for a DM draft
 */
export const getDMDraftKey = (conversationId: string): string =>
  `dm:${conversationId}`;

/**
 * Create an empty draft
 */
const createEmptyDraft = (): MessageDraft => ({
  content: "",
  contentHtml: undefined,
  replyToMessageId: null,
  replyToPreview: undefined,
  attachmentIds: [],
  mentions: [],
  selectionStart: 0,
  selectionEnd: 0,
  lastModified: Date.now(),
});

// ============================================================================
// Initial State
// ============================================================================

const DEFAULT_AUTO_SAVE_DEBOUNCE = 500; // ms
const MAX_DRAFT_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

const initialState: DraftState = {
  drafts: {},
  activeDraftContext: null,
  pendingAttachments: {},
  autoSaveEnabled: true,
  autoSaveDebounce: DEFAULT_AUTO_SAVE_DEBOUNCE,
};

// ============================================================================
// Store
// ============================================================================

export const useDraftStore = create<DraftStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,

          // Draft CRUD
          setDraft: (contextKey, draft) =>
            set(
              (state) => {
                const existing = state.drafts[contextKey] || createEmptyDraft();
                state.drafts[contextKey] = {
                  ...existing,
                  ...draft,
                  lastModified: Date.now(),
                };
              },
              false,
              "draft/setDraft",
            ),

          getDraft: (contextKey) => get().drafts[contextKey],

          clearDraft: (contextKey) =>
            set(
              (state) => {
                delete state.drafts[contextKey];
                delete state.pendingAttachments[contextKey];
              },
              false,
              "draft/clearDraft",
            ),

          clearAllDrafts: () =>
            set(
              (state) => {
                state.drafts = {};
                state.pendingAttachments = {};
              },
              false,
              "draft/clearAllDrafts",
            ),

          // Content shortcuts
          setDraftContent: (contextKey, content) =>
            set(
              (state) => {
                if (!state.drafts[contextKey]) {
                  state.drafts[contextKey] = createEmptyDraft();
                }
                state.drafts[contextKey].content = content;
                state.drafts[contextKey].lastModified = Date.now();
              },
              false,
              "draft/setDraftContent",
            ),

          appendToDraft: (contextKey, text) =>
            set(
              (state) => {
                if (!state.drafts[contextKey]) {
                  state.drafts[contextKey] = createEmptyDraft();
                }
                state.drafts[contextKey].content += text;
                state.drafts[contextKey].lastModified = Date.now();
              },
              false,
              "draft/appendToDraft",
            ),

          // Reply management
          setReplyTo: (contextKey, messageId, preview) =>
            set(
              (state) => {
                if (!state.drafts[contextKey]) {
                  state.drafts[contextKey] = createEmptyDraft();
                }
                state.drafts[contextKey].replyToMessageId = messageId;
                state.drafts[contextKey].replyToPreview = preview;
                state.drafts[contextKey].lastModified = Date.now();
              },
              false,
              "draft/setReplyTo",
            ),

          clearReplyTo: (contextKey) =>
            set(
              (state) => {
                if (state.drafts[contextKey]) {
                  state.drafts[contextKey].replyToMessageId = null;
                  state.drafts[contextKey].replyToPreview = undefined;
                  state.drafts[contextKey].lastModified = Date.now();
                }
              },
              false,
              "draft/clearReplyTo",
            ),

          // Mentions
          addMention: (contextKey, mention) =>
            set(
              (state) => {
                if (!state.drafts[contextKey]) {
                  state.drafts[contextKey] = createEmptyDraft();
                }
                state.drafts[contextKey].mentions.push(mention);
                state.drafts[contextKey].lastModified = Date.now();
              },
              false,
              "draft/addMention",
            ),

          clearMentions: (contextKey) =>
            set(
              (state) => {
                if (state.drafts[contextKey]) {
                  state.drafts[contextKey].mentions = [];
                  state.drafts[contextKey].lastModified = Date.now();
                }
              },
              false,
              "draft/clearMentions",
            ),

          // Selection/cursor state
          setSelection: (contextKey, start, end) =>
            set(
              (state) => {
                if (!state.drafts[contextKey]) {
                  state.drafts[contextKey] = createEmptyDraft();
                }
                state.drafts[contextKey].selectionStart = start;
                state.drafts[contextKey].selectionEnd = end;
              },
              false,
              "draft/setSelection",
            ),

          // Attachments (in memory, not persisted)
          addPendingAttachment: (contextKey, attachment) =>
            set(
              (state) => {
                if (!state.pendingAttachments[contextKey]) {
                  state.pendingAttachments[contextKey] = [];
                }
                state.pendingAttachments[contextKey].push(attachment);
              },
              false,
              "draft/addPendingAttachment",
            ),

          removePendingAttachment: (contextKey, attachmentId) =>
            set(
              (state) => {
                if (state.pendingAttachments[contextKey]) {
                  state.pendingAttachments[contextKey] =
                    state.pendingAttachments[contextKey].filter(
                      (a) => a.id !== attachmentId,
                    );
                }
              },
              false,
              "draft/removePendingAttachment",
            ),

          clearPendingAttachments: (contextKey) =>
            set(
              (state) => {
                delete state.pendingAttachments[contextKey];
              },
              false,
              "draft/clearPendingAttachments",
            ),

          getPendingAttachments: (contextKey) =>
            get().pendingAttachments[contextKey] || [],

          // Active draft
          setActiveDraftContext: (contextKey) =>
            set(
              (state) => {
                state.activeDraftContext = contextKey;
              },
              false,
              "draft/setActiveDraftContext",
            ),

          // Configuration
          setAutoSaveEnabled: (enabled) =>
            set(
              (state) => {
                state.autoSaveEnabled = enabled;
              },
              false,
              "draft/setAutoSaveEnabled",
            ),

          setAutoSaveDebounce: (debounce) =>
            set(
              (state) => {
                state.autoSaveDebounce = debounce;
              },
              false,
              "draft/setAutoSaveDebounce",
            ),

          // Utility
          hasDraft: (contextKey) => {
            const draft = get().drafts[contextKey];
            if (!draft) return false;
            return (
              draft.content.trim().length > 0 ||
              draft.attachmentIds.length > 0 ||
              (get().pendingAttachments[contextKey]?.length ?? 0) > 0
            );
          },

          getDraftCount: () => Object.keys(get().drafts).length,

          getOldDrafts: (olderThanMs) => {
            const now = Date.now();
            const drafts = get().drafts;
            return Object.keys(drafts).filter(
              (key) => now - drafts[key].lastModified > olderThanMs,
            );
          },

          cleanupOldDrafts: (olderThanMs) =>
            set(
              (state) => {
                const now = Date.now();
                Object.keys(state.drafts).forEach((key) => {
                  if (now - state.drafts[key].lastModified > olderThanMs) {
                    delete state.drafts[key];
                    delete state.pendingAttachments[key];
                  }
                });
              },
              false,
              "draft/cleanupOldDrafts",
            ),

          reset: () =>
            set(
              () => ({
                ...initialState,
                drafts: {},
                pendingAttachments: {},
              }),
              false,
              "draft/reset",
            ),
        })),
      ),
      {
        name: "nchat-drafts",
        // Only persist drafts, not pending attachments (they contain File objects)
        partialize: (state) => ({
          drafts: state.drafts,
          autoSaveEnabled: state.autoSaveEnabled,
          autoSaveDebounce: state.autoSaveDebounce,
        }),
        // Clean up old drafts on rehydration
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.cleanupOldDrafts(MAX_DRAFT_AGE);
          }
        },
      },
    ),
    { name: "draft-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

/**
 * Select draft for a specific context
 */
export const selectDraft = (contextKey: string) => (state: DraftStore) =>
  state.drafts[contextKey];

/**
 * Select draft content for a specific context
 */
export const selectDraftContent = (contextKey: string) => (state: DraftStore) =>
  state.drafts[contextKey]?.content ?? "";

/**
 * Check if context has a non-empty draft
 */
export const selectHasDraft = (contextKey: string) => (state: DraftStore) => {
  const draft = state.drafts[contextKey];
  if (!draft) return false;
  return (
    draft.content.trim().length > 0 ||
    draft.attachmentIds.length > 0 ||
    (state.pendingAttachments[contextKey]?.length ?? 0) > 0
  );
};

/**
 * Select reply info for a draft
 */
export const selectDraftReply = (contextKey: string) => (state: DraftStore) => {
  const draft = state.drafts[contextKey];
  if (!draft?.replyToMessageId) return null;
  return {
    messageId: draft.replyToMessageId,
    preview: draft.replyToPreview,
  };
};

/**
 * Select pending attachments for a context
 */
export const selectPendingAttachments =
  (contextKey: string) => (state: DraftStore) =>
    state.pendingAttachments[contextKey] || [];

/**
 * Select all contexts that have drafts
 */
export const selectDraftContexts = (state: DraftStore) =>
  Object.keys(state.drafts).filter((key) => {
    const draft = state.drafts[key];
    return (
      draft.content.trim().length > 0 ||
      draft.attachmentIds.length > 0 ||
      (state.pendingAttachments[key]?.length ?? 0) > 0
    );
  });

/**
 * Select total draft count
 */
export const selectDraftCount = (state: DraftStore) => {
  return Object.keys(state.drafts).filter((key) => {
    const draft = state.drafts[key];
    return (
      draft.content.trim().length > 0 ||
      draft.attachmentIds.length > 0 ||
      (state.pendingAttachments[key]?.length ?? 0) > 0
    );
  }).length;
};

/**
 * Select the active draft context
 */
export const selectActiveDraftContext = (state: DraftStore) =>
  state.activeDraftContext;

/**
 * Select the active draft
 */
export const selectActiveDraft = (state: DraftStore) =>
  state.activeDraftContext ? state.drafts[state.activeDraftContext] : null;
