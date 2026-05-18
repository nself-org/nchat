/**
 * Emoji Recent/Frequent Tracking - Track emoji usage patterns
 *
 * This module provides utilities for tracking recently used and
 * frequently used emojis, with localStorage persistence.
 */

import type { RecentEmoji, EmojiUsage } from "./emoji-types";

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY_RECENT = "nchat-emoji-recent";
const STORAGE_KEY_FREQUENT = "nchat-emoji-frequent";
const DEFAULT_MAX_RECENT = 36;
const DEFAULT_MAX_FREQUENT = 50;

// ============================================================================
// Recent Emojis
// ============================================================================

/**
 * Get recent emojis from storage
 *
 * @returns Array of recent emojis
 */
export function getRecentEmojis(): RecentEmoji[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY_RECENT);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed;
  } catch {
    return [];
  }
}

/**
 * Save recent emojis to storage
 *
 * @param emojis - Array of recent emojis
 */
export function saveRecentEmojis(emojis: RecentEmoji[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(emojis));
  } catch {
    // Storage full or disabled
  }
}

/**
 * Add an emoji to recent list
 *
 * @param emoji - The emoji character or URL
 * @param isCustom - Whether this is a custom emoji
 * @param customEmojiId - The custom emoji ID if applicable
 * @param maxRecent - Maximum recent emojis to keep
 * @returns Updated recent emojis array
 */
export function addRecentEmoji(
  emoji: string,
  isCustom: boolean = false,
  customEmojiId?: string,
  maxRecent: number = DEFAULT_MAX_RECENT,
): RecentEmoji[] {
  const recent = getRecentEmojis();

  // Remove if already exists (we'll add to front)
  const filtered = recent.filter((r) =>
    isCustom
      ? r.customEmojiId !== customEmojiId
      : r.emoji !== emoji || r.isCustom,
  );

  // Add to front
  const updated: RecentEmoji[] = [
    {
      emoji,
      isCustom,
      customEmojiId,
      usedAt: Date.now(),
    },
    ...filtered,
  ].slice(0, maxRecent);

  saveRecentEmojis(updated);
  return updated;
}

/**
 * Clear all recent emojis
 */
export function clearRecentEmojis(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY_RECENT);
}

/**
 * Get recent emoji strings (just the characters/URLs)
 *
 * @param limit - Maximum emojis to return
 * @returns Array of emoji strings
 */
export function getRecentEmojiStrings(limit?: number): string[] {
  const recent = getRecentEmojis();
  const emojis = recent.map((r) => r.emoji);
  return limit ? emojis.slice(0, limit) : emojis;
}

// ============================================================================
// Frequent Emojis
// ============================================================================

/**
 * Get frequent emoji usage data from storage
 *
 * @returns Map of emoji to usage data
 */
export function getFrequentEmojis(): Map<string, EmojiUsage> {
  if (typeof window === "undefined") return new Map();

  try {
    const stored = localStorage.getItem(STORAGE_KEY_FREQUENT);
    if (!stored) return new Map();

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return new Map();

    return new Map(parsed.map((entry: EmojiUsage) => [entry.emoji, entry]));
  } catch {
    return new Map();
  }
}

/**
 * Save frequent emojis to storage
 *
 * @param emojis - Map of emoji usage data
 */
export function saveFrequentEmojis(emojis: Map<string, EmojiUsage>): void {
  if (typeof window === "undefined") return;

  try {
    const entries = Array.from(emojis.values());
    localStorage.setItem(STORAGE_KEY_FREQUENT, JSON.stringify(entries));
  } catch {
    // Storage full or disabled
  }
}

/**
 * Record emoji usage for frequency tracking
 *
 * @param emoji - The emoji character or URL
 * @param isCustom - Whether this is a custom emoji
 * @param customEmojiId - The custom emoji ID if applicable
 * @param maxFrequent - Maximum frequent emojis to track
 * @returns Updated frequent emojis map
 */
export function recordEmojiUsage(
  emoji: string,
  isCustom: boolean = false,
  customEmojiId?: string,
  maxFrequent: number = DEFAULT_MAX_FREQUENT,
): Map<string, EmojiUsage> {
  const frequent = getFrequentEmojis();
  const now = Date.now();

  const existing = frequent.get(emoji);

  if (existing) {
    // Update existing entry
    frequent.set(emoji, {
      ...existing,
      count: existing.count + 1,
      lastUsedAt: now,
    });
  } else {
    // Create new entry
    frequent.set(emoji, {
      emoji,
      isCustom,
      customEmojiId,
      count: 1,
      lastUsedAt: now,
      firstUsedAt: now,
    });
  }

  // Trim to max size (remove least used)
  if (frequent.size > maxFrequent) {
    const sorted = Array.from(frequent.entries()).sort(
      (a, b) => b[1].count - a[1].count,
    );

    const trimmed = new Map(sorted.slice(0, maxFrequent));
    saveFrequentEmojis(trimmed);
    return trimmed;
  }

  saveFrequentEmojis(frequent);
  return frequent;
}

/**
 * Get top N frequently used emojis
 *
 * @param count - Number of emojis to return
 * @returns Array of emoji strings sorted by usage count
 */
export function getTopFrequentEmojis(count: number = 10): string[] {
  const frequent = getFrequentEmojis();

  return Array.from(frequent.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, count)
    .map((e) => e.emoji);
}

/**
 * Get emoji usage count
 *
 * @param emoji - The emoji to check
 * @returns Usage count or 0
 */
export function getEmojiUsageCount(emoji: string): number {
  const frequent = getFrequentEmojis();
  return frequent.get(emoji)?.count ?? 0;
}

/**
 * Clear all frequent emoji data
 */
export function clearFrequentEmojis(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY_FREQUENT);
}

// ============================================================================
// Combined Tracking
// ============================================================================

/**
 * Track an emoji use (updates both recent and frequent)
 *
 * @param emoji - The emoji character or URL
 * @param isCustom - Whether this is a custom emoji
 * @param customEmojiId - The custom emoji ID if applicable
 */
export function trackEmojiUse(
  emoji: string,
  isCustom: boolean = false,
  customEmojiId?: string,
): void {
  addRecentEmoji(emoji, isCustom, customEmojiId);
  recordEmojiUsage(emoji, isCustom, customEmojiId);
}

/**
 * Clear all emoji tracking data
 */
export function clearAllEmojiTracking(): void {
  clearRecentEmojis();
  clearFrequentEmojis();
}

// ============================================================================
// Decay Functions
// ============================================================================

/**
 * Apply time-based decay to frequent emoji scores
 *
 * This reduces the score of emojis that haven't been used recently,
 * allowing newer emojis to rise in the rankings.
 *
 * @param decayFactor - Factor to multiply count by (0-1)
 * @param maxAgeDays - Maximum age in days before applying decay
 */
export function applyFrequentDecay(
  decayFactor: number = 0.9,
  maxAgeDays: number = 7,
): void {
  const frequent = getFrequentEmojis();
  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  let changed = false;

  for (const [emoji, usage] of frequent) {
    const age = now - usage.lastUsedAt;

    if (age > maxAgeMs) {
      const daysSinceMax = Math.floor((age - maxAgeMs) / (24 * 60 * 60 * 1000));
      const newCount = Math.max(
        1,
        Math.floor(usage.count * Math.pow(decayFactor, daysSinceMax)),
      );

      if (newCount !== usage.count) {
        frequent.set(emoji, { ...usage, count: newCount });
        changed = true;
      }
    }
  }

  if (changed) {
    saveFrequentEmojis(frequent);
  }
}

// ============================================================================
// Export/Import Functions
// ============================================================================

/**
 * Export all emoji tracking data
 *
 * @returns Export data object
 */
export function exportEmojiTrackingData(): {
  recent: RecentEmoji[];
  frequent: EmojiUsage[];
  exportedAt: string;
} {
  return {
    recent: getRecentEmojis(),
    frequent: Array.from(getFrequentEmojis().values()),
    exportedAt: new Date().toISOString(),
  };
}

/**
 * Import emoji tracking data
 *
 * @param data - Previously exported data
 * @param merge - Whether to merge with existing data
 */
export function importEmojiTrackingData(
  data: {
    recent?: RecentEmoji[];
    frequent?: EmojiUsage[];
  },
  merge: boolean = false,
): void {
  if (data.recent) {
    if (merge) {
      const existing = getRecentEmojis();
      const merged = [...data.recent, ...existing]
        .sort((a, b) => b.usedAt - a.usedAt)
        .slice(0, DEFAULT_MAX_RECENT);
      saveRecentEmojis(merged);
    } else {
      saveRecentEmojis(data.recent);
    }
  }

  if (data.frequent) {
    if (merge) {
      const existing = getFrequentEmojis();
      for (const usage of data.frequent) {
        const current = existing.get(usage.emoji);
        if (current) {
          existing.set(usage.emoji, {
            ...usage,
            count: usage.count + current.count,
            firstUsedAt: Math.min(usage.firstUsedAt, current.firstUsedAt),
            lastUsedAt: Math.max(usage.lastUsedAt, current.lastUsedAt),
          });
        } else {
          existing.set(usage.emoji, usage);
        }
      }
      saveFrequentEmojis(existing);
    } else {
      const map = new Map(data.frequent.map((u) => [u.emoji, u]));
      saveFrequentEmojis(map);
    }
  }
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get emoji usage statistics
 *
 * @returns Statistics object
 */
export function getEmojiStats(): {
  totalUses: number;
  uniqueEmojis: number;
  recentCount: number;
  topEmoji: string | null;
  topEmojiCount: number;
  averageUses: number;
} {
  const frequent = getFrequentEmojis();
  const recent = getRecentEmojis();

  let totalUses = 0;
  let topEmoji: string | null = null;
  let topEmojiCount = 0;

  for (const usage of frequent.values()) {
    totalUses += usage.count;
    if (usage.count > topEmojiCount) {
      topEmojiCount = usage.count;
      topEmoji = usage.emoji;
    }
  }

  return {
    totalUses,
    uniqueEmojis: frequent.size,
    recentCount: recent.length,
    topEmoji,
    topEmojiCount,
    averageUses: frequent.size > 0 ? totalUses / frequent.size : 0,
  };
}
