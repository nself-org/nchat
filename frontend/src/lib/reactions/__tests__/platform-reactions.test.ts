/**
 * Platform Reactions Tests
 *
 * Comprehensive test suite for platform-specific reaction configurations
 * and validation logic. Tests cover all 5 platforms (Default, WhatsApp,
 * Telegram, Slack, Discord) and their unique reaction behaviors.
 */

import {
  // Types
  type PlatformReactionConfig,
  type CanReactResult,
  type ChannelReactionPermissions,
  type ReactionAggregate,
  // Configurations
  defaultReactionConfig,
  whatsappReactionConfig,
  telegramReactionConfig,
  slackReactionConfig,
  discordReactionConfig,
  platformReactionConfigs,
  // Functions
  getReactionConfig,
  createCustomReactionConfig,
  canUserReact,
  canUseCustomEmoji,
  supportsAnimatedEmoji,
  getDisplayOptions,
  sortReactions,
  defaultChannelPermissions,
  areReactionsAllowed,
  isEmojiAllowed,
} from "../platform-reactions";

// ============================================================================
// Configuration Tests
// ============================================================================

describe("Platform Reaction Configurations", () => {
  describe("Default Configuration", () => {
    it("should have multiple reaction mode", () => {
      expect(defaultReactionConfig.mode).toBe("multiple");
    });

    it("should support full emoji set", () => {
      expect(defaultReactionConfig.emojiSet).toBe("full");
    });

    it("should support custom emojis", () => {
      expect(defaultReactionConfig.customEmojis).toBe(true);
    });

    it("should support animated emojis", () => {
      expect(defaultReactionConfig.animationSupport).toBe("animated");
    });

    it("should have 6 quick reactions", () => {
      expect(defaultReactionConfig.quickReactions).toHaveLength(6);
    });

    it("should include common quick reactions", () => {
      expect(defaultReactionConfig.quickReactions).toContain("👍");
      expect(defaultReactionConfig.quickReactions).toContain("❤️");
    });

    it("should allow 10 reactions per user", () => {
      expect(defaultReactionConfig.maxReactionsPerUser).toBe(10);
    });

    it("should allow 20 reactions per message", () => {
      expect(defaultReactionConfig.maxReactionsPerMessage).toBe(20);
    });
  });

  describe("WhatsApp Configuration", () => {
    it("should have single reaction mode", () => {
      expect(whatsappReactionConfig.mode).toBe("single");
    });

    it("should allow only 1 reaction per user", () => {
      expect(whatsappReactionConfig.maxReactionsPerUser).toBe(1);
    });

    it("should not support custom emojis", () => {
      expect(whatsappReactionConfig.customEmojis).toBe(false);
    });

    it("should only support static animations", () => {
      expect(whatsappReactionConfig.animationSupport).toBe("static");
    });

    it("should have WhatsApp quick reactions", () => {
      expect(whatsappReactionConfig.quickReactions).toContain("👍");
      expect(whatsappReactionConfig.quickReactions).toContain("🙏");
    });

    it("should support double-tap to react", () => {
      expect(whatsappReactionConfig.features.doubleTapReact).toBe(true);
    });

    it("should not show hover reaction bar", () => {
      expect(whatsappReactionConfig.features.hoverReactionBar).toBe(false);
    });

    it("should have cooldown", () => {
      expect(whatsappReactionConfig.cooldownMs).toBe(500);
    });
  });

  describe("Telegram Configuration", () => {
    it("should have multiple reaction mode", () => {
      expect(telegramReactionConfig.mode).toBe("multiple");
    });

    it("should allow 3 reactions per user", () => {
      expect(telegramReactionConfig.maxReactionsPerUser).toBe(3);
    });

    it("should support custom emojis (premium)", () => {
      expect(telegramReactionConfig.customEmojis).toBe(true);
    });

    it("should support animated emojis", () => {
      expect(telegramReactionConfig.animationSupport).toBe("animated");
    });

    it("should have Telegram quick reactions", () => {
      expect(telegramReactionConfig.quickReactions).toContain("🔥");
      expect(telegramReactionConfig.quickReactions).toContain("👎");
    });

    it("should show up to 50 reactors", () => {
      expect(telegramReactionConfig.maxReactorsDisplay).toBe(50);
    });

    it("should not support skin tone picker", () => {
      expect(telegramReactionConfig.showSkinTonePicker).toBe(false);
    });
  });

  describe("Slack Configuration", () => {
    it("should have multiple reaction mode", () => {
      expect(slackReactionConfig.mode).toBe("multiple");
    });

    it("should allow 23 reactions per message (Slack limit)", () => {
      expect(slackReactionConfig.maxReactionsPerMessage).toBe(23);
    });

    it("should allow 23 reactions per user", () => {
      expect(slackReactionConfig.maxReactionsPerUser).toBe(23);
    });

    it("should support custom emojis", () => {
      expect(slackReactionConfig.customEmojis).toBe(true);
    });

    it("should have hover display style", () => {
      expect(slackReactionConfig.displayStyle).toBe("hover");
    });

    it("should show hover reaction bar", () => {
      expect(slackReactionConfig.features.hoverReactionBar).toBe(true);
    });

    it("should have Slack quick reactions", () => {
      expect(slackReactionConfig.quickReactions).toContain("✅");
      expect(slackReactionConfig.quickReactions).toContain("👀");
    });

    it("should support skin tone picker", () => {
      expect(slackReactionConfig.showSkinTonePicker).toBe(true);
    });
  });

  describe("Discord Configuration", () => {
    it("should have multiple reaction mode", () => {
      expect(discordReactionConfig.mode).toBe("multiple");
    });

    it("should allow 20 reactions per message", () => {
      expect(discordReactionConfig.maxReactionsPerMessage).toBe(20);
    });

    it("should support custom emojis", () => {
      expect(discordReactionConfig.customEmojis).toBe(true);
    });

    it("should support animated emojis", () => {
      expect(discordReactionConfig.animationSupport).toBe("animated");
    });

    it("should have hover display style", () => {
      expect(discordReactionConfig.displayStyle).toBe("hover");
    });

    it("should show hover reaction bar", () => {
      expect(discordReactionConfig.features.hoverReactionBar).toBe(true);
    });

    it("should show up to 100 reactors", () => {
      expect(discordReactionConfig.maxReactorsDisplay).toBe(100);
    });

    it("should have small cooldown", () => {
      expect(discordReactionConfig.cooldownMs).toBe(250);
    });
  });
});

// ============================================================================
// Configuration Registry Tests
// ============================================================================

describe("Configuration Registry", () => {
  describe("getReactionConfig", () => {
    it('should return default config for "default" platform', () => {
      const config = getReactionConfig("default");
      expect(config).toEqual(defaultReactionConfig);
    });

    it('should return whatsapp config for "whatsapp" platform', () => {
      const config = getReactionConfig("whatsapp");
      expect(config).toEqual(whatsappReactionConfig);
    });

    it('should return telegram config for "telegram" platform', () => {
      const config = getReactionConfig("telegram");
      expect(config).toEqual(telegramReactionConfig);
    });

    it('should return slack config for "slack" platform', () => {
      const config = getReactionConfig("slack");
      expect(config).toEqual(slackReactionConfig);
    });

    it('should return discord config for "discord" platform', () => {
      const config = getReactionConfig("discord");
      expect(config).toEqual(discordReactionConfig);
    });

    it("should return default config for unknown platform", () => {
      // @ts-expect-error Testing unknown platform
      const config = getReactionConfig("unknown");
      expect(config).toEqual(defaultReactionConfig);
    });
  });

  describe("createCustomReactionConfig", () => {
    it("should merge overrides with base config", () => {
      const custom = createCustomReactionConfig("default", {
        maxReactionsPerUser: 5,
        cooldownMs: 1000,
      });

      expect(custom.maxReactionsPerUser).toBe(5);
      expect(custom.cooldownMs).toBe(1000);
      expect(custom.mode).toBe("multiple"); // From base
    });

    it("should merge features correctly", () => {
      const custom = createCustomReactionConfig("whatsapp", {
        features: {
          doubleTapReact: false,
          longPressReact: true,
          swipeToReact: false,
          hoverReactionBar: false,
          reactToOwnMessages: true,
          showAddButton: true,
        },
      });

      expect(custom.features.doubleTapReact).toBe(false);
      expect(custom.features.longPressReact).toBe(true);
    });

    it("should preserve base features when partially overriding", () => {
      const custom = createCustomReactionConfig("slack", {
        features: {
          hoverReactionBar: false,
          doubleTapReact: false,
          longPressReact: false,
          swipeToReact: false,
          reactToOwnMessages: true,
          showAddButton: true,
        },
      });

      expect(custom.features.hoverReactionBar).toBe(false);
      expect(custom.features.showAddButton).toBe(true);
    });
  });

  describe("platformReactionConfigs", () => {
    it("should have all 5 platforms", () => {
      expect(Object.keys(platformReactionConfigs)).toHaveLength(5);
    });

    it("should have correct platform keys", () => {
      expect(platformReactionConfigs).toHaveProperty("default");
      expect(platformReactionConfigs).toHaveProperty("whatsapp");
      expect(platformReactionConfigs).toHaveProperty("telegram");
      expect(platformReactionConfigs).toHaveProperty("slack");
      expect(platformReactionConfigs).toHaveProperty("discord");
    });
  });
});

// ============================================================================
// Reaction Validation Tests
// ============================================================================

describe("Reaction Validation", () => {
  describe("canUserReact - Multiple Mode (Default)", () => {
    const config = defaultReactionConfig;

    it("should allow first reaction", () => {
      const result = canUserReact(config, [], "👍", 0);
      expect(result.allowed).toBe(true);
    });

    it("should allow additional reactions up to limit", () => {
      const userReactions = ["👍", "❤️", "😂"];
      const result = canUserReact(config, userReactions, "🎉", 3);
      expect(result.allowed).toBe(true);
    });

    it("should deny when user limit reached", () => {
      const userReactions = Array.from({ length: 10 }, (_, i) => `emoji_${i}`);
      const result = canUserReact(config, userReactions, "👍", 10);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("10");
    });

    it("should allow toggle off existing reaction", () => {
      const result = canUserReact(config, ["👍"], "👍", 1);
      expect(result.allowed).toBe(true);
    });
  });

  describe("canUserReact - Single Mode (WhatsApp)", () => {
    const config = whatsappReactionConfig;

    it("should allow first reaction", () => {
      const result = canUserReact(config, [], "👍", 0);
      expect(result.allowed).toBe(true);
    });

    it("should indicate replacement when changing reaction", () => {
      const result = canUserReact(config, ["👍"], "❤️", 1);
      expect(result.allowed).toBe(true);
      expect(result.shouldReplace).toBe(true);
      expect(result.existingEmoji).toBe("👍");
    });

    it("should allow toggle off same reaction", () => {
      const result = canUserReact(config, ["👍"], "👍", 1);
      expect(result.allowed).toBe(true);
      expect(result.shouldReplace).toBeUndefined();
    });

    it("should allow replacement even at message limit", () => {
      // WhatsApp has unlimited unique emojis, so this tests the single-user behavior
      const result = canUserReact(config, ["👍"], "❤️", 100);
      expect(result.allowed).toBe(true);
      expect(result.shouldReplace).toBe(true);
    });
  });

  describe("canUserReact - Limited Emoji Set (Signal-style)", () => {
    const signalConfig: PlatformReactionConfig = {
      ...defaultReactionConfig,
      mode: "single",
      emojiSet: "limited",
      allowedEmojis: ["❤️", "👍", "👎", "😂", "😮", "😢", "😡"],
      maxReactionsPerMessage: 7,
      maxReactionsPerUser: 1,
    };

    it("should allow emoji in allowed set", () => {
      const result = canUserReact(signalConfig, [], "❤️", 0);
      expect(result.allowed).toBe(true);
    });

    it("should deny emoji not in allowed set", () => {
      const result = canUserReact(signalConfig, [], "🎉", 0);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("not available");
    });

    it("should respect message reaction limit", () => {
      const result = canUserReact(signalConfig, [], "👍", 7);
      expect(result.allowed).toBe(false);
    });
  });

  describe("canUserReact - Telegram Mode", () => {
    const config = telegramReactionConfig;

    it("should allow up to 3 reactions", () => {
      const result = canUserReact(config, ["👍", "❤️"], "😂", 5);
      expect(result.allowed).toBe(true);
    });

    it("should deny 4th reaction", () => {
      const result = canUserReact(config, ["👍", "❤️", "😂"], "🎉", 10);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("3");
    });
  });
});

// ============================================================================
// Feature Detection Tests
// ============================================================================

describe("Feature Detection", () => {
  describe("canUseCustomEmoji", () => {
    it("should return true for platforms with custom emoji support", () => {
      expect(canUseCustomEmoji(defaultReactionConfig)).toBe(true);
      expect(canUseCustomEmoji(telegramReactionConfig)).toBe(true);
      expect(canUseCustomEmoji(slackReactionConfig)).toBe(true);
      expect(canUseCustomEmoji(discordReactionConfig)).toBe(true);
    });

    it("should return false for platforms without custom emoji support", () => {
      expect(canUseCustomEmoji(whatsappReactionConfig)).toBe(false);
    });
  });

  describe("supportsAnimatedEmoji", () => {
    it("should return true for platforms with animated emoji support", () => {
      expect(supportsAnimatedEmoji(defaultReactionConfig)).toBe(true);
      expect(supportsAnimatedEmoji(telegramReactionConfig)).toBe(true);
      expect(supportsAnimatedEmoji(slackReactionConfig)).toBe(true);
      expect(supportsAnimatedEmoji(discordReactionConfig)).toBe(true);
    });

    it("should return false for platforms without animated emoji support", () => {
      expect(supportsAnimatedEmoji(whatsappReactionConfig)).toBe(false);
    });
  });
});

// ============================================================================
// Display Options Tests
// ============================================================================

describe("Display Options", () => {
  describe("getDisplayOptions", () => {
    it("should return display options based on config", () => {
      const options = getDisplayOptions(defaultReactionConfig);
      expect(options.maxDisplay).toBe(defaultReactionConfig.maxReactorsDisplay);
      expect(options.sortBy).toBe("count");
      expect(options.showOverflow).toBe(true);
      expect(options.groupByEmoji).toBe(true);
    });
  });

  describe("sortReactions", () => {
    const mockReactions: ReactionAggregate[] = [
      { emoji: "👍", count: 5, hasReacted: false, users: [] },
      { emoji: "❤️", count: 10, hasReacted: false, users: [] },
      { emoji: "😂", count: 3, hasReacted: false, users: [] },
    ];

    it("should sort by count descending", () => {
      const sorted = sortReactions(mockReactions, { sortBy: "count" });
      expect(sorted[0].emoji).toBe("❤️");
      expect(sorted[1].emoji).toBe("👍");
      expect(sorted[2].emoji).toBe("😂");
    });

    it("should limit to maxDisplay", () => {
      const sorted = sortReactions(mockReactions, { maxDisplay: 2 });
      expect(sorted).toHaveLength(2);
    });

    it("should not modify original array", () => {
      sortReactions(mockReactions, { sortBy: "count" });
      expect(mockReactions[0].emoji).toBe("👍");
    });
  });
});

// ============================================================================
// Channel Permission Tests
// ============================================================================

describe("Channel Permissions", () => {
  describe("defaultChannelPermissions", () => {
    it("should have reactions enabled by default", () => {
      expect(defaultChannelPermissions.enabled).toBe(true);
    });

    it("should not be moderator only by default", () => {
      expect(defaultChannelPermissions.moderatorOnly).toBe(false);
    });

    it("should not be members only by default", () => {
      expect(defaultChannelPermissions.membersOnly).toBe(false);
    });

    it("should not allow anonymous reactions by default", () => {
      expect(defaultChannelPermissions.anonymousAllowed).toBe(false);
    });
  });

  describe("areReactionsAllowed", () => {
    it("should deny when reactions are disabled", () => {
      const permissions: ChannelReactionPermissions = {
        ...defaultChannelPermissions,
        enabled: false,
      };
      expect(areReactionsAllowed(permissions, "member")).toBe(false);
    });

    it("should allow members when moderator only is false", () => {
      expect(areReactionsAllowed(defaultChannelPermissions, "member")).toBe(
        true,
      );
    });

    it("should deny members when moderator only", () => {
      const permissions: ChannelReactionPermissions = {
        ...defaultChannelPermissions,
        moderatorOnly: true,
      };
      expect(areReactionsAllowed(permissions, "member")).toBe(false);
    });

    it("should allow moderators when moderator only", () => {
      const permissions: ChannelReactionPermissions = {
        ...defaultChannelPermissions,
        moderatorOnly: true,
      };
      expect(areReactionsAllowed(permissions, "moderator")).toBe(true);
      expect(areReactionsAllowed(permissions, "admin")).toBe(true);
      expect(areReactionsAllowed(permissions, "owner")).toBe(true);
    });

    it("should deny guests when members only", () => {
      const permissions: ChannelReactionPermissions = {
        ...defaultChannelPermissions,
        membersOnly: true,
      };
      expect(areReactionsAllowed(permissions, "guest")).toBe(false);
    });

    it("should allow members when members only", () => {
      const permissions: ChannelReactionPermissions = {
        ...defaultChannelPermissions,
        membersOnly: true,
      };
      expect(areReactionsAllowed(permissions, "member")).toBe(true);
    });
  });

  describe("isEmojiAllowed", () => {
    it("should return false when reactions disabled", () => {
      const permissions: ChannelReactionPermissions = {
        ...defaultChannelPermissions,
        enabled: false,
      };
      expect(isEmojiAllowed(permissions, "👍")).toBe(false);
    });

    it("should return true when no restrictions", () => {
      expect(isEmojiAllowed(defaultChannelPermissions, "👍")).toBe(true);
      expect(isEmojiAllowed(defaultChannelPermissions, "🎉")).toBe(true);
    });

    it("should check restricted emojis when specified", () => {
      const permissions: ChannelReactionPermissions = {
        ...defaultChannelPermissions,
        restrictedEmojis: ["👍", "❤️", "😂"],
      };
      expect(isEmojiAllowed(permissions, "👍")).toBe(true);
      expect(isEmojiAllowed(permissions, "🎉")).toBe(false);
    });

    it("should ignore empty restricted list", () => {
      const permissions: ChannelReactionPermissions = {
        ...defaultChannelPermissions,
        restrictedEmojis: [],
      };
      expect(isEmojiAllowed(permissions, "🎉")).toBe(true);
    });
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe("Edge Cases", () => {
  describe("Empty States", () => {
    it("should handle empty user reactions array", () => {
      const result = canUserReact(defaultReactionConfig, [], "👍", 0);
      expect(result.allowed).toBe(true);
    });

    it("should handle zero total reactions", () => {
      const result = canUserReact(defaultReactionConfig, [], "👍", 0);
      expect(result.allowed).toBe(true);
    });
  });

  describe("Boundary Conditions", () => {
    it("should allow exactly at user limit", () => {
      const userReactions = Array.from({ length: 9 }, (_, i) => `emoji_${i}`);
      // 10 total reactions on message, user has 9, can add 10th
      const result = canUserReact(
        defaultReactionConfig,
        userReactions,
        "👍",
        10,
      );
      expect(result.allowed).toBe(true);
    });

    it("should deny at user limit + 1", () => {
      const userReactions = Array.from({ length: 10 }, (_, i) => `emoji_${i}`);
      const result = canUserReact(
        defaultReactionConfig,
        userReactions,
        "👍",
        20,
      );
      expect(result.allowed).toBe(false);
    });

    it("should handle unlimited message reactions (0)", () => {
      const config: PlatformReactionConfig = {
        ...defaultReactionConfig,
        maxReactionsPerMessage: 0, // Unlimited
      };
      const result = canUserReact(config, [], "👍", 1000);
      expect(result.allowed).toBe(true);
    });
  });

  describe("Special Characters", () => {
    it("should handle emoji with skin tone modifiers", () => {
      const result = canUserReact(defaultReactionConfig, [], "👍🏻", 0);
      expect(result.allowed).toBe(true);
    });

    it("should handle complex emoji sequences", () => {
      const result = canUserReact(defaultReactionConfig, [], "👨‍👩‍👧‍👦", 0);
      expect(result.allowed).toBe(true);
    });

    it("should handle flag emojis", () => {
      const result = canUserReact(defaultReactionConfig, [], "🇺🇸", 0);
      expect(result.allowed).toBe(true);
    });
  });
});
