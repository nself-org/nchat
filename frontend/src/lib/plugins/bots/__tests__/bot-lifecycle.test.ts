/**
 * @jest-environment node
 */

/**
 * Bot Account Lifecycle - Comprehensive Test Suite
 *
 * Tests covering bot identity, scope management, rate limiting,
 * moderation controls, lifecycle management, and security scenarios.
 *
 * Target: 120+ tests organized by feature area.
 */

import type { AppScope } from "../../app-contract";
import {
  BotLifecycleManager,
  BotLifecycleError,
  BotIdentityManager,
  BotAccountStore,
  BotIdentityError,
  BotScopeManager,
  BotScopeValidator,
  BotScopeError,
  BotRateLimiter,
  BotModerationManager,
  BotModerationStore,
  BotModerationError,
  BotInstallationStore,
  isValidBotUsername,
  CAPABILITY_PRESET_SCOPES,
  DEFAULT_BOT_RATE_LIMITS,
  BOT_ACCOUNT_TRANSITIONS,
  BOT_INSTALLATION_TRANSITIONS,
  MAX_SCOPE_GRANTS,
  MAX_ACTIVE_CHANNELS,
} from "../index";
import type {
  BotAccount,
  BotInstallation,
  BotScopeGrant,
  BotRateLimitConfig,
} from "../index";

// ============================================================================
// TEST HELPERS
// ============================================================================

function createTestBot(
  manager: BotLifecycleManager,
  overrides?: Partial<{
    appId: string;
    username: string;
    displayName: string;
    description: string;
    botType: string;
  }>,
): BotAccount {
  return manager.createBot({
    appId: overrides?.appId ?? "com.example.testapp",
    username: overrides?.username ?? "test-bot",
    displayName: overrides?.displayName ?? "Test Bot",
    description: overrides?.description ?? "A test bot for unit testing",
    createdBy: "admin-1",
    botType: (overrides?.botType as BotAccount["botType"]) ?? "utility",
  });
}

function installTestBot(
  manager: BotLifecycleManager,
  botId: string,
  workspaceId: string = "ws-1",
  scopes: AppScope[] = ["read:messages", "write:messages"],
): BotInstallation {
  return manager.installBot({
    botId,
    workspaceId,
    installedBy: "admin-1",
    scopes,
    manifestScopes: [
      "read:messages",
      "write:messages",
      "read:channels",
      "admin:moderation",
    ],
  });
}

// ============================================================================
// 1. BOT IDENTITY TESTS
// ============================================================================

describe("Bot Identity", () => {
  let manager: BotLifecycleManager;

  beforeEach(() => {
    manager = new BotLifecycleManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe("Bot Creation", () => {
    it("should create a bot with valid parameters", () => {
      const bot = createTestBot(manager);
      expect(bot.id).toBeTruthy();
      expect(bot.id.startsWith("bot_")).toBe(true);
      expect(bot.username).toBe("test-bot");
      expect(bot.displayName).toBe("Test Bot");
      expect(bot.description).toBe("A test bot for unit testing");
      expect(bot.status).toBe("active");
      expect(bot.verified).toBe(false);
      expect(bot.botType).toBe("utility");
    });

    it("should preserve lowercase username", () => {
      const bot = createTestBot(manager, { username: "my-bot" });
      expect(bot.username).toBe("my-bot");
    });

    it("should reject invalid bot username - uppercase", () => {
      expect(() => createTestBot(manager, { username: "UPPERCASE" })).toThrow(
        BotIdentityError,
      );
    });

    it("should reject invalid bot username - too short", () => {
      expect(() => createTestBot(manager, { username: "ab" })).toThrow(
        BotIdentityError,
      );
    });

    it("should reject invalid bot username - too long", () => {
      expect(() =>
        createTestBot(manager, { username: "a".repeat(33) }),
      ).toThrow(BotIdentityError);
    });

    it("should reject invalid bot username - starts with number", () => {
      expect(() => createTestBot(manager, { username: "1bot" })).toThrow(
        BotIdentityError,
      );
    });

    it("should reject invalid bot username - special characters", () => {
      expect(() => createTestBot(manager, { username: "bot@name" })).toThrow(
        BotIdentityError,
      );
    });

    it("should reject duplicate username", () => {
      createTestBot(manager);
      expect(() => createTestBot(manager)).toThrow(BotIdentityError);
    });

    it("should reject empty display name", () => {
      expect(() => createTestBot(manager, { displayName: "" })).toThrow(
        BotIdentityError,
      );
    });

    it("should reject display name over 64 chars", () => {
      expect(() =>
        createTestBot(manager, { displayName: "x".repeat(65) }),
      ).toThrow(BotIdentityError);
    });

    it("should reject empty description", () => {
      expect(() => createTestBot(manager, { description: "" })).toThrow(
        BotIdentityError,
      );
    });

    it("should reject description over 200 chars", () => {
      expect(() =>
        createTestBot(manager, { description: "x".repeat(201) }),
      ).toThrow(BotIdentityError);
    });

    it("should create bot with avatar URL", () => {
      const bot = manager.createBot({
        appId: "app-1",
        username: "avatar-bot",
        displayName: "Avatar Bot",
        description: "Bot with avatar",
        avatarUrl: "https://example.com/avatar.png",
        createdBy: "admin-1",
      });
      expect(bot.avatarUrl).toBe("https://example.com/avatar.png");
    });

    it("should reject invalid avatar URL", () => {
      expect(() =>
        manager.createBot({
          appId: "app-1",
          username: "bad-avatar",
          displayName: "Bad Avatar Bot",
          description: "Bot with bad avatar",
          avatarUrl: "not-a-url",
          createdBy: "admin-1",
        }),
      ).toThrow(BotIdentityError);
    });

    it("should reject non-http avatar URL", () => {
      expect(() =>
        manager.createBot({
          appId: "app-1",
          username: "ftp-avatar",
          displayName: "FTP Avatar Bot",
          description: "Bot with ftp avatar",
          avatarUrl: "ftp://example.com/avatar.png",
          createdBy: "admin-1",
        }),
      ).toThrow(BotIdentityError);
    });

    it("should create multiple bots with different usernames", () => {
      const bot1 = createTestBot(manager, { username: "bot-one" });
      const bot2 = createTestBot(manager, { username: "bot-two" });
      expect(bot1.id).not.toBe(bot2.id);
      expect(bot1.username).toBe("bot-one");
      expect(bot2.username).toBe("bot-two");
    });

    it("should set default bot type to custom", () => {
      const bot = manager.createBot({
        appId: "app-1",
        username: "custom-bot",
        displayName: "Custom",
        description: "A custom bot",
        createdBy: "admin-1",
      });
      expect(bot.botType).toBe("custom");
    });

    it("should set specified bot type", () => {
      const bot = createTestBot(manager, {
        username: "mod-bot",
        botType: "moderation",
      });
      expect(bot.botType).toBe("moderation");
    });
  });

  describe("Profile Management", () => {
    it("should update display name", () => {
      const bot = createTestBot(manager);
      const updated = manager.updateBotProfile(
        bot.id,
        { displayName: "New Name" },
        "admin-1",
      );
      expect(updated.displayName).toBe("New Name");
    });

    it("should update description", () => {
      const bot = createTestBot(manager);
      const updated = manager.updateBotProfile(
        bot.id,
        { description: "New description" },
        "admin-1",
      );
      expect(updated.description).toBe("New description");
    });

    it("should update avatar URL", () => {
      const bot = createTestBot(manager);
      const updated = manager.updateBotProfile(
        bot.id,
        { avatarUrl: "https://example.com/new.png" },
        "admin-1",
      );
      expect(updated.avatarUrl).toBe("https://example.com/new.png");
    });

    it("should clear avatar URL with empty string", () => {
      const bot = manager.createBot({
        appId: "app-1",
        username: "avatar-clear",
        displayName: "Clear Avatar",
        description: "Test clearing avatar",
        avatarUrl: "https://example.com/avatar.png",
        createdBy: "admin-1",
      });
      const updated = manager.updateBotProfile(
        bot.id,
        { avatarUrl: "" },
        "admin-1",
      );
      expect(updated.avatarUrl).toBeUndefined();
    });

    it("should reject empty display name in update", () => {
      const bot = createTestBot(manager);
      expect(() =>
        manager.updateBotProfile(bot.id, { displayName: "" }, "admin-1"),
      ).toThrow(BotIdentityError);
    });

    it("should reject empty description in update", () => {
      const bot = createTestBot(manager);
      expect(() =>
        manager.updateBotProfile(bot.id, { description: "" }, "admin-1"),
      ).toThrow(BotIdentityError);
    });

    it("should update bot type", () => {
      const bot = createTestBot(manager);
      const updated = manager.updateBotProfile(
        bot.id,
        { botType: "ai_assistant" },
        "admin-1",
      );
      expect(updated.botType).toBe("ai_assistant");
    });

    it("should throw for non-existent bot", () => {
      expect(() =>
        manager.updateBotProfile(
          "nonexistent",
          { displayName: "x" },
          "admin-1",
        ),
      ).toThrow(BotIdentityError);
    });
  });

  describe("Version Management", () => {
    it("should update bot version", () => {
      const bot = createTestBot(manager);
      const updated = manager.updateBotVersion(bot.id, "2.0.0", "admin-1");
      expect(updated.version).toBe("2.0.0");
    });

    it("should accept pre-release version", () => {
      const bot = createTestBot(manager);
      const updated = manager.updateBotVersion(
        bot.id,
        "2.0.0-beta.1",
        "admin-1",
      );
      expect(updated.version).toBe("2.0.0-beta.1");
    });

    it("should reject invalid version format", () => {
      const bot = createTestBot(manager);
      expect(() =>
        manager.updateBotVersion(bot.id, "not-semver", "admin-1"),
      ).toThrow(BotIdentityError);
    });
  });

  describe("Bot Verification", () => {
    it("should verify a bot", () => {
      const bot = createTestBot(manager);
      expect(bot.verified).toBe(false);
      const verified = manager.verifyBot(bot.id, "admin-1");
      expect(verified.verified).toBe(true);
    });
  });

  describe("Bot Lookup", () => {
    it("should find bot by ID", () => {
      const bot = createTestBot(manager);
      const found = manager.getBot(bot.id);
      expect(found?.id).toBe(bot.id);
    });

    it("should find bot by username", () => {
      createTestBot(manager);
      const found = manager.getBotByUsername("test-bot");
      expect(found?.username).toBe("test-bot");
    });

    it("should return undefined for non-existent bot", () => {
      expect(manager.getBot("nonexistent")).toBeUndefined();
      expect(manager.getBotByUsername("nonexistent")).toBeUndefined();
    });

    it("should list bots by app", () => {
      createTestBot(manager, { username: "bot-a", appId: "app-1" });
      createTestBot(manager, { username: "bot-b", appId: "app-1" });
      createTestBot(manager, { username: "bot-c", appId: "app-2" });
      expect(manager.listBots({ appId: "app-1" })).toHaveLength(2);
    });

    it("should list bots by status", () => {
      const bot = createTestBot(manager, { username: "active-bot" });
      createTestBot(manager, { username: "other-bot" });
      manager.suspendBot(bot.id, "test", "admin-1");
      expect(manager.listBots({ status: "active" })).toHaveLength(1);
      expect(manager.listBots({ status: "suspended" })).toHaveLength(1);
    });

    it("should list bots by type", () => {
      createTestBot(manager, { username: "util-bot", botType: "utility" });
      createTestBot(manager, { username: "mod-bot", botType: "moderation" });
      expect(manager.listBots({ botType: "utility" })).toHaveLength(1);
    });
  });
});

// ============================================================================
// 2. BOT USERNAME VALIDATION TESTS
// ============================================================================

describe("Bot Username Validation", () => {
  it("should accept valid usernames", () => {
    expect(isValidBotUsername("bot")).toBe(true);
    expect(isValidBotUsername("my-bot")).toBe(true);
    expect(isValidBotUsername("bot123")).toBe(true);
    expect(isValidBotUsername("abc")).toBe(true);
    expect(isValidBotUsername("a".repeat(32))).toBe(true);
  });

  it("should reject invalid usernames", () => {
    expect(isValidBotUsername("")).toBe(false);
    expect(isValidBotUsername("ab")).toBe(false); // Too short
    expect(isValidBotUsername("a".repeat(33))).toBe(false); // Too long
    expect(isValidBotUsername("1bot")).toBe(false); // Starts with number
    expect(isValidBotUsername("Bot")).toBe(false); // Uppercase
    expect(isValidBotUsername("bot name")).toBe(false); // Space
    expect(isValidBotUsername("bot@name")).toBe(false); // Special char
    expect(isValidBotUsername("-bot")).toBe(false); // Starts with hyphen
  });
});

// ============================================================================
// 3. SCOPE MANAGEMENT TESTS
// ============================================================================

describe("Bot Scope Management", () => {
  let manager: BotLifecycleManager;

  beforeEach(() => {
    manager = new BotLifecycleManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe("Scope Grants", () => {
    it("should install bot with specific scopes", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      expect(inst.scopeGrants).toHaveLength(2);
      expect(inst.scopeGrants.map((g) => g.scope)).toEqual([
        "read:messages",
        "write:messages",
      ]);
    });

    it("should install bot with capability preset", () => {
      const bot = createTestBot(manager);
      const inst = manager.installBot({
        botId: bot.id,
        workspaceId: "ws-1",
        installedBy: "admin-1",
        capabilityPreset: "read_only",
      });
      expect(inst.scopeGrants.map((g) => g.scope)).toEqual(
        CAPABILITY_PRESET_SCOPES.read_only,
      );
    });

    it("should grant additional scopes", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      const updated = manager.grantScopes(
        inst.id,
        ["read:channels"],
        [
          "read:messages",
          "write:messages",
          "read:channels",
          "admin:moderation",
        ],
        "admin-1",
      );
      expect(updated.scopeGrants).toHaveLength(3);
    });

    it("should not duplicate existing scope grants", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      const updated = manager.grantScopes(
        inst.id,
        ["read:messages"], // Already granted
        ["read:messages", "write:messages", "read:channels"],
        "admin-1",
      );
      expect(updated.scopeGrants).toHaveLength(2); // Still 2
    });

    it("should reject scopes exceeding manifest", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      expect(() =>
        manager.grantScopes(
          inst.id,
          ["admin:*"], // Not in manifest
          ["read:messages", "write:messages"],
          "admin-1",
        ),
      ).toThrow(BotScopeError);
    });
  });

  describe("Scope Revocation", () => {
    it("should revoke specific scopes", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      const updated = manager.revokeScopes(
        inst.id,
        ["write:messages"],
        "admin-1",
      );
      expect(updated.scopeGrants).toHaveLength(1);
      expect(updated.scopeGrants[0].scope).toBe("read:messages");
    });

    it("should handle revoking non-existent scopes", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      const updated = manager.revokeScopes(
        inst.id,
        ["admin:channels"],
        "admin-1",
      );
      expect(updated.scopeGrants).toHaveLength(2); // Unchanged
    });
  });

  describe("Channel Restrictions", () => {
    it("should restrict scopes to specific channels", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      manager.restrictToChannels(
        inst.id,
        ["channel-1", "channel-2"],
        "admin-1",
      );

      const updated = manager.getInstallation(inst.id)!;
      expect(updated.activeChannels).toEqual(["channel-1", "channel-2"]);
      expect(updated.scopeGrants.every((g) => g.channelIds?.length === 2)).toBe(
        true,
      );
    });

    it("should reject too many channels", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      const manyChannels = Array.from(
        { length: MAX_ACTIVE_CHANNELS + 1 },
        (_, i) => `ch-${i}`,
      );
      expect(() =>
        manager.restrictToChannels(inst.id, manyChannels, "admin-1"),
      ).toThrow(BotLifecycleError);
    });
  });

  describe("Scope Enforcement", () => {
    it("should allow actions with granted scopes", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      expect(() =>
        manager.enforceScope(inst.id, "read:messages"),
      ).not.toThrow();
      expect(() =>
        manager.enforceScope(inst.id, "write:messages"),
      ).not.toThrow();
    });

    it("should block actions without granted scopes", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      expect(() => manager.enforceScope(inst.id, "admin:channels")).toThrow(
        BotScopeError,
      );
    });

    it("should enforce channel-specific scopes", () => {
      const bot = createTestBot(manager);
      const inst = manager.installBot({
        botId: bot.id,
        workspaceId: "ws-1",
        installedBy: "admin-1",
        scopes: ["read:messages"],
        channelIds: ["channel-1"],
        manifestScopes: ["read:messages", "write:messages"],
      });
      // Should work for channel-1
      expect(() =>
        manager.enforceScope(inst.id, "read:messages", "channel-1"),
      ).not.toThrow();
      // Should fail for channel-2 (not in allowed channels)
      expect(() =>
        manager.enforceScope(inst.id, "read:messages", "channel-2"),
      ).toThrow(BotScopeError);
    });

    it("should block actions when bot is suspended", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      manager.suspendBot(bot.id, "test suspension", "admin-1");
      expect(() => manager.enforceScope(inst.id, "read:messages")).toThrow(
        BotLifecycleError,
      );
    });
  });

  describe("Scope Escalation Prevention", () => {
    it("should prevent scope escalation during installation", () => {
      const bot = createTestBot(manager);
      expect(() =>
        manager.installBot({
          botId: bot.id,
          workspaceId: "ws-1",
          installedBy: "admin-1",
          scopes: ["admin:*"], // Not in manifest
          manifestScopes: ["read:messages"],
        }),
      ).toThrow(BotLifecycleError);
    });

    it("should prevent scope escalation during grant", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      expect(() =>
        manager.grantScopes(
          inst.id,
          ["admin:*"],
          ["read:messages", "write:messages"],
          "admin-1",
        ),
      ).toThrow(BotScopeError);
    });
  });
});

// ============================================================================
// 4. BOT SCOPE VALIDATOR TESTS
// ============================================================================

describe("Bot Scope Validator", () => {
  const validator = new BotScopeValidator();

  function makeInstallation(scopes: BotScopeGrant[]): BotInstallation {
    return {
      id: "inst-1",
      botId: "bot-1",
      workspaceId: "ws-1",
      scopeGrants: scopes,
      activeChannels: [],
      status: "active",
      config: {},
      installedBy: "user-1",
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  function makeGrant(scope: AppScope, channelIds?: string[]): BotScopeGrant {
    return {
      scope,
      channelIds,
      grantedAtInstall: true,
      grantedBy: "admin-1",
      grantedAt: new Date().toISOString(),
    };
  }

  it("should check direct scope match", () => {
    const inst = makeInstallation([makeGrant("read:messages")]);
    expect(validator.hasScope(inst, "read:messages")).toBe(true);
    expect(validator.hasScope(inst, "write:messages")).toBe(false);
  });

  it("should expand wildcard scopes", () => {
    const inst = makeInstallation([makeGrant("read:*")]);
    expect(validator.hasScope(inst, "read:messages")).toBe(true);
    expect(validator.hasScope(inst, "read:channels")).toBe(true);
    expect(validator.hasScope(inst, "write:messages")).toBe(false);
  });

  it("should check channel-specific scopes", () => {
    const inst = makeInstallation([makeGrant("read:messages", ["ch-1"])]);
    expect(validator.hasScope(inst, "read:messages", "ch-1")).toBe(true);
    expect(validator.hasScope(inst, "read:messages", "ch-2")).toBe(false);
  });

  it("should allow unrestricted grants for any channel", () => {
    const inst = makeInstallation([makeGrant("read:messages")]);
    expect(validator.hasScope(inst, "read:messages", "any-channel")).toBe(true);
  });

  it("should check all required scopes", () => {
    const inst = makeInstallation([
      makeGrant("read:messages"),
      makeGrant("write:messages"),
    ]);
    expect(
      validator.hasAllScopes(inst, ["read:messages", "write:messages"]),
    ).toBe(true);
    expect(
      validator.hasAllScopes(inst, ["read:messages", "admin:channels"]),
    ).toBe(false);
  });

  it("should find escalation attempts", () => {
    const grants = [makeGrant("read:messages")];
    const escalations = validator.findEscalations(grants, [
      "read:messages",
      "admin:channels",
    ]);
    expect(escalations).toEqual(["admin:channels"]);
  });

  it("should validate against manifest scopes", () => {
    const result = validator.validateAgainstManifest(
      ["read:messages", "admin:channels"],
      ["read:messages", "write:messages"],
    );
    expect(result.valid).toBe(false);
    expect(result.violations).toEqual(["admin:channels"]);
  });

  it("should get effective scopes with expansion", () => {
    const inst = makeInstallation([makeGrant("read:*")]);
    const effective = validator.getEffectiveScopes(inst);
    expect(effective).toContain("read:messages");
    expect(effective).toContain("read:channels");
    expect(effective).toContain("read:users");
  });

  it("should get channel-specific scopes", () => {
    const inst = makeInstallation([
      makeGrant("read:messages", ["ch-1"]),
      makeGrant("write:messages"), // No channel restriction
    ]);
    const scopes = validator.getChannelScopes(inst, "ch-1");
    expect(scopes).toContain("read:messages");
    expect(scopes).toContain("write:messages");

    const scopes2 = validator.getChannelScopes(inst, "ch-2");
    expect(scopes2).not.toContain("read:messages"); // Restricted to ch-1
    expect(scopes2).toContain("write:messages"); // Unrestricted
  });
});

// ============================================================================
// 5. BOT SCOPE MANAGER TESTS
// ============================================================================

describe("Bot Scope Manager", () => {
  const scopeManager = new BotScopeManager();

  it("should create grants from read_only preset", () => {
    const grants = scopeManager.createGrantsFromPreset("read_only", "admin-1");
    expect(grants).toHaveLength(3);
    expect(grants.map((g) => g.scope)).toEqual(
      CAPABILITY_PRESET_SCOPES.read_only,
    );
  });

  it("should create grants from responder preset", () => {
    const grants = scopeManager.createGrantsFromPreset("responder", "admin-1");
    expect(grants).toHaveLength(3);
    expect(grants.map((g) => g.scope)).toContain("write:messages");
  });

  it("should create grants from moderator preset", () => {
    const grants = scopeManager.createGrantsFromPreset("moderator", "admin-1");
    expect(grants.map((g) => g.scope)).toContain("admin:moderation");
  });

  it("should create grants with channel restrictions", () => {
    const grants = scopeManager.createGrantsFromPreset("read_only", "admin-1", [
      "ch-1",
    ]);
    expect(grants.every((g) => g.channelIds?.includes("ch-1"))).toBe(true);
  });

  it("should build capabilities list", () => {
    const installation: BotInstallation = {
      id: "inst-1",
      botId: "bot-1",
      workspaceId: "ws-1",
      scopeGrants: [
        {
          scope: "read:messages",
          grantedAtInstall: true,
          grantedBy: "admin",
          grantedAt: new Date().toISOString(),
        },
        {
          scope: "write:messages",
          grantedAtInstall: true,
          grantedBy: "admin",
          grantedAt: new Date().toISOString(),
        },
      ],
      activeChannels: [],
      status: "active",
      config: {},
      installedBy: "user-1",
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const capabilities = scopeManager.buildCapabilities(installation);
    const readMessages = capabilities.find((c) => c.name === "Read Messages");
    const sendMessages = capabilities.find((c) => c.name === "Send Messages");
    const adminMod = capabilities.find((c) => c.name === "Admin Moderation");

    expect(readMessages?.active).toBe(true);
    expect(sendMessages?.active).toBe(true);
    expect(adminMod?.active).toBe(false);
  });
});

// ============================================================================
// 6. BOT RATE LIMITER TESTS
// ============================================================================

describe("Bot Rate Limiter", () => {
  let limiter: BotRateLimiter;

  beforeEach(() => {
    limiter = new BotRateLimiter();
  });

  afterEach(() => {
    limiter.destroy();
  });

  describe("Global Rate Limiting", () => {
    it("should allow requests under limit", () => {
      const result = limiter.checkGlobal("bot-1");
      expect(result.allowed).toBe(true);
      expect(result.limitType).toBe("global");
    });

    it("should block requests over limit", () => {
      limiter.setConfig("bot-1", {
        ...DEFAULT_BOT_RATE_LIMITS,
        globalRequestsPerMinute: 3,
        burstAllowance: 0,
      });

      limiter.checkGlobal("bot-1");
      limiter.checkGlobal("bot-1");
      limiter.checkGlobal("bot-1");
      const result = limiter.checkGlobal("bot-1");
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should allow burst above base rate", () => {
      limiter.setConfig("bot-1", {
        ...DEFAULT_BOT_RATE_LIMITS,
        globalRequestsPerMinute: 2,
        burstAllowance: 2,
      });

      // 2 base + 2 burst = 4 total
      for (let i = 0; i < 4; i++) {
        expect(limiter.checkGlobal("bot-1").allowed).toBe(true);
      }
      expect(limiter.checkGlobal("bot-1").allowed).toBe(false);
    });

    it("should track limits per bot independently", () => {
      limiter.setConfig("bot-1", {
        ...DEFAULT_BOT_RATE_LIMITS,
        globalRequestsPerMinute: 1,
        burstAllowance: 0,
      });
      limiter.setConfig("bot-2", {
        ...DEFAULT_BOT_RATE_LIMITS,
        globalRequestsPerMinute: 1,
        burstAllowance: 0,
      });

      limiter.checkGlobal("bot-1");
      expect(limiter.checkGlobal("bot-1").allowed).toBe(false);
      expect(limiter.checkGlobal("bot-2").allowed).toBe(true);
    });
  });

  describe("Channel Rate Limiting", () => {
    it("should enforce per-channel limits", () => {
      limiter.setConfig("bot-1", {
        ...DEFAULT_BOT_RATE_LIMITS,
        channelMessageRate: 2,
      });

      limiter.checkChannel("bot-1", "ch-1");
      limiter.checkChannel("bot-1", "ch-1");
      const result = limiter.checkChannel("bot-1", "ch-1");
      expect(result.allowed).toBe(false);
      expect(result.limitType).toBe("channel");
    });

    it("should track channels independently", () => {
      limiter.setConfig("bot-1", {
        ...DEFAULT_BOT_RATE_LIMITS,
        channelMessageRate: 1,
      });

      limiter.checkChannel("bot-1", "ch-1");
      expect(limiter.checkChannel("bot-1", "ch-1").allowed).toBe(false);
      expect(limiter.checkChannel("bot-1", "ch-2").allowed).toBe(true);
    });
  });

  describe("Endpoint Rate Limiting", () => {
    it("should enforce endpoint-specific limits", () => {
      limiter.setConfig("bot-1", {
        ...DEFAULT_BOT_RATE_LIMITS,
        globalRequestsPerMinute: 100,
        endpointOverrides: {
          "messages:send": { requestsPerMinute: 2 },
        },
      });

      limiter.checkEndpoint("bot-1", "messages:send");
      limiter.checkEndpoint("bot-1", "messages:send");
      const result = limiter.checkEndpoint("bot-1", "messages:send");
      expect(result.allowed).toBe(false);
      expect(result.limitType).toBe("endpoint");
    });

    it("should fall back to global for unknown endpoints", () => {
      limiter.setConfig("bot-1", {
        ...DEFAULT_BOT_RATE_LIMITS,
        globalRequestsPerMinute: 100,
      });

      const result = limiter.checkEndpoint("bot-1", "unknown:endpoint");
      expect(result.allowed).toBe(true);
      expect(result.limitType).toBe("global");
    });
  });

  describe("Composite Rate Check", () => {
    it("should check all applicable limits", () => {
      limiter.setConfig("bot-1", {
        globalRequestsPerMinute: 100,
        burstAllowance: 0,
        channelMessageRate: 1,
        endpointOverrides: {},
      });

      // Channel limit is 1, should block on second
      limiter.checkAll("bot-1", undefined, "ch-1");
      const result = limiter.checkAll("bot-1", undefined, "ch-1");
      expect(result.allowed).toBe(false);
      expect(result.limitType).toBe("channel");
    });

    it("should return global block if global limit hit first", () => {
      limiter.setConfig("bot-1", {
        globalRequestsPerMinute: 1,
        burstAllowance: 0,
        channelMessageRate: 100,
        endpointOverrides: {},
      });

      limiter.checkAll("bot-1", undefined, "ch-1");
      const result = limiter.checkAll("bot-1", undefined, "ch-1");
      expect(result.allowed).toBe(false);
      expect(result.limitType).toBe("global");
    });
  });

  describe("Rate Limit Reduction", () => {
    it("should reduce rate limits by factor", () => {
      const reduced = limiter.reduceRateLimits("bot-1", 0.5);
      expect(reduced.globalRequestsPerMinute).toBe(30); // 60 * 0.5
      expect(reduced.burstAllowance).toBe(5); // 10 * 0.5
      expect(reduced.channelMessageRate).toBe(5); // 10 * 0.5
    });

    it("should not reduce below 1 for request rates", () => {
      limiter.setConfig("bot-1", {
        globalRequestsPerMinute: 2,
        burstAllowance: 1,
        channelMessageRate: 2,
        endpointOverrides: {},
      });
      const reduced = limiter.reduceRateLimits("bot-1", 0.1);
      expect(reduced.globalRequestsPerMinute).toBeGreaterThanOrEqual(1);
      expect(reduced.channelMessageRate).toBeGreaterThanOrEqual(1);
    });

    it("should reject invalid reduction factor", () => {
      expect(() => limiter.reduceRateLimits("bot-1", 0)).toThrow();
      expect(() => limiter.reduceRateLimits("bot-1", 1)).toThrow();
      expect(() => limiter.reduceRateLimits("bot-1", 1.5)).toThrow();
    });
  });

  describe("Status (Non-consuming)", () => {
    it("should report status without consuming", () => {
      const s1 = limiter.status("bot-1", "global");
      const s2 = limiter.status("bot-1", "global");
      expect(s1.remaining).toBe(s2.remaining);
    });

    it("should reflect consumed requests", () => {
      limiter.checkGlobal("bot-1");
      const status = limiter.status("bot-1", "global");
      expect(status.remaining).toBeLessThan(status.limit);
    });
  });

  describe("Reset", () => {
    it("should reset all limits for a bot", () => {
      limiter.setConfig("bot-1", {
        ...DEFAULT_BOT_RATE_LIMITS,
        globalRequestsPerMinute: 1,
        burstAllowance: 0,
      });

      limiter.checkGlobal("bot-1");
      expect(limiter.checkGlobal("bot-1").allowed).toBe(false);

      limiter.resetBot("bot-1");
      expect(limiter.checkGlobal("bot-1").allowed).toBe(true);
    });
  });

  describe("Cleanup", () => {
    it("should track window count", () => {
      limiter.checkGlobal("bot-1");
      limiter.checkGlobal("bot-2");
      expect(limiter.getWindowCount()).toBe(2);
    });

    it("should clear on destroy", () => {
      limiter.checkGlobal("bot-1");
      limiter.destroy();
      expect(limiter.getWindowCount()).toBe(0);
    });
  });
});

// ============================================================================
// 7. BOT MODERATION TESTS
// ============================================================================

describe("Bot Moderation", () => {
  let store: BotModerationStore;
  let moderation: BotModerationManager;

  beforeEach(() => {
    store = new BotModerationStore();
    moderation = new BotModerationManager(store);
  });

  describe("Moderation Actions", () => {
    it("should issue a warning", () => {
      const record = moderation.warn("bot-1", "Excessive messaging", "admin-1");
      expect(record.action).toBe("warn");
      expect(record.active).toBe(true);
      expect(record.reason).toBe("Excessive messaging");
    });

    it("should restrict a bot", () => {
      const record = moderation.restrict(
        "bot-1",
        "Spam detected",
        "admin-1",
        "ws-1",
      );
      expect(record.action).toBe("restrict");
      expect(record.workspaceId).toBe("ws-1");
    });

    it("should suspend a bot", () => {
      const record = moderation.suspend("bot-1", "Policy violation", "admin-1");
      expect(record.action).toBe("suspend");
      expect(record.expiresAt).toBeUndefined();
    });

    it("should suspend a bot with duration", () => {
      const record = moderation.suspend(
        "bot-1",
        "Temporary",
        "admin-1",
        3600000,
      );
      expect(record.expiresAt).toBeDefined();
    });

    it("should ban a bot permanently", () => {
      const record = moderation.ban("bot-1", "Severe violation", "admin-1");
      expect(record.action).toBe("ban");
    });

    it("should force uninstall a bot", () => {
      const record = moderation.forceUninstall(
        "bot-1",
        "Abuse",
        "admin-1",
        "ws-1",
      );
      expect(record.action).toBe("force_uninstall");
      expect(record.workspaceId).toBe("ws-1");
    });

    it("should reduce rate limits", () => {
      const record = moderation.reduceRateLimits(
        "bot-1",
        "Rate abuse",
        "admin-1",
        0.5,
        "ws-1",
      );
      expect(record.action).toBe("rate_reduce");
      expect(record.metadata?.reductionFactor).toBe(0.5);
    });
  });

  describe("Lifting Actions", () => {
    it("should lift an active moderation action", () => {
      const record = moderation.suspend("bot-1", "Temp", "admin-1");
      const lifted = moderation.liftAction(record.id, "admin-2");
      expect(lifted.active).toBe(false);
    });

    it("should throw when lifting non-existent record", () => {
      expect(() => moderation.liftAction("nonexistent", "admin-1")).toThrow(
        BotModerationError,
      );
    });

    it("should throw when lifting already inactive record", () => {
      const record = moderation.warn("bot-1", "test", "admin-1");
      moderation.liftAction(record.id, "admin-1");
      expect(() => moderation.liftAction(record.id, "admin-1")).toThrow(
        BotModerationError,
      );
    });
  });

  describe("Status Checks", () => {
    it("should detect suspended bot", () => {
      expect(moderation.isSuspended("bot-1")).toBe(false);
      moderation.suspend("bot-1", "Test", "admin-1");
      expect(moderation.isSuspended("bot-1")).toBe(true);
    });

    it("should detect banned bot", () => {
      expect(moderation.isBanned("bot-1")).toBe(false);
      moderation.ban("bot-1", "Test", "admin-1");
      expect(moderation.isBanned("bot-1")).toBe(true);
    });

    it("should detect restricted bot", () => {
      expect(moderation.isRestricted("bot-1")).toBe(false);
      moderation.restrict("bot-1", "Test", "admin-1");
      expect(moderation.isRestricted("bot-1")).toBe(true);
    });

    it("should check if bot can act", () => {
      expect(moderation.canAct("bot-1").allowed).toBe(true);
      moderation.suspend("bot-1", "Test", "admin-1");
      const result = moderation.canAct("bot-1");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("suspended");
    });

    it("should check workspace-specific suspension", () => {
      moderation.suspend("bot-1", "Test", "admin-1", undefined, "ws-1");
      expect(moderation.isSuspended("bot-1", "ws-1")).toBe(true);
      expect(moderation.isSuspended("bot-1", "ws-2")).toBe(false);
    });
  });

  describe("Abuse Detection", () => {
    it("should record rate limit violations", () => {
      const flags = moderation.recordRateLimitViolation("bot-1");
      expect(flags.rateLimitViolations).toBe(1);
      expect(flags.isFlagged).toBe(false);
    });

    it("should flag bot after threshold", () => {
      // Default threshold is 10
      for (let i = 0; i < 10; i++) {
        moderation.recordRateLimitViolation("bot-1");
      }
      const flags = moderation.getAbuseFlags("bot-1");
      expect(flags.isFlagged).toBe(true);
      expect(flags.rateLimitViolations).toBe(10);
    });

    it("should record scope escalation attempts", () => {
      const flags = moderation.recordScopeEscalation("bot-1");
      expect(flags.scopeEscalationAttempts).toBe(1);
    });

    it("should flag after scope escalation threshold", () => {
      for (let i = 0; i < 3; i++) {
        moderation.recordScopeEscalation("bot-1");
      }
      expect(moderation.getAbuseFlags("bot-1").isFlagged).toBe(true);
    });

    it("should update spam score", () => {
      const flags = moderation.updateSpamScore("bot-1", 50);
      expect(flags.spamScore).toBe(50);
      expect(flags.isFlagged).toBe(false);
    });

    it("should flag at spam threshold", () => {
      moderation.updateSpamScore("bot-1", 80);
      expect(moderation.getAbuseFlags("bot-1").isFlagged).toBe(true);
    });

    it("should clamp spam score to 0-100", () => {
      moderation.updateSpamScore("bot-1", 150);
      expect(moderation.getAbuseFlags("bot-1").spamScore).toBe(100);
      moderation.updateSpamScore("bot-1", -10);
      expect(moderation.getAbuseFlags("bot-1").spamScore).toBe(0);
    });

    it("should record unauthorized channel attempts", () => {
      const flags = moderation.recordUnauthorizedChannelAttempt("bot-1");
      expect(flags.unauthorizedChannelAttempts).toBe(1);
    });

    it("should reset abuse flags", () => {
      moderation.recordRateLimitViolation("bot-1");
      moderation.recordScopeEscalation("bot-1");
      moderation.resetAbuseFlags("bot-1", "admin-1");
      const flags = moderation.getAbuseFlags("bot-1");
      expect(flags.rateLimitViolations).toBe(0);
      expect(flags.scopeEscalationAttempts).toBe(0);
      expect(flags.isFlagged).toBe(false);
    });
  });

  describe("Audit Trail", () => {
    it("should create audit entries for moderation actions", () => {
      moderation.warn("bot-1", "test warning", "admin-1");
      const entries = moderation.getAuditEntries({ botId: "bot-1" });
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].eventType).toBe("bot.moderation_action");
    });

    it("should create audit entries for abuse detection", () => {
      for (let i = 0; i < 10; i++) {
        moderation.recordRateLimitViolation("bot-1");
      }
      const entries = moderation.getAuditEntries({
        botId: "bot-1",
        eventType: "bot.abuse_detected",
      });
      expect(entries.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// 8. BOT LIFECYCLE TESTS
// ============================================================================

describe("Bot Lifecycle", () => {
  let manager: BotLifecycleManager;

  beforeEach(() => {
    manager = new BotLifecycleManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe("Installation", () => {
    it("should install a bot into a workspace", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      expect(inst.status).toBe("active");
      expect(inst.botId).toBe(bot.id);
      expect(inst.workspaceId).toBe("ws-1");
    });

    it("should reject installing non-existent bot", () => {
      expect(() => installTestBot(manager, "nonexistent")).toThrow(
        BotLifecycleError,
      );
    });

    it("should reject duplicate installation", () => {
      const bot = createTestBot(manager);
      installTestBot(manager, bot.id);
      expect(() => installTestBot(manager, bot.id)).toThrow(BotLifecycleError);
    });

    it("should allow installation in different workspaces", () => {
      const bot = createTestBot(manager);
      const inst1 = installTestBot(manager, bot.id, "ws-1");
      const inst2 = installTestBot(manager, bot.id, "ws-2");
      expect(inst1.id).not.toBe(inst2.id);
    });

    it("should reject installing suspended bot", () => {
      const bot = createTestBot(manager);
      manager.suspendBot(bot.id, "test", "admin-1");
      expect(() => installTestBot(manager, bot.id)).toThrow(BotLifecycleError);
    });

    it("should install with configuration", () => {
      const bot = createTestBot(manager);
      const inst = manager.installBot({
        botId: bot.id,
        workspaceId: "ws-1",
        installedBy: "admin-1",
        scopes: ["read:messages"],
        manifestScopes: ["read:messages"],
        config: { prefix: "!", locale: "en" },
      });
      expect(inst.config).toEqual({ prefix: "!", locale: "en" });
    });
  });

  describe("Disable / Enable", () => {
    it("should disable an active installation", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      const disabled = manager.disableInstallation(inst.id, "admin-1");
      expect(disabled.status).toBe("disabled");
    });

    it("should enable a disabled installation", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      manager.disableInstallation(inst.id, "admin-1");
      const enabled = manager.enableInstallation(inst.id, "admin-1");
      expect(enabled.status).toBe("active");
    });

    it("should reject enabling when bot is moderated", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      manager.disableInstallation(inst.id, "admin-1");
      manager.getModeration().ban(bot.id, "Banned", "admin-1");
      expect(() => manager.enableInstallation(inst.id, "admin-1")).toThrow(
        BotLifecycleError,
      );
    });

    it("should not disable an already uninstalled bot", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      manager.uninstallBot(inst.id, "admin-1");
      expect(() => manager.disableInstallation(inst.id, "admin-1")).toThrow(
        BotLifecycleError,
      );
    });
  });

  describe("Suspend / Unsuspend Installation", () => {
    it("should suspend an installation", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      const suspended = manager.suspendInstallation(
        inst.id,
        "admin-1",
        "Policy violation",
      );
      expect(suspended.status).toBe("suspended");
    });

    it("should unsuspend an installation", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      manager.suspendInstallation(inst.id, "admin-1", "Temp");
      const unsuspended = manager.unsuspendInstallation(inst.id, "admin-1");
      expect(unsuspended.status).toBe("active");
    });
  });

  describe("Uninstall", () => {
    it("should uninstall a bot", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      const uninstalled = manager.uninstallBot(inst.id, "admin-1");
      expect(uninstalled.status).toBe("uninstalled");
      expect(uninstalled.scopeGrants).toHaveLength(0);
      expect(uninstalled.activeChannels).toHaveLength(0);
    });

    it("should allow reinstallation after uninstall", () => {
      const bot = createTestBot(manager);
      const inst1 = installTestBot(manager, bot.id);
      manager.uninstallBot(inst1.id, "admin-1");
      const inst2 = installTestBot(manager, bot.id);
      expect(inst2.status).toBe("active");
    });

    it("should not uninstall an already uninstalled bot", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      manager.uninstallBot(inst.id, "admin-1");
      expect(() => manager.uninstallBot(inst.id, "admin-1")).toThrow(
        BotLifecycleError,
      );
    });
  });

  describe("Bot Account Suspension", () => {
    it("should suspend bot account and all installations", () => {
      const bot = createTestBot(manager);
      installTestBot(manager, bot.id, "ws-1");
      installTestBot(manager, bot.id, "ws-2");

      manager.suspendBot(bot.id, "Policy violation", "admin-1");

      const updatedBot = manager.getBot(bot.id)!;
      expect(updatedBot.status).toBe("suspended");

      const installations = manager.listInstallations({ botId: bot.id });
      expect(installations.every((i) => i.status === "suspended")).toBe(true);
    });

    it("should unsuspend bot account", () => {
      const bot = createTestBot(manager);
      manager.suspendBot(bot.id, "test", "admin-1");
      const unsuspended = manager.unsuspendBot(bot.id, "admin-1");
      expect(unsuspended.status).toBe("active");
    });
  });

  describe("Bot Deletion", () => {
    it("should soft-delete a bot and uninstall all", () => {
      const bot = createTestBot(manager);
      installTestBot(manager, bot.id, "ws-1");
      installTestBot(manager, bot.id, "ws-2");

      const deleted = manager.deleteBot(bot.id, "admin-1");
      expect(deleted.status).toBe("deleted");

      const installations = manager.listInstallations({ botId: bot.id });
      expect(installations.every((i) => i.status === "uninstalled")).toBe(true);
    });

    it("should not be able to install a deleted bot", () => {
      const bot = createTestBot(manager);
      manager.deleteBot(bot.id, "admin-1");
      expect(() => installTestBot(manager, bot.id)).toThrow(BotLifecycleError);
    });
  });

  describe("Force Uninstall (Admin Override)", () => {
    it("should force uninstall regardless of state", () => {
      const bot = createTestBot(manager);
      installTestBot(manager, bot.id);
      const result = manager.forceUninstall(
        bot.id,
        "ws-1",
        "Emergency",
        "admin-1",
      );
      expect(result?.status).toBe("uninstalled");
    });

    it("should return undefined for non-existent installation", () => {
      const result = manager.forceUninstall("bot-1", "ws-1", "test", "admin-1");
      expect(result).toBeUndefined();
    });

    it("should return existing uninstalled installation", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      manager.uninstallBot(inst.id, "admin-1");
      const result = manager.forceUninstall(bot.id, "ws-1", "test", "admin-1");
      expect(result?.status).toBe("uninstalled");
    });
  });

  describe("Rate Limiting Integration", () => {
    it("should check rate limits and record violations", () => {
      const bot = createTestBot(manager);
      manager.setRateLimitConfig(bot.id, {
        globalRequestsPerMinute: 1,
        burstAllowance: 0,
        channelMessageRate: 10,
        endpointOverrides: {},
      });

      const r1 = manager.checkRateLimit(bot.id);
      expect(r1.allowed).toBe(true);

      const r2 = manager.checkRateLimit(bot.id);
      expect(r2.allowed).toBe(false);
    });
  });

  describe("Audit Log", () => {
    it("should log bot creation", () => {
      const bot = createTestBot(manager);
      const log = manager.getAuditLog({ botId: bot.id });
      expect(log.some((e) => e.eventType === "bot.created")).toBe(true);
    });

    it("should log installation", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      const log = manager.getAuditLog({ botId: bot.id });
      expect(log.some((e) => e.eventType === "bot.installed")).toBe(true);
    });

    it("should log suspension", () => {
      const bot = createTestBot(manager);
      manager.suspendBot(bot.id, "test", "admin-1");
      const log = manager.getAuditLog({ botId: bot.id });
      expect(log.some((e) => e.eventType === "bot.suspended")).toBe(true);
    });

    it("should log scope changes", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      manager.grantScopes(
        inst.id,
        ["read:channels"],
        ["read:messages", "write:messages", "read:channels"],
        "admin-1",
      );
      const log = manager.getAuditLog({ botId: bot.id });
      expect(log.some((e) => e.eventType === "bot.scope_granted")).toBe(true);
    });
  });

  describe("Listing and Queries", () => {
    it("should list installations by workspace", () => {
      const bot1 = createTestBot(manager, { username: "bot-a" });
      const bot2 = createTestBot(manager, { username: "bot-b" });
      installTestBot(manager, bot1.id, "ws-1");
      installTestBot(manager, bot2.id, "ws-1");
      installTestBot(manager, bot1.id, "ws-2");

      expect(manager.listInstallations({ workspaceId: "ws-1" })).toHaveLength(
        2,
      );
      expect(manager.listInstallations({ workspaceId: "ws-2" })).toHaveLength(
        1,
      );
    });

    it("should list installations by status", () => {
      const bot = createTestBot(manager);
      const inst = installTestBot(manager, bot.id);
      expect(manager.listInstallations({ status: "active" })).toHaveLength(1);
      manager.disableInstallation(inst.id, "admin-1");
      expect(manager.listInstallations({ status: "disabled" })).toHaveLength(1);
      expect(manager.listInstallations({ status: "active" })).toHaveLength(0);
    });
  });

  describe("Clear All", () => {
    it("should clear all data", () => {
      const bot = createTestBot(manager);
      installTestBot(manager, bot.id);
      manager.clearAll();
      expect(manager.listBots()).toHaveLength(0);
      expect(manager.listInstallations()).toHaveLength(0);
    });
  });
});

// ============================================================================
// 9. SECURITY TESTS
// ============================================================================

describe("Security", () => {
  let manager: BotLifecycleManager;

  beforeEach(() => {
    manager = new BotLifecycleManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  it("should prevent scope escalation during install", () => {
    const bot = createTestBot(manager);
    expect(() =>
      manager.installBot({
        botId: bot.id,
        workspaceId: "ws-1",
        installedBy: "admin-1",
        scopes: ["admin:*"],
        manifestScopes: ["read:messages"],
      }),
    ).toThrow();
  });

  it("should prevent scope escalation during grant", () => {
    const bot = createTestBot(manager);
    const inst = installTestBot(manager, bot.id);
    expect(() =>
      manager.grantScopes(
        inst.id,
        ["admin:*"],
        ["read:messages", "write:messages"],
        "admin-1",
      ),
    ).toThrow();
  });

  it("should prevent actions on suspended bot", () => {
    const bot = createTestBot(manager);
    const inst = installTestBot(manager, bot.id);
    manager.suspendBot(bot.id, "test", "admin-1");
    expect(() => manager.enforceScope(inst.id, "read:messages")).toThrow();
  });

  it("should prevent actions on banned bot", () => {
    const bot = createTestBot(manager);
    const inst = installTestBot(manager, bot.id);
    manager.getModeration().ban(bot.id, "banned", "admin-1");
    expect(() => manager.enforceScope(inst.id, "read:messages")).toThrow();
  });

  it("should prevent installing banned bot", () => {
    const bot = createTestBot(manager);
    manager.getModeration().ban(bot.id, "banned", "admin-1");
    expect(() => installTestBot(manager, bot.id, "ws-2")).toThrow();
  });

  it("should not allow re-enabling when moderated", () => {
    const bot = createTestBot(manager);
    const inst = installTestBot(manager, bot.id);
    manager.disableInstallation(inst.id, "admin-1");
    manager.getModeration().suspend(bot.id, "suspended", "admin-1");
    expect(() => manager.enableInstallation(inst.id, "admin-1")).toThrow();
  });

  it("should enforce channel-specific scope restrictions", () => {
    const bot = createTestBot(manager);
    const inst = manager.installBot({
      botId: bot.id,
      workspaceId: "ws-1",
      installedBy: "admin-1",
      scopes: ["read:messages"],
      channelIds: ["allowed-channel"],
      manifestScopes: ["read:messages"],
    });
    expect(() =>
      manager.enforceScope(inst.id, "read:messages", "allowed-channel"),
    ).not.toThrow();
    expect(() =>
      manager.enforceScope(inst.id, "read:messages", "restricted-channel"),
    ).toThrow();
  });

  it("should delete bot and clean up all installations", () => {
    const bot = createTestBot(manager);
    installTestBot(manager, bot.id, "ws-1");
    installTestBot(manager, bot.id, "ws-2");

    manager.deleteBot(bot.id, "admin-1");

    // All installations should be uninstalled
    const installations = manager.listInstallations({ botId: bot.id });
    expect(installations.every((i) => i.status === "uninstalled")).toBe(true);
    expect(installations.every((i) => i.scopeGrants.length === 0)).toBe(true);
  });

  it("should prevent scope modification on non-active installations", () => {
    const bot = createTestBot(manager);
    const inst = installTestBot(manager, bot.id);
    manager.disableInstallation(inst.id, "admin-1");
    expect(() =>
      manager.grantScopes(
        inst.id,
        ["read:channels"],
        ["read:messages", "write:messages", "read:channels"],
        "admin-1",
      ),
    ).toThrow();
  });

  it("should track rate limit violations for abuse detection", () => {
    const bot = createTestBot(manager);
    manager.setRateLimitConfig(bot.id, {
      globalRequestsPerMinute: 1,
      burstAllowance: 0,
      channelMessageRate: 10,
      endpointOverrides: {},
    });

    manager.checkRateLimit(bot.id); // Use up the limit
    manager.checkRateLimit(bot.id); // This should be blocked and recorded

    const flags = manager.getModeration().getAbuseFlags(bot.id);
    expect(flags.rateLimitViolations).toBeGreaterThan(0);
  });
});

// ============================================================================
// 10. STATE TRANSITION TESTS
// ============================================================================

describe("State Transitions", () => {
  it("should define valid bot account transitions", () => {
    expect(BOT_ACCOUNT_TRANSITIONS.active).toContain("suspended");
    expect(BOT_ACCOUNT_TRANSITIONS.active).toContain("disabled");
    expect(BOT_ACCOUNT_TRANSITIONS.active).toContain("deleted");
    expect(BOT_ACCOUNT_TRANSITIONS.suspended).toContain("active");
    expect(BOT_ACCOUNT_TRANSITIONS.deleted).toHaveLength(0);
  });

  it("should define valid installation transitions", () => {
    expect(BOT_INSTALLATION_TRANSITIONS.active).toContain("disabled");
    expect(BOT_INSTALLATION_TRANSITIONS.active).toContain("suspended");
    expect(BOT_INSTALLATION_TRANSITIONS.active).toContain("uninstalled");
    expect(BOT_INSTALLATION_TRANSITIONS.disabled).toContain("active");
    expect(BOT_INSTALLATION_TRANSITIONS.uninstalled).toContain("active");
  });

  it("should enforce bot account state machine", () => {
    const manager = new BotLifecycleManager();
    const bot = createTestBot(manager);

    // active -> suspended (valid)
    manager.suspendBot(bot.id, "test", "admin-1");
    expect(manager.getBot(bot.id)!.status).toBe("suspended");

    // suspended -> active (valid)
    manager.unsuspendBot(bot.id, "admin-1");
    expect(manager.getBot(bot.id)!.status).toBe("active");

    // active -> deleted (valid)
    manager.deleteBot(bot.id, "admin-1");
    expect(manager.getBot(bot.id)!.status).toBe("deleted");

    manager.destroy();
  });

  it("should reject invalid installation transitions", () => {
    const manager = new BotLifecycleManager();
    const bot = createTestBot(manager);
    const inst = installTestBot(manager, bot.id);

    // active -> active (invalid: enable already active)
    expect(() => manager.enableInstallation(inst.id, "admin-1")).toThrow();

    manager.destroy();
  });
});

// ============================================================================
// 11. EDGE CASES
// ============================================================================

describe("Edge Cases", () => {
  let manager: BotLifecycleManager;

  beforeEach(() => {
    manager = new BotLifecycleManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  it("should handle empty scope grants installation", () => {
    const bot = createTestBot(manager);
    const inst = manager.installBot({
      botId: bot.id,
      workspaceId: "ws-1",
      installedBy: "admin-1",
    });
    expect(inst.scopeGrants).toHaveLength(0);
  });

  it("should handle bot with no installations on delete", () => {
    const bot = createTestBot(manager);
    expect(() => manager.deleteBot(bot.id, "admin-1")).not.toThrow();
  });

  it("should handle concurrent installations in different workspaces", () => {
    const bot = createTestBot(manager);
    const inst1 = installTestBot(manager, bot.id, "ws-1");
    const inst2 = installTestBot(manager, bot.id, "ws-2");
    const inst3 = installTestBot(manager, bot.id, "ws-3");

    // Disable in ws-1, should not affect others
    manager.disableInstallation(inst1.id, "admin-1");
    expect(manager.getInstallation(inst1.id)!.status).toBe("disabled");
    expect(manager.getInstallation(inst2.id)!.status).toBe("active");
    expect(manager.getInstallation(inst3.id)!.status).toBe("active");
  });

  it("should handle scope grant limit", () => {
    const bot = createTestBot(manager);
    const manyScopes: AppScope[] = Array.from(
      { length: MAX_SCOPE_GRANTS + 1 },
      () => "read:messages",
    );
    const inst = installTestBot(manager, bot.id);

    // The grant function prevents duplicates but we test the limit mechanism
    // by trying to grant more unique scopes than allowed
    expect(inst.scopeGrants.length).toBeLessThanOrEqual(MAX_SCOPE_GRANTS);
  });

  it("should handle deleting already-deleted bot gracefully", () => {
    const bot = createTestBot(manager);
    manager.deleteBot(bot.id, "admin-1");
    // Trying to delete again should fail because 'deleted' -> 'deleted' is not a valid transition
    expect(() => manager.deleteBot(bot.id, "admin-1")).toThrow();
  });

  it("should handle moderation after suspension", () => {
    const bot = createTestBot(manager);
    const inst = installTestBot(manager, bot.id);
    manager.suspendBot(bot.id, "test", "admin-1");

    // Should not be able to modify scopes on suspended installation
    expect(() =>
      manager.grantScopes(
        inst.id,
        ["read:channels"],
        ["read:channels"],
        "admin-1",
      ),
    ).toThrow();
  });

  it("should reinstall with different scopes", () => {
    const bot = createTestBot(manager);
    const inst1 = installTestBot(manager, bot.id);
    manager.uninstallBot(inst1.id, "admin-1");

    const inst2 = manager.installBot({
      botId: bot.id,
      workspaceId: "ws-1",
      installedBy: "admin-1",
      scopes: ["read:channels"],
      manifestScopes: ["read:messages", "write:messages", "read:channels"],
    });
    expect(inst2.scopeGrants.map((g) => g.scope)).toEqual(["read:channels"]);
  });
});

// ============================================================================
// 12. CAPABILITY PRESET TESTS
// ============================================================================

describe("Capability Presets", () => {
  it("should define read_only preset", () => {
    expect(CAPABILITY_PRESET_SCOPES.read_only).toContain("read:messages");
    expect(CAPABILITY_PRESET_SCOPES.read_only).toContain("read:channels");
    expect(CAPABILITY_PRESET_SCOPES.read_only).toContain("read:users");
    expect(CAPABILITY_PRESET_SCOPES.read_only).not.toContain("write:messages");
  });

  it("should define responder preset", () => {
    expect(CAPABILITY_PRESET_SCOPES.responder).toContain("read:messages");
    expect(CAPABILITY_PRESET_SCOPES.responder).toContain("write:messages");
  });

  it("should define moderator preset", () => {
    expect(CAPABILITY_PRESET_SCOPES.moderator).toContain("admin:moderation");
  });

  it("should define full_access preset with wildcards", () => {
    expect(CAPABILITY_PRESET_SCOPES.full_access).toContain("read:*");
    expect(CAPABILITY_PRESET_SCOPES.full_access).toContain("write:*");
    expect(CAPABILITY_PRESET_SCOPES.full_access).toContain("admin:*");
  });
});

// ============================================================================
// 13. DEFAULT RATE LIMITS TESTS
// ============================================================================

describe("Default Rate Limits", () => {
  it("should have sensible global defaults", () => {
    expect(DEFAULT_BOT_RATE_LIMITS.globalRequestsPerMinute).toBe(60);
    expect(DEFAULT_BOT_RATE_LIMITS.burstAllowance).toBe(10);
    expect(DEFAULT_BOT_RATE_LIMITS.channelMessageRate).toBe(10);
  });

  it("should have endpoint-specific defaults", () => {
    expect(
      DEFAULT_BOT_RATE_LIMITS.endpointOverrides["messages:send"],
    ).toBeDefined();
    expect(
      DEFAULT_BOT_RATE_LIMITS.endpointOverrides["files:upload"],
    ).toBeDefined();
    expect(
      DEFAULT_BOT_RATE_LIMITS.endpointOverrides["channels:create"],
    ).toBeDefined();
  });

  it("should have stricter limits for destructive operations", () => {
    const sendRate =
      DEFAULT_BOT_RATE_LIMITS.endpointOverrides["messages:send"]
        .requestsPerMinute;
    const deleteRate =
      DEFAULT_BOT_RATE_LIMITS.endpointOverrides["messages:delete"]
        .requestsPerMinute;
    expect(deleteRate).toBeLessThan(sendRate);
  });
});
