"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation } from "@apollo/client";
import { useLocalStorage } from "usehooks-ts";
import { SkinTones } from "emoji-picker-react";
import { ADD_REACTION, REMOVE_REACTION } from "@/graphql/reactions";
import { useAuth } from "@/contexts/auth-context";

// Constants
const RECENT_EMOJIS_KEY = "nchat-recent-emojis";
const FREQUENT_EMOJIS_KEY = "nchat-frequent-emojis";
const SKIN_TONE_KEY = "nchat-skin-tone";
const MAX_RECENT_EMOJIS = 32;
const MAX_FREQUENT_EMOJIS = 16;

// Types
interface FrequentEmoji {
  emoji: string;
  count: number;
  lastUsed: number;
}

interface EmojiUsage {
  recent: string[];
  frequent: FrequentEmoji[];
}

interface UseEmojiOptions {
  persistRecent?: boolean;
  persistFrequent?: boolean;
  persistSkinTone?: boolean;
  maxRecent?: number;
  maxFrequent?: number;
}

interface UseEmojiReturn {
  // Recent emojis
  recentEmojis: string[];
  addToRecent: (emoji: string) => void;
  clearRecent: () => void;

  // Frequently used emojis
  frequentEmojis: string[];
  getEmojiCount: (emoji: string) => number;

  // Skin tone
  skinTone: SkinTones;
  setSkinTone: (tone: SkinTones) => void;

  // Reaction mutations
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  toggleReaction: (
    messageId: string,
    emoji: string,
    hasReacted: boolean,
  ) => Promise<void>;

  // Loading states
  isAddingReaction: boolean;
  isRemovingReaction: boolean;
}

export function useEmoji(options: UseEmojiOptions = {}): UseEmojiReturn {
  const {
    persistRecent = true,
    persistFrequent = true,
    persistSkinTone = true,
    maxRecent = MAX_RECENT_EMOJIS,
    maxFrequent = MAX_FREQUENT_EMOJIS,
  } = options;

  const { user } = useAuth();

  // Local storage for recent emojis
  const [storedRecent, setStoredRecent] = useLocalStorage<string[]>(
    RECENT_EMOJIS_KEY,
    [],
  );

  // Local storage for frequent emojis
  const [storedFrequent, setStoredFrequent] = useLocalStorage<FrequentEmoji[]>(
    FREQUENT_EMOJIS_KEY,
    [],
  );

  // Local storage for skin tone
  const [storedSkinTone, setStoredSkinTone] = useLocalStorage<SkinTones>(
    SKIN_TONE_KEY,
    SkinTones.NEUTRAL,
  );

  // In-memory state (for non-persistent mode)
  const [memoryRecent, setMemoryRecent] = useState<string[]>([]);
  const [memoryFrequent, setMemoryFrequent] = useState<FrequentEmoji[]>([]);
  const [memorySkinTone, setMemorySkinTone] = useState<SkinTones>(
    SkinTones.NEUTRAL,
  );

  // Select storage based on options
  const recentEmojis = persistRecent ? storedRecent : memoryRecent;
  const setRecentEmojis = persistRecent ? setStoredRecent : setMemoryRecent;
  const frequentData = persistFrequent ? storedFrequent : memoryFrequent;
  const setFrequentData = persistFrequent
    ? setStoredFrequent
    : setMemoryFrequent;
  const skinTone = persistSkinTone ? storedSkinTone : memorySkinTone;
  const setSkinToneValue = persistSkinTone
    ? setStoredSkinTone
    : setMemorySkinTone;

  // GraphQL mutations
  const [addReactionMutation, { loading: isAddingReaction }] =
    useMutation(ADD_REACTION);
  const [removeReactionMutation, { loading: isRemovingReaction }] =
    useMutation(REMOVE_REACTION);

  // Add emoji to recent list
  const addToRecent = useCallback(
    (emoji: string) => {
      setRecentEmojis((prev) => {
        // Remove if already exists
        const filtered = prev.filter((e) => e !== emoji);
        // Add to front
        const updated = [emoji, ...filtered];
        // Limit size
        return updated.slice(0, maxRecent);
      });

      // Also update frequent count
      setFrequentData((prev) => {
        const existing = prev.find((e) => e.emoji === emoji);
        const now = Date.now();

        if (existing) {
          return prev
            .map((e) =>
              e.emoji === emoji
                ? { ...e, count: e.count + 1, lastUsed: now }
                : e,
            )
            .sort((a, b) => b.count - a.count)
            .slice(0, maxFrequent);
        }

        return [...prev, { emoji, count: 1, lastUsed: now }]
          .sort((a, b) => b.count - a.count)
          .slice(0, maxFrequent);
      });
    },
    [maxRecent, maxFrequent, setRecentEmojis, setFrequentData],
  );

  // Clear recent emojis
  const clearRecent = useCallback(() => {
    setRecentEmojis([]);
  }, [setRecentEmojis]);

  // Get frequently used emojis (sorted by count)
  const frequentEmojis = frequentData
    .sort((a, b) => b.count - a.count)
    .map((e) => e.emoji);

  // Get count for specific emoji
  const getEmojiCount = useCallback(
    (emoji: string): number => {
      const found = frequentData.find((e) => e.emoji === emoji);
      return found?.count || 0;
    },
    [frequentData],
  );

  // Set skin tone
  const setSkinTone = useCallback(
    (tone: SkinTones) => {
      setSkinToneValue(tone);
    },
    [setSkinToneValue],
  );

  // Add reaction to message
  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user?.id) {
        throw new Error("User must be logged in to add reactions");
      }

      await addReactionMutation({
        variables: {
          messageId,
          userId: user.id,
          emoji,
        },
        optimisticResponse: {
          insert_nchat_reactions_one: {
            __typename: "nchat_reactions",
            id: `temp-${Date.now()}`,
            emoji,
            created_at: new Date().toISOString(),
            user: {
              __typename: "nchat_users",
              id: user.id,
              username: user.username,
              display_name: user.displayName,
              avatar_url: user.avatarUrl || null,
            },
            message: {
              __typename: "nchat_messages",
              id: messageId,
              reactions_aggregate: {
                __typename: "nchat_reactions_aggregate",
                aggregate: {
                  __typename: "nchat_reactions_aggregate_fields",
                  count: 1,
                },
              },
            },
          },
        },
      });

      // Track emoji usage
      addToRecent(emoji);
    },
    [user, addReactionMutation, addToRecent],
  );

  // Remove reaction from message
  const removeReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user?.id) {
        throw new Error("User must be logged in to remove reactions");
      }

      await removeReactionMutation({
        variables: {
          messageId,
          userId: user.id,
          emoji,
        },
        optimisticResponse: {
          delete_nchat_reactions: {
            __typename: "nchat_reactions_mutation_response",
            affected_rows: 1,
            returning: [
              {
                __typename: "nchat_reactions",
                id: `temp-${Date.now()}`,
                message_id: messageId,
                emoji,
              },
            ],
          },
        },
      });
    },
    [user, removeReactionMutation],
  );

  // Toggle reaction (add if not reacted, remove if already reacted)
  const toggleReaction = useCallback(
    async (messageId: string, emoji: string, hasReacted: boolean) => {
      if (hasReacted) {
        await removeReaction(messageId, emoji);
      } else {
        await addReaction(messageId, emoji);
      }
    },
    [addReaction, removeReaction],
  );

  return {
    recentEmojis,
    addToRecent,
    clearRecent,
    frequentEmojis,
    getEmojiCount,
    skinTone,
    setSkinTone,
    addReaction,
    removeReaction,
    toggleReaction,
    isAddingReaction,
    isRemovingReaction,
  };
}

// Simplified hook for just emoji selection (no reactions)
export function useEmojiPicker() {
  const [storedRecent, setStoredRecent] = useLocalStorage<string[]>(
    RECENT_EMOJIS_KEY,
    [],
  );
  const [storedSkinTone, setStoredSkinTone] = useLocalStorage<SkinTones>(
    SKIN_TONE_KEY,
    SkinTones.NEUTRAL,
  );

  const addToRecent = useCallback(
    (emoji: string) => {
      setStoredRecent((prev) => {
        const filtered = prev.filter((e) => e !== emoji);
        return [emoji, ...filtered].slice(0, MAX_RECENT_EMOJIS);
      });
    },
    [setStoredRecent],
  );

  return {
    recentEmojis: storedRecent,
    addToRecent,
    skinTone: storedSkinTone,
    setSkinTone: setStoredSkinTone,
  };
}

// Hook for managing quick reaction preferences
export function useQuickReactions() {
  const DEFAULT_QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🤔", "👀"];

  const [quickReactions, setQuickReactions] = useLocalStorage<string[]>(
    "nchat-quick-reactions",
    DEFAULT_QUICK_REACTIONS,
  );

  const updateQuickReactions = useCallback(
    (reactions: string[]) => {
      setQuickReactions(reactions.slice(0, 6));
    },
    [setQuickReactions],
  );

  const resetToDefaults = useCallback(() => {
    setQuickReactions(DEFAULT_QUICK_REACTIONS);
  }, [setQuickReactions]);

  const addQuickReaction = useCallback(
    (emoji: string) => {
      setQuickReactions((prev) => {
        if (prev.includes(emoji)) return prev;
        return [...prev.slice(0, 5), emoji];
      });
    },
    [setQuickReactions],
  );

  const removeQuickReaction = useCallback(
    (emoji: string) => {
      setQuickReactions((prev) => prev.filter((e) => e !== emoji));
    },
    [setQuickReactions],
  );

  return {
    quickReactions,
    updateQuickReactions,
    resetToDefaults,
    addQuickReaction,
    removeQuickReaction,
  };
}
