/**
 * Pinned Messages Unit Tests
 *
 * Comprehensive tests for pinned messages functionality including:
 * - Pin limits and validation
 * - Pin permissions
 * - Pin manager operations
 * - Filtering and sorting
 * - Statistics
 */

import {
  PinManager,
  filterPinnedMessages,
  sortPinnedMessages,
  getPinnedMessages,
  reorderPins,
  calculatePinStats,
  pinManager,
} from "../pin-manager";
import {
  PIN_LIMITS,
  hasReachedPinLimit,
  getRemainingPinSlots,
  hasUserReachedPinLimit,
  isValidPinNote,
  checkPinLimits,
  formatRemainingSlots,
  getPinLimitWarningThreshold,
  isNearPinLimit,
  getPinUsagePercentage,
} from "../pin-limits";
import {
  canPinMessage,
  canUnpinMessage,
  canReorderPins,
  canEditPinNote,
  canConfigurePins,
  getPinPermissionDescription,
  getMinimumRoleForPin,
  validatePinConfig,
  type UserRole,
} from "../pin-permissions";
import type {
  PinnedMessage,
  PinMessageInput,
  UnpinMessageInput,
  ChannelPinStats,
  PinConfig,
  PinPermission,
  PinFilters,
} from "../pin-types";
import { DEFAULT_PIN_CONFIG } from "../pin-types";

// ============================================================================
// Test Data
// ============================================================================

const createTestMessage = (overrides = {}) => ({
  id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  channelId: "channel-1",
  content: "Test message content",
  type: "text" as const,
  userId: "user-1",
  user: {
    id: "user-1",
    username: "testuser",
    displayName: "Test User",
  },
  createdAt: new Date(),
  isEdited: false,
  ...overrides,
});

const createTestPinnedMessage = (
  overrides: Partial<PinnedMessage> = {},
): PinnedMessage => ({
  id: `pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  messageId: `msg-${Date.now()}`,
  channelId: "channel-1",
  pinnedBy: {
    id: "user-1",
    username: "testuser",
    displayName: "Test User",
  },
  pinnedAt: new Date(),
  message: createTestMessage(),
  position: 0,
  ...overrides,
});

const createTestStats = (
  overrides: Partial<ChannelPinStats> = {},
): ChannelPinStats => ({
  channelId: "channel-1",
  totalPins: 10,
  maxPins: 50,
  remainingSlots: 40,
  pinnerCount: 5,
  ...overrides,
});

// ============================================================================
// PIN_LIMITS Tests
// ============================================================================

describe("PIN_LIMITS", () => {
  it("should have correct default values", () => {
    expect(PIN_LIMITS.MIN_PINS_PER_CHANNEL).toBe(1);
    expect(PIN_LIMITS.MAX_PINS_PER_CHANNEL).toBe(200);
    expect(PIN_LIMITS.DEFAULT_PINS_PER_CHANNEL).toBe(50);
    expect(PIN_LIMITS.MAX_PINS_PER_USER_PER_CHANNEL).toBe(25);
    expect(PIN_LIMITS.MAX_NOTE_LENGTH).toBe(500);
    expect(PIN_LIMITS.PINS_PER_MINUTE).toBe(10);
  });
});

// ============================================================================
// hasReachedPinLimit Tests
// ============================================================================

describe("hasReachedPinLimit", () => {
  it("should return false when below limit", () => {
    expect(hasReachedPinLimit(10, 50)).toBe(false);
  });

  it("should return true when at limit", () => {
    expect(hasReachedPinLimit(50, 50)).toBe(true);
  });

  it("should return true when above limit", () => {
    expect(hasReachedPinLimit(60, 50)).toBe(true);
  });

  it("should use default limit when not specified", () => {
    expect(hasReachedPinLimit(49)).toBe(false);
    expect(hasReachedPinLimit(50)).toBe(true);
  });

  it("should handle zero pins", () => {
    expect(hasReachedPinLimit(0, 50)).toBe(false);
  });

  it("should handle zero limit", () => {
    expect(hasReachedPinLimit(0, 0)).toBe(true);
  });
});

// ============================================================================
// getRemainingPinSlots Tests
// ============================================================================

describe("getRemainingPinSlots", () => {
  it("should return correct remaining slots", () => {
    expect(getRemainingPinSlots(10, 50)).toBe(40);
  });

  it("should return 0 when at limit", () => {
    expect(getRemainingPinSlots(50, 50)).toBe(0);
  });

  it("should return 0 when over limit", () => {
    expect(getRemainingPinSlots(60, 50)).toBe(0);
  });

  it("should use default limit when not specified", () => {
    expect(getRemainingPinSlots(30)).toBe(20);
  });

  it("should handle zero pins", () => {
    expect(getRemainingPinSlots(0, 50)).toBe(50);
  });
});

// ============================================================================
// hasUserReachedPinLimit Tests
// ============================================================================

describe("hasUserReachedPinLimit", () => {
  it("should return false when below limit", () => {
    expect(hasUserReachedPinLimit(10)).toBe(false);
  });

  it("should return true when at limit", () => {
    expect(hasUserReachedPinLimit(25)).toBe(true);
  });

  it("should return true when above limit", () => {
    expect(hasUserReachedPinLimit(30)).toBe(true);
  });

  it("should accept custom limit", () => {
    expect(hasUserReachedPinLimit(5, 5)).toBe(true);
    expect(hasUserReachedPinLimit(4, 5)).toBe(false);
  });
});

// ============================================================================
// isValidPinNote Tests
// ============================================================================

describe("isValidPinNote", () => {
  it("should return true for undefined note", () => {
    expect(isValidPinNote(undefined)).toBe(true);
  });

  it("should return true for empty note", () => {
    expect(isValidPinNote("")).toBe(true);
  });

  it("should return true for note within limit", () => {
    expect(isValidPinNote("This is a valid note")).toBe(true);
  });

  it("should return true for note at limit", () => {
    const noteAtLimit = "a".repeat(500);
    expect(isValidPinNote(noteAtLimit)).toBe(true);
  });

  it("should return false for note over limit", () => {
    const noteOverLimit = "a".repeat(501);
    expect(isValidPinNote(noteOverLimit)).toBe(false);
  });
});

// ============================================================================
// checkPinLimits Tests
// ============================================================================

describe("checkPinLimits", () => {
  it("should allow pin when under all limits", () => {
    const stats = createTestStats({ totalPins: 10, maxPins: 50 });
    const result = checkPinLimits(stats, 5);

    expect(result.canPin).toBe(true);
    expect(result.remainingSlots).toBe(40);
  });

  it("should deny pin when channel limit reached", () => {
    const stats = createTestStats({ totalPins: 50 });
    const result = checkPinLimits(stats, 5, { maxPins: 50 });

    expect(result.canPin).toBe(false);
    expect(result.errorCode).toBe("PIN_LIMIT_REACHED");
    expect(result.remainingSlots).toBe(0);
  });

  it("should deny pin when user limit reached", () => {
    const stats = createTestStats({ totalPins: 10 });
    const result = checkPinLimits(stats, 25);

    expect(result.canPin).toBe(false);
    expect(result.errorCode).toBe("PIN_LIMIT_REACHED");
    expect(result.errorMessage).toContain("25");
  });

  it("should use custom max pins from config", () => {
    const stats = createTestStats({ totalPins: 20 });
    const result = checkPinLimits(stats, 5, { maxPins: 20 });

    expect(result.canPin).toBe(false);
    expect(result.errorMessage).toContain("20");
  });
});

// ============================================================================
// formatRemainingSlots Tests
// ============================================================================

describe("formatRemainingSlots", () => {
  it("should format zero remaining slots", () => {
    expect(formatRemainingSlots(0, 50)).toBe("Pin limit reached (50/50)");
  });

  it("should format single remaining slot", () => {
    expect(formatRemainingSlots(1, 50)).toBe("1 pin slot remaining");
  });

  it("should format multiple remaining slots", () => {
    expect(formatRemainingSlots(10, 50)).toBe("10 pin slots remaining");
  });
});

// ============================================================================
// getPinLimitWarningThreshold Tests
// ============================================================================

describe("getPinLimitWarningThreshold", () => {
  it("should return 90% of max pins", () => {
    expect(getPinLimitWarningThreshold(50)).toBe(45);
  });

  it("should round up", () => {
    expect(getPinLimitWarningThreshold(100)).toBe(90);
    expect(getPinLimitWarningThreshold(33)).toBe(30); // 33 * 0.9 = 29.7 -> 30
  });

  it("should handle small limits", () => {
    expect(getPinLimitWarningThreshold(1)).toBe(1);
    expect(getPinLimitWarningThreshold(5)).toBe(5); // 5 * 0.9 = 4.5 -> 5
  });
});

// ============================================================================
// isNearPinLimit Tests
// ============================================================================

describe("isNearPinLimit", () => {
  it("should return false when well below threshold", () => {
    expect(isNearPinLimit(20, 50)).toBe(false);
  });

  it("should return true when at threshold", () => {
    expect(isNearPinLimit(45, 50)).toBe(true);
  });

  it("should return true when above threshold", () => {
    expect(isNearPinLimit(48, 50)).toBe(true);
  });

  it("should return true when at limit", () => {
    expect(isNearPinLimit(50, 50)).toBe(true);
  });
});

// ============================================================================
// getPinUsagePercentage Tests
// ============================================================================

describe("getPinUsagePercentage", () => {
  it("should calculate correct percentage", () => {
    expect(getPinUsagePercentage(25, 50)).toBe(50);
    expect(getPinUsagePercentage(10, 50)).toBe(20);
  });

  it("should return 100 at limit", () => {
    expect(getPinUsagePercentage(50, 50)).toBe(100);
  });

  it("should handle zero pins", () => {
    expect(getPinUsagePercentage(0, 50)).toBe(0);
  });

  it("should handle zero max pins", () => {
    expect(getPinUsagePercentage(10, 0)).toBe(0);
  });

  it("should round to nearest integer", () => {
    expect(getPinUsagePercentage(1, 3)).toBe(33);
  });
});

// ============================================================================
// canPinMessage Tests
// ============================================================================

describe("canPinMessage", () => {
  describe("admins-only permission", () => {
    it("should allow owner", () => {
      expect(canPinMessage("owner", "admins-only")).toBe(true);
    });

    it("should allow admin", () => {
      expect(canPinMessage("admin", "admins-only")).toBe(true);
    });

    it("should deny moderator", () => {
      expect(canPinMessage("moderator", "admins-only")).toBe(false);
    });

    it("should deny member", () => {
      expect(canPinMessage("member", "admins-only")).toBe(false);
    });

    it("should deny guest", () => {
      expect(canPinMessage("guest", "admins-only")).toBe(false);
    });
  });

  describe("moderators permission", () => {
    it("should allow owner", () => {
      expect(canPinMessage("owner", "moderators")).toBe(true);
    });

    it("should allow admin", () => {
      expect(canPinMessage("admin", "moderators")).toBe(true);
    });

    it("should allow moderator", () => {
      expect(canPinMessage("moderator", "moderators")).toBe(true);
    });

    it("should deny member", () => {
      expect(canPinMessage("member", "moderators")).toBe(false);
    });

    it("should deny guest", () => {
      expect(canPinMessage("guest", "moderators")).toBe(false);
    });
  });

  describe("members permission", () => {
    it("should allow member", () => {
      expect(canPinMessage("member", "members")).toBe(true);
    });

    it("should deny guest", () => {
      expect(canPinMessage("guest", "members")).toBe(false);
    });
  });

  describe("anyone permission", () => {
    it("should allow all roles", () => {
      const roles: UserRole[] = [
        "owner",
        "admin",
        "moderator",
        "member",
        "guest",
      ];
      roles.forEach((role) => {
        expect(canPinMessage(role, "anyone")).toBe(true);
      });
    });
  });
});

// ============================================================================
// canUnpinMessage Tests
// ============================================================================

describe("canUnpinMessage", () => {
  it("should allow pinner to unpin their own message", () => {
    expect(canUnpinMessage("guest", "admins-only", true)).toBe(true);
  });

  it("should allow user with pin permission to unpin any message", () => {
    expect(canUnpinMessage("admin", "admins-only", false)).toBe(true);
  });

  it("should deny user without permission who is not pinner", () => {
    expect(canUnpinMessage("member", "admins-only", false)).toBe(false);
  });
});

// ============================================================================
// canReorderPins Tests
// ============================================================================

describe("canReorderPins", () => {
  it("should allow owner", () => {
    expect(canReorderPins("owner")).toBe(true);
  });

  it("should allow admin", () => {
    expect(canReorderPins("admin")).toBe(true);
  });

  it("should allow moderator", () => {
    expect(canReorderPins("moderator")).toBe(true);
  });

  it("should deny member", () => {
    expect(canReorderPins("member")).toBe(false);
  });

  it("should deny guest", () => {
    expect(canReorderPins("guest")).toBe(false);
  });
});

// ============================================================================
// canEditPinNote Tests
// ============================================================================

describe("canEditPinNote", () => {
  it("should allow pinner to edit their own note", () => {
    expect(canEditPinNote("guest", true)).toBe(true);
  });

  it("should allow moderator to edit any note", () => {
    expect(canEditPinNote("moderator", false)).toBe(true);
  });

  it("should deny member who is not pinner", () => {
    expect(canEditPinNote("member", false)).toBe(false);
  });
});

// ============================================================================
// canConfigurePins Tests
// ============================================================================

describe("canConfigurePins", () => {
  it("should allow owner", () => {
    expect(canConfigurePins("owner")).toBe(true);
  });

  it("should allow admin", () => {
    expect(canConfigurePins("admin")).toBe(true);
  });

  it("should deny moderator", () => {
    expect(canConfigurePins("moderator")).toBe(false);
  });

  it("should deny member", () => {
    expect(canConfigurePins("member")).toBe(false);
  });
});

// ============================================================================
// getPinPermissionDescription Tests
// ============================================================================

describe("getPinPermissionDescription", () => {
  it("should return description for admins-only", () => {
    expect(getPinPermissionDescription("admins-only")).toContain("admin");
  });

  it("should return description for moderators", () => {
    expect(getPinPermissionDescription("moderators")).toContain("Moderator");
  });

  it("should return description for members", () => {
    expect(getPinPermissionDescription("members")).toContain("member");
  });

  it("should return description for anyone", () => {
    expect(getPinPermissionDescription("anyone")).toContain("Anyone");
  });
});

// ============================================================================
// getMinimumRoleForPin Tests
// ============================================================================

describe("getMinimumRoleForPin", () => {
  it("should return Admin for admins-only", () => {
    expect(getMinimumRoleForPin("admins-only")).toBe("Admin");
  });

  it("should return Moderator for moderators", () => {
    expect(getMinimumRoleForPin("moderators")).toBe("Moderator");
  });

  it("should return Member for members", () => {
    expect(getMinimumRoleForPin("members")).toBe("Member");
  });

  it("should return Guest for anyone", () => {
    expect(getMinimumRoleForPin("anyone")).toBe("Guest");
  });
});

// ============================================================================
// validatePinConfig Tests
// ============================================================================

describe("validatePinConfig", () => {
  it("should accept valid config", () => {
    const result = validatePinConfig({
      maxPins: 50,
      pinPermission: "moderators",
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject maxPins less than 1", () => {
    const result = validatePinConfig({ maxPins: 0 });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Maximum pins must be at least 1");
  });

  it("should reject maxPins over 200", () => {
    const result = validatePinConfig({ maxPins: 201 });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Maximum pins cannot exceed 200");
  });

  it("should reject invalid pin permission", () => {
    const result = validatePinConfig({
      pinPermission: "invalid" as PinPermission,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Invalid pin permission level");
  });

  it("should accept empty config", () => {
    const result = validatePinConfig({});
    expect(result.isValid).toBe(true);
  });
});

// ============================================================================
// PinManager Tests
// ============================================================================

describe("PinManager", () => {
  let manager: PinManager;

  beforeEach(() => {
    manager = new PinManager();
  });

  describe("getChannelConfig", () => {
    it("should return default config for unconfigured channel", () => {
      const config = manager.getChannelConfig("channel-1");
      expect(config).toEqual(DEFAULT_PIN_CONFIG);
    });

    it("should return configured config", () => {
      manager.setChannelConfig("channel-1", { maxPins: 100 });
      const config = manager.getChannelConfig("channel-1");
      expect(config.maxPins).toBe(100);
    });
  });

  describe("setChannelConfig", () => {
    it("should set channel configuration", () => {
      manager.setChannelConfig("channel-1", {
        maxPins: 100,
        showBanner: false,
      });
      const config = manager.getChannelConfig("channel-1");
      expect(config.maxPins).toBe(100);
      expect(config.showBanner).toBe(false);
    });

    it("should merge with existing config", () => {
      manager.setChannelConfig("channel-1", { maxPins: 100 });
      manager.setChannelConfig("channel-1", { showBanner: false });
      const config = manager.getChannelConfig("channel-1");
      expect(config.maxPins).toBe(100);
      expect(config.showBanner).toBe(false);
    });
  });

  describe("validatePin", () => {
    it("should allow valid pin", () => {
      const stats = createTestStats({ totalPins: 10 });
      const input: PinMessageInput = {
        messageId: "msg-1",
        channelId: "channel-1",
      };
      const result = manager.validatePin(input, stats, "admin", 5, false);
      expect(result.success).toBe(true);
    });

    it("should reject already pinned message", () => {
      const stats = createTestStats();
      const input: PinMessageInput = {
        messageId: "msg-1",
        channelId: "channel-1",
      };
      const result = manager.validatePin(input, stats, "admin", 5, true);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("MESSAGE_ALREADY_PINNED");
    });

    it("should reject without permission", () => {
      manager.setChannelConfig("channel-1", { pinPermission: "admins-only" });
      const stats = createTestStats();
      const input: PinMessageInput = {
        messageId: "msg-1",
        channelId: "channel-1",
      };
      const result = manager.validatePin(input, stats, "member", 5, false);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("PERMISSION_DENIED");
    });

    it("should reject when limit reached", () => {
      const stats = createTestStats({ totalPins: 50 });
      const input: PinMessageInput = {
        messageId: "msg-1",
        channelId: "channel-1",
      };
      const result = manager.validatePin(input, stats, "admin", 5, false);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("PIN_LIMIT_REACHED");
    });

    it("should reject long note", () => {
      const stats = createTestStats();
      const input: PinMessageInput = {
        messageId: "msg-1",
        channelId: "channel-1",
        note: "a".repeat(501),
      };
      const result = manager.validatePin(input, stats, "admin", 5, false);
      expect(result.success).toBe(false);
    });
  });

  describe("validateUnpin", () => {
    it("should allow unpin with permission", () => {
      const input: UnpinMessageInput = {
        pinId: "pin-1",
        channelId: "channel-1",
      };
      const result = manager.validateUnpin(input, "admin", false, true);
      expect(result.success).toBe(true);
    });

    it("should allow pinner to unpin", () => {
      const input: UnpinMessageInput = {
        pinId: "pin-1",
        channelId: "channel-1",
      };
      const result = manager.validateUnpin(input, "guest", true, true);
      expect(result.success).toBe(true);
    });

    it("should reject non-existent pin", () => {
      const input: UnpinMessageInput = {
        pinId: "pin-1",
        channelId: "channel-1",
      };
      const result = manager.validateUnpin(input, "admin", false, false);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("PIN_NOT_FOUND");
    });

    it("should reject without permission", () => {
      manager.setChannelConfig("channel-1", { pinPermission: "admins-only" });
      const input: UnpinMessageInput = {
        pinId: "pin-1",
        channelId: "channel-1",
      };
      const result = manager.validateUnpin(input, "member", false, true);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("PERMISSION_DENIED");
    });
  });
});

// ============================================================================
// filterPinnedMessages Tests
// ============================================================================

describe("filterPinnedMessages", () => {
  const pins: PinnedMessage[] = [
    createTestPinnedMessage({
      id: "pin-1",
      pinnedBy: { id: "user-1", username: "alice", displayName: "Alice" },
      pinnedAt: new Date("2024-01-01"),
      message: createTestMessage({ type: "text", content: "Hello world" }),
    }),
    createTestPinnedMessage({
      id: "pin-2",
      pinnedBy: { id: "user-2", username: "bob", displayName: "Bob" },
      pinnedAt: new Date("2024-02-01"),
      message: createTestMessage({ type: "image", content: "Image message" }),
      note: "Important image",
    }),
    createTestPinnedMessage({
      id: "pin-3",
      pinnedBy: { id: "user-1", username: "alice", displayName: "Alice" },
      pinnedAt: new Date("2024-03-01"),
      message: createTestMessage({
        type: "text",
        content: "Another text",
        attachments: [{}],
      }),
    }),
  ];

  it("should filter by pinner", () => {
    const result = filterPinnedMessages(pins, { pinnedByUserId: "user-1" });
    expect(result).toHaveLength(2);
  });

  it("should filter by date range - after", () => {
    const result = filterPinnedMessages(pins, {
      pinnedAfter: new Date("2024-01-15"),
    });
    expect(result).toHaveLength(2);
  });

  it("should filter by date range - before", () => {
    const result = filterPinnedMessages(pins, {
      pinnedBefore: new Date("2024-02-15"),
    });
    expect(result).toHaveLength(2);
  });

  it("should filter by message type", () => {
    const result = filterPinnedMessages(pins, { messageType: "image" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("pin-2");
  });

  it("should filter by attachments", () => {
    const result = filterPinnedMessages(pins, { hasAttachments: true });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("pin-3");
  });

  it("should filter by search query in content", () => {
    const result = filterPinnedMessages(pins, { searchQuery: "hello" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("pin-1");
  });

  it("should filter by search query in note", () => {
    const result = filterPinnedMessages(pins, { searchQuery: "important" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("pin-2");
  });

  it("should filter by search query in author name", () => {
    const result = filterPinnedMessages(pins, { searchQuery: "Test User" });
    expect(result).toHaveLength(3);
  });

  it("should handle empty filters", () => {
    const result = filterPinnedMessages(pins, {});
    expect(result).toHaveLength(3);
  });

  it("should combine multiple filters", () => {
    const result = filterPinnedMessages(pins, {
      pinnedByUserId: "user-1",
      messageType: "text",
    });
    expect(result).toHaveLength(2);
  });
});

// ============================================================================
// sortPinnedMessages Tests
// ============================================================================

describe("sortPinnedMessages", () => {
  const pins: PinnedMessage[] = [
    createTestPinnedMessage({
      id: "pin-1",
      position: 2,
      pinnedAt: new Date("2024-02-01"),
      message: createTestMessage({ createdAt: new Date("2024-01-01") }),
    }),
    createTestPinnedMessage({
      id: "pin-2",
      position: 0,
      pinnedAt: new Date("2024-01-01"),
      message: createTestMessage({ createdAt: new Date("2024-02-01") }),
    }),
    createTestPinnedMessage({
      id: "pin-3",
      position: 1,
      pinnedAt: new Date("2024-03-01"),
      message: createTestMessage({ createdAt: new Date("2024-03-01") }),
    }),
  ];

  it("should sort by position ascending", () => {
    const result = sortPinnedMessages(pins, "position", "asc");
    expect(result[0].id).toBe("pin-2");
    expect(result[1].id).toBe("pin-3");
    expect(result[2].id).toBe("pin-1");
  });

  it("should sort by position descending", () => {
    const result = sortPinnedMessages(pins, "position", "desc");
    expect(result[0].id).toBe("pin-1");
    expect(result[1].id).toBe("pin-3");
    expect(result[2].id).toBe("pin-2");
  });

  it("should sort by pinnedAt ascending", () => {
    const result = sortPinnedMessages(pins, "pinnedAt", "asc");
    expect(result[0].id).toBe("pin-2");
    expect(result[2].id).toBe("pin-3");
  });

  it("should sort by pinnedAt descending", () => {
    const result = sortPinnedMessages(pins, "pinnedAt", "desc");
    expect(result[0].id).toBe("pin-3");
    expect(result[2].id).toBe("pin-2");
  });

  it("should sort by messageDate ascending", () => {
    const result = sortPinnedMessages(pins, "messageDate", "asc");
    expect(result[0].id).toBe("pin-1");
    expect(result[2].id).toBe("pin-3");
  });

  it("should sort by messageDate descending", () => {
    const result = sortPinnedMessages(pins, "messageDate", "desc");
    expect(result[0].id).toBe("pin-3");
    expect(result[2].id).toBe("pin-1");
  });

  it("should default to position ascending", () => {
    const result = sortPinnedMessages(pins);
    expect(result[0].id).toBe("pin-2");
  });

  it("should not mutate original array", () => {
    const originalFirst = pins[0].id;
    sortPinnedMessages(pins, "position", "asc");
    expect(pins[0].id).toBe(originalFirst);
  });
});

// ============================================================================
// getPinnedMessages Tests
// ============================================================================

describe("getPinnedMessages", () => {
  const pins: PinnedMessage[] = [
    createTestPinnedMessage({
      id: "pin-1",
      channelId: "channel-1",
      position: 1,
    }),
    createTestPinnedMessage({
      id: "pin-2",
      channelId: "channel-1",
      position: 0,
    }),
    createTestPinnedMessage({
      id: "pin-3",
      channelId: "channel-2",
      position: 0,
    }),
  ];

  it("should filter by channelId", () => {
    const result = getPinnedMessages(pins, { channelId: "channel-1" });
    expect(result).toHaveLength(2);
  });

  it("should apply filters", () => {
    const result = getPinnedMessages(pins, {
      channelId: "channel-1",
      filters: { searchQuery: "test" },
    });
    // Will match based on message content/author
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("should apply sorting", () => {
    const result = getPinnedMessages(pins, {
      channelId: "channel-1",
      sortBy: "position",
      sortOrder: "asc",
    });
    expect(result[0].id).toBe("pin-2");
    expect(result[1].id).toBe("pin-1");
  });

  it("should apply offset", () => {
    const result = getPinnedMessages(pins, {
      channelId: "channel-1",
      sortBy: "position",
      sortOrder: "asc",
      offset: 1,
    });
    expect(result).toHaveLength(1);
  });

  it("should apply limit", () => {
    const result = getPinnedMessages(pins, {
      channelId: "channel-1",
      limit: 1,
    });
    expect(result).toHaveLength(1);
  });

  it("should handle empty result", () => {
    const result = getPinnedMessages(pins, { channelId: "non-existent" });
    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// reorderPins Tests
// ============================================================================

describe("reorderPins", () => {
  const pins: PinnedMessage[] = [
    createTestPinnedMessage({ id: "pin-1", position: 0 }),
    createTestPinnedMessage({ id: "pin-2", position: 1 }),
    createTestPinnedMessage({ id: "pin-3", position: 2 }),
  ];

  it("should reorder pins according to new order", () => {
    const newOrder = ["pin-3", "pin-1", "pin-2"];
    const result = reorderPins(pins, newOrder);

    expect(result[0].id).toBe("pin-3");
    expect(result[0].position).toBe(0);
    expect(result[1].id).toBe("pin-1");
    expect(result[1].position).toBe(1);
    expect(result[2].id).toBe("pin-2");
    expect(result[2].position).toBe(2);
  });

  it("should handle partial order", () => {
    const newOrder = ["pin-2", "pin-1"];
    const result = reorderPins(pins, newOrder);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("pin-2");
    expect(result[1].id).toBe("pin-1");
  });

  it("should ignore non-existent pin IDs", () => {
    const newOrder = ["pin-1", "non-existent", "pin-2"];
    const result = reorderPins(pins, newOrder);

    expect(result).toHaveLength(2);
  });

  it("should handle empty order", () => {
    const result = reorderPins(pins, []);
    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// calculatePinStats Tests
// ============================================================================

describe("calculatePinStats", () => {
  const pins: PinnedMessage[] = [
    createTestPinnedMessage({
      channelId: "channel-1",
      pinnedBy: { id: "user-1", username: "alice", displayName: "Alice" },
      pinnedAt: new Date("2024-01-01"),
    }),
    createTestPinnedMessage({
      channelId: "channel-1",
      pinnedBy: { id: "user-2", username: "bob", displayName: "Bob" },
      pinnedAt: new Date("2024-02-01"),
    }),
    createTestPinnedMessage({
      channelId: "channel-1",
      pinnedBy: { id: "user-1", username: "alice", displayName: "Alice" },
      pinnedAt: new Date("2024-03-01"),
    }),
    createTestPinnedMessage({
      channelId: "channel-2",
      pinnedBy: { id: "user-3", username: "charlie", displayName: "Charlie" },
      pinnedAt: new Date("2024-01-15"),
    }),
  ];

  it("should calculate total pins for channel", () => {
    const stats = calculatePinStats(pins, "channel-1");
    expect(stats.totalPins).toBe(3);
  });

  it("should calculate remaining slots", () => {
    const stats = calculatePinStats(pins, "channel-1", 50);
    expect(stats.remainingSlots).toBe(47);
  });

  it("should count unique pinners", () => {
    const stats = calculatePinStats(pins, "channel-1");
    expect(stats.pinnerCount).toBe(2); // user-1 and user-2
  });

  it("should find last pinned date", () => {
    const stats = calculatePinStats(pins, "channel-1");
    expect(stats.lastPinnedAt?.toISOString()).toBe(
      new Date("2024-03-01").toISOString(),
    );
  });

  it("should use custom max pins", () => {
    const stats = calculatePinStats(pins, "channel-1", 100);
    expect(stats.maxPins).toBe(100);
    expect(stats.remainingSlots).toBe(97);
  });

  it("should return correct channel ID", () => {
    const stats = calculatePinStats(pins, "channel-1");
    expect(stats.channelId).toBe("channel-1");
  });

  it("should handle channel with no pins", () => {
    const stats = calculatePinStats(pins, "non-existent");
    expect(stats.totalPins).toBe(0);
    expect(stats.pinnerCount).toBe(0);
    expect(stats.lastPinnedAt).toBeUndefined();
  });
});

// ============================================================================
// Singleton pinManager Tests
// ============================================================================

describe("pinManager singleton", () => {
  it("should be an instance of PinManager", () => {
    expect(pinManager).toBeInstanceOf(PinManager);
  });

  it("should be reusable", () => {
    pinManager.setChannelConfig("test-channel", { maxPins: 75 });
    const config = pinManager.getChannelConfig("test-channel");
    expect(config.maxPins).toBe(75);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  it("should handle empty pins array", () => {
    const result = filterPinnedMessages([], { searchQuery: "test" });
    expect(result).toHaveLength(0);
  });

  it("should handle null/undefined filters gracefully", () => {
    const pins = [createTestPinnedMessage()];
    const result = filterPinnedMessages(pins, {
      pinnedByUserId: undefined,
      searchQuery: undefined,
    });
    expect(result).toHaveLength(1);
  });

  it("should handle pins with missing optional fields", () => {
    const pinWithoutNote = createTestPinnedMessage({ note: undefined });
    const result = filterPinnedMessages([pinWithoutNote], {
      searchQuery: "test",
    });
    // Should not throw, note search should skip undefined
    expect(result).toBeDefined();
  });

  it("should handle special characters in search query", () => {
    const pins = [createTestPinnedMessage()];
    const result = filterPinnedMessages(pins, { searchQuery: "@#$%" });
    expect(result).toHaveLength(0);
  });

  it("should handle very long search query", () => {
    const pins = [createTestPinnedMessage()];
    const longQuery = "a".repeat(1000);
    const result = filterPinnedMessages(pins, { searchQuery: longQuery });
    expect(result).toHaveLength(0);
  });
});
