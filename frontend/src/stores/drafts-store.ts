/**
 * Drafts Store - Enhanced Zustand store for draft management
 *
 * Integrates with the draft manager for comprehensive draft functionality
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  Draft,
  DraftContextType,
  DraftMetadata,
  DraftAttachment,
  DraftMention,
  DraftReplyPreview,
  AutoSaveStatus,
  DraftFilterOptions,
  DraftSortOptions,
} from "@/lib/drafts/draft-types";
import {
  getDraftManager,
  createContextKey,
  hasDraftContent,
  getDraftPreview,
} from "@/lib/drafts";

// ============================================================================
// Types
// ============================================================================

export interface DraftsState {
  // Draft data
  drafts: Map<string, Draft>;
  draftMetadata: DraftMetadata[];

  // Active draft
  activeDraftKey: string | null;

  // Auto-save state
  autoSaveStatus: AutoSaveStatus;
  lastAutoSaveTime: number | null;
  autoSaveError: string | null;

  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Configuration
  autoSaveEnabled: boolean;
  autoSaveDebounceMs: number;
}

export interface DraftsActions {
  // Initialization
  initialize: () => Promise<void>;

  // Draft CRUD
  saveDraft: (
    contextType: DraftContextType,
    contextId: string,
    content: string,
    options?: {
      contentHtml?: string;
      replyToMessageId?: string | null;
      replyToPreview?: DraftReplyPreview;
      attachments?: DraftAttachment[];
      mentions?: DraftMention[];
    },
  ) => Promise<Draft>;

  scheduleAutoSave: (
    contextType: DraftContextType,
    contextId: string,
    content: string,
    options?: {
      contentHtml?: string;
      replyToMessageId?: string | null;
      replyToPreview?: DraftReplyPreview;
      attachments?: DraftAttachment[];
      mentions?: DraftMention[];
    },
  ) => void;

  getDraft: (contextKey: string) => Draft | undefined;
  getDraftByContext: (type: DraftContextType, id: string) => Draft | undefined;

  deleteDraft: (contextKey: string) => Promise<boolean>;
  deleteByContext: (type: DraftContextType, id: string) => Promise<boolean>;
  clearAllDrafts: () => Promise<void>;

  // Draft restoration
  restoreDraft: (contextKey: string) => Promise<Draft | null>;

  // Active draft
  setActiveDraftKey: (key: string | null) => void;

  // Query
  getDraftCount: () => number;
  hasDraft: (contextKey: string) => boolean;
  hasDraftForContext: (type: DraftContextType, id: string) => boolean;
  getFilteredDrafts: (options: DraftFilterOptions) => Draft[];
  getSortedDrafts: (options: DraftSortOptions) => Draft[];

  // Auto-save
  setAutoSaveEnabled: (enabled: boolean) => void;
  setAutoSaveDebounce: (ms: number) => void;
  updateAutoSaveStatus: (status: AutoSaveStatus, error?: string | null) => void;

  // Refresh
  refreshDrafts: () => Promise<void>;

  // Utility
  reset: () => void;
}

export type DraftsStore = DraftsState & DraftsActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: DraftsState = {
  drafts: new Map(),
  draftMetadata: [],
  activeDraftKey: null,
  autoSaveStatus: "idle",
  lastAutoSaveTime: null,
  autoSaveError: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  autoSaveEnabled: true,
  autoSaveDebounceMs: 500,
};

// ============================================================================
// Store
// ============================================================================

export const useDraftsStore = create<DraftsStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // ========================================================================
        // Initialization
        // ========================================================================

        initialize: async () => {
          if (get().isInitialized) return;

          set(
            (state) => {
              state.isLoading = true;
              state.error = null;
            },
            false,
            "drafts/initialize/start",
          );

          try {
            const manager = getDraftManager();

            // Load all drafts
            const drafts = await manager.getAllWithContent();
            const metadata = await manager.getDraftMetadata();

            // Subscribe to draft events
            manager.addEventListener((event) => {
              const store = get();

              switch (event.type) {
                case "created":
                case "updated":
                  if (event.draft) {
                    set(
                      (state) => {
                        state.drafts.set(event.contextKey!, event.draft!);
                      },
                      false,
                      `drafts/${event.type}`,
                    );
                    // Refresh metadata
                    store.refreshDrafts();
                  }
                  break;

                case "deleted":
                  set(
                    (state) => {
                      state.drafts.delete(event.contextKey!);
                    },
                    false,
                    "drafts/deleted",
                  );
                  store.refreshDrafts();
                  break;

                case "cleared":
                  set(
                    (state) => {
                      state.drafts.clear();
                      state.draftMetadata = [];
                    },
                    false,
                    "drafts/cleared",
                  );
                  break;

                case "autosave_start":
                  set(
                    (state) => {
                      state.autoSaveStatus = "saving";
                    },
                    false,
                    "drafts/autosave/start",
                  );
                  break;

                case "autosave_complete":
                  set(
                    (state) => {
                      state.autoSaveStatus = "saved";
                      state.lastAutoSaveTime = event.timestamp;
                      state.autoSaveError = null;
                    },
                    false,
                    "drafts/autosave/complete",
                  );
                  break;

                case "autosave_error":
                  set(
                    (state) => {
                      state.autoSaveStatus = "error";
                      state.autoSaveError = event.error || "Save failed";
                    },
                    false,
                    "drafts/autosave/error",
                  );
                  break;
              }
            });

            set(
              (state) => {
                state.drafts = new Map(drafts.map((d) => [d.contextKey, d]));
                state.draftMetadata = metadata;
                state.isLoading = false;
                state.isInitialized = true;
              },
              false,
              "drafts/initialize/complete",
            );
          } catch (error) {
            set(
              (state) => {
                state.isLoading = false;
                state.error =
                  error instanceof Error
                    ? error.message
                    : "Failed to load drafts";
              },
              false,
              "drafts/initialize/error",
            );
          }
        },

        // ========================================================================
        // Draft CRUD
        // ========================================================================

        saveDraft: async (contextType, contextId, content, options) => {
          const manager = getDraftManager();
          const draft = await manager.save(
            contextType,
            contextId,
            content,
            options,
          );

          set(
            (state) => {
              state.drafts.set(draft.contextKey, draft);
            },
            false,
            "drafts/saveDraft",
          );

          // Refresh metadata
          get().refreshDrafts();

          return draft;
        },

        scheduleAutoSave: (contextType, contextId, content, options) => {
          const manager = getDraftManager();
          manager.scheduleAutoSave(contextType, contextId, content, options);
        },

        getDraft: (contextKey) => {
          return get().drafts.get(contextKey);
        },

        getDraftByContext: (type, id) => {
          return get().drafts.get(createContextKey(type, id));
        },

        deleteDraft: async (contextKey) => {
          const manager = getDraftManager();
          const success = await manager.delete(contextKey);

          if (success) {
            set(
              (state) => {
                state.drafts.delete(contextKey);
                if (state.activeDraftKey === contextKey) {
                  state.activeDraftKey = null;
                }
              },
              false,
              "drafts/deleteDraft",
            );

            get().refreshDrafts();
          }

          return success;
        },

        deleteByContext: async (type, id) => {
          return get().deleteDraft(createContextKey(type, id));
        },

        clearAllDrafts: async () => {
          const manager = getDraftManager();
          await manager.clearAll();

          set(
            (state) => {
              state.drafts.clear();
              state.draftMetadata = [];
              state.activeDraftKey = null;
            },
            false,
            "drafts/clearAll",
          );
        },

        // ========================================================================
        // Draft Restoration
        // ========================================================================

        restoreDraft: async (contextKey) => {
          const manager = getDraftManager();
          return await manager.restore(contextKey);
        },

        // ========================================================================
        // Active Draft
        // ========================================================================

        setActiveDraftKey: (key) => {
          set(
            (state) => {
              state.activeDraftKey = key;
            },
            false,
            "drafts/setActiveDraftKey",
          );
        },

        // ========================================================================
        // Query
        // ========================================================================

        getDraftCount: () => {
          const drafts = Array.from(get().drafts.values());
          return drafts.filter(hasDraftContent).length;
        },

        hasDraft: (contextKey) => {
          const draft = get().drafts.get(contextKey);
          return hasDraftContent(draft);
        },

        hasDraftForContext: (type, id) => {
          return get().hasDraft(createContextKey(type, id));
        },

        getFilteredDrafts: (options) => {
          let drafts = Array.from(get().drafts.values()).filter(
            hasDraftContent,
          );

          if (options.contextType) {
            drafts = drafts.filter(
              (d) => d.contextType === options.contextType,
            );
          }

          if (options.hasAttachments !== undefined) {
            drafts = drafts.filter((d) =>
              options.hasAttachments
                ? d.attachmentIds.length > 0 || (d.attachments?.length ?? 0) > 0
                : d.attachmentIds.length === 0 &&
                  (d.attachments?.length ?? 0) === 0,
            );
          }

          if (options.isReply !== undefined) {
            drafts = drafts.filter((d) =>
              options.isReply
                ? d.replyToMessageId !== null
                : d.replyToMessageId === null,
            );
          }

          if (options.modifiedAfter !== undefined) {
            drafts = drafts.filter(
              (d) => d.lastModified > options.modifiedAfter!,
            );
          }

          if (options.modifiedBefore !== undefined) {
            drafts = drafts.filter(
              (d) => d.lastModified < options.modifiedBefore!,
            );
          }

          if (options.searchTerm) {
            const term = options.searchTerm.toLowerCase();
            drafts = drafts.filter((d) =>
              d.content.toLowerCase().includes(term),
            );
          }

          return drafts;
        },

        getSortedDrafts: (options) => {
          const drafts = Array.from(get().drafts.values()).filter(
            hasDraftContent,
          );

          return [...drafts].sort((a, b) => {
            let comparison = 0;

            switch (options.field) {
              case "lastModified":
                comparison = a.lastModified - b.lastModified;
                break;
              case "createdAt":
                comparison = a.createdAt - b.createdAt;
                break;
              case "contextName":
                // Simple comparison by context key
                comparison = a.contextKey.localeCompare(b.contextKey);
                break;
            }

            return options.direction === "desc" ? -comparison : comparison;
          });
        },

        // ========================================================================
        // Auto-save
        // ========================================================================

        setAutoSaveEnabled: (enabled) => {
          const manager = getDraftManager();
          manager.configureAutoSave({ enabled });

          set(
            (state) => {
              state.autoSaveEnabled = enabled;
            },
            false,
            "drafts/setAutoSaveEnabled",
          );
        },

        setAutoSaveDebounce: (ms) => {
          const manager = getDraftManager();
          manager.configureAutoSave({ debounceMs: ms });

          set(
            (state) => {
              state.autoSaveDebounceMs = ms;
            },
            false,
            "drafts/setAutoSaveDebounce",
          );
        },

        updateAutoSaveStatus: (status, error = null) => {
          set(
            (state) => {
              state.autoSaveStatus = status;
              state.autoSaveError = error;
              if (status === "saved") {
                state.lastAutoSaveTime = Date.now();
              }
            },
            false,
            "drafts/updateAutoSaveStatus",
          );
        },

        // ========================================================================
        // Refresh
        // ========================================================================

        refreshDrafts: async () => {
          const manager = getDraftManager();
          const metadata = await manager.getDraftMetadata();

          set(
            (state) => {
              state.draftMetadata = metadata;
            },
            false,
            "drafts/refreshMetadata",
          );
        },

        // ========================================================================
        // Utility
        // ========================================================================

        reset: () => {
          set(
            () => ({
              ...initialState,
              drafts: new Map(),
            }),
            false,
            "drafts/reset",
          );
        },
      })),
    ),
    { name: "drafts-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

/**
 * Select all drafts as array
 */
export const selectDrafts = (state: DraftsStore) =>
  Array.from(state.drafts.values());

/**
 * Select drafts with content
 */
export const selectDraftsWithContent = (state: DraftsStore) =>
  Array.from(state.drafts.values()).filter(hasDraftContent);

/**
 * Select draft by context key
 */
export const selectDraft = (contextKey: string) => (state: DraftsStore) =>
  state.drafts.get(contextKey);

/**
 * Select draft by context type and ID
 */
export const selectDraftByContext =
  (type: DraftContextType, id: string) => (state: DraftsStore) =>
    state.drafts.get(createContextKey(type, id));

/**
 * Select draft count
 */
export const selectDraftCount = (state: DraftsStore) =>
  Array.from(state.drafts.values()).filter(hasDraftContent).length;

/**
 * Select if context has draft
 */
export const selectHasDraft = (contextKey: string) => (state: DraftsStore) =>
  hasDraftContent(state.drafts.get(contextKey));

/**
 * Select if context has draft by type and ID
 */
export const selectHasDraftForContext =
  (type: DraftContextType, id: string) => (state: DraftsStore) =>
    hasDraftContent(state.drafts.get(createContextKey(type, id)));

/**
 * Select active draft
 */
export const selectActiveDraft = (state: DraftsStore) =>
  state.activeDraftKey ? state.drafts.get(state.activeDraftKey) : undefined;

/**
 * Select draft metadata
 */
export const selectDraftMetadata = (state: DraftsStore) => state.draftMetadata;

/**
 * Select auto-save state
 */
export const selectAutoSaveState = (state: DraftsStore) => ({
  status: state.autoSaveStatus,
  lastSaveTime: state.lastAutoSaveTime,
  error: state.autoSaveError,
  enabled: state.autoSaveEnabled,
});

/**
 * Select drafts by context type
 */
export const selectDraftsByType =
  (type: DraftContextType) => (state: DraftsStore) =>
    Array.from(state.drafts.values()).filter(
      (d) => d.contextType === type && hasDraftContent(d),
    );

/**
 * Select channel drafts
 */
export const selectChannelDrafts = (state: DraftsStore) =>
  selectDraftsByType("channel")(state);

/**
 * Select thread drafts
 */
export const selectThreadDrafts = (state: DraftsStore) =>
  selectDraftsByType("thread")(state);

/**
 * Select DM drafts
 */
export const selectDMDrafts = (state: DraftsStore) =>
  selectDraftsByType("dm")(state);
