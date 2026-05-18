/**
 * Message Edit History Manager
 *
 * Central manager for handling message edit history operations.
 * Coordinates between storage, permissions, and UI updates.
 */

import { create } from "zustand";
import type {
  MessageEditHistory,
  MessageVersion,
  EditHistorySettings,
  VersionDiff,
  AdminHistoryFilters,
  AdminHistoryItem,
  HistoryEvent,
  HistoryEventType,
} from "./history-types";

import {
  loadHistorySettings,
  saveHistorySettings,
  getCachedHistory,
  cacheHistory,
  invalidateHistoryCache,
  createInitialHistory,
  addVersionToHistory,
  restoreVersion,
  clearHistory,
  applyRetentionPolicy,
  getOriginalVersion,
  getCurrentVersion,
  getVersion,
} from "./history-storage";
import { calculateVersionDiff } from "./history-diff";
import {
  canViewHistoryWithSettings,
  canRestoreVersion,
  canClearHistory,
  getHistoryPermissions,
} from "./history-permissions";
import type { MessageUser } from "@/types/message";
import type { UserRole } from "@/lib/auth/roles";
import { DEFAULT_EDIT_HISTORY_SETTINGS } from "./history-types";

import { logger } from "@/lib/logger";

// ============================================================================
// Store State
// ============================================================================

interface EditHistoryState {
  // Current user context
  currentUserId: string | null;
  currentUserRole: UserRole | null;

  // Settings
  settings: EditHistorySettings;

  // Active history being viewed
  activeMessageId: string | null;
  activeHistory: MessageEditHistory | null;

  // Selected versions for comparison
  selectedVersions: {
    left: MessageVersion | null;
    right: MessageVersion | null;
  };

  // UI state
  isModalOpen: boolean;
  isLoading: boolean;
  error: string | null;

  // Event listeners
  eventListeners: Array<(event: HistoryEvent) => void>;
}

interface EditHistoryActions {
  // User context
  setCurrentUser: (userId: string, role: UserRole) => void;
  clearCurrentUser: () => void;

  // Settings
  loadSettings: () => void;
  updateSettings: (updates: Partial<EditHistorySettings>) => void;

  // History operations
  loadHistory: (messageId: string) => Promise<MessageEditHistory | null>;
  recordEdit: (
    messageId: string,
    channelId: string,
    oldContent: string,
    newContent: string,
    author: MessageUser,
    editor: MessageUser,
  ) => MessageEditHistory;
  restoreToVersion: (
    history: MessageEditHistory,
    versionNumber: number,
    restoredBy: MessageUser,
  ) => MessageEditHistory | null;
  clearMessageHistory: (messageId: string, keepOriginal?: boolean) => void;

  // UI operations
  openHistoryModal: (messageId: string) => Promise<void>;
  closeHistoryModal: () => void;
  selectVersionsForComparison: (
    left: MessageVersion | null,
    right: MessageVersion | null,
  ) => void;
  clearVersionSelection: () => void;

  // Diff operations
  getVersionDiff: (
    history: MessageEditHistory,
    fromVersion: number,
    toVersion: number,
  ) => VersionDiff | null;

  // Permission checks
  canViewHistory: (messageAuthorId: string) => boolean;
  canRestore: (messageAuthorId: string) => boolean;
  canClear: () => boolean;

  // Events
  addEventListener: (listener: (event: HistoryEvent) => void) => () => void;
  emitEvent: (event: HistoryEvent) => void;

  // Reset
  reset: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

const initialState: EditHistoryState = {
  currentUserId: null,
  currentUserRole: null,
  settings: DEFAULT_EDIT_HISTORY_SETTINGS,
  activeMessageId: null,
  activeHistory: null,
  selectedVersions: {
    left: null,
    right: null,
  },
  isModalOpen: false,
  isLoading: false,
  error: null,
  eventListeners: [],
};

export const useEditHistoryStore = create<
  EditHistoryState & EditHistoryActions
>((set, get) => ({
  ...initialState,

  // ============================================================================
  // User Context
  // ============================================================================

  setCurrentUser: (userId, role) => {
    set({ currentUserId: userId, currentUserRole: role });
  },

  clearCurrentUser: () => {
    set({ currentUserId: null, currentUserRole: null });
  },

  // ============================================================================
  // Settings
  // ============================================================================

  loadSettings: () => {
    const settings = loadHistorySettings();
    set({ settings });
  },

  updateSettings: (updates) => {
    const { settings } = get();
    const newSettings = { ...settings, ...updates };
    saveHistorySettings(newSettings);
    set({ settings: newSettings });
  },

  // ============================================================================
  // History Operations
  // ============================================================================

  loadHistory: async (messageId) => {
    set({ isLoading: true, error: null });

    try {
      // Try cache first
      const cached = getCachedHistory(messageId);
      if (cached) {
        set({ isLoading: false });
        return cached;
      }

      // For now, return null (no history)
      set({ isLoading: false });
      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load history";
      set({ isLoading: false, error: errorMessage });
      return null;
    }
  },

  recordEdit: (
    messageId,
    channelId,
    oldContent,
    newContent,
    author,
    editor,
  ) => {
    const { settings, emitEvent } = get();

    // Get or create history
    let history = getCachedHistory(messageId);

    if (!history) {
      // Create new history with original content
      history = createInitialHistory(messageId, channelId, oldContent, author);
    }

    // Add new version
    const updatedHistory = addVersionToHistory(history, newContent, editor);

    // Apply retention policy
    const finalHistory = applyRetentionPolicy(updatedHistory, settings);

    // Cache the updated history
    cacheHistory(finalHistory);

    // Emit event
    emitEvent({
      type: "version-created",
      messageId,
      timestamp: new Date(),
      actor: editor,
      data: {
        versionNumber: finalHistory.versions.length,
      },
    });

    return finalHistory;
  },

  restoreToVersion: (history, versionNumber, restoredBy) => {
    const { settings, emitEvent } = get();

    // Check permissions
    if (
      !canRestoreVersion(
        settings,
        (restoredBy.role as UserRole) ?? "member",
        restoredBy.id,
        history.author.id,
      )
    ) {
      return null;
    }

    const restoredHistory = restoreVersion(history, versionNumber, restoredBy);
    if (!restoredHistory) return null;

    // Cache updated history
    cacheHistory(restoredHistory);

    // Emit event
    emitEvent({
      type: "version-restored",
      messageId: history.messageId,
      timestamp: new Date(),
      actor: restoredBy,
      data: {
        restoredVersion: versionNumber,
        newVersion: restoredHistory.versions.length,
      },
    });

    // Update active history if viewing
    const { activeMessageId } = get();
    if (activeMessageId === history.messageId) {
      set({ activeHistory: restoredHistory });
    }

    return restoredHistory;
  },

  clearMessageHistory: (messageId, keepOriginal = true) => {
    const { settings, currentUserRole, emitEvent, currentUserId } = get();

    // Check permissions
    if (!currentUserRole || !canClearHistory(settings, currentUserRole)) {
      return;
    }

    const history = getCachedHistory(messageId);
    if (!history) return;

    const clearedHistory = clearHistory(history, keepOriginal);
    cacheHistory(clearedHistory);

    // Emit event
    emitEvent({
      type: "history-cleared",
      messageId,
      timestamp: new Date(),
      actor: {
        id: currentUserId ?? "unknown",
        username: "unknown",
        displayName: "Unknown",
        role: currentUserRole,
      },
      data: { keepOriginal },
    });

    // Update active history if viewing
    const { activeMessageId } = get();
    if (activeMessageId === messageId) {
      set({ activeHistory: clearedHistory });
    }
  },

  // ============================================================================
  // UI Operations
  // ============================================================================

  openHistoryModal: async (messageId) => {
    set({ isModalOpen: true, activeMessageId: messageId, isLoading: true });

    const history = await get().loadHistory(messageId);
    set({ activeHistory: history, isLoading: false });

    // Auto-select first and last versions for comparison if available
    if (history && history.versions.length >= 2) {
      const original = getOriginalVersion(history);
      const current = getCurrentVersion(history);
      set({
        selectedVersions: {
          left: original,
          right: current,
        },
      });
    }
  },

  closeHistoryModal: () => {
    set({
      isModalOpen: false,
      activeMessageId: null,
      activeHistory: null,
      selectedVersions: { left: null, right: null },
      error: null,
    });
  },

  selectVersionsForComparison: (left, right) => {
    set({ selectedVersions: { left, right } });
  },

  clearVersionSelection: () => {
    set({ selectedVersions: { left: null, right: null } });
  },

  // ============================================================================
  // Diff Operations
  // ============================================================================

  getVersionDiff: (history, fromVersion, toVersion) => {
    const from = getVersion(history, fromVersion);
    const to = getVersion(history, toVersion);

    if (!from || !to) return null;

    return calculateVersionDiff(from, to);
  },

  // ============================================================================
  // Permission Checks
  // ============================================================================

  canViewHistory: (messageAuthorId) => {
    const { settings, currentUserRole, currentUserId } = get();
    if (!currentUserRole || !currentUserId) return false;

    return canViewHistoryWithSettings(
      settings,
      currentUserRole,
      currentUserId,
      messageAuthorId,
    );
  },

  canRestore: (messageAuthorId) => {
    const { settings, currentUserRole, currentUserId } = get();
    if (!currentUserRole || !currentUserId) return false;

    return canRestoreVersion(
      settings,
      currentUserRole,
      currentUserId,
      messageAuthorId,
    );
  },

  canClear: () => {
    const { settings, currentUserRole } = get();
    if (!currentUserRole) return false;

    return canClearHistory(settings, currentUserRole);
  },

  // ============================================================================
  // Events
  // ============================================================================

  addEventListener: (listener) => {
    set((state) => ({
      eventListeners: [...state.eventListeners, listener],
    }));

    // Return unsubscribe function
    return () => {
      set((state) => ({
        eventListeners: state.eventListeners.filter((l) => l !== listener),
      }));
    };
  },

  emitEvent: (event) => {
    const { eventListeners } = get();
    eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        logger.error("Error in history event listener:", error);
      }
    });
  },

  // ============================================================================
  // Reset
  // ============================================================================

  reset: () => {
    set(initialState);
  },
}));

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Select the active history.
 */
export const useActiveHistory = () =>
  useEditHistoryStore((state) => state.activeHistory);

/**
 * Select the selected versions for comparison.
 */
export const useSelectedVersions = () =>
  useEditHistoryStore((state) => state.selectedVersions);

/**
 * Select the loading state.
 */
export const useHistoryLoading = () =>
  useEditHistoryStore((state) => state.isLoading);

/**
 * Select the modal open state.
 */
export const useHistoryModalOpen = () =>
  useEditHistoryStore((state) => state.isModalOpen);

/**
 * Select the settings.
 */
export const useHistorySettings = () =>
  useEditHistoryStore((state) => state.settings);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get edit history for admin view with filters.
 * This would typically fetch from server in production.
 */
export async function getAdminHistoryList(
  filters: AdminHistoryFilters,
): Promise<AdminHistoryItem[]> {
  // For now, return empty array
  return [];
}

/**
 * Export history data for a message.
 */
export function exportHistoryData(
  history: MessageEditHistory,
): Record<string, unknown> {
  return {
    messageId: history.messageId,
    channelId: history.channelId,
    author: {
      id: history.author.id,
      username: history.author.username,
      displayName: history.author.displayName,
    },
    createdAt: history.createdAt.toISOString(),
    editCount: history.editCount,
    versions: history.versions.map((v) => ({
      versionNumber: v.versionNumber,
      content: v.content,
      createdAt: v.createdAt.toISOString(),
      editedBy: {
        id: v.editedBy.id,
        username: v.editedBy.username,
        displayName: v.editedBy.displayName,
      },
      isOriginal: v.isOriginal,
      isCurrent: v.isCurrent,
    })),
  };
}

/**
 * Format history for display.
 */
export function formatHistoryForDisplay(history: MessageEditHistory): {
  title: string;
  subtitle: string;
  versionCount: number;
  hasMultipleEditors: boolean;
} {
  const uniqueEditors = new Set(history.versions.map((v) => v.editedBy.id));

  return {
    title: `Edit History (${history.editCount} edit${history.editCount !== 1 ? "s" : ""})`,
    subtitle: history.lastEditedAt
      ? `Last edited ${history.lastEditedAt.toLocaleString()}`
      : "Never edited",
    versionCount: history.versions.length,
    hasMultipleEditors: uniqueEditors.size > 1,
  };
}
