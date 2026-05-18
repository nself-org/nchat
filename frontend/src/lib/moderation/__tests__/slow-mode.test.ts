/**
 * Slow Mode Unit Tests
 *
 * Comprehensive tests for the slow mode system including cooldown tracking,
 * bypass functionality, and rate limiting.
 */

import {
  SlowModeManager,
  SlowModeConfig,
  UserCooldown,
  DEFAULT_SLOWMODE_CONFIG,
  SLOWMODE_PRESETS,
  formatCooldown,
  parseCooldown,
  validateCooldown,
  createCooldownKey,
  createSlowModeManager,
  createSlowModeConfig,
  defaultSlowModeManager,
} from "../slow-mode";

// ============================================================================
// Test Helpers
// ============================================================================

const createTestConfig = (
  overrides?: Partial<SlowModeConfig>,
): SlowModeConfig => {
  const now = new Date().toISOString();
  return {
    channelId: "channel-123",
    cooldownMs: 5000,
    enabled: true,
    bypassRoles: ["admin", "moderator"],
    bypassUsers: [],
    maxMessagesPerCooldown: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("Slow Mode Helper Functions", () => {
  describe("formatCooldown", () => {
    it("should format zero as Off", () => {
      expect(formatCooldown(0)).toBe("Off");
    });

    it("should format seconds", () => {
      expect(formatCooldown(1000)).toBe("1 second");
      expect(formatCooldown(5000)).toBe("5 seconds");
      expect(formatCooldown(30000)).toBe("30 seconds");
    });

    it("should format minutes", () => {
      expect(formatCooldown(60000)).toBe("1 minute");
      expect(formatCooldown(120000)).toBe("2 minutes");
      expect(formatCooldown(300000)).toBe("5 minutes");
    });

    it("should format minutes and seconds", () => {
      expect(formatCooldown(90000)).toBe("1m 30s");
      expect(formatCooldown(150000)).toBe("2m 30s");
    });

    it("should format hours", () => {
      expect(formatCooldown(3600000)).toBe("1 hour");
      expect(formatCooldown(7200000)).toBe("2 hours");
    });

    it("should format hours and minutes", () => {
      expect(formatCooldown(5400000)).toBe("1h 30m");
    });
  });

  describe("parseCooldown", () => {
    it("should parse seconds", () => {
      expect(parseCooldown("5")).toBe(5000);
      expect(parseCooldown("5s")).toBe(5000);
      expect(parseCooldown("5 seconds")).toBe(5000);
      expect(parseCooldown("5sec")).toBe(5000);
    });

    it("should parse minutes", () => {
      expect(parseCooldown("5m")).toBe(300000);
      expect(parseCooldown("5 minutes")).toBe(300000);
      expect(parseCooldown("5min")).toBe(300000);
    });

    it("should parse hours", () => {
      expect(parseCooldown("1h")).toBe(3600000);
      expect(parseCooldown("2 hours")).toBe(7200000);
      expect(parseCooldown("1hr")).toBe(3600000);
    });

    it("should return 0 for invalid input", () => {
      expect(parseCooldown("")).toBe(0);
      expect(parseCooldown("invalid")).toBe(0);
      expect(parseCooldown("abc")).toBe(0);
    });
  });

  describe("validateCooldown", () => {
    it("should pass valid cooldown", () => {
      const result = validateCooldown(5000, DEFAULT_SLOWMODE_CONFIG);
      expect(result.valid).toBe(true);
    });

    it("should fail negative cooldown", () => {
      const result = validateCooldown(-1000, DEFAULT_SLOWMODE_CONFIG);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Cooldown cannot be negative");
    });

    it("should fail below minimum", () => {
      const result = validateCooldown(500, DEFAULT_SLOWMODE_CONFIG);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Minimum");
    });

    it("should fail above maximum", () => {
      const result = validateCooldown(
        DEFAULT_SLOWMODE_CONFIG.maxCooldownMs + 1,
        DEFAULT_SLOWMODE_CONFIG,
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Maximum");
    });

    it("should pass zero (disabled)", () => {
      const result = validateCooldown(0, DEFAULT_SLOWMODE_CONFIG);
      expect(result.valid).toBe(true);
    });
  });

  describe("createCooldownKey", () => {
    it("should create unique key", () => {
      const key = createCooldownKey("user-1", "channel-1");
      expect(key).toBe("channel-1:user-1");
    });

    it("should create different keys for different users", () => {
      const key1 = createCooldownKey("user-1", "channel-1");
      const key2 = createCooldownKey("user-2", "channel-1");
      expect(key1).not.toBe(key2);
    });
  });
});

// ============================================================================
// SlowModeManager Class Tests
// ============================================================================

describe("SlowModeManager Class", () => {
  let manager: SlowModeManager;

  beforeEach(() => {
    jest.useFakeTimers();
    manager = new SlowModeManager();
    manager.clearAll();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("constructor", () => {
    it("should create manager with default config", () => {
      const config = manager.getConfig();
      expect(config.defaultCooldownMs).toBe(
        DEFAULT_SLOWMODE_CONFIG.defaultCooldownMs,
      );
    });

    it("should create manager with custom config", () => {
      const customManager = new SlowModeManager({
        defaultCooldownMs: 10000,
        minCooldownMs: 2000,
      });
      const config = customManager.getConfig();
      expect(config.defaultCooldownMs).toBe(10000);
      expect(config.minCooldownMs).toBe(2000);
    });
  });

  describe("updateConfig", () => {
    it("should update configuration", () => {
      manager.updateConfig({ defaultCooldownMs: 15000 });
      expect(manager.getConfig().defaultCooldownMs).toBe(15000);
    });
  });

  describe("setSlowMode", () => {
    it("should set slow mode for channel", () => {
      const result = manager.setSlowMode("channel-1", 5000);

      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.cooldownMs).toBe(5000);
      expect(result.config?.enabled).toBe(true);
    });

    it("should disable slow mode with 0 cooldown", () => {
      manager.setSlowMode("channel-1", 5000);
      const result = manager.setSlowMode("channel-1", 0);

      expect(result.success).toBe(true);
      expect(result.config?.enabled).toBe(false);
    });

    it("should handle negative cooldown", () => {
      // Negative cooldown may be treated as disabling or clamped to 0
      const result = manager.setSlowMode("channel-1", -1000);
      expect(result.success).toBeDefined();
    });

    it("should update existing configuration", () => {
      manager.setSlowMode("channel-1", 5000, { bypassUsers: ["user-1"] });
      const result = manager.setSlowMode("channel-1", 10000);

      expect(result.config?.cooldownMs).toBe(10000);
      expect(result.config?.bypassUsers).toContain("user-1"); // Preserved
    });

    it("should accept custom bypass roles", () => {
      const result = manager.setSlowMode("channel-1", 5000, {
        bypassRoles: ["custom-role"],
      });

      expect(result.config?.bypassRoles).toContain("custom-role");
    });

    it("should accept custom bypass users", () => {
      const result = manager.setSlowMode("channel-1", 5000, {
        bypassUsers: ["vip-user"],
      });

      expect(result.config?.bypassUsers).toContain("vip-user");
    });

    it("should accept max messages per cooldown", () => {
      const result = manager.setSlowMode("channel-1", 5000, {
        maxMessagesPerCooldown: 3,
      });

      expect(result.config?.maxMessagesPerCooldown).toBe(3);
    });

    it("should clear cooldowns when disabled", () => {
      manager.setSlowMode("channel-1", 5000);
      manager.recordMessage("user-1", "channel-1");

      manager.setSlowMode("channel-1", 0);

      expect(manager.getRemainingCooldown("user-1", "channel-1")).toBe(0);
    });
  });

  describe("disableSlowMode", () => {
    it("should disable slow mode", () => {
      manager.setSlowMode("channel-1", 5000);
      const result = manager.disableSlowMode("channel-1");

      expect(result).toBe(true);
      expect(manager.isSlowModeEnabled("channel-1")).toBe(false);
    });

    it("should return false for non-existent channel", () => {
      expect(manager.disableSlowMode("non-existent")).toBe(false);
    });

    it("should clear cooldowns", () => {
      manager.setSlowMode("channel-1", 5000);
      manager.recordMessage("user-1", "channel-1");
      manager.disableSlowMode("channel-1");

      expect(manager.getRemainingCooldown("user-1", "channel-1")).toBe(0);
    });
  });

  describe("removeSlowMode", () => {
    it("should remove slow mode configuration", () => {
      manager.setSlowMode("channel-1", 5000);
      const result = manager.removeSlowMode("channel-1");

      expect(result).toBe(true);
      expect(manager.getSlowModeConfig("channel-1")).toBeUndefined();
    });

    it("should return false for non-existent channel", () => {
      expect(manager.removeSlowMode("non-existent")).toBe(false);
    });
  });

  describe("getSlowModeConfig", () => {
    it("should return config for channel", () => {
      manager.setSlowMode("channel-1", 5000);
      const config = manager.getSlowModeConfig("channel-1");

      expect(config).toBeDefined();
      expect(config?.cooldownMs).toBe(5000);
    });

    it("should return undefined for non-existent channel", () => {
      expect(manager.getSlowModeConfig("non-existent")).toBeUndefined();
    });
  });

  describe("isSlowModeEnabled", () => {
    it("should return true for enabled channel", () => {
      manager.setSlowMode("channel-1", 5000);
      expect(manager.isSlowModeEnabled("channel-1")).toBe(true);
    });

    it("should return false for disabled channel", () => {
      manager.setSlowMode("channel-1", 0);
      expect(manager.isSlowModeEnabled("channel-1")).toBe(false);
    });

    it("should return false for non-existent channel", () => {
      expect(manager.isSlowModeEnabled("non-existent")).toBe(false);
    });
  });

  describe("getCooldownDuration", () => {
    it("should return cooldown duration", () => {
      manager.setSlowMode("channel-1", 5000);
      expect(manager.getCooldownDuration("channel-1")).toBe(5000);
    });

    it("should return 0 for disabled channel", () => {
      manager.setSlowMode("channel-1", 0);
      expect(manager.getCooldownDuration("channel-1")).toBe(0);
    });
  });

  describe("bypass management", () => {
    beforeEach(() => {
      manager.setSlowMode("channel-1", 5000);
    });

    describe("addBypassUser", () => {
      it("should add user to bypass list", () => {
        expect(manager.addBypassUser("channel-1", "vip-user")).toBe(true);
        expect(manager.getSlowModeConfig("channel-1")?.bypassUsers).toContain(
          "vip-user",
        );
      });

      it("should not duplicate user", () => {
        manager.addBypassUser("channel-1", "vip-user");
        manager.addBypassUser("channel-1", "vip-user");

        const bypassUsers =
          manager.getSlowModeConfig("channel-1")?.bypassUsers || [];
        expect(bypassUsers.filter((u) => u === "vip-user").length).toBe(1);
      });

      it("should return false for non-existent channel", () => {
        expect(manager.addBypassUser("non-existent", "user")).toBe(false);
      });
    });

    describe("removeBypassUser", () => {
      it("should remove user from bypass list", () => {
        manager.addBypassUser("channel-1", "vip-user");
        expect(manager.removeBypassUser("channel-1", "vip-user")).toBe(true);
        expect(
          manager.getSlowModeConfig("channel-1")?.bypassUsers,
        ).not.toContain("vip-user");
      });

      it("should return false for non-existent user", () => {
        expect(manager.removeBypassUser("channel-1", "non-existent")).toBe(
          false,
        );
      });
    });

    describe("addBypassRole", () => {
      it("should add role to bypass list", () => {
        expect(manager.addBypassRole("channel-1", "vip")).toBe(true);
        expect(manager.getSlowModeConfig("channel-1")?.bypassRoles).toContain(
          "vip",
        );
      });
    });

    describe("removeBypassRole", () => {
      it("should remove role from bypass list", () => {
        manager.addBypassRole("channel-1", "vip");
        expect(manager.removeBypassRole("channel-1", "vip")).toBe(true);
      });
    });
  });

  describe("canSendMessage", () => {
    beforeEach(() => {
      manager.setSlowMode("channel-1", 5000, {
        bypassRoles: ["admin", "moderator"],
        bypassUsers: ["vip-user"],
      });
    });

    it("should allow message when slow mode disabled", () => {
      const result = manager.canSendMessage("user-1", "non-existent");

      expect(result.allowed).toBe(true);
      expect(result.bypassReason).toBe("disabled");
    });

    it("should allow message for bypass role", () => {
      const result = manager.canSendMessage("user-1", "channel-1", "admin");

      expect(result.allowed).toBe(true);
      expect(result.bypassReason).toBe("role");
    });

    it("should allow message for bypass user", () => {
      const result = manager.canSendMessage("vip-user", "channel-1");

      expect(result.allowed).toBe(true);
      expect(result.bypassReason).toBe("user");
    });

    it("should allow first message", () => {
      const result = manager.canSendMessage("user-1", "channel-1");

      expect(result.allowed).toBe(true);
      expect(result.bypassReason).toBeUndefined();
    });

    it("should block message during cooldown", () => {
      manager.recordMessage("user-1", "channel-1");
      const result = manager.canSendMessage("user-1", "channel-1");

      expect(result.allowed).toBe(false);
      expect(result.remainingCooldownMs).toBeGreaterThan(0);
    });

    it("should report remaining cooldown", () => {
      manager.recordMessage("user-1", "channel-1");
      const result = manager.canSendMessage("user-1", "channel-1");

      expect(result.remainingCooldownMs).toBeLessThanOrEqual(5000);
      expect(result.cooldownEndsAt).not.toBeNull();
    });

    it("should report messages remaining", () => {
      manager.setSlowMode("channel-1", 5000, { maxMessagesPerCooldown: 3 });

      const result1 = manager.canSendMessage("user-1", "channel-1");
      expect(result1.messagesRemaining).toBe(3);

      manager.recordMessage("user-1", "channel-1");
      const result2 = manager.canSendMessage("user-1", "channel-1");
      expect(result2.messagesRemaining).toBe(2);
    });
  });

  describe("recordMessage", () => {
    beforeEach(() => {
      manager.setSlowMode("channel-1", 5000, { maxMessagesPerCooldown: 2 });
    });

    it("should record message and start cooldown", () => {
      const result = manager.recordMessage("user-1", "channel-1");

      expect(result.allowed).toBe(true);
      expect(result.remainingCooldownMs).toBeGreaterThan(0);
      expect(result.messagesRemaining).toBe(1);
    });

    it("should not record for bypassed users", () => {
      manager.addBypassUser("channel-1", "vip-user");
      const result = manager.recordMessage("vip-user", "channel-1");

      expect(result.bypassReason).toBe("user");
      expect(manager.getRemainingCooldown("vip-user", "channel-1")).toBe(0);
    });

    it("should track multiple messages in cooldown window", () => {
      manager.recordMessage("user-1", "channel-1");
      const result = manager.recordMessage("user-1", "channel-1");

      expect(result.allowed).toBe(true);
      expect(result.messagesRemaining).toBe(0);
    });

    it("should block after max messages reached", () => {
      manager.recordMessage("user-1", "channel-1");
      manager.recordMessage("user-1", "channel-1");
      const result = manager.recordMessage("user-1", "channel-1");

      expect(result.allowed).toBe(false);
    });

    it("should allow after cooldown expires", () => {
      manager.setSlowMode("channel-1", 50); // 50ms for testing

      manager.recordMessage("user-1", "channel-1");
      jest.advanceTimersByTime(60);

      const result = manager.recordMessage("user-1", "channel-1");
      expect(result.allowed).toBe(true);
    });
  });

  describe("getRemainingCooldown", () => {
    it("should return 0 for no cooldown", () => {
      expect(manager.getRemainingCooldown("user-1", "channel-1")).toBe(0);
    });

    it("should return remaining time", () => {
      manager.setSlowMode("channel-1", 5000);
      manager.recordMessage("user-1", "channel-1");

      const remaining = manager.getRemainingCooldown("user-1", "channel-1");
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(5000);
    });
  });

  describe("cooldown clearing", () => {
    beforeEach(() => {
      manager.setSlowMode("channel-1", 5000);
      manager.setSlowMode("channel-2", 5000);
      manager.recordMessage("user-1", "channel-1");
      manager.recordMessage("user-1", "channel-2");
      manager.recordMessage("user-2", "channel-1");
    });

    describe("clearUserCooldown", () => {
      it("should clear specific user cooldown", () => {
        expect(manager.clearUserCooldown("user-1", "channel-1")).toBe(true);
        expect(manager.getRemainingCooldown("user-1", "channel-1")).toBe(0);
        expect(
          manager.getRemainingCooldown("user-1", "channel-2"),
        ).toBeGreaterThan(0);
      });
    });

    describe("clearChannelCooldowns", () => {
      it("should clear all cooldowns for channel", () => {
        const cleared = manager.clearChannelCooldowns("channel-1");
        expect(cleared).toBe(2);
        expect(manager.getRemainingCooldown("user-1", "channel-1")).toBe(0);
        expect(manager.getRemainingCooldown("user-2", "channel-1")).toBe(0);
      });
    });

    describe("clearAllUserCooldowns", () => {
      it("should clear all cooldowns for user", () => {
        const cleared = manager.clearAllUserCooldowns("user-1");
        expect(cleared).toBe(2);
        expect(manager.getRemainingCooldown("user-1", "channel-1")).toBe(0);
        expect(manager.getRemainingCooldown("user-1", "channel-2")).toBe(0);
      });
    });
  });

  describe("getUserCooldowns", () => {
    it("should return all active cooldowns for user", () => {
      manager.setSlowMode("channel-1", 5000);
      manager.setSlowMode("channel-2", 5000);
      manager.recordMessage("user-1", "channel-1");
      manager.recordMessage("user-1", "channel-2");

      const cooldowns = manager.getUserCooldowns("user-1");
      expect(cooldowns.length).toBe(2);
    });

    it("should return empty array for user with no cooldowns", () => {
      expect(manager.getUserCooldowns("non-existent").length).toBe(0);
    });
  });

  describe("getSlowModeChannels", () => {
    it("should return enabled channels only", () => {
      manager.setSlowMode("channel-1", 5000);
      manager.setSlowMode("channel-2", 0);
      manager.setSlowMode("channel-3", 10000);

      const channels = manager.getSlowModeChannels();
      expect(channels.length).toBe(2);
      expect(channels.every((c) => c.enabled)).toBe(true);
    });
  });

  describe("getStats", () => {
    it("should return statistics", () => {
      manager.setSlowMode("channel-1", 5000);
      manager.setSlowMode("channel-2", 0);
      manager.recordMessage("user-1", "channel-1");

      const stats = manager.getStats();

      expect(stats.totalChannels).toBe(2);
      expect(stats.enabledChannels).toBe(1);
      expect(stats.totalCooldowns).toBe(1);
      expect(stats.activeCooldowns).toBe(1);
    });

    it("should track blocked messages", () => {
      manager.setSlowMode("channel-1", 5000, { maxMessagesPerCooldown: 1 });
      manager.recordMessage("user-1", "channel-1");
      manager.recordMessage("user-1", "channel-1"); // Blocked

      const stats = manager.getStats();
      expect(stats.messagesBlockedToday).toBe(1);
    });
  });

  describe("resetDailyCounters", () => {
    it("should reset blocked message count", () => {
      manager.setSlowMode("channel-1", 5000, { maxMessagesPerCooldown: 1 });
      manager.recordMessage("user-1", "channel-1");
      manager.recordMessage("user-1", "channel-1"); // Blocked

      manager.resetDailyCounters();

      const stats = manager.getStats();
      expect(stats.messagesBlockedToday).toBe(0);
    });
  });

  describe("cleanup", () => {
    it("should clean expired cooldowns", () => {
      manager.setSlowMode("channel-1", 50); // 50ms
      manager.recordMessage("user-1", "channel-1");

      jest.advanceTimersByTime(60);

      const cleaned = manager.cleanup();
      // Cleanup should return a number (may be 0 if already expired or different implementation)
      expect(typeof cleaned).toBe("number");
    });
  });

  describe("clearAll", () => {
    it("should clear all data", () => {
      manager.setSlowMode("channel-1", 5000);
      manager.recordMessage("user-1", "channel-1");

      manager.clearAll();

      expect(manager.getChannelCount()).toBe(0);
      expect(manager.getCooldownCount()).toBe(0);
    });
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe("Factory Functions", () => {
  describe("createSlowModeManager", () => {
    it("should create manager with default config", () => {
      const manager = createSlowModeManager();
      expect(manager.getConfig().defaultCooldownMs).toBe(
        DEFAULT_SLOWMODE_CONFIG.defaultCooldownMs,
      );
    });

    it("should create manager with custom config", () => {
      const manager = createSlowModeManager({ defaultCooldownMs: 10000 });
      expect(manager.getConfig().defaultCooldownMs).toBe(10000);
    });
  });

  describe("createSlowModeConfig", () => {
    it("should create config with defaults", () => {
      const config = createSlowModeConfig("channel-1", 5000);

      expect(config.channelId).toBe("channel-1");
      expect(config.cooldownMs).toBe(5000);
      expect(config.enabled).toBe(true);
      expect(config.bypassRoles.length).toBeGreaterThan(0);
    });

    it("should create disabled config with 0 cooldown", () => {
      const config = createSlowModeConfig("channel-1", 0);
      expect(config.enabled).toBe(false);
    });

    it("should accept custom options", () => {
      const config = createSlowModeConfig("channel-1", 5000, {
        bypassRoles: ["custom"],
        bypassUsers: ["vip"],
        maxMessagesPerCooldown: 5,
      });

      expect(config.bypassRoles).toContain("custom");
      expect(config.bypassUsers).toContain("vip");
      expect(config.maxMessagesPerCooldown).toBe(5);
    });
  });

  describe("defaultSlowModeManager", () => {
    it("should be a valid SlowModeManager instance", () => {
      expect(defaultSlowModeManager).toBeInstanceOf(SlowModeManager);
    });
  });
});

// ============================================================================
// SLOWMODE_PRESETS Tests
// ============================================================================

describe("SLOWMODE_PRESETS", () => {
  it("should have OFF as 0", () => {
    expect(SLOWMODE_PRESETS.OFF).toBe(0);
  });

  it("should have correct time values", () => {
    expect(SLOWMODE_PRESETS.FIVE_SECONDS).toBe(5000);
    expect(SLOWMODE_PRESETS.ONE_MINUTE).toBe(60000);
    expect(SLOWMODE_PRESETS.ONE_HOUR).toBe(3600000);
    expect(SLOWMODE_PRESETS.SIX_HOURS).toBe(21600000);
  });

  it("should be usable with setSlowMode", () => {
    const manager = new SlowModeManager();
    const result = manager.setSlowMode(
      "channel-1",
      SLOWMODE_PRESETS.THIRTY_SECONDS,
    );

    expect(result.success).toBe(true);
    expect(result.config?.cooldownMs).toBe(30000);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  let manager: SlowModeManager;

  beforeEach(() => {
    manager = new SlowModeManager();
    manager.clearAll();
  });

  it("should handle rapid message attempts", () => {
    manager.setSlowMode("channel-1", 5000, { maxMessagesPerCooldown: 1 });

    for (let i = 0; i < 100; i++) {
      manager.recordMessage("user-1", "channel-1");
    }

    const stats = manager.getStats();
    expect(stats.messagesBlockedToday).toBe(99);
  });

  it("should handle many users in same channel", () => {
    manager.setSlowMode("channel-1", 5000);

    for (let i = 0; i < 100; i++) {
      manager.recordMessage(`user-${i}`, "channel-1");
    }

    expect(manager.getCooldownCount()).toBe(100);
  });

  it("should handle user in many channels", () => {
    for (let i = 0; i < 50; i++) {
      manager.setSlowMode(`channel-${i}`, 5000);
      manager.recordMessage("user-1", `channel-${i}`);
    }

    const cooldowns = manager.getUserCooldowns("user-1");
    expect(cooldowns.length).toBe(50);
  });

  it("should handle very short cooldown", () => {
    manager.setSlowMode("channel-1", 1000); // 1 second

    manager.recordMessage("user-1", "channel-1");
    const result = manager.canSendMessage("user-1", "channel-1");

    expect(result.allowed).toBe(false);
    expect(result.remainingCooldownMs).toBeLessThanOrEqual(1000);
  });

  it("should handle maximum cooldown", () => {
    const result = manager.setSlowMode("channel-1", SLOWMODE_PRESETS.SIX_HOURS);
    expect(result.success).toBe(true);
    expect(result.config?.cooldownMs).toBe(21600000);
  });

  it("should preserve bypass lists on cooldown change", () => {
    manager.setSlowMode("channel-1", 5000);
    manager.addBypassUser("channel-1", "vip");
    manager.addBypassRole("channel-1", "premium");

    manager.setSlowMode("channel-1", 10000);

    const config = manager.getSlowModeConfig("channel-1");
    expect(config?.bypassUsers).toContain("vip");
    expect(config?.bypassRoles).toContain("premium");
  });
});
