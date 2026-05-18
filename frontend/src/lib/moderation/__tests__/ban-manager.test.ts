/**
 * Ban Manager Unit Tests
 *
 * Comprehensive tests for the ban management system including ban creation,
 * expiration, history tracking, and IP bans.
 */

import {
  BanManager,
  Ban,
  IpBan,
  CreateBanInput,
  BanFilter,
  DEFAULT_BAN_CONFIG,
  BAN_DURATIONS,
  generateBanId,
  generateHistoryId,
  generateIpBanId,
  isBanExpired,
  isBanActive,
  calculateExpiresAt,
  getRemainingTime,
  formatDuration,
  isValidIpAddress,
  validateBanInput,
  createBanManager,
  createBanInput,
  defaultBanManager,
} from "../ban-manager";

// ============================================================================
// Test Helpers
// ============================================================================

const createTestBanInput = (
  overrides?: Partial<CreateBanInput>,
): CreateBanInput => ({
  userId: "user-123",
  userName: "Test User",
  moderatorId: "mod-456",
  moderatorName: "Test Moderator",
  reason: "Test ban reason",
  durationMs: BAN_DURATIONS.ONE_DAY,
  ...overrides,
});

const createExpiredBan = (): Ban => ({
  id: "ban-expired",
  userId: "user-expired",
  channelId: null,
  moderatorId: "mod-1",
  reason: "Expired ban",
  type: "temporary",
  expiresAt: new Date(Date.now() - 10000).toISOString(),
  createdAt: new Date(Date.now() - 100000).toISOString(),
  updatedAt: new Date(Date.now() - 100000).toISOString(),
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("Ban Manager Helper Functions", () => {
  describe("generateBanId", () => {
    it("should generate unique IDs", () => {
      const id1 = generateBanId();
      const id2 = generateBanId();
      expect(id1).not.toBe(id2);
    });

    it("should generate string IDs starting with ban-", () => {
      const id = generateBanId();
      expect(typeof id).toBe("string");
      expect(id.startsWith("ban-")).toBe(true);
    });
  });

  describe("generateHistoryId", () => {
    it("should generate unique IDs starting with history-", () => {
      const id = generateHistoryId();
      expect(id.startsWith("history-")).toBe(true);
    });
  });

  describe("generateIpBanId", () => {
    it("should generate unique IDs starting with ipban-", () => {
      const id = generateIpBanId();
      expect(id.startsWith("ipban-")).toBe(true);
    });
  });

  describe("isBanExpired", () => {
    it("should return true for expired ban", () => {
      const ban = createExpiredBan();
      expect(isBanExpired(ban)).toBe(true);
    });

    it("should return false for active ban", () => {
      const ban: Ban = {
        ...createExpiredBan(),
        expiresAt: new Date(Date.now() + 100000).toISOString(),
      };
      expect(isBanExpired(ban)).toBe(false);
    });

    it("should return false for permanent ban", () => {
      const ban: Ban = {
        ...createExpiredBan(),
        expiresAt: null,
      };
      expect(isBanExpired(ban)).toBe(false);
    });
  });

  describe("isBanActive", () => {
    it("should return true for active ban", () => {
      const ban: Ban = {
        ...createExpiredBan(),
        expiresAt: new Date(Date.now() + 100000).toISOString(),
      };
      expect(isBanActive(ban)).toBe(true);
    });

    it("should return false for expired ban", () => {
      const ban = createExpiredBan();
      expect(isBanActive(ban)).toBe(false);
    });

    it("should return true for permanent ban", () => {
      const ban: Ban = {
        ...createExpiredBan(),
        expiresAt: null,
      };
      expect(isBanActive(ban)).toBe(true);
    });
  });

  describe("calculateExpiresAt", () => {
    it("should return null for undefined duration", () => {
      expect(calculateExpiresAt(undefined)).toBeNull();
    });

    it("should calculate future date for duration", () => {
      const before = Date.now();
      const expiresAt = calculateExpiresAt(60000); // 1 minute
      const after = Date.now();

      expect(expiresAt).not.toBeNull();
      const expiresTime = new Date(expiresAt!).getTime();
      expect(expiresTime).toBeGreaterThanOrEqual(before + 60000);
      expect(expiresTime).toBeLessThanOrEqual(after + 60000);
    });
  });

  describe("getRemainingTime", () => {
    it("should return null for permanent ban", () => {
      const ban: Ban = {
        ...createExpiredBan(),
        expiresAt: null,
      };
      expect(getRemainingTime(ban)).toBeNull();
    });

    it("should return 0 for expired ban", () => {
      const ban = createExpiredBan();
      expect(getRemainingTime(ban)).toBe(0);
    });

    it("should return positive value for active ban", () => {
      const ban: Ban = {
        ...createExpiredBan(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      };
      const remaining = getRemainingTime(ban);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(60000);
    });
  });

  describe("formatDuration", () => {
    it("should format seconds", () => {
      expect(formatDuration(5000)).toBe("5 seconds");
      expect(formatDuration(1000)).toBe("1 second");
    });

    it("should format minutes", () => {
      expect(formatDuration(120000)).toBe("2 minutes");
      expect(formatDuration(60000)).toBe("1 minute");
    });

    it("should format hours", () => {
      expect(formatDuration(7200000)).toBe("2 hours");
      expect(formatDuration(3600000)).toBe("1 hour");
    });

    it("should format days", () => {
      expect(formatDuration(172800000)).toBe("2 days");
      expect(formatDuration(86400000)).toBe("1 day");
    });
  });

  describe("isValidIpAddress", () => {
    it("should validate IPv4 addresses", () => {
      expect(isValidIpAddress("192.168.1.1")).toBe(true);
      expect(isValidIpAddress("0.0.0.0")).toBe(true);
      expect(isValidIpAddress("255.255.255.255")).toBe(true);
    });

    it("should reject invalid IPv4 addresses", () => {
      expect(isValidIpAddress("256.1.1.1")).toBe(false);
      expect(isValidIpAddress("1.2.3")).toBe(false);
      expect(isValidIpAddress("1.2.3.4.5")).toBe(false);
    });

    it("should validate IPv6 addresses", () => {
      expect(isValidIpAddress("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe(
        true,
      );
    });

    it("should reject invalid formats", () => {
      expect(isValidIpAddress("not-an-ip")).toBe(false);
      expect(isValidIpAddress("")).toBe(false);
    });
  });

  describe("validateBanInput", () => {
    it("should pass valid input", () => {
      const input = createTestBanInput();
      const result = validateBanInput(input, DEFAULT_BAN_CONFIG);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail without user ID", () => {
      const input = createTestBanInput({ userId: "" });
      const result = validateBanInput(input, DEFAULT_BAN_CONFIG);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("User ID is required");
    });

    it("should fail without moderator ID", () => {
      const input = createTestBanInput({ moderatorId: "" });
      const result = validateBanInput(input, DEFAULT_BAN_CONFIG);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Moderator ID is required");
    });

    it("should fail with short reason", () => {
      const input = createTestBanInput({ reason: "ab" });
      const result = validateBanInput(input, DEFAULT_BAN_CONFIG);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Reason"))).toBe(true);
    });

    it("should fail with negative duration", () => {
      const input = createTestBanInput({ durationMs: -1000 });
      const result = validateBanInput(input, DEFAULT_BAN_CONFIG);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Duration must be positive");
    });

    it("should fail with excessive duration", () => {
      const input = createTestBanInput({
        durationMs: DEFAULT_BAN_CONFIG.maxBanDurationMs + 1,
      });
      const result = validateBanInput(input, DEFAULT_BAN_CONFIG);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("exceeds maximum"))).toBe(
        true,
      );
    });

    it("should fail permanent ban when not allowed", () => {
      const config = { ...DEFAULT_BAN_CONFIG, allowPermanentBans: false };
      const input = createTestBanInput({ durationMs: undefined });
      const result = validateBanInput(input, config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Permanent bans are not allowed");
    });

    it("should fail with invalid IP address", () => {
      const input = createTestBanInput({ ipAddress: "invalid" });
      const result = validateBanInput(input, DEFAULT_BAN_CONFIG);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid IP address format");
    });
  });
});

// ============================================================================
// BanManager Class Tests
// ============================================================================

describe("BanManager Class", () => {
  let manager: BanManager;

  beforeEach(() => {
    manager = new BanManager();
    manager.clearAll();
  });

  describe("constructor", () => {
    it("should create manager with default config", () => {
      const config = manager.getConfig();
      expect(config.maxBanDurationMs).toBe(DEFAULT_BAN_CONFIG.maxBanDurationMs);
      expect(config.allowPermanentBans).toBe(
        DEFAULT_BAN_CONFIG.allowPermanentBans,
      );
    });

    it("should create manager with custom config", () => {
      const customManager = new BanManager({
        maxBanDurationMs: 999999,
        allowPermanentBans: false,
      });
      const config = customManager.getConfig();
      expect(config.maxBanDurationMs).toBe(999999);
      expect(config.allowPermanentBans).toBe(false);
    });
  });

  describe("updateConfig", () => {
    it("should update configuration", () => {
      manager.updateConfig({ allowPermanentBans: false });
      expect(manager.getConfig().allowPermanentBans).toBe(false);
    });
  });

  describe("banUser", () => {
    it("should create temporary ban successfully", () => {
      const input = createTestBanInput();
      const result = manager.banUser(input);

      expect(result.success).toBe(true);
      expect(result.ban).toBeDefined();
      expect(result.ban?.userId).toBe(input.userId);
      expect(result.ban?.type).toBe("temporary");
      expect(result.ban?.expiresAt).not.toBeNull();
    });

    it("should create permanent ban successfully", () => {
      const input = createTestBanInput({ durationMs: undefined });
      const result = manager.banUser(input);

      expect(result.success).toBe(true);
      expect(result.ban?.type).toBe("permanent");
      expect(result.ban?.expiresAt).toBeNull();
    });

    it("should create channel-specific ban", () => {
      const input = createTestBanInput({ channelId: "channel-1" });
      const result = manager.banUser(input);

      expect(result.success).toBe(true);
      expect(result.ban?.channelId).toBe("channel-1");
    });

    it("should create server-wide ban", () => {
      const input = createTestBanInput({ channelId: null });
      const result = manager.banUser(input);

      expect(result.success).toBe(true);
      expect(result.ban?.channelId).toBeNull();
    });

    it("should reject duplicate ban in same scope", () => {
      const input = createTestBanInput();
      manager.banUser(input);

      const result = manager.banUser(input);
      expect(result.success).toBe(false);
      expect(result.errors).toContain("User is already banned in this scope");
    });

    it("should allow ban in different scope", () => {
      manager.banUser(createTestBanInput({ channelId: "channel-1" }));
      const result = manager.banUser(
        createTestBanInput({ channelId: "channel-2" }),
      );

      expect(result.success).toBe(true);
    });

    it("should record ban history", () => {
      const input = createTestBanInput();
      const { ban } = manager.banUser(input);

      const history = manager.getBanHistory(ban!.id);
      expect(history.length).toBe(1);
      expect(history[0].action).toBe("created");
    });

    it("should also ban IP when specified", () => {
      const input = createTestBanInput({ ipAddress: "192.168.1.1" });
      manager.banUser(input);

      expect(manager.isIpBanned("192.168.1.1")).toBe(true);
    });

    it("should return validation errors", () => {
      const input = createTestBanInput({ userId: "" });
      const result = manager.banUser(input);

      expect(result.success).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe("unbanUser", () => {
    it("should unban user successfully", () => {
      const { ban } = manager.banUser(createTestBanInput());
      const result = manager.unbanUser(ban!.id, "mod-1", "Unbanned");

      expect(result.success).toBe(true);
      expect(manager.getBan(ban!.id)).toBeUndefined();
    });

    it("should record history on unban", () => {
      const { ban } = manager.banUser(createTestBanInput());
      manager.unbanUser(ban!.id, "mod-1", "Unbanned");

      const history = manager.getBanHistory(ban!.id);
      expect(history.some((h) => h.action === "lifted")).toBe(true);
    });

    it("should return error for non-existent ban", () => {
      const result = manager.unbanUser("non-existent", "mod-1");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Ban not found");
    });
  });

  describe("unbanUserById", () => {
    it("should unban all bans for user", () => {
      manager.banUser(createTestBanInput({ channelId: "channel-1" }));
      manager.banUser(createTestBanInput({ channelId: "channel-2" }));

      const result = manager.unbanUserById("user-123", "mod-1");

      expect(result.success).toBe(true);
      expect(result.unbannedCount).toBe(2);
    });

    it("should unban only specific channel", () => {
      manager.banUser(createTestBanInput({ channelId: "channel-1" }));
      manager.banUser(createTestBanInput({ channelId: "channel-2" }));

      const result = manager.unbanUserById("user-123", "mod-1", "channel-1");

      expect(result.unbannedCount).toBe(1);
      expect(manager.isUserBanned("user-123", "channel-2")).toBe(true);
    });
  });

  describe("updateBan", () => {
    it("should update ban reason", () => {
      const { ban } = manager.banUser(createTestBanInput());
      const result = manager.updateBan(ban!.id, {
        reason: "Updated reason",
        moderatorId: "mod-1",
      });

      expect(result.success).toBe(true);
      expect(result.ban?.reason).toBe("Updated reason");
    });

    it("should extend ban duration", () => {
      const { ban } = manager.banUser(
        createTestBanInput({ durationMs: BAN_DURATIONS.ONE_DAY }),
      );
      const originalExpires = ban!.expiresAt;

      const result = manager.updateBan(ban!.id, {
        durationMs: BAN_DURATIONS.ONE_WEEK,
        moderatorId: "mod-1",
      });

      expect(result.success).toBe(true);
      expect(new Date(result.ban!.expiresAt!).getTime()).toBeGreaterThan(
        new Date(originalExpires!).getTime(),
      );

      const history = manager.getBanHistory(ban!.id);
      expect(history.some((h) => h.action === "extended")).toBe(true);
    });

    it("should reduce ban duration", () => {
      const { ban } = manager.banUser(
        createTestBanInput({ durationMs: BAN_DURATIONS.ONE_WEEK }),
      );
      const originalExpires = ban!.expiresAt;

      const result = manager.updateBan(ban!.id, {
        durationMs: BAN_DURATIONS.ONE_DAY,
        moderatorId: "mod-1",
      });

      expect(result.success).toBe(true);
      expect(new Date(result.ban!.expiresAt!).getTime()).toBeLessThan(
        new Date(originalExpires!).getTime(),
      );

      const history = manager.getBanHistory(ban!.id);
      expect(history.some((h) => h.action === "reduced")).toBe(true);
    });

    it("should make ban permanent", () => {
      const { ban } = manager.banUser(createTestBanInput());
      const result = manager.updateBan(ban!.id, {
        durationMs: null,
        moderatorId: "mod-1",
      });

      expect(result.success).toBe(true);
      expect(result.ban?.type).toBe("permanent");
      expect(result.ban?.expiresAt).toBeNull();
    });

    it("should reject making permanent when not allowed", () => {
      manager.updateConfig({ allowPermanentBans: false });
      const { ban } = manager.banUser(createTestBanInput());
      const result = manager.updateBan(ban!.id, {
        durationMs: null,
        moderatorId: "mod-1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Permanent bans are not allowed");
    });

    it("should return error for non-existent ban", () => {
      const result = manager.updateBan("non-existent", {
        moderatorId: "mod-1",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Ban not found");
    });
  });

  describe("getBan", () => {
    it("should get ban by ID", () => {
      const { ban } = manager.banUser(createTestBanInput());
      const found = manager.getBan(ban!.id);
      expect(found?.id).toBe(ban!.id);
    });

    it("should return undefined for non-existent ban", () => {
      expect(manager.getBan("non-existent")).toBeUndefined();
    });
  });

  describe("getActiveBan", () => {
    it("should return active server-wide ban", () => {
      manager.banUser(createTestBanInput({ channelId: null }));
      const ban = manager.getActiveBan("user-123");
      expect(ban).toBeDefined();
    });

    it("should return active channel ban", () => {
      manager.banUser(createTestBanInput({ channelId: "channel-1" }));
      const ban = manager.getActiveBan("user-123", "channel-1");
      expect(ban).toBeDefined();
    });

    it("should return server-wide ban for any channel", () => {
      manager.banUser(createTestBanInput({ channelId: null }));
      const ban = manager.getActiveBan("user-123", "any-channel");
      expect(ban).toBeDefined();
    });

    it("should return undefined for non-banned user", () => {
      expect(manager.getActiveBan("non-banned")).toBeUndefined();
    });
  });

  describe("isUserBanned", () => {
    it("should return true for banned user", () => {
      manager.banUser(createTestBanInput());
      expect(manager.isUserBanned("user-123")).toBe(true);
    });

    it("should return false for non-banned user", () => {
      expect(manager.isUserBanned("non-banned")).toBe(false);
    });

    it("should respect channel scope", () => {
      manager.banUser(createTestBanInput({ channelId: "channel-1" }));
      expect(manager.isUserBanned("user-123", "channel-1")).toBe(true);
      expect(manager.isUserBanned("user-123", "channel-2")).toBe(false);
    });
  });

  describe("getUserBans", () => {
    it("should return all bans for user", () => {
      manager.banUser(createTestBanInput({ channelId: "channel-1" }));
      manager.banUser(createTestBanInput({ channelId: "channel-2" }));

      const bans = manager.getUserBans("user-123");
      expect(bans.length).toBe(2);
    });

    it("should filter active only", () => {
      // Create one active ban
      manager.banUser(createTestBanInput({ channelId: "channel-1" }));

      const allBans = manager.getUserBans("user-123", false);
      const activeBans = manager.getUserBans("user-123", true);

      expect(allBans.length).toBeGreaterThanOrEqual(activeBans.length);
    });
  });

  describe("getChannelBans", () => {
    it("should return bans for channel", () => {
      manager.banUser(
        createTestBanInput({ userId: "user-1", channelId: "channel-1" }),
      );
      manager.banUser(
        createTestBanInput({ userId: "user-2", channelId: "channel-1" }),
      );

      const bans = manager.getChannelBans("channel-1");
      expect(bans.length).toBe(2);
    });
  });

  describe("getBans", () => {
    beforeEach(() => {
      manager.banUser(
        createTestBanInput({
          userId: "user-1",
          channelId: null,
          durationMs: undefined,
        }),
      );
      manager.banUser(
        createTestBanInput({
          userId: "user-2",
          channelId: "channel-1",
          durationMs: BAN_DURATIONS.ONE_DAY,
        }),
      );
      manager.banUser(
        createTestBanInput({
          userId: "user-3",
          channelId: "channel-1",
          moderatorId: "mod-2",
          durationMs: BAN_DURATIONS.ONE_WEEK,
        }),
      );
    });

    it("should return all bans without filter", () => {
      const bans = manager.getBans();
      expect(bans.length).toBe(3);
    });

    it("should filter by userId", () => {
      const bans = manager.getBans({ userId: "user-1" });
      expect(bans.length).toBe(1);
      expect(bans[0].userId).toBe("user-1");
    });

    it("should filter by channelId", () => {
      const bans = manager.getBans({ channelId: "channel-1" });
      expect(bans.length).toBe(2);
    });

    it("should filter by moderatorId", () => {
      const bans = manager.getBans({ moderatorId: "mod-2" });
      expect(bans.length).toBe(1);
    });

    it("should filter by type", () => {
      const permanentBans = manager.getBans({ type: "permanent" });
      expect(permanentBans.length).toBe(1);

      const temporaryBans = manager.getBans({ type: "temporary" });
      expect(temporaryBans.length).toBe(2);
    });

    it("should filter by scope", () => {
      const serverBans = manager.getBans({ scope: "server" });
      expect(serverBans.length).toBe(1);

      const channelBans = manager.getBans({ scope: "channel" });
      expect(channelBans.length).toBe(2);
    });

    it("should filter active bans", () => {
      const activeBans = manager.getBans({ active: true });
      expect(activeBans.every((b) => isBanActive(b))).toBe(true);
    });
  });

  describe("cleanupExpiredBans", () => {
    it("should remove expired bans", async () => {
      // Create a ban that expires immediately
      manager.banUser(createTestBanInput({ durationMs: 1 }));

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      const expiredCount = manager.cleanupExpiredBans();
      expect(expiredCount).toBeGreaterThanOrEqual(1);
    });

    it("should not remove permanent bans", () => {
      manager.banUser(createTestBanInput({ durationMs: undefined }));
      const countBefore = manager.getCount();

      manager.cleanupExpiredBans();

      expect(manager.getCount()).toBe(countBefore);
    });
  });

  // ==========================================================================
  // IP Ban Tests
  // ==========================================================================

  describe("IP Bans", () => {
    describe("banIp", () => {
      it("should ban IP address", () => {
        const result = manager.banIp(
          "192.168.1.1",
          "Suspicious activity",
          "mod-1",
        );
        expect(result.success).toBe(true);
        expect(result.ipBan).toBeDefined();
      });

      it("should reject when IP bans disabled", () => {
        manager.updateConfig({ ipBansEnabled: false });
        const result = manager.banIp("192.168.1.1", "Test", "mod-1");
        expect(result.success).toBe(false);
        expect(result.error).toBe("IP bans are disabled");
      });

      it("should reject invalid IP", () => {
        const result = manager.banIp("invalid", "Test", "mod-1");
        expect(result.success).toBe(false);
        expect(result.error).toBe("Invalid IP address format");
      });

      it("should reject duplicate IP ban", () => {
        manager.banIp("192.168.1.1", "Test", "mod-1");
        const result = manager.banIp("192.168.1.1", "Test", "mod-1");
        expect(result.success).toBe(false);
        expect(result.error).toBe("IP address is already banned");
      });
    });

    describe("unbanIp", () => {
      it("should unban IP", () => {
        const { ipBan } = manager.banIp("192.168.1.1", "Test", "mod-1");
        const result = manager.unbanIp(ipBan!.id);
        expect(result.success).toBe(true);
        expect(manager.isIpBanned("192.168.1.1")).toBe(false);
      });

      it("should return error for non-existent ban", () => {
        const result = manager.unbanIp("non-existent");
        expect(result.success).toBe(false);
      });
    });

    describe("unbanIpByAddress", () => {
      it("should unban by IP address", () => {
        manager.banIp("192.168.1.1", "Test", "mod-1");
        const result = manager.unbanIpByAddress("192.168.1.1");
        expect(result.success).toBe(true);
      });
    });

    describe("isIpBanned", () => {
      it("should return true for banned IP", () => {
        manager.banIp("192.168.1.1", "Test", "mod-1");
        expect(manager.isIpBanned("192.168.1.1")).toBe(true);
      });

      it("should return false for non-banned IP", () => {
        expect(manager.isIpBanned("192.168.1.1")).toBe(false);
      });
    });

    describe("getIpBan", () => {
      it("should get IP ban by address", () => {
        manager.banIp("192.168.1.1", "Test", "mod-1");
        const ipBan = manager.getIpBan("192.168.1.1");
        expect(ipBan).toBeDefined();
        expect(ipBan?.ipAddress).toBe("192.168.1.1");
      });
    });

    describe("getIpBans", () => {
      it("should return all IP bans", () => {
        manager.banIp("192.168.1.1", "Test", "mod-1");
        manager.banIp("192.168.1.2", "Test", "mod-1");

        const ipBans = manager.getIpBans();
        expect(ipBans.length).toBe(2);
      });
    });
  });

  // ==========================================================================
  // Statistics Tests
  // ==========================================================================

  describe("getStats", () => {
    it("should calculate statistics", () => {
      manager.banUser(
        createTestBanInput({
          userId: "user-1",
          channelId: null,
          durationMs: undefined,
        }),
      );
      manager.banUser(
        createTestBanInput({ userId: "user-2", channelId: "channel-1" }),
      );
      manager.banIp("192.168.1.1", "Test", "mod-1");

      const stats = manager.getStats();

      expect(stats.totalBans).toBe(2);
      expect(stats.permanentBans).toBe(1);
      expect(stats.temporaryBans).toBe(1);
      expect(stats.serverWideBans).toBe(1);
      expect(stats.channelBans).toBe(1);
      expect(stats.ipBans).toBe(1);
    });

    it("should count bans today", () => {
      manager.banUser(createTestBanInput());
      const stats = manager.getStats();
      expect(stats.bansToday).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Utility Tests
  // ==========================================================================

  describe("clearAll", () => {
    it("should clear all bans", () => {
      manager.banUser(createTestBanInput());
      manager.banIp("192.168.1.1", "Test", "mod-1");

      manager.clearAll();

      expect(manager.getCount()).toBe(0);
      expect(manager.getIpBans().length).toBe(0);
    });
  });

  describe("getCount", () => {
    it("should return correct count", () => {
      expect(manager.getCount()).toBe(0);

      manager.banUser(
        createTestBanInput({ userId: "user-1", channelId: "channel-1" }),
      );
      expect(manager.getCount()).toBe(1);

      manager.banUser(
        createTestBanInput({ userId: "user-2", channelId: "channel-2" }),
      );
      expect(manager.getCount()).toBe(2);
    });
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe("Factory Functions", () => {
  describe("createBanManager", () => {
    it("should create manager with default config", () => {
      const manager = createBanManager();
      expect(manager.getConfig().allowPermanentBans).toBe(true);
    });

    it("should create manager with custom config", () => {
      const manager = createBanManager({ allowPermanentBans: false });
      expect(manager.getConfig().allowPermanentBans).toBe(false);
    });
  });

  describe("createBanInput", () => {
    it("should create ban input", () => {
      const input = createBanInput("user-1", "mod-1", "Test reason");
      expect(input.userId).toBe("user-1");
      expect(input.moderatorId).toBe("mod-1");
      expect(input.reason).toBe("Test reason");
    });

    it("should accept options", () => {
      const input = createBanInput("user-1", "mod-1", "Test", {
        durationMs: BAN_DURATIONS.ONE_DAY,
        channelId: "channel-1",
        ipAddress: "192.168.1.1",
      });

      expect(input.durationMs).toBe(BAN_DURATIONS.ONE_DAY);
      expect(input.channelId).toBe("channel-1");
      expect(input.ipAddress).toBe("192.168.1.1");
    });
  });

  describe("defaultBanManager", () => {
    it("should be a valid BanManager instance", () => {
      expect(defaultBanManager).toBeInstanceOf(BanManager);
    });
  });
});

// ============================================================================
// Ban Durations Tests
// ============================================================================

describe("BAN_DURATIONS", () => {
  it("should have correct values", () => {
    expect(BAN_DURATIONS.ONE_HOUR).toBe(3600000);
    expect(BAN_DURATIONS.ONE_DAY).toBe(86400000);
    expect(BAN_DURATIONS.ONE_WEEK).toBe(604800000);
  });

  it("should have values in ascending order", () => {
    expect(BAN_DURATIONS.FIVE_MINUTES).toBeLessThan(
      BAN_DURATIONS.FIFTEEN_MINUTES,
    );
    expect(BAN_DURATIONS.ONE_HOUR).toBeLessThan(BAN_DURATIONS.ONE_DAY);
    expect(BAN_DURATIONS.ONE_WEEK).toBeLessThan(BAN_DURATIONS.ONE_MONTH);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  let manager: BanManager;

  beforeEach(() => {
    manager = new BanManager();
    manager.clearAll();
  });

  it("should handle rapid ban/unban cycles", () => {
    for (let i = 0; i < 100; i++) {
      const { ban } = manager.banUser(
        createTestBanInput({ userId: `user-${i}` }),
      );
      manager.unbanUser(ban!.id, "mod-1");
    }

    expect(manager.getCount()).toBe(0);
  });

  it("should handle very long ban reasons", () => {
    const input = createTestBanInput({ reason: "a".repeat(10000) });
    const result = manager.banUser(input);
    expect(result.success).toBe(true);
  });

  it("should handle metadata in bans", () => {
    const input = createTestBanInput({
      metadata: {
        source: "auto-mod",
        ruleId: "rule-123",
        nested: { data: true },
      },
    });

    const result = manager.banUser(input);
    expect(result.ban?.metadata?.source).toBe("auto-mod");
  });

  it("should handle concurrent bans for same user in different channels", () => {
    for (let i = 0; i < 10; i++) {
      manager.banUser(createTestBanInput({ channelId: `channel-${i}` }));
    }

    const userBans = manager.getUserBans("user-123");
    expect(userBans.length).toBe(10);
  });
});
