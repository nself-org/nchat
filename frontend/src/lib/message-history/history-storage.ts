/**
 * Message Edit History Storage
 *
 * Utilities for storing and retrieving message edit history.
 * Supports both local caching and server-side storage via GraphQL.
 */

import type {
  MessageVersion,
  MessageEditHistory,
  EditHistorySummary,
  EditHistorySettings,
} from "./history-types";

import { DEFAULT_EDIT_HISTORY_SETTINGS } from "./history-types";
import type { MessageUser } from "@/types/message";

import { logger } from "@/lib/logger";

// ============================================================================
// Local Storage Keys
// ============================================================================

const STORAGE_PREFIX = "nchat-edit-history";
const SETTINGS_KEY = `${STORAGE_PREFIX}-settings`;
const CACHE_KEY = `${STORAGE_PREFIX}-cache`;

// ============================================================================
// Settings Storage
// ============================================================================

/**
 * Load edit history settings from local storage.
 */
export function loadHistorySettings(): EditHistorySettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_EDIT_HISTORY_SETTINGS };
  }

  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_EDIT_HISTORY_SETTINGS, ...parsed };
    }
  } catch (error) {
    logger.error("Failed to load edit history settings:", error);
  }

  return { ...DEFAULT_EDIT_HISTORY_SETTINGS };
}

/**
 * Save edit history settings to local storage.
 */
export function saveHistorySettings(settings: EditHistorySettings): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    logger.error("Failed to save edit history settings:", error);
  }
}

/**
 * Update specific settings.
 */
export function updateHistorySettings(
  updates: Partial<EditHistorySettings>,
): EditHistorySettings {
  const current = loadHistorySettings();
  const updated = { ...current, ...updates };
  saveHistorySettings(updated);
  return updated;
}

// ============================================================================
// History Cache
// ============================================================================

interface HistoryCache {
  [messageId: string]: {
    history: MessageEditHistory;
    cachedAt: number;
  };
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load history cache from local storage.
 */
function loadHistoryCache(): HistoryCache {
  if (typeof window === "undefined") return {};

  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    logger.error("Failed to load history cache:", error);
  }

  return {};
}

/**
 * Save history cache to local storage.
 */
function saveHistoryCache(cache: HistoryCache): void {
  if (typeof window === "undefined") return;

  try {
    // Clean up expired entries before saving
    const now = Date.now();
    const cleaned: HistoryCache = {};
    for (const [id, entry] of Object.entries(cache)) {
      if (now - entry.cachedAt < CACHE_TTL) {
        cleaned[id] = entry;
      }
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cleaned));
  } catch (error) {
    logger.error("Failed to save history cache:", error);
  }
}

/**
 * Get cached history for a message.
 */
export function getCachedHistory(messageId: string): MessageEditHistory | null {
  const cache = loadHistoryCache();
  const entry = cache[messageId];

  if (!entry) return null;

  // Check if cache is still valid
  if (Date.now() - entry.cachedAt > CACHE_TTL) {
    // Remove expired entry
    delete cache[messageId];
    saveHistoryCache(cache);
    return null;
  }

  // Parse dates
  return {
    ...entry.history,
    createdAt: new Date(entry.history.createdAt),
    lastEditedAt: entry.history.lastEditedAt
      ? new Date(entry.history.lastEditedAt)
      : null,
    versions: entry.history.versions.map((v) => ({
      ...v,
      createdAt: new Date(v.createdAt),
    })),
  };
}

/**
 * Cache history for a message.
 */
export function cacheHistory(history: MessageEditHistory): void {
  const cache = loadHistoryCache();
  cache[history.messageId] = {
    history,
    cachedAt: Date.now(),
  };
  saveHistoryCache(cache);
}

/**
 * Invalidate cached history for a message.
 */
export function invalidateHistoryCache(messageId: string): void {
  const cache = loadHistoryCache();
  delete cache[messageId];
  saveHistoryCache(cache);
}

/**
 * Clear all history cache.
 */
export function clearHistoryCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CACHE_KEY);
}

// ============================================================================
// History Serialization
// ============================================================================

/**
 * Serialize history for storage/transmission.
 */
export function serializeHistory(
  history: MessageEditHistory,
): Record<string, unknown> {
  return {
    ...history,
    createdAt: history.createdAt.toISOString(),
    lastEditedAt: history.lastEditedAt?.toISOString() ?? null,
    versions: history.versions.map((v) => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
    })),
  };
}

/**
 * Deserialize history from storage/transmission.
 */
export function deserializeHistory(
  data: Record<string, unknown>,
): MessageEditHistory {
  const versions = (data.versions as Array<Record<string, unknown>>).map(
    (v) => ({
      ...v,
      createdAt: new Date(v.createdAt as string),
    }),
  ) as MessageVersion[];

  return {
    messageId: data.messageId as string,
    channelId: data.channelId as string,
    currentContent: data.currentContent as string,
    originalContent: data.originalContent as string,
    versions,
    editCount: data.editCount as number,
    author: data.author as MessageUser,
    createdAt: new Date(data.createdAt as string),
    lastEditedAt: data.lastEditedAt
      ? new Date(data.lastEditedAt as string)
      : null,
    lastEditedBy: (data.lastEditedBy as MessageUser) ?? null,
  };
}

// ============================================================================
// History Construction
// ============================================================================

/**
 * Create initial history for a new message.
 */
export function createInitialHistory(
  messageId: string,
  channelId: string,
  content: string,
  author: MessageUser,
): MessageEditHistory {
  const now = new Date();
  const originalVersion: MessageVersion = {
    id: `${messageId}-v1`,
    messageId,
    versionNumber: 1,
    content,
    createdAt: now,
    editedBy: author,
    isOriginal: true,
    isCurrent: true,
  };

  return {
    messageId,
    channelId,
    currentContent: content,
    originalContent: content,
    versions: [originalVersion],
    editCount: 0,
    author,
    createdAt: now,
    lastEditedAt: null,
    lastEditedBy: null,
  };
}

/**
 * Add a new version to history.
 */
export function addVersionToHistory(
  history: MessageEditHistory,
  newContent: string,
  editor: MessageUser,
): MessageEditHistory {
  const now = new Date();
  const newVersionNumber = history.versions.length + 1;

  // Mark previous current version as not current
  const updatedVersions = history.versions.map((v) => ({
    ...v,
    isCurrent: false,
  }));

  // Add new version
  const newVersion: MessageVersion = {
    id: `${history.messageId}-v${newVersionNumber}`,
    messageId: history.messageId,
    versionNumber: newVersionNumber,
    content: newContent,
    createdAt: now,
    editedBy: editor,
    isOriginal: false,
    isCurrent: true,
  };

  return {
    ...history,
    currentContent: newContent,
    versions: [...updatedVersions, newVersion],
    editCount: history.editCount + 1,
    lastEditedAt: now,
    lastEditedBy: editor,
  };
}

/**
 * Get edit summary from history.
 */
export function getEditSummary(
  history: MessageEditHistory | null,
): EditHistorySummary {
  if (!history) {
    return {
      isEdited: false,
      editCount: 0,
      lastEditedAt: null,
      lastEditedBy: null,
    };
  }

  return {
    isEdited: history.editCount > 0,
    editCount: history.editCount,
    lastEditedAt: history.lastEditedAt,
    lastEditedBy: history.lastEditedBy,
  };
}

// ============================================================================
// History Operations
// ============================================================================

/**
 * Get a specific version from history.
 */
export function getVersion(
  history: MessageEditHistory,
  versionNumber: number,
): MessageVersion | null {
  return (
    history.versions.find((v) => v.versionNumber === versionNumber) ?? null
  );
}

/**
 * Get the original version.
 */
export function getOriginalVersion(
  history: MessageEditHistory,
): MessageVersion | null {
  return (
    history.versions.find((v) => v.isOriginal) ?? history.versions[0] ?? null
  );
}

/**
 * Get the current version.
 */
export function getCurrentVersion(
  history: MessageEditHistory,
): MessageVersion | null {
  return (
    history.versions.find((v) => v.isCurrent) ??
    history.versions[history.versions.length - 1] ??
    null
  );
}

/**
 * Restore to a previous version (creates new version with old content).
 */
export function restoreVersion(
  history: MessageEditHistory,
  targetVersionNumber: number,
  restoredBy: MessageUser,
): MessageEditHistory | null {
  const targetVersion = getVersion(history, targetVersionNumber);
  if (!targetVersion) return null;

  // Add the restored content as a new version
  return addVersionToHistory(history, targetVersion.content, restoredBy);
}

/**
 * Clear all history except original.
 */
export function clearHistory(
  history: MessageEditHistory,
  keepOriginal: boolean = true,
): MessageEditHistory {
  if (keepOriginal) {
    const original = getOriginalVersion(history);
    if (original) {
      return {
        ...history,
        versions: [{ ...original, isCurrent: true }],
        editCount: 0,
        currentContent: original.content,
        lastEditedAt: null,
        lastEditedBy: null,
      };
    }
  }

  // Return empty history
  return {
    ...history,
    versions: [],
    editCount: 0,
    lastEditedAt: null,
    lastEditedBy: null,
  };
}

/**
 * Trim history to max versions.
 */
export function trimHistory(
  history: MessageEditHistory,
  maxVersions: number,
): MessageEditHistory {
  if (maxVersions <= 0 || history.versions.length <= maxVersions) {
    return history;
  }

  // Always keep the first (original) and last (current) versions
  // Remove versions from the middle
  const original = history.versions[0];
  const recent = history.versions.slice(-(maxVersions - 1));

  // Avoid duplicating the original if it's in the recent slice
  const versions =
    recent[0]?.id === original?.id
      ? recent
      : [original, ...recent.slice(-Math.max(1, maxVersions - 1))];

  // Renumber versions
  const renumbered = versions.map((v, idx) => ({
    ...v,
    versionNumber: idx + 1,
    isOriginal: idx === 0,
    isCurrent: idx === versions.length - 1,
  }));

  return {
    ...history,
    versions: renumbered,
    editCount: renumbered.length - 1,
  };
}

/**
 * Check if history should be trimmed based on retention settings.
 */
export function shouldTrimHistory(
  history: MessageEditHistory,
  settings: EditHistorySettings,
): boolean {
  if (!settings.retention.enabled) return false;
  if (settings.retention.maxVersionsPerMessage <= 0) return false;

  return history.versions.length > settings.retention.maxVersionsPerMessage;
}

/**
 * Apply retention policy to history.
 */
export function applyRetentionPolicy(
  history: MessageEditHistory,
  settings: EditHistorySettings,
): MessageEditHistory {
  let result = history;

  // Trim by max versions
  if (
    settings.retention.maxVersionsPerMessage > 0 &&
    result.versions.length > settings.retention.maxVersionsPerMessage
  ) {
    result = trimHistory(result, settings.retention.maxVersionsPerMessage);
  }

  // Remove old versions based on retention days
  if (settings.retention.retentionDays > 0) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - settings.retention.retentionDays);

    const filteredVersions = result.versions.filter((v) => {
      // Always keep original and current
      if (v.isOriginal || v.isCurrent) return true;
      return v.createdAt >= cutoffDate;
    });

    if (filteredVersions.length !== result.versions.length) {
      // Renumber versions
      const renumbered = filteredVersions.map((v, idx) => ({
        ...v,
        versionNumber: idx + 1,
        isOriginal: idx === 0,
        isCurrent: idx === filteredVersions.length - 1,
      }));

      result = {
        ...result,
        versions: renumbered,
        editCount: renumbered.length - 1,
      };
    }
  }

  return result;
}
