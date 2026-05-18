/**
 * Reactions Module Tests
 *
 * Comprehensive tests for emoji reaction functionality.
 */

import {
  // Types
  type Reaction,
  type DetailedReaction,
  type ReactionRecord,
  type ReactionUser,
  type MessageReactions,
  type ReactionUpdateEvent,
  // Constants
  MAX_REACTIONS_PER_MESSAGE,
  MAX_REACTIONS_PER_USER,
  DEFAULT_QUICK_REACTIONS,
  REACTION_CATEGORIES,
  // Emoji utilities
  isCustomEmoji,
  parseCustomEmoji,
  formatEmoji,
  isSameEmoji,
  getEmojiSkinTone,
  removeEmojiSkinTone,
  // Reaction processing
  groupReactionsByEmoji,
  groupReactionsWithDetails,
  createMessageReactions,
  addReaction,
  removeReaction,
  toggleReaction,
  // Queries
  hasUserReacted,
  getUserReactions,
  getReactionCount,
  getTotalReactionCount,
  getUniqueReactorCount,
  getMostUsedReaction,
  sortReactionsByCount,
  sortReactionsByRecent,
  // Validation
  canAddReaction,
  isValidEmoji,
  // Formatting
  formatReactionUsers,
  formatReactionTooltip,
  getReactionAriaLabel,
  // Optimistic updates
  createOptimisticAdd,
  createOptimisticRemove,
  applyOptimisticUpdate,
  revertOptimisticUpdate,
} from "../reactions";

// ============================================================================
// Test Helpers
// ============================================================================

const createTestReaction = (overrides?: Partial<Reaction>): Reaction => ({
  emoji: "👍",
  count: 1,
  users: ["user1"],
  hasReacted: false,
  ...overrides,
});

const createTestRecord = (
  overrides?: Partial<ReactionRecord>,
): ReactionRecord => ({
  id: `r_${Date.now()}`,
  messageId: "msg1",
  userId: "user1",
  emoji: "👍",
  createdAt: new Date().toISOString(),
  ...overrides,
});

const createTestUser = (id: string): ReactionUser => ({
  id,
  username: `user_${id}`,
  displayName: `User ${id}`,
});

// ============================================================================
// Tests
// ============================================================================

describe("Reactions Module", () => {
  // ==========================================================================
  // Emoji Utility Tests
  // ==========================================================================

  describe("isCustomEmoji", () => {
    it("should return true for custom emoji format", () => {
      expect(isCustomEmoji(":smile:")).toBe(true);
      expect(isCustomEmoji(":custom_emoji:")).toBe(true);
    });

    it("should return false for native emoji", () => {
      expect(isCustomEmoji("👍")).toBe(false);
      expect(isCustomEmoji("❤️")).toBe(false);
    });

    it("should return false for partial format", () => {
      expect(isCustomEmoji(":smile")).toBe(false);
      expect(isCustomEmoji("smile:")).toBe(false);
    });
  });

  describe("parseCustomEmoji", () => {
    it("should parse simple custom emoji", () => {
      const result = parseCustomEmoji(":smile:");
      expect(result).toEqual({ name: "smile", id: undefined });
    });

    it("should parse custom emoji with ID", () => {
      const result = parseCustomEmoji(":smile:123456:");
      expect(result).toEqual({ name: "smile", id: "123456" });
    });

    it("should return null for native emoji", () => {
      expect(parseCustomEmoji("👍")).toBeNull();
    });
  });

  describe("formatEmoji", () => {
    it("should return native emoji as-is", () => {
      expect(formatEmoji("👍")).toBe("👍");
    });

    it("should return custom emoji name", () => {
      expect(formatEmoji(":smile:")).toBe("smile");
    });
  });

  describe("isSameEmoji", () => {
    it("should match identical emojis", () => {
      expect(isSameEmoji("👍", "👍")).toBe(true);
    });

    it("should match emojis with different variation selectors", () => {
      expect(isSameEmoji("❤️", "❤")).toBe(true);
    });

    it("should not match different emojis", () => {
      expect(isSameEmoji("👍", "👎")).toBe(false);
    });
  });

  describe("getEmojiSkinTone", () => {
    it("should detect light skin tone", () => {
      expect(getEmojiSkinTone("👍🏻")).toBe("light");
    });

    it("should detect dark skin tone", () => {
      expect(getEmojiSkinTone("👍🏿")).toBe("dark");
    });

    it("should return null for no skin tone", () => {
      expect(getEmojiSkinTone("👍")).toBeNull();
    });

    it("should return null for non-skin emoji", () => {
      expect(getEmojiSkinTone("❤️")).toBeNull();
    });
  });

  describe("removeEmojiSkinTone", () => {
    it("should remove skin tone modifier", () => {
      expect(removeEmojiSkinTone("👍🏻")).toBe("👍");
      expect(removeEmojiSkinTone("👍🏿")).toBe("👍");
    });

    it("should not modify emoji without skin tone", () => {
      expect(removeEmojiSkinTone("👍")).toBe("👍");
      expect(removeEmojiSkinTone("❤️")).toBe("❤️");
    });
  });

  // ==========================================================================
  // Reaction Processing Tests
  // ==========================================================================

  describe("groupReactionsByEmoji", () => {
    it("should group reactions by emoji", () => {
      const records: ReactionRecord[] = [
        createTestRecord({ emoji: "👍", userId: "u1" }),
        createTestRecord({ emoji: "👍", userId: "u2" }),
        createTestRecord({ emoji: "❤️", userId: "u1" }),
      ];

      const grouped = groupReactionsByEmoji(records);

      expect(grouped).toHaveLength(2);
      expect(grouped.find((r) => r.emoji === "👍")?.count).toBe(2);
      expect(grouped.find((r) => r.emoji === "❤️")?.count).toBe(1);
    });

    it("should track user IDs", () => {
      const records: ReactionRecord[] = [
        createTestRecord({ emoji: "👍", userId: "u1" }),
        createTestRecord({ emoji: "👍", userId: "u2" }),
      ];

      const grouped = groupReactionsByEmoji(records);
      const thumbsUp = grouped.find((r) => r.emoji === "👍");

      expect(thumbsUp?.users).toContain("u1");
      expect(thumbsUp?.users).toContain("u2");
    });

    it("should set hasReacted for current user", () => {
      const records: ReactionRecord[] = [
        createTestRecord({ emoji: "👍", userId: "u1" }),
        createTestRecord({ emoji: "👍", userId: "u2" }),
      ];

      const grouped = groupReactionsByEmoji(records, "u1");
      expect(grouped.find((r) => r.emoji === "👍")?.hasReacted).toBe(true);
    });

    it("should return empty array for no records", () => {
      expect(groupReactionsByEmoji([])).toEqual([]);
    });
  });

  describe("groupReactionsWithDetails", () => {
    it("should include user details", () => {
      const records: ReactionRecord[] = [
        createTestRecord({
          emoji: "👍",
          userId: "u1",
          user: createTestUser("u1"),
        }),
      ];

      const grouped = groupReactionsWithDetails(records);
      expect(grouped[0].userDetails).toHaveLength(1);
      expect(grouped[0].userDetails[0].id).toBe("u1");
    });

    it("should track timestamps", () => {
      const records: ReactionRecord[] = [
        createTestRecord({
          emoji: "👍",
          userId: "u1",
          createdAt: "2024-01-01T10:00:00Z",
        }),
        createTestRecord({
          emoji: "👍",
          userId: "u2",
          createdAt: "2024-01-01T12:00:00Z",
        }),
      ];

      const grouped = groupReactionsWithDetails(records);
      const thumbsUp = grouped.find((r) => r.emoji === "👍");

      expect(thumbsUp?.firstReactedAt).toBe(
        new Date("2024-01-01T10:00:00Z").getTime(),
      );
      expect(thumbsUp?.lastReactedAt).toBe(
        new Date("2024-01-01T12:00:00Z").getTime(),
      );
    });
  });

  describe("createMessageReactions", () => {
    it("should create message reactions summary", () => {
      const records: ReactionRecord[] = [
        createTestRecord({ emoji: "👍", userId: "u1" }),
        createTestRecord({ emoji: "👍", userId: "u2" }),
        createTestRecord({ emoji: "❤️", userId: "u1" }),
      ];

      const summary = createMessageReactions("msg1", records, "u1");

      expect(summary.messageId).toBe("msg1");
      expect(summary.reactions).toHaveLength(2);
      expect(summary.totalCount).toBe(3);
      expect(summary.uniqueUsers).toBe(2);
    });
  });

  describe("addReaction", () => {
    it("should add new reaction", () => {
      const reactions: Reaction[] = [];
      const result = addReaction(reactions, "👍", "u1", "u1");

      expect(result).toHaveLength(1);
      expect(result[0].emoji).toBe("👍");
      expect(result[0].count).toBe(1);
      expect(result[0].hasReacted).toBe(true);
    });

    it("should add to existing reaction", () => {
      const reactions: Reaction[] = [
        createTestReaction({ emoji: "👍", count: 1, users: ["u1"] }),
      ];
      const result = addReaction(reactions, "👍", "u2");

      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(2);
      expect(result[0].users).toContain("u2");
    });

    it("should not add duplicate user", () => {
      const reactions: Reaction[] = [
        createTestReaction({ emoji: "👍", count: 1, users: ["u1"] }),
      ];
      const result = addReaction(reactions, "👍", "u1");

      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(1);
    });

    it("should not mutate original array", () => {
      const reactions: Reaction[] = [createTestReaction()];
      addReaction(reactions, "❤️", "u1");

      expect(reactions).toHaveLength(1);
    });
  });

  describe("removeReaction", () => {
    it("should remove user from reaction", () => {
      const reactions: Reaction[] = [
        createTestReaction({ emoji: "👍", count: 2, users: ["u1", "u2"] }),
      ];
      const result = removeReaction(reactions, "👍", "u1");

      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(1);
      expect(result[0].users).not.toContain("u1");
    });

    it("should remove reaction entirely when last user", () => {
      const reactions: Reaction[] = [
        createTestReaction({ emoji: "👍", count: 1, users: ["u1"] }),
      ];
      const result = removeReaction(reactions, "👍", "u1");

      expect(result).toHaveLength(0);
    });

    it("should return unchanged for non-existent reaction", () => {
      const reactions: Reaction[] = [createTestReaction({ emoji: "👍" })];
      const result = removeReaction(reactions, "❤️", "u1");

      expect(result).toEqual(reactions);
    });

    it("should return unchanged if user has not reacted", () => {
      const reactions: Reaction[] = [
        createTestReaction({ emoji: "👍", users: ["u1"] }),
      ];
      const result = removeReaction(reactions, "👍", "u2");

      expect(result).toEqual(reactions);
    });
  });

  describe("toggleReaction", () => {
    it("should add reaction if not present", () => {
      const reactions: Reaction[] = [];
      const result = toggleReaction(reactions, "👍", "u1");

      expect(result).toHaveLength(1);
    });

    it("should remove reaction if present", () => {
      const reactions: Reaction[] = [
        createTestReaction({ emoji: "👍", users: ["u1"] }),
      ];
      const result = toggleReaction(reactions, "👍", "u1");

      expect(result).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Query Tests
  // ==========================================================================

  describe("hasUserReacted", () => {
    it("should return true if user has reacted", () => {
      const reactions: Reaction[] = [
        createTestReaction({ emoji: "👍", users: ["u1", "u2"] }),
      ];
      expect(hasUserReacted(reactions, "👍", "u1")).toBe(true);
    });

    it("should return false if user has not reacted", () => {
      const reactions: Reaction[] = [
        createTestReaction({ emoji: "👍", users: ["u1"] }),
      ];
      expect(hasUserReacted(reactions, "👍", "u2")).toBe(false);
    });

    it("should return false for non-existent emoji", () => {
      const reactions: Reaction[] = [createTestReaction({ emoji: "👍" })];
      expect(hasUserReacted(reactions, "❤️", "u1")).toBe(false);
    });
  });

  describe("getUserReactions", () => {
    it("should return emojis user has reacted with", () => {
      const reactions: Reaction[] = [
        createTestReaction({ emoji: "👍", users: ["u1"] }),
        createTestReaction({ emoji: "❤️", users: ["u1", "u2"] }),
        createTestReaction({ emoji: "😂", users: ["u2"] }),
      ];

      const result = getUserReactions(reactions, "u1");
      expect(result).toEqual(["👍", "❤️"]);
    });

    it("should return empty array for user with no reactions", () => {
      const reactions: Reaction[] = [
        createTestReaction({ emoji: "👍", users: ["u1"] }),
      ];
      expect(getUserReactions(reactions, "u2")).toEqual([]);
    });
  });

  describe("getReactionCount", () => {
    it("should return count for emoji", () => {
      const reactions: Reaction[] = [
        createTestReaction({ emoji: "👍", count: 5 }),
      ];
      expect(getReactionCount(reactions, "👍")).toBe(5);
    });

    it("should return 0 for non-existent emoji", () => {
      const reactions: Reaction[] = [createTestReaction({ emoji: "👍" })];
      expect(getReactionCount(reactions, "❤️")).toBe(0);
    });
  });

  describe("getTotalReactionCount", () => {
    it("should return sum of all reaction counts", () => {
      const reactions: Reaction[] = [
        createTestReaction({ emoji: "👍", count: 5 }),
        createTestReaction({ emoji: "❤️", count: 3 }),
      ];
      expect(getTotalReactionCount(reactions)).toBe(8);
    });

    it("should return 0 for empty array", () => {
      expect(getTotalReactionCount([])).toBe(0);
    });
  });

  describe("getUniqueReactorCount", () => {
    it("should count unique users", () => {
      const reactions: Reaction[] = [
        createTestReaction({ emoji: "👍", users: ["u1", "u2"] }),
        createTestReaction({ emoji: "❤️", users: ["u1", "u3"] }),
      ];
      expect(getUniqueReactorCount(reactions)).toBe(3);
    });
  });

  describe("getMostUsedReaction", () => {
    it("should return reaction with highest count", () => {
      const reactions: Reaction[] = [
        createTestReaction({ emoji: "👍", count: 5 }),
        createTestReaction({ emoji: "❤️", count: 10 }),
        createTestReaction({ emoji: "😂", count: 3 }),
      ];
      const result = getMostUsedReaction(reactions);
      expect(result?.emoji).toBe("❤️");
    });

    it("should return null for empty array", () => {
      expect(getMostUsedReaction([])).toBeNull();
    });
  });

  describe("sortReactionsByCount", () => {
    it("should sort descending by default", () => {
      const reactions: Reaction[] = [
        createTestReaction({ emoji: "👍", count: 3 }),
        createTestReaction({ emoji: "❤️", count: 10 }),
        createTestReaction({ emoji: "😂", count: 5 }),
      ];
      const sorted = sortReactionsByCount(reactions);
      expect(sorted[0].count).toBe(10);
      expect(sorted[1].count).toBe(5);
      expect(sorted[2].count).toBe(3);
    });

    it("should sort ascending when specified", () => {
      const reactions: Reaction[] = [
        createTestReaction({ emoji: "👍", count: 3 }),
        createTestReaction({ emoji: "❤️", count: 10 }),
      ];
      const sorted = sortReactionsByCount(reactions, true);
      expect(sorted[0].count).toBe(3);
      expect(sorted[1].count).toBe(10);
    });
  });

  // ==========================================================================
  // Validation Tests
  // ==========================================================================

  describe("canAddReaction", () => {
    it("should allow when under limit", () => {
      const reactions: Reaction[] = [
        createTestReaction({ emoji: "👍", users: ["u1"] }),
      ];
      const result = canAddReaction(reactions, "u1");
      expect(result.allowed).toBe(true);
    });

    it("should deny when at user limit", () => {
      const reactions: Reaction[] = Array.from(
        { length: MAX_REACTIONS_PER_USER },
        (_, i) => createTestReaction({ emoji: `emoji_${i}`, users: ["u1"] }),
      );
      const result = canAddReaction(reactions, "u1");
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe("isValidEmoji", () => {
    it("should validate native emojis", () => {
      expect(isValidEmoji("👍")).toBe(true);
      expect(isValidEmoji("❤️")).toBe(true);
      expect(isValidEmoji("🎉")).toBe(true);
    });

    it("should validate custom emoji format", () => {
      expect(isValidEmoji(":smile:")).toBe(true);
      expect(isValidEmoji(":custom_emoji:")).toBe(true);
    });

    it("should reject empty string", () => {
      expect(isValidEmoji("")).toBe(false);
      expect(isValidEmoji("   ")).toBe(false);
    });

    it("should reject invalid custom emoji", () => {
      expect(isValidEmoji("::")).toBe(false);
    });
  });

  // ==========================================================================
  // Formatting Tests
  // ==========================================================================

  describe("formatReactionUsers", () => {
    const userNames = new Map([
      ["u1", "Alice"],
      ["u2", "Bob"],
      ["u3", "Charlie"],
      ["u4", "David"],
      ["u5", "Eve"],
    ]);

    it("should format single user", () => {
      expect(formatReactionUsers(["u1"], userNames)).toBe("Alice");
    });

    it("should format two users", () => {
      expect(formatReactionUsers(["u1", "u2"], userNames)).toBe(
        "Alice and Bob",
      );
    });

    it("should format three users", () => {
      expect(formatReactionUsers(["u1", "u2", "u3"], userNames)).toBe(
        "Alice, Bob, and Charlie",
      );
    });

    it('should show "You" for current user', () => {
      expect(formatReactionUsers(["u1", "u2"], userNames, "u1")).toBe(
        "You and Bob",
      );
    });

    it("should truncate long list", () => {
      const result = formatReactionUsers(
        ["u1", "u2", "u3", "u4", "u5"],
        userNames,
        undefined,
        3,
      );
      expect(result).toBe("Alice, Bob, Charlie and 2 others");
    });

    it("should handle unknown users", () => {
      expect(formatReactionUsers(["unknown"], userNames)).toBe("Unknown");
    });
  });

  describe("formatReactionTooltip", () => {
    it("should format tooltip with emoji and users", () => {
      const reaction = createTestReaction({ emoji: "👍", users: ["u1"] });
      const userNames = new Map([["u1", "Alice"]]);
      const tooltip = formatReactionTooltip(reaction, userNames);
      expect(tooltip).toBe("👍 Alice");
    });
  });

  describe("getReactionAriaLabel", () => {
    it("should return accessible label", () => {
      const reaction = createTestReaction({
        emoji: "👍",
        count: 3,
        users: ["u1", "u2", "u3"],
      });
      const userNames = new Map([
        ["u1", "Alice"],
        ["u2", "Bob"],
        ["u3", "Charlie"],
      ]);
      const label = getReactionAriaLabel(reaction, userNames);
      expect(label).toContain("👍");
      expect(label).toContain("3 reactions");
    });

    it("should use singular for 1 reaction", () => {
      const reaction = createTestReaction({
        emoji: "👍",
        count: 1,
        users: ["u1"],
      });
      const userNames = new Map([["u1", "Alice"]]);
      const label = getReactionAriaLabel(reaction, userNames);
      expect(label).toContain("1 reaction");
    });
  });

  // ==========================================================================
  // Optimistic Update Tests
  // ==========================================================================

  describe("createOptimisticAdd", () => {
    it("should create add event", () => {
      const event = createOptimisticAdd("👍", "u1");
      expect(event.type).toBe("add");
      expect(event.emoji).toBe("👍");
      expect(event.userId).toBe("u1");
      expect(event.timestamp).toBeDefined();
    });
  });

  describe("createOptimisticRemove", () => {
    it("should create remove event", () => {
      const event = createOptimisticRemove("👍", "u1");
      expect(event.type).toBe("remove");
      expect(event.emoji).toBe("👍");
      expect(event.userId).toBe("u1");
    });
  });

  describe("applyOptimisticUpdate", () => {
    it("should apply add event", () => {
      const reactions: Reaction[] = [];
      const event = createOptimisticAdd("👍", "u1");
      const result = applyOptimisticUpdate(reactions, event, "u1");
      expect(result).toHaveLength(1);
      expect(result[0].hasReacted).toBe(true);
    });

    it("should apply remove event", () => {
      const reactions: Reaction[] = [
        createTestReaction({ emoji: "👍", users: ["u1"] }),
      ];
      const event = createOptimisticRemove("👍", "u1");
      const result = applyOptimisticUpdate(reactions, event);
      expect(result).toHaveLength(0);
    });
  });

  describe("revertOptimisticUpdate", () => {
    it("should revert add event", () => {
      const reactions: Reaction[] = [
        createTestReaction({ emoji: "👍", users: ["u1"] }),
      ];
      const event = createOptimisticAdd("👍", "u1");
      const result = revertOptimisticUpdate(reactions, event);
      expect(result).toHaveLength(0);
    });

    it("should revert remove event", () => {
      const reactions: Reaction[] = [];
      const event = createOptimisticRemove("👍", "u1");
      const result = revertOptimisticUpdate(reactions, event);
      expect(result).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Constants Tests
  // ==========================================================================

  describe("Constants", () => {
    it("should have valid MAX_REACTIONS_PER_MESSAGE", () => {
      expect(MAX_REACTIONS_PER_MESSAGE).toBe(20);
    });

    it("should have valid MAX_REACTIONS_PER_USER", () => {
      expect(MAX_REACTIONS_PER_USER).toBe(10);
    });

    it("should have default quick reactions", () => {
      expect(DEFAULT_QUICK_REACTIONS).toContain("👍");
      expect(DEFAULT_QUICK_REACTIONS).toContain("❤️");
      expect(DEFAULT_QUICK_REACTIONS.length).toBeGreaterThan(0);
    });

    it("should have reaction categories", () => {
      expect(REACTION_CATEGORIES.positive).toContain("👍");
      expect(REACTION_CATEGORIES.negative).toContain("👎");
      expect(REACTION_CATEGORIES.funny).toContain("😂");
    });
  });
});
