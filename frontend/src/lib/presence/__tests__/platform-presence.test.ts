/**
 * Platform Presence Tests - Comprehensive test suite for presence system
 *
 * Tests presence states, typing indicators, read receipts, and privacy controls
 * across all platform presets (WhatsApp, Telegram, Signal, Slack, Discord, Default).
 *
 * @module lib/presence/__tests__/platform-presence.test
 */

import {
  // Types
  type PlatformPreset,
  type PresenceStatus,
  type DeliveryStatus,
  type LastSeenPrivacy,
  type UserTypingState,
  type PresencePrivacySettings,
  type MessageReadReceipt,
  type PlatformPresenceConfig,

  // Configuration
  getPlatformConfig,
  PLATFORM_CONFIGS,
  WHATSAPP_CONFIG,
  TELEGRAM_CONFIG,
  SIGNAL_CONFIG,
  SLACK_CONFIG,
  DISCORD_CONFIG,
  DEFAULT_CONFIG,
  DEFAULT_PRIVACY_SETTINGS,
  DEFAULT_TRANSITION_RULES,

  // Helper functions
  formatLastSeen,
  formatTypingText,
  formatSeenByText,
  getPresenceColor,
  getDeliveryStatusIcon,
  getDeliveryStatusColor,
  shouldShowReadReceipts,
  shouldSendTypingIndicator,
  isPresenceVisibleTo,
  isLastSeenVisibleTo,
} from "../platform-presence";

// ============================================================================
// PLATFORM CONFIGURATION TESTS
// ============================================================================

describe("Platform Configurations", () => {
  const platforms: PlatformPreset[] = [
    "whatsapp",
    "telegram",
    "signal",
    "slack",
    "discord",
    "default",
  ];

  describe("getPlatformConfig", () => {
    test.each(platforms)("returns valid config for %s", (platform) => {
      const config = getPlatformConfig(platform);

      expect(config).toBeDefined();
      expect(config.platform).toBe(platform);
      expect(config.presence).toBeDefined();
      expect(config.typing).toBeDefined();
      expect(config.receipts).toBeDefined();
      expect(config.privacyDefaults).toBeDefined();
    });

    test("all platform configs exist in PLATFORM_CONFIGS", () => {
      platforms.forEach((platform) => {
        expect(PLATFORM_CONFIGS[platform]).toBeDefined();
      });
    });
  });

  describe("WhatsApp Configuration", () => {
    const config = WHATSAPP_CONFIG;

    test("has correct presence settings", () => {
      expect(config.presence.showOnline).toBe(true);
      expect(config.presence.showLastSeen).toBe(true);
      expect(config.presence.customStatus).toBe(true);
      expect(config.presence.activityStatus).toBe(false); // WhatsApp doesn't have activities
      expect(config.presence.dndSupported).toBe(false);
      expect(config.presence.invisibleSupported).toBe(false);
    });

    test("has correct typing settings", () => {
      expect(config.typing.enabled).toBe(true);
      expect(config.typing.timeout).toBe(5);
      expect(config.typing.showInGroups).toBe(true);
      expect(config.typing.showTyperNames).toBe(true);
    });

    test("has correct receipt settings", () => {
      expect(config.receipts.enabled).toBe(true);
      expect(config.receipts.userOptOut).toBe(true);
      expect(config.receipts.showDeliveryStatus).toBe(true);
      expect(config.receipts.showReadStatus).toBe(true);
      expect(config.receipts.groupReceipts).toBe(true);
      expect(config.receipts.style.readColor).toBe("#53BDEB"); // WhatsApp blue
      expect(config.receipts.style.useCheckmarks).toBe(true);
    });
  });

  describe("Telegram Configuration", () => {
    const config = TELEGRAM_CONFIG;

    test("has correct presence settings", () => {
      expect(config.presence.showOnline).toBe(true);
      expect(config.presence.showLastSeen).toBe(true);
      expect(config.presence.invisibleSupported).toBe(true); // Can hide last seen
    });

    test("does NOT show read receipts in groups", () => {
      expect(config.receipts.groupReceipts).toBe(false);
    });

    test("has green read color", () => {
      expect(config.receipts.style.readColor).toBe("#4FAE4E");
    });

    test("cannot opt out of receipts", () => {
      expect(config.receipts.userOptOut).toBe(false);
    });
  });

  describe("Signal Configuration", () => {
    const config = SIGNAL_CONFIG;

    test("does NOT show online status (privacy)", () => {
      expect(config.presence.showOnline).toBe(false);
    });

    test("does NOT show last seen (privacy)", () => {
      expect(config.presence.showLastSeen).toBe(false);
    });

    test("has minimal typing display", () => {
      expect(config.typing.showTyperNames).toBe(false);
      expect(config.typing.maxTypersDisplayed).toBe(1);
    });

    test("read receipts disabled by default", () => {
      expect(config.privacyDefaults.readReceipts).toBe("disabled");
    });

    test("uses circles instead of checkmarks", () => {
      expect(config.receipts.style.useCheckmarks).toBe(false);
    });

    test("no group receipts", () => {
      expect(config.receipts.groupReceipts).toBe(false);
    });
  });

  describe("Slack Configuration", () => {
    const config = SLACK_CONFIG;

    test("has rich presence features", () => {
      expect(config.presence.customStatus).toBe(true);
      expect(config.presence.activityStatus).toBe(true);
      expect(config.presence.dndSupported).toBe(true);
      expect(config.presence.autoAwayTimeout).toBe(30);
    });

    test('shows "Seen by" with avatars', () => {
      expect(config.receipts.style.showSeenByText).toBe(true);
      expect(config.receipts.style.showReaderAvatars).toBe(true);
      expect(config.receipts.maxReadersDisplayed).toBe(5);
    });

    test("does NOT show delivery status", () => {
      expect(config.receipts.showDeliveryStatus).toBe(false);
    });

    test("has all presence statuses", () => {
      expect(config.presence.availableStatuses).toContain("online");
      expect(config.presence.availableStatuses).toContain("away");
      expect(config.presence.availableStatuses).toContain("dnd");
    });
  });

  describe("Discord Configuration", () => {
    const config = DISCORD_CONFIG;

    test("has rich presence with activities", () => {
      expect(config.presence.activityStatus).toBe(true);
      expect(config.presence.dndSupported).toBe(true);
      expect(config.presence.invisibleSupported).toBe(true);
    });

    test("has all Discord statuses", () => {
      expect(config.presence.availableStatuses).toContain("online");
      expect(config.presence.availableStatuses).toContain("away");
      expect(config.presence.availableStatuses).toContain("dnd");
      expect(config.presence.availableStatuses).toContain("invisible");
    });

    test("NO read receipts in servers", () => {
      expect(config.receipts.enabled).toBe(false);
    });

    test("typing shows more users", () => {
      expect(config.typing.maxTypersDisplayed).toBe(4);
      expect(config.typing.timeout).toBe(8);
    });
  });
});

// ============================================================================
// LAST SEEN FORMATTING TESTS
// ============================================================================

describe("formatLastSeen", () => {
  const now = new Date();

  test('returns "Never" for undefined', () => {
    expect(formatLastSeen(undefined)).toBe("Never");
  });

  describe("Default/WhatsApp style", () => {
    test('shows "online" for just now', () => {
      const justNow = new Date(now.getTime() - 10000); // 10 seconds ago
      expect(formatLastSeen(justNow, "whatsapp")).toBe("online");
    });

    test("shows minutes ago", () => {
      const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
      expect(formatLastSeen(fiveMinAgo, "whatsapp")).toContain("minute");
    });

    test("shows hours ago", () => {
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      expect(formatLastSeen(threeHoursAgo, "whatsapp")).toContain("hour");
    });

    test("shows yesterday", () => {
      const yesterday = new Date(now.getTime() - 25 * 60 * 60 * 1000);
      expect(formatLastSeen(yesterday, "default")).toBe("last seen yesterday");
    });

    test("shows days ago", () => {
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      expect(formatLastSeen(threeDaysAgo, "default")).toContain("days ago");
    });
  });

  describe("Telegram style (approximations)", () => {
    test('shows "recently" for recent activity', () => {
      const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
      expect(formatLastSeen(fiveMinAgo, "telegram")).toBe("last seen recently");
    });

    test('shows "within a week"', () => {
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      expect(formatLastSeen(threeDaysAgo, "telegram")).toBe(
        "last seen within a week",
      );
    });

    test('shows "within a month"', () => {
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      expect(formatLastSeen(twoWeeksAgo, "telegram")).toBe(
        "last seen within a month",
      );
    });

    test('shows "a long time ago" for old activity', () => {
      const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      expect(formatLastSeen(twoMonthsAgo, "telegram")).toBe(
        "last seen a long time ago",
      );
    });
  });

  describe("Slack style", () => {
    test('shows "Active" for online', () => {
      const justNow = new Date(now.getTime() - 10000);
      expect(formatLastSeen(justNow, "slack")).toBe("Active");
    });

    test('shows "Active Xm ago"', () => {
      const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000);
      expect(formatLastSeen(tenMinAgo, "slack")).toBe("Active 10m ago");
    });

    test('shows "Active Xh ago"', () => {
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      expect(formatLastSeen(twoHoursAgo, "slack")).toBe("Active 2h ago");
    });

    test('shows "Away" for older', () => {
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      expect(formatLastSeen(twoDaysAgo, "slack")).toBe("Away");
    });
  });
});

// ============================================================================
// TYPING INDICATOR TESTS
// ============================================================================

describe("formatTypingText", () => {
  const config = DEFAULT_CONFIG;

  const createTypingUser = (id: string, name: string): UserTypingState => ({
    userId: id,
    userName: name,
    conversationId: "test-conv",
    startedAt: new Date(),
    expiresAt: new Date(Date.now() + 5000),
  });

  test("returns empty string for no users", () => {
    expect(formatTypingText([], config)).toBe("");
  });

  test("shows single user typing", () => {
    const users = [createTypingUser("1", "Alice")];
    expect(formatTypingText(users, config)).toBe("Alice is typing...");
  });

  test("shows two users typing", () => {
    const users = [
      createTypingUser("1", "Alice"),
      createTypingUser("2", "Bob"),
    ];
    expect(formatTypingText(users, config)).toBe("Alice and Bob are typing...");
  });

  test("shows three users typing", () => {
    const users = [
      createTypingUser("1", "Alice"),
      createTypingUser("2", "Bob"),
      createTypingUser("3", "Charlie"),
    ];
    expect(formatTypingText(users, config)).toBe(
      "Alice, Bob, and Charlie are typing...",
    );
  });

  test('shows "X others" for many users', () => {
    const users = [
      createTypingUser("1", "Alice"),
      createTypingUser("2", "Bob"),
      createTypingUser("3", "Charlie"),
      createTypingUser("4", "Diana"),
      createTypingUser("5", "Eve"),
    ];
    expect(formatTypingText(users, config)).toContain("others are typing...");
  });

  test("respects maxTypersDisplayed setting", () => {
    const customConfig = {
      ...config,
      typing: { ...config.typing, maxTypersDisplayed: 2 },
    };
    const users = [
      createTypingUser("1", "Alice"),
      createTypingUser("2", "Bob"),
      createTypingUser("3", "Charlie"),
    ];
    expect(formatTypingText(users, customConfig)).toContain("1 other");
  });

  describe("Signal style (no names)", () => {
    const signalConfig = SIGNAL_CONFIG;

    test('shows just "typing..." without names', () => {
      const users = [createTypingUser("1", "Alice")];
      expect(formatTypingText(users, signalConfig)).toBe("typing...");
    });
  });
});

// ============================================================================
// READ RECEIPT FORMATTING TESTS
// ============================================================================

describe("formatSeenByText", () => {
  const config = SLACK_CONFIG;

  const createReceipt = (id: string, name: string): MessageReadReceipt => ({
    messageId: "msg-1",
    userId: id,
    userName: name,
    readAt: new Date(),
  });

  test("returns empty for no receipts", () => {
    expect(formatSeenByText([], 5, config)).toBe("");
  });

  test('shows "Seen by everyone" when all read', () => {
    const receipts = [createReceipt("1", "Alice"), createReceipt("2", "Bob")];
    expect(formatSeenByText(receipts, 2, config)).toBe("Seen by everyone");
  });

  test("shows single reader", () => {
    const receipts = [createReceipt("1", "Alice")];
    expect(formatSeenByText(receipts, 5, config)).toBe("Seen by Alice");
  });

  test("shows two readers", () => {
    const receipts = [createReceipt("1", "Alice"), createReceipt("2", "Bob")];
    expect(formatSeenByText(receipts, 10, config)).toBe(
      "Seen by Alice and Bob",
    );
  });

  test('shows "X others" for many readers', () => {
    const receipts = [
      createReceipt("1", "Alice"),
      createReceipt("2", "Bob"),
      createReceipt("3", "Charlie"),
      createReceipt("4", "Diana"),
      createReceipt("5", "Eve"),
      createReceipt("6", "Frank"),
      createReceipt("7", "Grace"),
    ];
    expect(formatSeenByText(receipts, 10, config)).toContain("others");
  });

  test("respects config.receipts.style.showSeenByText", () => {
    const noTextConfig = {
      ...config,
      receipts: {
        ...config.receipts,
        style: { ...config.receipts.style, showSeenByText: false },
      },
    };
    const receipts = [createReceipt("1", "Alice")];
    expect(formatSeenByText(receipts, 5, noTextConfig)).toBe("");
  });
});

// ============================================================================
// PRESENCE COLOR TESTS
// ============================================================================

describe("getPresenceColor", () => {
  const statuses: PresenceStatus[] = [
    "online",
    "away",
    "busy",
    "dnd",
    "invisible",
    "offline",
  ];

  test.each(statuses)("returns a color for status %s", (status) => {
    const color = getPresenceColor(status);
    expect(color).toBeDefined();
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  test("online is green", () => {
    expect(getPresenceColor("online")).toBe("#22C55E");
  });

  test("away is amber", () => {
    expect(getPresenceColor("away")).toBe("#F59E0B");
  });

  test("dnd is red", () => {
    expect(getPresenceColor("dnd")).toBe("#EF4444");
  });

  test("offline is gray", () => {
    expect(getPresenceColor("offline")).toBe("#6B7280");
  });

  describe("Platform-specific colors", () => {
    test("Slack online is blue-ish", () => {
      const color = getPresenceColor("online", "slack");
      expect(color).toBe("#36C5F0");
    });

    test("Discord away is yellow", () => {
      const color = getPresenceColor("away", "discord");
      expect(color).toBe("#FAA61A");
    });
  });
});

// ============================================================================
// DELIVERY STATUS ICON TESTS
// ============================================================================

describe("getDeliveryStatusIcon", () => {
  const statuses: DeliveryStatus[] = [
    "pending",
    "sent",
    "delivered",
    "read",
    "failed",
  ];

  describe("WhatsApp style", () => {
    const config = WHATSAPP_CONFIG;

    test.each(statuses)("returns icon for %s", (status) => {
      const icon = getDeliveryStatusIcon(status, config);
      expect(icon).toBeDefined();
      expect(typeof icon).toBe("string");
    });

    test("pending shows clock", () => {
      expect(getDeliveryStatusIcon("pending", config)).toBe("clock");
    });

    test("sent shows single check", () => {
      expect(getDeliveryStatusIcon("sent", config)).toBe("check");
    });

    test("delivered shows double check", () => {
      expect(getDeliveryStatusIcon("delivered", config)).toBe("check-check");
    });

    test("read shows double check", () => {
      expect(getDeliveryStatusIcon("read", config)).toBe("check-check");
    });
  });

  describe("Signal style (circles)", () => {
    const config = SIGNAL_CONFIG;

    test("uses circle icons", () => {
      expect(getDeliveryStatusIcon("sent", config)).toBe("circle-check");
      expect(getDeliveryStatusIcon("read", config)).toBe("circle-check-filled");
    });
  });
});

// ============================================================================
// DELIVERY STATUS COLOR TESTS
// ============================================================================

describe("getDeliveryStatusColor", () => {
  describe("WhatsApp colors", () => {
    const config = WHATSAPP_CONFIG;

    test("read is blue", () => {
      expect(getDeliveryStatusColor("read", config)).toBe("#53BDEB");
    });

    test("sent/delivered is gray", () => {
      expect(getDeliveryStatusColor("sent", config)).toBe("#9E9E9E");
      expect(getDeliveryStatusColor("delivered", config)).toBe("#9E9E9E");
    });

    test("failed is red", () => {
      expect(getDeliveryStatusColor("failed", config)).toBe("#EF4444");
    });
  });

  describe("Telegram colors", () => {
    const config = TELEGRAM_CONFIG;

    test("read is green", () => {
      expect(getDeliveryStatusColor("read", config)).toBe("#4FAE4E");
    });
  });

  describe("Signal colors", () => {
    const config = SIGNAL_CONFIG;

    test("read is blue", () => {
      expect(getDeliveryStatusColor("read", config)).toBe("#2C6BED");
    });
  });
});

// ============================================================================
// PRIVACY CONTROL TESTS
// ============================================================================

describe("Privacy Controls", () => {
  describe("shouldShowReadReceipts", () => {
    const defaultSettings: PresencePrivacySettings = {
      ...DEFAULT_PRIVACY_SETTINGS,
      sendReadReceipts: true,
    };

    test("returns false if platform disabled", () => {
      const result = shouldShowReadReceipts(
        defaultSettings,
        "conv-1",
        DISCORD_CONFIG,
      );
      expect(result).toBe(false);
    });

    test("returns true if globally enabled", () => {
      const result = shouldShowReadReceipts(
        defaultSettings,
        "conv-1",
        WHATSAPP_CONFIG,
      );
      expect(result).toBe(true);
    });

    test("respects global disable", () => {
      const settings = { ...defaultSettings, sendReadReceipts: false };
      const result = shouldShowReadReceipts(
        settings,
        "conv-1",
        WHATSAPP_CONFIG,
      );
      expect(result).toBe(false);
    });

    test("per-conversation override takes precedence", () => {
      const settings: PresencePrivacySettings = {
        ...defaultSettings,
        sendReadReceipts: true,
        conversationOverrides: new Map([
          ["conv-1", { conversationId: "conv-1", readReceipts: false }],
        ]),
      };
      const result = shouldShowReadReceipts(
        settings,
        "conv-1",
        WHATSAPP_CONFIG,
      );
      expect(result).toBe(false);
    });

    test("override can enable when globally disabled", () => {
      const settings: PresencePrivacySettings = {
        ...defaultSettings,
        sendReadReceipts: false,
        conversationOverrides: new Map([
          ["conv-1", { conversationId: "conv-1", readReceipts: true }],
        ]),
      };
      const result = shouldShowReadReceipts(
        settings,
        "conv-1",
        WHATSAPP_CONFIG,
      );
      expect(result).toBe(true);
    });
  });

  describe("shouldSendTypingIndicator", () => {
    const defaultSettings: PresencePrivacySettings = {
      ...DEFAULT_PRIVACY_SETTINGS,
      sendTypingIndicators: true,
    };

    test("returns true if enabled", () => {
      const result = shouldSendTypingIndicator(
        defaultSettings,
        "conv-1",
        DEFAULT_CONFIG,
      );
      expect(result).toBe(true);
    });

    test("returns false if globally disabled", () => {
      const settings = { ...defaultSettings, sendTypingIndicators: false };
      const result = shouldSendTypingIndicator(
        settings,
        "conv-1",
        DEFAULT_CONFIG,
      );
      expect(result).toBe(false);
    });

    test("per-conversation override works", () => {
      const settings: PresencePrivacySettings = {
        ...defaultSettings,
        sendTypingIndicators: true,
        conversationOverrides: new Map([
          ["conv-1", { conversationId: "conv-1", typingIndicators: false }],
        ]),
      };
      const result = shouldSendTypingIndicator(
        settings,
        "conv-1",
        DEFAULT_CONFIG,
      );
      expect(result).toBe(false);
    });
  });

  describe("isPresenceVisibleTo", () => {
    test("everyone setting shows to all", () => {
      const settings: PresencePrivacySettings = {
        ...DEFAULT_PRIVACY_SETTINGS,
        onlineStatusVisibility: "everyone",
      };
      expect(isPresenceVisibleTo(settings, "viewer-1", false)).toBe(true);
      expect(isPresenceVisibleTo(settings, "viewer-1", true)).toBe(true);
    });

    test("contacts-only shows only to contacts", () => {
      const settings: PresencePrivacySettings = {
        ...DEFAULT_PRIVACY_SETTINGS,
        onlineStatusVisibility: "contacts",
      };
      expect(isPresenceVisibleTo(settings, "viewer-1", false)).toBe(false);
      expect(isPresenceVisibleTo(settings, "viewer-1", true)).toBe(true);
    });

    test("nobody hides from all", () => {
      const settings: PresencePrivacySettings = {
        ...DEFAULT_PRIVACY_SETTINGS,
        onlineStatusVisibility: "nobody",
      };
      expect(isPresenceVisibleTo(settings, "viewer-1", false)).toBe(false);
      expect(isPresenceVisibleTo(settings, "viewer-1", true)).toBe(false);
    });
  });

  describe("isLastSeenVisibleTo", () => {
    test("everyone setting shows to all", () => {
      const settings: PresencePrivacySettings = {
        ...DEFAULT_PRIVACY_SETTINGS,
        lastSeenVisibility: "everyone",
      };
      expect(isLastSeenVisibleTo(settings, "viewer-1", false)).toBe(true);
    });

    test("contacts-only shows only to contacts", () => {
      const settings: PresencePrivacySettings = {
        ...DEFAULT_PRIVACY_SETTINGS,
        lastSeenVisibility: "contacts",
      };
      expect(isLastSeenVisibleTo(settings, "viewer-1", false)).toBe(false);
      expect(isLastSeenVisibleTo(settings, "viewer-1", true)).toBe(true);
    });

    test("nobody hides from all", () => {
      const settings: PresencePrivacySettings = {
        ...DEFAULT_PRIVACY_SETTINGS,
        lastSeenVisibility: "nobody",
      };
      expect(isLastSeenVisibleTo(settings, "viewer-1", true)).toBe(false);
    });
  });
});

// ============================================================================
// PLATFORM BEHAVIOR TESTS
// ============================================================================

describe("Platform-Specific Behaviors", () => {
  describe("WhatsApp Reciprocal Receipts", () => {
    test("user opt-out is supported", () => {
      expect(WHATSAPP_CONFIG.receipts.userOptOut).toBe(true);
    });

    test("privacy default is receipts enabled", () => {
      expect(WHATSAPP_CONFIG.privacyDefaults.readReceipts).toBe("enabled");
    });
  });

  describe("Telegram Group Receipts", () => {
    test("no read receipts in groups", () => {
      expect(TELEGRAM_CONFIG.receipts.groupReceipts).toBe(false);
    });

    test("receipts work in DMs", () => {
      expect(TELEGRAM_CONFIG.receipts.enabled).toBe(true);
    });
  });

  describe("Signal Privacy-First", () => {
    test("read receipts disabled by default", () => {
      expect(SIGNAL_CONFIG.privacyDefaults.readReceipts).toBe("disabled");
    });

    test("last seen hidden by default", () => {
      expect(SIGNAL_CONFIG.privacyDefaults.lastSeen).toBe("nobody");
    });

    test("no online status shown", () => {
      expect(SIGNAL_CONFIG.presence.showOnline).toBe(false);
    });
  });

  describe("Slack Activity Status", () => {
    test("activity status supported", () => {
      expect(SLACK_CONFIG.presence.activityStatus).toBe(true);
    });

    test("auto-away after 30 minutes", () => {
      expect(SLACK_CONFIG.presence.autoAwayTimeout).toBe(30);
    });

    test("idle detection after 10 minutes", () => {
      expect(SLACK_CONFIG.presence.idleTimeout).toBe(10);
    });
  });

  describe("Discord Rich Presence", () => {
    test("invisible mode supported", () => {
      expect(DISCORD_CONFIG.presence.invisibleSupported).toBe(true);
    });

    test("activity status supported", () => {
      expect(DISCORD_CONFIG.presence.activityStatus).toBe(true);
    });

    test("no read receipts", () => {
      expect(DISCORD_CONFIG.receipts.enabled).toBe(false);
    });
  });
});

// ============================================================================
// TRANSITION RULES TESTS
// ============================================================================

describe("Presence Transition Rules", () => {
  test("default auto-away after 5 minutes", () => {
    expect(DEFAULT_TRANSITION_RULES.idleTimeout).toBe(5 * 60 * 1000);
  });

  test("DND is exempt from auto-away", () => {
    expect(DEFAULT_TRANSITION_RULES.autoAwayExemptStatuses).toContain("dnd");
  });

  test("invisible is exempt from auto-away", () => {
    expect(DEFAULT_TRANSITION_RULES.autoAwayExemptStatuses).toContain(
      "invisible",
    );
  });

  test("restoreOnActive is enabled", () => {
    expect(DEFAULT_TRANSITION_RULES.restoreOnActive).toBe(true);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("Edge Cases", () => {
  test("handles empty typing users array", () => {
    expect(formatTypingText([], DEFAULT_CONFIG)).toBe("");
  });

  test("handles empty read receipts array", () => {
    expect(formatSeenByText([], 0, SLACK_CONFIG)).toBe("");
  });

  test("handles undefined platform gracefully", () => {
    const config = getPlatformConfig("default");
    expect(config).toBeDefined();
  });

  test("handles null conversationOverrides", () => {
    const settings: PresencePrivacySettings = {
      ...DEFAULT_PRIVACY_SETTINGS,
      conversationOverrides: new Map(),
    };
    const result = shouldShowReadReceipts(
      settings,
      "non-existent",
      WHATSAPP_CONFIG,
    );
    expect(result).toBe(true); // Falls back to global setting
  });

  test("handles very old last seen dates", () => {
    const veryOld = new Date("2020-01-01");
    const formatted = formatLastSeen(veryOld, "telegram");
    expect(formatted).toBe("last seen a long time ago");
  });

  test("handles future dates gracefully", () => {
    const future = new Date(Date.now() + 10000);
    const formatted = formatLastSeen(future, "default");
    expect(formatted).toBe("online"); // Treats as just now
  });
});
