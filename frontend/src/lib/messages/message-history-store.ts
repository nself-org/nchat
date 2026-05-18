/**
 * Message Edit History Store
 *
 * Manages loading and caching of message edit history.
 * Uses Zustand for state management with localStorage persistence.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { MessageEditRecord } from "@/types/message";

// ============================================================================
// Types
// ============================================================================

export interface MessageHistoryEntry {
  /** Message ID */
  messageId: string;
  /** Edit history records */
  history: MessageEditRecord[];
  /** When the history was last fetched */
  fetchedAt: Date;
  /** Whether the history is currently being loaded */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
}

export interface MessageHistoryState {
  /** Map of message ID to history entry */
  histories: Record<string, MessageHistoryEntry>;

  /** Whether a specific message's history is loading */
  isLoading: (messageId: string) => boolean;

  /** Get history for a message */
  getHistory: (messageId: string) => MessageEditRecord[] | null;

  /** Get error for a message */
  getError: (messageId: string) => string | null;

  /** Set loading state for a message */
  setLoading: (messageId: string, isLoading: boolean) => void;

  /** Set history for a message */
  setHistory: (messageId: string, history: MessageEditRecord[]) => void;

  /** Set error for a message */
  setError: (messageId: string, error: string | null) => void;

  /** Add a single edit record to history */
  addEditRecord: (messageId: string, record: MessageEditRecord) => void;

  /** Clear history for a message */
  clearHistory: (messageId: string) => void;

  /** Clear all cached histories */
  clearAllHistories: () => void;

  /** Check if history is stale (older than maxAge) */
  isStale: (messageId: string, maxAgeMs?: number) => boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Default max age for cached history (5 minutes) */
const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;

/** Storage key for persistence */
const STORAGE_KEY = "nchat-message-history";

// ============================================================================
// Store
// ============================================================================

export const useMessageHistoryStore = create<MessageHistoryState>()(
  persist(
    (set, get) => ({
      histories: {},

      isLoading: (messageId: string) => {
        const entry = get().histories[messageId];
        return entry?.isLoading ?? false;
      },

      getHistory: (messageId: string) => {
        const entry = get().histories[messageId];
        return entry?.history ?? null;
      },

      getError: (messageId: string) => {
        const entry = get().histories[messageId];
        return entry?.error ?? null;
      },

      setLoading: (messageId: string, isLoading: boolean) => {
        set((state) => ({
          histories: {
            ...state.histories,
            [messageId]: {
              ...state.histories[messageId],
              messageId,
              history: state.histories[messageId]?.history ?? [],
              fetchedAt: state.histories[messageId]?.fetchedAt ?? new Date(),
              isLoading,
              error: isLoading
                ? null
                : (state.histories[messageId]?.error ?? null),
            },
          },
        }));
      },

      setHistory: (messageId: string, history: MessageEditRecord[]) => {
        set((state) => ({
          histories: {
            ...state.histories,
            [messageId]: {
              messageId,
              history,
              fetchedAt: new Date(),
              isLoading: false,
              error: null,
            },
          },
        }));
      },

      setError: (messageId: string, error: string | null) => {
        set((state) => ({
          histories: {
            ...state.histories,
            [messageId]: {
              ...state.histories[messageId],
              messageId,
              history: state.histories[messageId]?.history ?? [],
              fetchedAt: state.histories[messageId]?.fetchedAt ?? new Date(),
              isLoading: false,
              error,
            },
          },
        }));
      },

      addEditRecord: (messageId: string, record: MessageEditRecord) => {
        set((state) => {
          const existing = state.histories[messageId];
          const history = existing?.history ?? [];

          return {
            histories: {
              ...state.histories,
              [messageId]: {
                messageId,
                history: [record, ...history],
                fetchedAt: new Date(),
                isLoading: false,
                error: null,
              },
            },
          };
        });
      },

      clearHistory: (messageId: string) => {
        set((state) => {
          const { [messageId]: _, ...rest } = state.histories;
          return { histories: rest };
        });
      },

      clearAllHistories: () => {
        set({ histories: {} });
      },

      isStale: (messageId: string, maxAgeMs: number = DEFAULT_MAX_AGE_MS) => {
        const entry = get().histories[messageId];
        if (!entry?.fetchedAt) return true;

        const age = Date.now() - new Date(entry.fetchedAt).getTime();
        return age > maxAgeMs;
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist the history data, not loading/error states
        histories: Object.fromEntries(
          Object.entries(state.histories).map(([id, entry]) => [
            id,
            {
              messageId: entry.messageId,
              history: entry.history,
              fetchedAt: entry.fetchedAt,
              isLoading: false,
              error: null,
            },
          ]),
        ),
      }),
    },
  ),
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Load message edit history from the API
 * @param messageId - The message ID to load history for
 * @param fetchFn - Function to fetch the history from GraphQL
 */
export async function loadMessageHistory(
  messageId: string,
  fetchFn: () => Promise<MessageEditRecord[]>,
): Promise<MessageEditRecord[]> {
  const store = useMessageHistoryStore.getState();

  // Check if we have a fresh cached version
  if (!store.isStale(messageId)) {
    const cached = store.getHistory(messageId);
    if (cached) return cached;
  }

  // Set loading state
  store.setLoading(messageId, true);

  try {
    const history = await fetchFn();
    store.setHistory(messageId, history);
    return history;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load edit history";
    store.setError(messageId, errorMessage);
    throw error;
  }
}

/**
 * Preload history for multiple messages
 * @param messageIds - Array of message IDs to preload
 * @param fetchFn - Function to fetch histories in batch
 */
export async function preloadMessageHistories(
  messageIds: string[],
  fetchFn: (ids: string[]) => Promise<Record<string, MessageEditRecord[]>>,
): Promise<void> {
  const store = useMessageHistoryStore.getState();

  // Filter to only load stale or missing histories
  const idsToLoad = messageIds.filter((id) => store.isStale(id));

  if (idsToLoad.length === 0) return;

  // Set loading state for all
  idsToLoad.forEach((id) => store.setLoading(id, true));

  try {
    const histories = await fetchFn(idsToLoad);

    Object.entries(histories).forEach(([id, history]) => {
      store.setHistory(id, history);
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load edit histories";
    idsToLoad.forEach((id) => store.setError(id, errorMessage));
    throw error;
  }
}

/**
 * Subscribe to real-time edit events and update the store
 * @param messageId - The message ID to watch
 * @param record - The new edit record
 */
export function handleEditEvent(
  messageId: string,
  record: MessageEditRecord,
): void {
  const store = useMessageHistoryStore.getState();
  store.addEditRecord(messageId, record);
}

// ============================================================================
// Selectors
// ============================================================================

/**
 * Select history for a specific message
 */
export const selectMessageHistory =
  (messageId: string) => (state: MessageHistoryState) =>
    state.histories[messageId];

/**
 * Select loading state for a specific message
 */
export const selectHistoryLoading =
  (messageId: string) => (state: MessageHistoryState) =>
    state.histories[messageId]?.isLoading ?? false;

/**
 * Select error for a specific message
 */
export const selectHistoryError =
  (messageId: string) => (state: MessageHistoryState) =>
    state.histories[messageId]?.error ?? null;

/**
 * Select all message IDs with cached history
 */
export const selectCachedMessageIds = (state: MessageHistoryState) =>
  Object.keys(state.histories);

export default useMessageHistoryStore;
