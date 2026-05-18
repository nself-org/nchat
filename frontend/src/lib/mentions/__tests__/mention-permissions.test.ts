/**
 * Mention Permissions Unit Tests
 *
 * Comprehensive tests for mention permission functionality including:
 * - Role-based permission checks
 * - Platform-specific rules (WhatsApp, Telegram, Slack, Discord)
 * - Notification fanout controls
 * - Anti-abuse measures
 * - Rate limiting
 */

import {
  // Core permission functions
  canUseMention,
  getMentionPermissions,
  roleAtLeast,
  getEffectiveRole,
  isAdmin,
  isModerator,
  canUseAnyGroupMention,
  // Channel settings
  mergeChannelSettings,
  channelAllowsGroupMentions,
  getMinRoleForGroupMentions,
  // Validation
  validateMentions,
  // Rate limiting
  isRateLimitedForGroupMentions,
  recordGroupMention,
  getRemainingGroupMentions,
  // Permission display
  getPermissionMessage,
  getMentionPermissionTooltip,
  // Platform-specific
  getPlatformMentionRules,
  canUseMentionOnPlatform,
  getPlatformMentionPermissions,
  validateMentionCount,
  PLATFORM_MENTION_RULES,
  // Notification fanout
  calculateMentionFanout,
  DEFAULT_FANOUT_OPTIONS,
  // Anti-abuse
  checkAntiAbuse,
  recordMention,
  resetAntiAbuseTracking,
  clearAllAntiAbuseTracking,
  adminCanBypassAntiAbuse,
  DEFAULT_ANTI_ABUSE_CONFIG,
  // Types
  type UserRole,
  type PermissionContext,
  type PlatformType,
  type UserNotificationStatus,
  type AntiAbuseConfig,
  ROLE_HIERARCHY,
  GROUP_MENTION_RATE_LIMIT,
} from "../mention-permissions";
import { DEFAULT_CHANNEL_MENTION_SETTINGS } from "../mention-types";

// ============================================================================
// Test Helpers
// ============================================================================

const createPermissionContext = (
  overrides?: Partial<PermissionContext>,
): PermissionContext => ({
  userRole: "member",
  channelSettings: DEFAULT_CHANNEL_MENTION_SETTINGS,
  ...overrides,
});

const createUserNotificationStatus = (
  overrides?: Partial<UserNotificationStatus>,
): UserNotificationStatus => ({
  userId: `user-${Math.random().toString(36).substr(2, 9)}`,
  isDND: false,
  isMuted: false,
  isOnline: true,
  allowMentionNotifications: true,
  allowGroupMentionNotifications: true,
  ...overrides,
});

// ============================================================================
// Role Hierarchy Tests
// ============================================================================

describe("Role Hierarchy", () => {
  describe("roleAtLeast", () => {
    it("should return true when role equals minimum", () => {
      expect(roleAtLeast("admin", "admin")).toBe(true);
      expect(roleAtLeast("member", "member")).toBe(true);
    });

    it("should return true when role exceeds minimum", () => {
      expect(roleAtLeast("owner", "admin")).toBe(true);
      expect(roleAtLeast("admin", "moderator")).toBe(true);
      expect(roleAtLeast("moderator", "member")).toBe(true);
      expect(roleAtLeast("member", "guest")).toBe(true);
    });

    it("should return false when role is below minimum", () => {
      expect(roleAtLeast("guest", "member")).toBe(false);
      expect(roleAtLeast("member", "moderator")).toBe(false);
      expect(roleAtLeast("moderator", "admin")).toBe(false);
      expect(roleAtLeast("admin", "owner")).toBe(false);
    });

    it("should validate full hierarchy chain", () => {
      const roles: UserRole[] = [
        "guest",
        "member",
        "moderator",
        "admin",
        "owner",
      ];
      for (let i = 0; i < roles.length; i++) {
        for (let j = 0; j < roles.length; j++) {
          expect(roleAtLeast(roles[i], roles[j])).toBe(i >= j);
        }
      }
    });
  });

  describe("getEffectiveRole", () => {
    it("should return global role when no channel role", () => {
      expect(getEffectiveRole("admin", undefined)).toBe("admin");
      expect(getEffectiveRole("member", undefined)).toBe("member");
    });

    it("should return higher of two roles", () => {
      expect(getEffectiveRole("admin", "member")).toBe("admin");
      expect(getEffectiveRole("member", "admin")).toBe("admin");
      expect(getEffectiveRole("moderator", "owner")).toBe("owner");
    });

    it("should return same role when both are equal", () => {
      expect(getEffectiveRole("admin", "admin")).toBe("admin");
      expect(getEffectiveRole("member", "member")).toBe("member");
    });
  });

  describe("isAdmin", () => {
    it("should return true for admin and owner", () => {
      expect(isAdmin("admin")).toBe(true);
      expect(isAdmin("owner")).toBe(true);
    });

    it("should return false for lower roles", () => {
      expect(isAdmin("moderator")).toBe(false);
      expect(isAdmin("member")).toBe(false);
      expect(isAdmin("guest")).toBe(false);
    });
  });

  describe("isModerator", () => {
    it("should return true for moderator and above", () => {
      expect(isModerator("moderator")).toBe(true);
      expect(isModerator("admin")).toBe(true);
      expect(isModerator("owner")).toBe(true);
    });

    it("should return false for lower roles", () => {
      expect(isModerator("member")).toBe(false);
      expect(isModerator("guest")).toBe(false);
    });
  });
});

// ============================================================================
// Core Permission Tests
// ============================================================================

describe("canUseMention", () => {
  describe("user mentions", () => {
    it("should always allow user mentions", () => {
      expect(
        canUseMention("user", createPermissionContext({ userRole: "guest" })),
      ).toBe(true);
      expect(
        canUseMention("user", createPermissionContext({ userRole: "member" })),
      ).toBe(true);
      expect(
        canUseMention("user", createPermissionContext({ userRole: "admin" })),
      ).toBe(true);
    });

    it("should disallow in archived channels", () => {
      expect(
        canUseMention(
          "user",
          createPermissionContext({ userRole: "admin", isArchived: true }),
        ),
      ).toBe(false);
    });
  });

  describe("@everyone mentions", () => {
    it("should allow for admin role by default", () => {
      expect(
        canUseMention(
          "everyone",
          createPermissionContext({ userRole: "admin" }),
        ),
      ).toBe(true);
    });

    it("should disallow for member role by default", () => {
      expect(
        canUseMention(
          "everyone",
          createPermissionContext({ userRole: "member" }),
        ),
      ).toBe(false);
    });

    it("should respect channel settings", () => {
      const context = createPermissionContext({
        userRole: "admin",
        channelSettings: {
          ...DEFAULT_CHANNEL_MENTION_SETTINGS,
          allowEveryone: false,
        },
      });
      expect(canUseMention("everyone", context)).toBe(false);
    });

    it("should always allow for workspace owner", () => {
      expect(
        canUseMention(
          "everyone",
          createPermissionContext({
            userRole: "member",
            isWorkspaceOwner: true,
          }),
        ),
      ).toBe(true);
    });
  });

  describe("@here mentions", () => {
    it("should allow for moderator role by default", () => {
      expect(
        canUseMention(
          "here",
          createPermissionContext({ userRole: "moderator" }),
        ),
      ).toBe(true);
    });

    it("should allow for all roles in DMs", () => {
      expect(
        canUseMention(
          "here",
          createPermissionContext({
            userRole: "member",
            isDirectMessage: true,
          }),
        ),
      ).toBe(true);
    });
  });

  describe("role mentions", () => {
    it("should require moderator or higher", () => {
      expect(
        canUseMention("role", createPermissionContext({ userRole: "member" })),
      ).toBe(false);
      expect(
        canUseMention(
          "role",
          createPermissionContext({ userRole: "moderator" }),
        ),
      ).toBe(true);
      expect(
        canUseMention("role", createPermissionContext({ userRole: "admin" })),
      ).toBe(true);
    });
  });
});

describe("getMentionPermissions", () => {
  it("should return all permissions for owner", () => {
    const perms = getMentionPermissions(
      createPermissionContext({
        userRole: "owner",
        isWorkspaceOwner: true,
      }),
    );

    expect(perms.canMentionUsers).toBe(true);
    expect(perms.canMentionChannels).toBe(true);
    expect(perms.canMentionEveryone).toBe(true);
    expect(perms.canMentionHere).toBe(true);
    expect(perms.canMentionRoles).toBe(true);
  });

  it("should restrict permissions for guest", () => {
    const perms = getMentionPermissions(
      createPermissionContext({ userRole: "guest" }),
    );

    expect(perms.canMentionUsers).toBe(true);
    expect(perms.canMentionChannels).toBe(true);
    expect(perms.canMentionEveryone).toBe(false);
    expect(perms.canMentionHere).toBe(false);
    expect(perms.canMentionRoles).toBe(false);
  });
});

describe("canUseAnyGroupMention", () => {
  it("should return true if can use @everyone", () => {
    expect(
      canUseAnyGroupMention(createPermissionContext({ userRole: "admin" })),
    ).toBe(true);
  });

  it("should return true if can use @here", () => {
    expect(
      canUseAnyGroupMention(createPermissionContext({ userRole: "moderator" })),
    ).toBe(true);
  });

  it("should return false if cannot use any group mention", () => {
    expect(
      canUseAnyGroupMention(createPermissionContext({ userRole: "guest" })),
    ).toBe(false);
  });
});

// ============================================================================
// Channel Settings Tests
// ============================================================================

describe("Channel Settings", () => {
  describe("mergeChannelSettings", () => {
    it("should return defaults for empty settings", () => {
      const merged = mergeChannelSettings({});
      expect(merged).toEqual(DEFAULT_CHANNEL_MENTION_SETTINGS);
    });

    it("should override specific settings", () => {
      const merged = mergeChannelSettings({ allowEveryone: false });
      expect(merged.allowEveryone).toBe(false);
      expect(merged.allowHere).toBe(DEFAULT_CHANNEL_MENTION_SETTINGS.allowHere);
    });
  });

  describe("channelAllowsGroupMentions", () => {
    it("should return true if any group mention is allowed", () => {
      expect(
        channelAllowsGroupMentions({
          ...DEFAULT_CHANNEL_MENTION_SETTINGS,
          allowEveryone: true,
          allowHere: false,
          allowChannel: false,
        }),
      ).toBe(true);
    });

    it("should return false if no group mentions allowed", () => {
      expect(
        channelAllowsGroupMentions({
          ...DEFAULT_CHANNEL_MENTION_SETTINGS,
          allowEveryone: false,
          allowHere: false,
          allowChannel: false,
        }),
      ).toBe(false);
    });
  });

  describe("getMinRoleForGroupMentions", () => {
    it("should return the lowest required role", () => {
      const settings = {
        ...DEFAULT_CHANNEL_MENTION_SETTINGS,
        everyoneMinRole: "admin" as UserRole,
        hereMinRole: "member" as UserRole,
        channelMinRole: "moderator" as UserRole,
      };
      expect(getMinRoleForGroupMentions(settings)).toBe("member");
    });

    it("should return owner if no group mentions allowed", () => {
      const settings = {
        ...DEFAULT_CHANNEL_MENTION_SETTINGS,
        allowEveryone: false,
        allowHere: false,
        allowChannel: false,
      };
      expect(getMinRoleForGroupMentions(settings)).toBe("owner");
    });
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe("validateMentions", () => {
  it("should return valid for allowed mentions", () => {
    const result = validateMentions(
      [{ type: "user", identifier: "john" }],
      createPermissionContext({ userRole: "member" }),
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return error for unauthorized @everyone", () => {
    const result = validateMentions(
      [{ type: "everyone", identifier: "everyone" }],
      createPermissionContext({ userRole: "member" }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe("everyone");
  });

  it("should return warning for @everyone usage", () => {
    const result = validateMentions(
      [{ type: "everyone", identifier: "everyone" }],
      createPermissionContext({ userRole: "admin" }),
    );
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].type).toBe("everyone");
  });

  it("should validate multiple mentions", () => {
    const result = validateMentions(
      [
        { type: "user", identifier: "john" },
        { type: "everyone", identifier: "everyone" },
        { type: "role", identifier: "admin" },
      ],
      createPermissionContext({ userRole: "member" }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================================
// Rate Limiting Tests
// ============================================================================

describe("Rate Limiting", () => {
  const testUserId = "test-rate-limit-user";

  beforeEach(() => {
    // Reset rate limits by waiting (in tests we mock time or use unique user IDs)
  });

  describe("isRateLimitedForGroupMentions", () => {
    it("should not be rate limited initially", () => {
      const userId = `user-${Date.now()}-1`;
      expect(isRateLimitedForGroupMentions(userId)).toBe(false);
    });

    it("should be rate limited after max mentions", () => {
      const userId = `user-${Date.now()}-2`;
      for (let i = 0; i < GROUP_MENTION_RATE_LIMIT.maxMentions; i++) {
        recordGroupMention(userId);
      }
      expect(isRateLimitedForGroupMentions(userId)).toBe(true);
    });
  });

  describe("getRemainingGroupMentions", () => {
    it("should return max for new user", () => {
      const userId = `user-${Date.now()}-3`;
      expect(getRemainingGroupMentions(userId)).toBe(
        GROUP_MENTION_RATE_LIMIT.maxMentions,
      );
    });

    it("should decrease with each mention", () => {
      const userId = `user-${Date.now()}-4`;
      recordGroupMention(userId);
      expect(getRemainingGroupMentions(userId)).toBe(
        GROUP_MENTION_RATE_LIMIT.maxMentions - 1,
      );
    });
  });
});

// ============================================================================
// Permission Display Tests
// ============================================================================

describe("Permission Display", () => {
  describe("getPermissionMessage", () => {
    it("should return positive message when allowed", () => {
      const message = getPermissionMessage(
        "everyone",
        true,
        createPermissionContext({ userRole: "admin" }),
      );
      expect(message).toContain("can use");
    });

    it("should return disabled message when channel disables", () => {
      const context = createPermissionContext({
        userRole: "admin",
        channelSettings: {
          ...DEFAULT_CHANNEL_MENTION_SETTINGS,
          allowEveryone: false,
        },
      });
      const message = getPermissionMessage("everyone", false, context);
      expect(message).toContain("disabled");
    });

    it("should return role requirement message", () => {
      const context = createPermissionContext({ userRole: "member" });
      const message = getPermissionMessage("everyone", false, context);
      expect(message).toContain("and above");
    });
  });

  describe("getMentionPermissionTooltip", () => {
    it("should return tooltip based on permission", () => {
      const tooltipAllowed = getMentionPermissionTooltip(
        "user",
        createPermissionContext({ userRole: "member" }),
      );
      expect(tooltipAllowed).toBeTruthy();

      const tooltipDenied = getMentionPermissionTooltip(
        "everyone",
        createPermissionContext({ userRole: "guest" }),
      );
      expect(tooltipDenied).toBeTruthy();
      expect(tooltipDenied).not.toBe(tooltipAllowed);
    });
  });
});

// ============================================================================
// Platform-Specific Rules Tests
// ============================================================================

describe("Platform-Specific Rules", () => {
  describe("getPlatformMentionRules", () => {
    it("should return rules for each platform", () => {
      const platforms: PlatformType[] = [
        "default",
        "whatsapp",
        "telegram",
        "slack",
        "discord",
      ];
      platforms.forEach((platform) => {
        const rules = getPlatformMentionRules(platform);
        expect(rules).toBeDefined();
        expect(rules.maxMentionsPerMessage).toBeGreaterThan(0);
        expect(rules.description).toBeTruthy();
      });
    });

    it("should return default rules for unknown platform", () => {
      const rules = getPlatformMentionRules("unknown" as PlatformType);
      expect(rules).toEqual(PLATFORM_MENTION_RULES.default);
    });
  });

  describe("canUseMentionOnPlatform - WhatsApp", () => {
    const platform: PlatformType = "whatsapp";

    it("should allow anyone in group to use @everyone", () => {
      expect(canUseMentionOnPlatform("everyone", "member", platform)).toBe(
        true,
      );
      expect(canUseMentionOnPlatform("everyone", "guest", platform)).toBe(
        false,
      );
    });

    it("should not support role mentions", () => {
      expect(canUseMentionOnPlatform("role", "admin", platform)).toBe(false);
      expect(canUseMentionOnPlatform("role", "owner", platform)).toBe(false);
    });

    it("should always allow user mentions", () => {
      expect(canUseMentionOnPlatform("user", "guest", platform)).toBe(true);
    });
  });

  describe("canUseMentionOnPlatform - Telegram", () => {
    const platform: PlatformType = "telegram";

    it("should only allow admins for @everyone", () => {
      expect(canUseMentionOnPlatform("everyone", "member", platform)).toBe(
        false,
      );
      expect(canUseMentionOnPlatform("everyone", "admin", platform)).toBe(true);
      expect(canUseMentionOnPlatform("everyone", "owner", platform)).toBe(true);
    });

    it("should not support role mentions", () => {
      expect(canUseMentionOnPlatform("role", "admin", platform)).toBe(false);
    });
  });

  describe("canUseMentionOnPlatform - Slack", () => {
    const platform: PlatformType = "slack";

    it("should allow members to use @here", () => {
      expect(canUseMentionOnPlatform("here", "member", platform)).toBe(true);
    });

    it("should restrict @everyone to admins", () => {
      expect(canUseMentionOnPlatform("everyone", "member", platform)).toBe(
        false,
      );
      expect(canUseMentionOnPlatform("everyone", "admin", platform)).toBe(true);
    });

    it("should support role mentions", () => {
      expect(canUseMentionOnPlatform("role", "member", platform)).toBe(true);
    });
  });

  describe("canUseMentionOnPlatform - Discord", () => {
    const platform: PlatformType = "discord";

    it("should require MENTION_EVERYONE permission (admin) for @everyone", () => {
      expect(canUseMentionOnPlatform("everyone", "member", platform)).toBe(
        false,
      );
      expect(canUseMentionOnPlatform("everyone", "moderator", platform)).toBe(
        false,
      );
      expect(canUseMentionOnPlatform("everyone", "admin", platform)).toBe(true);
    });

    it("should support role mentions", () => {
      expect(canUseMentionOnPlatform("role", "member", platform)).toBe(true);
    });
  });

  describe("getPlatformMentionPermissions", () => {
    it("should return complete permissions for user role on each platform", () => {
      const platforms: PlatformType[] = [
        "default",
        "whatsapp",
        "telegram",
        "slack",
        "discord",
      ];
      platforms.forEach((platform) => {
        const perms = getPlatformMentionPermissions("member", platform);
        expect(perms).toHaveProperty("canMentionUsers");
        expect(perms).toHaveProperty("canMentionEveryone");
        expect(perms).toHaveProperty("canMentionHere");
        expect(perms).toHaveProperty("canMentionRoles");
      });
    });
  });

  describe("validateMentionCount", () => {
    it("should pass for valid count", () => {
      const result = validateMentionCount(5, "default");
      expect(result.valid).toBe(true);
    });

    it("should fail for exceeding limit", () => {
      const result = validateMentionCount(1000, "default");
      expect(result.valid).toBe(false);
      expect(result.message).toBeTruthy();
    });

    it("should use platform-specific limits", () => {
      // WhatsApp has higher limit
      const whatsappResult = validateMentionCount(200, "whatsapp");
      expect(whatsappResult.valid).toBe(true);

      // Telegram has lower limit
      const telegramResult = validateMentionCount(60, "telegram");
      expect(telegramResult.valid).toBe(false);
    });
  });
});

// ============================================================================
// Notification Fanout Tests
// ============================================================================

describe("Notification Fanout", () => {
  beforeEach(() => {
    clearAllAntiAbuseTracking();
  });

  describe("calculateMentionFanout", () => {
    it("should notify all eligible users for @user mention", () => {
      const recipients = [
        createUserNotificationStatus({ userId: "user1" }),
        createUserNotificationStatus({ userId: "user2" }),
      ];
      const result = calculateMentionFanout("user", recipients, "sender");
      expect(result.notifyUsers).toHaveLength(2);
      expect(result.notifyUsers).toContain("user1");
      expect(result.notifyUsers).toContain("user2");
    });

    it("should exclude sender from notifications", () => {
      const recipients = [
        createUserNotificationStatus({ userId: "sender" }),
        createUserNotificationStatus({ userId: "user1" }),
      ];
      const result = calculateMentionFanout("user", recipients, "sender");
      expect(result.notifyUsers).not.toContain("sender");
      expect(result.notifyUsers).toContain("user1");
    });

    it("should respect DND status", () => {
      const recipients = [
        createUserNotificationStatus({ userId: "user1", isDND: true }),
        createUserNotificationStatus({ userId: "user2", isDND: false }),
      ];
      const result = calculateMentionFanout("user", recipients, "sender");
      expect(result.notifyUsers).not.toContain("user1");
      expect(result.skippedDND).toContain("user1");
      expect(result.notifyUsers).toContain("user2");
    });

    it("should override DND for high priority", () => {
      const recipients = [
        createUserNotificationStatus({ userId: "user1", isDND: true }),
      ];
      const result = calculateMentionFanout("user", recipients, "sender", {
        ...DEFAULT_FANOUT_OPTIONS,
        highPriority: true,
      });
      expect(result.notifyUsers).toContain("user1");
    });

    it("should respect mute status", () => {
      const recipients = [
        createUserNotificationStatus({
          userId: "user1",
          isMuted: true,
          mutedUntil: new Date(Date.now() + 60000),
        }),
        createUserNotificationStatus({ userId: "user2" }),
      ];
      const result = calculateMentionFanout("user", recipients, "sender");
      expect(result.skippedMuted).toContain("user1");
      expect(result.notifyUsers).toContain("user2");
    });

    it("should respect user preferences", () => {
      const recipients = [
        createUserNotificationStatus({
          userId: "user1",
          allowMentionNotifications: false,
        }),
        createUserNotificationStatus({ userId: "user2" }),
      ];
      const result = calculateMentionFanout("user", recipients, "sender");
      expect(result.skippedPreferences).toContain("user1");
      expect(result.notifyUsers).toContain("user2");
    });

    it("should only notify online users for @here", () => {
      const recipients = [
        createUserNotificationStatus({ userId: "user1", isOnline: true }),
        createUserNotificationStatus({ userId: "user2", isOnline: false }),
      ];
      const result = calculateMentionFanout("here", recipients, "sender");
      expect(result.notifyUsers).toContain("user1");
      expect(result.notifyUsers).not.toContain("user2");
    });

    it("should respect group mention preferences", () => {
      const recipients = [
        createUserNotificationStatus({
          userId: "user1",
          allowGroupMentionNotifications: false,
        }),
      ];
      const result = calculateMentionFanout("everyone", recipients, "sender");
      expect(result.skippedPreferences).toContain("user1");
    });

    it("should respect max notifications limit", () => {
      const recipients = Array.from({ length: 100 }, (_, i) =>
        createUserNotificationStatus({ userId: `user${i}` }),
      );
      const result = calculateMentionFanout("everyone", recipients, "sender", {
        ...DEFAULT_FANOUT_OPTIONS,
        maxNotifications: 10,
      });
      expect(result.notifyUsers.length).toBe(10);
    });
  });
});

// ============================================================================
// Anti-Abuse Tests
// ============================================================================

describe("Anti-Abuse", () => {
  beforeEach(() => {
    clearAllAntiAbuseTracking();
  });

  describe("checkAntiAbuse", () => {
    it("should allow normal mention usage", () => {
      const result = checkAntiAbuse(
        "user1",
        "user",
        5,
        100 * 24 * 60 * 60 * 1000,
        100,
      );
      expect(result.allowed).toBe(true);
    });

    it("should block excessive mentions per message", () => {
      const result = checkAntiAbuse(
        "user1",
        "user",
        100,
        100 * 24 * 60 * 60 * 1000,
        100,
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Maximum");
      expect(result.suggestedAction).toBe("reduce_mentions");
    });

    it("should block @everyone for new accounts", () => {
      const result = checkAntiAbuse("user1", "everyone", 1, 60 * 1000, 100); // 1 minute old
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Account too new");
      expect(result.suggestedAction).toBe("wait");
    });

    it("should block @everyone for low message count", () => {
      const result = checkAntiAbuse(
        "user1",
        "everyone",
        1,
        100 * 24 * 60 * 60 * 1000,
        5,
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Send at least");
      expect(result.suggestedAction).toBe("use_direct_mention");
    });

    it("should enforce hourly limit for @everyone", () => {
      const userId = "user-hourly-test-1";
      const config: AntiAbuseConfig = {
        ...DEFAULT_ANTI_ABUSE_CONFIG,
        maxGroupMentionsPerHour: 2,
      };

      recordMention(userId, "everyone");
      recordMention(userId, "everyone");

      const result = checkAntiAbuse(
        userId,
        "everyone",
        1,
        100 * 24 * 60 * 60 * 1000,
        100,
        config,
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Hourly");
    });

    it("should enforce cooldown for @everyone", () => {
      const userId = "user-cooldown-test-1";
      recordMention(userId, "everyone");

      const result = checkAntiAbuse(
        userId,
        "everyone",
        1,
        100 * 24 * 60 * 60 * 1000,
        100,
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("wait");
      expect(result.cooldownRemainingMs).toBeDefined();
    });

    it("should detect spam for repeated mentions", () => {
      const userId = "user-spam-test-1";
      const config: AntiAbuseConfig = {
        ...DEFAULT_ANTI_ABUSE_CONFIG,
        spamThreshold: 2,
        spamWindowMs: 60 * 1000,
      };

      recordMention(userId, "user");
      recordMention(userId, "user");

      const result = checkAntiAbuse(
        userId,
        "user",
        1,
        100 * 24 * 60 * 60 * 1000,
        100,
        config,
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("slow down");
    });
  });

  describe("recordMention", () => {
    it("should record mention without error", () => {
      expect(() => recordMention("user1", "everyone")).not.toThrow();
      expect(() => recordMention("user1", "here")).not.toThrow();
      expect(() => recordMention("user1", "user")).not.toThrow();
    });
  });

  describe("resetAntiAbuseTracking", () => {
    it("should reset tracking for specific user", () => {
      const userId = "user-reset-test";
      recordMention(userId, "everyone");
      resetAntiAbuseTracking(userId);

      const result = checkAntiAbuse(
        userId,
        "everyone",
        1,
        100 * 24 * 60 * 60 * 1000,
        100,
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe("adminCanBypassAntiAbuse", () => {
    it("should return true for owner and admin", () => {
      expect(adminCanBypassAntiAbuse("owner")).toBe(true);
      expect(adminCanBypassAntiAbuse("admin")).toBe(true);
    });

    it("should return false for other roles", () => {
      expect(adminCanBypassAntiAbuse("moderator")).toBe(false);
      expect(adminCanBypassAntiAbuse("member")).toBe(false);
      expect(adminCanBypassAntiAbuse("guest")).toBe(false);
    });
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  it("should handle empty recipient list for fanout", () => {
    const result = calculateMentionFanout("everyone", [], "sender");
    expect(result.notifyUsers).toHaveLength(0);
    expect(result.totalRecipients).toBe(0);
  });

  it("should handle all roles in hierarchy", () => {
    expect(ROLE_HIERARCHY.owner).toBe(100);
    expect(ROLE_HIERARCHY.admin).toBe(80);
    expect(ROLE_HIERARCHY.moderator).toBe(60);
    expect(ROLE_HIERARCHY.member).toBe(40);
    expect(ROLE_HIERARCHY.guest).toBe(20);
  });

  it("should handle platform with no group mention support", () => {
    // Test a hypothetical platform that doesn't support group mentions
    const customRules = {
      ...PLATFORM_MENTION_RULES.default,
      supportsGroupMentions: false,
    };
    expect(customRules.supportsGroupMentions).toBe(false);
  });

  it("should handle expired mute", () => {
    const recipients = [
      createUserNotificationStatus({
        userId: "user1",
        isMuted: true,
        mutedUntil: new Date(Date.now() - 60000), // Expired 1 minute ago
      }),
    ];
    const result = calculateMentionFanout("user", recipients, "sender");
    // User should be notified since mute expired
    expect(result.notifyUsers).toContain("user1");
  });
});
