/**
 * Message Semantics Types Tests
 *
 * Tests for platform configuration, helper functions, and time window calculations.
 */

import {
  PLATFORM_EDIT_WINDOWS,
  PLATFORM_DELETE_WINDOWS,
  DEFAULT_MESSAGE_SEMANTICS,
  DEFAULT_UNDO_CONFIG,
  getEditWindow,
  getDeleteWindow,
  isWithinEditWindow,
  isWithinDeleteWindow,
  getRemainingEditTime,
  getRemainingDeleteTime,
  formatRemainingTime,
  type MessageSemanticsConfig,
  type MessagePlatformStyle,
} from "../message-semantics";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createConfig = (
  overrides: Partial<MessageSemanticsConfig> = {},
): MessageSemanticsConfig => ({
  ...DEFAULT_MESSAGE_SEMANTICS,
  ...overrides,
});

// ============================================================================
// PLATFORM CONFIGURATION TESTS
// ============================================================================

describe("Platform Configurations", () => {
  describe("Edit Windows", () => {
    it("should have all platform styles defined", () => {
      const platforms: MessagePlatformStyle[] = [
        "whatsapp",
        "telegram",
        "signal",
        "slack",
        "discord",
        "custom",
      ];

      platforms.forEach((platform) => {
        expect(PLATFORM_EDIT_WINDOWS[platform]).toBeDefined();
        expect(PLATFORM_EDIT_WINDOWS[platform].description).toBeDefined();
      });
    });

    it("should have WhatsApp 15-minute edit window", () => {
      const window = PLATFORM_EDIT_WINDOWS.whatsapp;
      expect(window.enabled).toBe(true);
      expect(window.windowSeconds).toBe(15 * 60);
    });

    it("should have Telegram 48-hour edit window", () => {
      const window = PLATFORM_EDIT_WINDOWS.telegram;
      expect(window.enabled).toBe(true);
      expect(window.windowSeconds).toBe(48 * 60 * 60);
    });

    it("should have Signal editing disabled", () => {
      const window = PLATFORM_EDIT_WINDOWS.signal;
      expect(window.enabled).toBe(false);
    });

    it("should have Slack unlimited edit window", () => {
      const window = PLATFORM_EDIT_WINDOWS.slack;
      expect(window.enabled).toBe(true);
      expect(window.windowSeconds).toBe(0); // 0 = unlimited
    });

    it("should have Discord unlimited edit window", () => {
      const window = PLATFORM_EDIT_WINDOWS.discord;
      expect(window.enabled).toBe(true);
      expect(window.windowSeconds).toBe(0);
    });
  });

  describe("Delete Windows", () => {
    it("should have all platform styles defined", () => {
      const platforms: MessagePlatformStyle[] = [
        "whatsapp",
        "telegram",
        "signal",
        "slack",
        "discord",
        "custom",
      ];

      platforms.forEach((platform) => {
        expect(PLATFORM_DELETE_WINDOWS[platform]).toBeDefined();
      });
    });

    it("should have WhatsApp 2-day delete-for-everyone window", () => {
      const window = PLATFORM_DELETE_WINDOWS.whatsapp;
      expect(window.deleteForEveryoneEnabled).toBe(true);
      expect(window.deleteForEveryoneWindowSeconds).toBe(2 * 24 * 60 * 60);
      expect(window.deleteForMeAlways).toBe(true);
    });

    it("should have Telegram 48-hour window with unlimited self-delete", () => {
      const window = PLATFORM_DELETE_WINDOWS.telegram;
      expect(window.deleteForEveryoneWindowSeconds).toBe(48 * 60 * 60);
      expect(window.selfDeleteUnlimited).toBe(true);
    });

    it("should have Signal unlimited delete window", () => {
      const window = PLATFORM_DELETE_WINDOWS.signal;
      expect(window.deleteForEveryoneWindowSeconds).toBe(0);
      expect(window.deleteForEveryoneEnabled).toBe(true);
    });

    it("should have Slack without delete-for-me", () => {
      const window = PLATFORM_DELETE_WINDOWS.slack;
      expect(window.deleteForMeAlways).toBe(false);
    });

    it("should have Discord without delete-for-me", () => {
      const window = PLATFORM_DELETE_WINDOWS.discord;
      expect(window.deleteForMeAlways).toBe(false);
    });
  });
});

// ============================================================================
// DEFAULT CONFIG TESTS
// ============================================================================

describe("Default Configurations", () => {
  it("should have default message semantics", () => {
    expect(DEFAULT_MESSAGE_SEMANTICS.platformStyle).toBe("slack");
    expect(DEFAULT_MESSAGE_SEMANTICS.trackEditHistory).toBe(true);
    expect(DEFAULT_MESSAGE_SEMANTICS.showEditedIndicator).toBe(true);
    expect(DEFAULT_MESSAGE_SEMANTICS.enableUndo).toBe(true);
    expect(DEFAULT_MESSAGE_SEMANTICS.undoWindowSeconds).toBe(5);
  });

  it("should have default undo config", () => {
    expect(DEFAULT_UNDO_CONFIG.enabled).toBe(true);
    expect(DEFAULT_UNDO_CONFIG.windowSeconds).toBe(5);
    expect(DEFAULT_UNDO_CONFIG.supportedActions).toContain("send");
    expect(DEFAULT_UNDO_CONFIG.supportedActions).toContain("edit");
    expect(DEFAULT_UNDO_CONFIG.supportedActions).toContain("delete");
  });
});

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe("getEditWindow", () => {
  it("should return platform default when no custom window", () => {
    const config = createConfig({ platformStyle: "whatsapp" });
    const window = getEditWindow(config);

    expect(window.windowSeconds).toBe(15 * 60);
  });

  it("should return custom window when set", () => {
    const config = createConfig({
      platformStyle: "whatsapp",
      customEditWindowSeconds: 3600, // 1 hour
    });
    const window = getEditWindow(config);

    expect(window.windowSeconds).toBe(3600);
    expect(window.description).toBe("Custom configuration");
  });

  it("should handle zero custom window (unlimited)", () => {
    const config = createConfig({
      platformStyle: "whatsapp",
      customEditWindowSeconds: 0,
    });
    const window = getEditWindow(config);

    expect(window.windowSeconds).toBe(0);
  });
});

describe("getDeleteWindow", () => {
  it("should return platform default when no custom window", () => {
    const config = createConfig({ platformStyle: "whatsapp" });
    const window = getDeleteWindow(config);

    expect(window.deleteForEveryoneWindowSeconds).toBe(2 * 24 * 60 * 60);
  });

  it("should return custom window when set", () => {
    const config = createConfig({
      platformStyle: "whatsapp",
      customDeleteWindowSeconds: 86400, // 1 day
    });
    const window = getDeleteWindow(config);

    expect(window.deleteForEveryoneWindowSeconds).toBe(86400);
  });

  it("should preserve other platform properties when customizing", () => {
    const config = createConfig({
      platformStyle: "telegram",
      customDeleteWindowSeconds: 3600,
    });
    const window = getDeleteWindow(config);

    expect(window.deleteForEveryoneWindowSeconds).toBe(3600);
    expect(window.selfDeleteUnlimited).toBe(true); // Preserved from Telegram
  });
});

// ============================================================================
// TIME WINDOW CHECK TESTS
// ============================================================================

describe("isWithinEditWindow", () => {
  it("should return true for message within window", () => {
    const config = createConfig({ platformStyle: "whatsapp" }); // 15 min window
    const messageTime = new Date(Date.now() - 10 * 60 * 1000); // 10 min ago

    expect(isWithinEditWindow(messageTime, config)).toBe(true);
  });

  it("should return false for message outside window", () => {
    const config = createConfig({ platformStyle: "whatsapp" }); // 15 min window
    const messageTime = new Date(Date.now() - 20 * 60 * 1000); // 20 min ago

    expect(isWithinEditWindow(messageTime, config)).toBe(false);
  });

  it("should return true for unlimited window (Slack)", () => {
    const config = createConfig({ platformStyle: "slack" });
    const messageTime = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago

    expect(isWithinEditWindow(messageTime, config)).toBe(true);
  });

  it("should return false for disabled editing (Signal)", () => {
    const config = createConfig({ platformStyle: "signal" });
    const messageTime = new Date(); // Just now

    expect(isWithinEditWindow(messageTime, config)).toBe(false);
  });

  it("should handle boundary case (exact expiry time)", () => {
    const config = createConfig({ platformStyle: "whatsapp" }); // 15 min window
    const messageTime = new Date(Date.now() - 15 * 60 * 1000); // Exactly 15 min ago

    // At exactly the boundary, should still be within window
    expect(isWithinEditWindow(messageTime, config)).toBe(true);
  });
});

describe("isWithinDeleteWindow", () => {
  it("should return true for message within window", () => {
    const config = createConfig({ platformStyle: "whatsapp" }); // 2 day window
    const messageTime = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

    expect(isWithinDeleteWindow(messageTime, config, false)).toBe(true);
  });

  it("should return false for message outside window", () => {
    const config = createConfig({ platformStyle: "whatsapp" }); // 2 day window
    const messageTime = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

    expect(isWithinDeleteWindow(messageTime, config, false)).toBe(false);
  });

  it("should return true for unlimited self-delete (Telegram)", () => {
    const config = createConfig({ platformStyle: "telegram" });
    const messageTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    expect(isWithinDeleteWindow(messageTime, config, true)).toBe(true); // isOwnMessage = true
  });

  it("should return true for unlimited window (Signal)", () => {
    const config = createConfig({ platformStyle: "signal" });
    const messageTime = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago

    expect(isWithinDeleteWindow(messageTime, config, false)).toBe(true);
  });
});

// ============================================================================
// REMAINING TIME TESTS
// ============================================================================

describe("getRemainingEditTime", () => {
  it("should return correct remaining time", () => {
    const config = createConfig({ platformStyle: "whatsapp" }); // 15 min window
    const messageTime = new Date(Date.now() - 10 * 60 * 1000); // 10 min ago

    const remaining = getRemainingEditTime(messageTime, config);

    // Should be approximately 5 minutes (300 seconds)
    expect(remaining).toBeGreaterThan(4 * 60);
    expect(remaining).toBeLessThan(6 * 60);
  });

  it("should return 0 for expired window", () => {
    const config = createConfig({ platformStyle: "whatsapp" }); // 15 min window
    const messageTime = new Date(Date.now() - 20 * 60 * 1000); // 20 min ago

    expect(getRemainingEditTime(messageTime, config)).toBe(0);
  });

  it("should return Infinity for unlimited window", () => {
    const config = createConfig({ platformStyle: "slack" });
    const messageTime = new Date();

    expect(getRemainingEditTime(messageTime, config)).toBe(Infinity);
  });

  it("should return 0 for disabled editing", () => {
    const config = createConfig({ platformStyle: "signal" });
    const messageTime = new Date();

    expect(getRemainingEditTime(messageTime, config)).toBe(0);
  });
});

describe("getRemainingDeleteTime", () => {
  it("should return correct remaining time", () => {
    const config = createConfig({ platformStyle: "whatsapp" }); // 2 day window
    const messageTime = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

    const remaining = getRemainingDeleteTime(messageTime, config);

    // Should be approximately 1 day (86400 seconds)
    expect(remaining).toBeGreaterThan(23 * 60 * 60);
    expect(remaining).toBeLessThan(25 * 60 * 60);
  });

  it("should return 0 for expired window", () => {
    const config = createConfig({ platformStyle: "whatsapp" }); // 2 day window
    const messageTime = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

    expect(getRemainingDeleteTime(messageTime, config)).toBe(0);
  });

  it("should return Infinity for unlimited window", () => {
    const config = createConfig({ platformStyle: "signal" });
    const messageTime = new Date();

    expect(getRemainingDeleteTime(messageTime, config)).toBe(Infinity);
  });
});

// ============================================================================
// FORMAT REMAINING TIME TESTS
// ============================================================================

describe("formatRemainingTime", () => {
  it("should format seconds correctly", () => {
    expect(formatRemainingTime(30)).toBe("30 seconds");
    expect(formatRemainingTime(1)).toBe("1 seconds"); // Grammatically could be improved
    expect(formatRemainingTime(59)).toBe("59 seconds");
  });

  it("should format minutes correctly", () => {
    expect(formatRemainingTime(60)).toBe("1 minute");
    expect(formatRemainingTime(120)).toBe("2 minutes");
    expect(formatRemainingTime(3599)).toBe("60 minutes");
  });

  it("should format hours correctly", () => {
    expect(formatRemainingTime(3600)).toBe("1 hour");
    expect(formatRemainingTime(7200)).toBe("2 hours");
    expect(formatRemainingTime(86399)).toBe("24 hours");
  });

  it("should format days correctly", () => {
    expect(formatRemainingTime(86400)).toBe("1 day");
    expect(formatRemainingTime(172800)).toBe("2 days");
  });

  it("should handle edge cases", () => {
    expect(formatRemainingTime(0)).toBe("expired");
    expect(formatRemainingTime(-1)).toBe("expired");
    expect(formatRemainingTime(Infinity)).toBe("unlimited");
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("Integration Tests", () => {
  it("should work end-to-end for WhatsApp style", () => {
    const config = createConfig({ platformStyle: "whatsapp" });

    // Fresh message
    const freshMessage = new Date();
    expect(isWithinEditWindow(freshMessage, config)).toBe(true);
    expect(isWithinDeleteWindow(freshMessage, config, false)).toBe(true);

    // 10 min old message
    const tenMinOld = new Date(Date.now() - 10 * 60 * 1000);
    expect(isWithinEditWindow(tenMinOld, config)).toBe(true);
    expect(isWithinDeleteWindow(tenMinOld, config, false)).toBe(true);

    // 20 min old message
    const twentyMinOld = new Date(Date.now() - 20 * 60 * 1000);
    expect(isWithinEditWindow(twentyMinOld, config)).toBe(false); // Edit expired
    expect(isWithinDeleteWindow(twentyMinOld, config, false)).toBe(true); // Delete still valid

    // 3 day old message
    const threeDayOld = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(isWithinEditWindow(threeDayOld, config)).toBe(false);
    expect(isWithinDeleteWindow(threeDayOld, config, false)).toBe(false);
  });

  it("should work end-to-end for Telegram style", () => {
    const config = createConfig({ platformStyle: "telegram" });

    // 24 hour old message
    const oneDayOld = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(isWithinEditWindow(oneDayOld, config)).toBe(true);
    expect(isWithinDeleteWindow(oneDayOld, config, false)).toBe(true);

    // 3 day old message (outside window)
    const threeDayOld = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(isWithinEditWindow(threeDayOld, config)).toBe(false);
    expect(isWithinDeleteWindow(threeDayOld, config, false)).toBe(false);

    // But self-delete is unlimited
    expect(isWithinDeleteWindow(threeDayOld, config, true)).toBe(true);
  });

  it("should work end-to-end for Slack style (unlimited)", () => {
    const config = createConfig({ platformStyle: "slack" });

    // Very old message
    const veryOld = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    expect(isWithinEditWindow(veryOld, config)).toBe(true);
    expect(isWithinDeleteWindow(veryOld, config, false)).toBe(true);
  });

  it("should work with custom windows", () => {
    const config = createConfig({
      platformStyle: "whatsapp",
      customEditWindowSeconds: 60, // 1 minute
      customDeleteWindowSeconds: 120, // 2 minutes
    });

    // 30 second old message
    const thirtySecOld = new Date(Date.now() - 30 * 1000);
    expect(isWithinEditWindow(thirtySecOld, config)).toBe(true);
    expect(isWithinDeleteWindow(thirtySecOld, config, false)).toBe(true);

    // 90 second old message
    const ninetySecOld = new Date(Date.now() - 90 * 1000);
    expect(isWithinEditWindow(ninetySecOld, config)).toBe(false);
    expect(isWithinDeleteWindow(ninetySecOld, config, false)).toBe(true);

    // 3 minute old message
    const threeMinOld = new Date(Date.now() - 3 * 60 * 1000);
    expect(isWithinEditWindow(threeMinOld, config)).toBe(false);
    expect(isWithinDeleteWindow(threeMinOld, config, false)).toBe(false);
  });
});
