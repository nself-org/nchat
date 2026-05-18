"use client";

/**
 * useRecentEmojis - Hook for recent and frequently used emojis
 *
 * Provides access to recently used emojis, frequently used emojis,
 * and functions to track emoji usage.
 */

import { useCallback, useMemo } from "react";
import { useEmojiStore } from "@/stores/emoji-store";
import type {
  RecentEmoji,
  UseRecentEmojisReturn,
} from "@/lib/emoji/emoji-types";

// ============================================================================
// Hook Implementation
// ============================================================================

export function useRecentEmojis(): UseRecentEmojisReturn {
  // Store state
  const recentEmojis = useEmojiStore((state) => state.recentEmojis);
  const frequentEmojis = useEmojiStore((state) => state.frequentEmojis);

  // Store actions
  const addRecentEmojiAction = useEmojiStore((state) => state.addRecentEmoji);
  const clearRecentEmojisAction = useEmojiStore(
    (state) => state.clearRecentEmojis,
  );
  const getTopEmojis = useEmojiStore((state) => state.getTopEmojis);

  /**
   * Add emoji to recent
   */
  const addRecent = useCallback(
    (emoji: string, isCustom: boolean = false, customEmojiId?: string) => {
      addRecentEmojiAction(emoji, isCustom, customEmojiId);
    },
    [addRecentEmojiAction],
  );

  /**
   * Clear recent emojis
   */
  const clearRecent = useCallback(() => {
    clearRecentEmojisAction();
  }, [clearRecentEmojisAction]);

  /**
   * Get top N frequent emojis
   */
  const getTopFrequent = useCallback(
    (count: number): string[] => {
      return getTopEmojis(count);
    },
    [getTopEmojis],
  );

  /**
   * Memoized frequent emojis list
   */
  const frequentEmojisList = useMemo(() => {
    return Array.from(frequentEmojis.values())
      .sort((a, b) => b.count - a.count)
      .map((u) => u.emoji);
  }, [frequentEmojis]);

  return {
    recentEmojis,
    frequentEmojis: frequentEmojisList,
    addRecent,
    clearRecent,
    getTopFrequent,
  };
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * Hook for just the recent emoji strings (not full objects)
 */
export function useRecentEmojiStrings(limit?: number): string[] {
  const recentEmojis = useEmojiStore((state) => state.recentEmojis);

  return useMemo(() => {
    const emojis = recentEmojis.map((r) => r.emoji);
    return limit ? emojis.slice(0, limit) : emojis;
  }, [recentEmojis, limit]);
}

/**
 * Hook for frequently used emoji strings
 */
export function useFrequentEmojiStrings(limit: number = 10): string[] {
  const getTopEmojis = useEmojiStore((state) => state.getTopEmojis);

  return useMemo(() => {
    return getTopEmojis(limit);
  }, [getTopEmojis, limit]);
}

/**
 * Hook for quick reactions (frequently used for message reactions)
 */
export function useQuickReactions() {
  const quickReactions = useEmojiStore((state) => state.quickReactions);
  const setQuickReactions = useEmojiStore((state) => state.setQuickReactions);
  const addQuickReaction = useEmojiStore((state) => state.addQuickReaction);
  const removeQuickReaction = useEmojiStore(
    (state) => state.removeQuickReaction,
  );

  const reset = useCallback(() => {
    setQuickReactions([
      "\u{1F44D}", // thumbsup
      "\u{2764}\u{FE0F}", // heart
      "\u{1F602}", // joy
      "\u{1F389}", // tada
      "\u{1F914}", // thinking
      "\u{1F440}", // eyes
    ]);
  }, [setQuickReactions]);

  return {
    quickReactions,
    setQuickReactions,
    addQuickReaction,
    removeQuickReaction,
    reset,
  };
}

/**
 * Hook for emoji usage statistics
 */
export function useEmojiStats() {
  const recentEmojis = useEmojiStore((state) => state.recentEmojis);
  const frequentEmojis = useEmojiStore((state) => state.frequentEmojis);

  return useMemo(() => {
    let totalUses = 0;
    let topEmoji: string | null = null;
    let topEmojiCount = 0;

    for (const usage of frequentEmojis.values()) {
      totalUses += usage.count;
      if (usage.count > topEmojiCount) {
        topEmojiCount = usage.count;
        topEmoji = usage.emoji;
      }
    }

    return {
      totalUses,
      uniqueEmojis: frequentEmojis.size,
      recentCount: recentEmojis.length,
      topEmoji,
      topEmojiCount,
      averageUses:
        frequentEmojis.size > 0 ? totalUses / frequentEmojis.size : 0,
    };
  }, [recentEmojis, frequentEmojis]);
}

export default useRecentEmojis;
