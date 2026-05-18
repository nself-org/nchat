/**
 * Star Manager Tests
 *
 * Tests for the star manager logic including filtering, sorting, and statistics.
 */

import {
  StarManager,
  starManager,
  filterStarredMessages,
  sortStarredMessages,
  getStarredMessages,
  calculateStarStats,
  getQuickAccessStars,
  getHighPriorityStars,
  isMessageStarred,
  getStarForMessage,
  getAllCategories,
  formatStarCount,
} from "../star-manager";
import type {
  StarredMessage,
  StarFilters,
  StarColor,
  StarPriority,
} from "../star-types";
import { STAR_COLORS, PRIORITY_ORDER } from "../star-types";

// ============================================================================
// Test Fixtures
// ============================================================================

function createStarredMessage(
  overrides: Partial<StarredMessage> = {},
): StarredMessage {
  return {
    id: `star-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: "user-1",
    messageId: `msg-${Date.now()}`,
    channelId: "channel-1",
    starredAt: new Date(),
    message: {
      id: "msg-1",
      content: "Test message content",
      type: "text",
      createdAt: new Date(),
      userId: "user-1",
      user: {
        id: "user-1",
        displayName: "Test User",
        username: "testuser",
      },
      channelId: "channel-1",
    } as any,
    color: "yellow",
    priority: "medium",
    quickAccess: false,
    ...overrides,
  };
}

function createTestStars(): StarredMessage[] {
  const now = new Date();
  return [
    createStarredMessage({
      id: "star-1",
      messageId: "msg-1",
      channelId: "channel-1",
      color: "yellow",
      priority: "medium",
      starredAt: new Date(now.getTime() - 86400000),
      quickAccess: false,
      category: "meeting",
    }),
    createStarredMessage({
      id: "star-2",
      messageId: "msg-2",
      channelId: "channel-2",
      color: "red",
      priority: "urgent",
      starredAt: new Date(now.getTime() - 3600000),
      quickAccess: true,
      category: "urgent",
    }),
    createStarredMessage({
      id: "star-3",
      messageId: "msg-3",
      channelId: "channel-1",
      color: "green",
      priority: "low",
      starredAt: new Date(now.getTime() - 7200000),
      quickAccess: false,
      note: "Important note",
    }),
    createStarredMessage({
      id: "star-4",
      messageId: "msg-4",
      channelId: "channel-2",
      color: "purple",
      priority: "high",
      starredAt: new Date(),
      quickAccess: true,
      category: "reference",
    }),
  ];
}

// ============================================================================
// StarManager Class Tests
// ============================================================================

describe("StarManager", () => {
  let manager: StarManager;

  beforeEach(() => {
    manager = new StarManager();
  });

  describe("validateStarInput", () => {
    it("should validate valid input", () => {
      const result = manager.validateStarInput({
        messageId: "msg-1",
        channelId: "channel-1",
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject missing messageId", () => {
      const result = manager.validateStarInput({
        messageId: "",
        channelId: "channel-1",
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Message ID is required");
    });

    it("should reject missing channelId", () => {
      const result = manager.validateStarInput({
        messageId: "msg-1",
        channelId: "",
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Channel ID is required");
    });

    it("should reject invalid star color", () => {
      const result = manager.validateStarInput({
        messageId: "msg-1",
        channelId: "channel-1",
        color: "invalid" as any,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Invalid star color");
    });

    it("should reject note exceeding 500 characters", () => {
      const result = manager.validateStarInput({
        messageId: "msg-1",
        channelId: "channel-1",
        note: "a".repeat(501),
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Note cannot exceed 500 characters");
    });

    it("should reject category exceeding 50 characters", () => {
      const result = manager.validateStarInput({
        messageId: "msg-1",
        channelId: "channel-1",
        category: "a".repeat(51),
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Category cannot exceed 50 characters");
    });
  });

  describe("validateUpdateInput", () => {
    it("should validate valid update input", () => {
      const result = manager.validateUpdateInput({
        starId: "star-1",
        color: "red",
      });
      expect(result.isValid).toBe(true);
    });

    it("should reject missing starId", () => {
      const result = manager.validateUpdateInput({
        starId: "",
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Star ID is required");
    });
  });

  describe("getPriorityForColor", () => {
    it("should return correct priority for yellow", () => {
      expect(manager.getPriorityForColor("yellow")).toBe("medium");
    });

    it("should return correct priority for red", () => {
      expect(manager.getPriorityForColor("red")).toBe("urgent");
    });

    it("should return correct priority for green", () => {
      expect(manager.getPriorityForColor("green")).toBe("low");
    });
  });

  describe("getColorForPriority", () => {
    it("should return a color for urgent priority", () => {
      const color = manager.getColorForPriority("urgent");
      expect(STAR_COLORS[color]).toBeDefined();
      expect(STAR_COLORS[color].priority).toBe("urgent");
    });

    it("should return yellow as fallback", () => {
      const color = manager.getColorForPriority("medium");
      expect(color).toBe("yellow");
    });
  });
});

// ============================================================================
// Filtering Tests
// ============================================================================

describe("filterStarredMessages", () => {
  const stars = createTestStars();

  it("should filter by channel", () => {
    const result = filterStarredMessages(stars, { channelId: "channel-1" });
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.channelId === "channel-1")).toBe(true);
  });

  it("should filter by color", () => {
    const result = filterStarredMessages(stars, { color: "red" });
    expect(result).toHaveLength(1);
    expect(result[0].color).toBe("red");
  });

  it("should filter by multiple colors", () => {
    const result = filterStarredMessages(stars, { colors: ["red", "yellow"] });
    expect(result).toHaveLength(2);
  });

  it("should filter by priority", () => {
    const result = filterStarredMessages(stars, { priority: "urgent" });
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe("urgent");
  });

  it("should filter by multiple priorities", () => {
    const result = filterStarredMessages(stars, {
      priorities: ["high", "urgent"],
    });
    expect(result).toHaveLength(2);
  });

  it("should filter quick access only", () => {
    const result = filterStarredMessages(stars, { quickAccessOnly: true });
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.quickAccess)).toBe(true);
  });

  it("should filter by category", () => {
    const result = filterStarredMessages(stars, { category: "meeting" });
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("meeting");
  });

  it("should filter by date range", () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 7200000);
    const result = filterStarredMessages(stars, { starredAfter: twoHoursAgo });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((s) => s.starredAt >= twoHoursAgo)).toBe(true);
  });

  it("should filter by hasNote", () => {
    const result = filterStarredMessages(stars, { hasNote: true });
    expect(result).toHaveLength(1);
    expect(result[0].note).toBeDefined();
  });

  it("should filter by search query", () => {
    const result = filterStarredMessages(stars, { searchQuery: "important" });
    expect(result).toHaveLength(1);
  });

  it("should return all when no filters", () => {
    const result = filterStarredMessages(stars, {});
    expect(result).toHaveLength(stars.length);
  });
});

// ============================================================================
// Sorting Tests
// ============================================================================

describe("sortStarredMessages", () => {
  const stars = createTestStars();

  it("should sort by starredAt descending", () => {
    const result = sortStarredMessages(stars, "starredAt", "desc");
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].starredAt.getTime()).toBeGreaterThanOrEqual(
        result[i].starredAt.getTime(),
      );
    }
  });

  it("should sort by starredAt ascending", () => {
    const result = sortStarredMessages(stars, "starredAt", "asc");
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].starredAt.getTime()).toBeLessThanOrEqual(
        result[i].starredAt.getTime(),
      );
    }
  });

  it("should sort by priority descending", () => {
    const result = sortStarredMessages(stars, "priority", "desc");
    for (let i = 1; i < result.length; i++) {
      expect(PRIORITY_ORDER[result[i - 1].priority]).toBeGreaterThanOrEqual(
        PRIORITY_ORDER[result[i].priority],
      );
    }
  });

  it("should sort by channel", () => {
    const result = sortStarredMessages(stars, "channel", "asc");
    for (let i = 1; i < result.length; i++) {
      expect(
        result[i - 1].channelId.localeCompare(result[i].channelId),
      ).toBeLessThanOrEqual(0);
    }
  });

  it("should sort by color", () => {
    const result = sortStarredMessages(stars, "color", "asc");
    for (let i = 1; i < result.length; i++) {
      expect(
        result[i - 1].color.localeCompare(result[i].color),
      ).toBeLessThanOrEqual(0);
    }
  });
});

// ============================================================================
// getStarredMessages Tests
// ============================================================================

describe("getStarredMessages", () => {
  const stars = createTestStars();

  it("should apply filters and sorting", () => {
    const result = getStarredMessages(stars, {
      filters: { channelId: "channel-1" },
      sortBy: "starredAt",
      sortOrder: "desc",
    });
    expect(result).toHaveLength(2);
  });

  it("should apply pagination", () => {
    const result = getStarredMessages(stars, {
      limit: 2,
      offset: 0,
    });
    expect(result).toHaveLength(2);
  });

  it("should handle offset", () => {
    const result = getStarredMessages(stars, {
      limit: 2,
      offset: 2,
    });
    expect(result).toHaveLength(2);
  });
});

// ============================================================================
// Statistics Tests
// ============================================================================

describe("calculateStarStats", () => {
  const stars = createTestStars();

  it("should calculate total starred", () => {
    const stats = calculateStarStats(stars);
    expect(stats.totalStarred).toBe(4);
  });

  it("should count by color", () => {
    const stats = calculateStarStats(stars);
    expect(stats.byColor.yellow).toBe(1);
    expect(stats.byColor.red).toBe(1);
    expect(stats.byColor.green).toBe(1);
    expect(stats.byColor.purple).toBe(1);
  });

  it("should count by priority", () => {
    const stats = calculateStarStats(stars);
    expect(stats.byPriority.urgent).toBe(1);
    expect(stats.byPriority.high).toBe(1);
    expect(stats.byPriority.medium).toBe(1);
    expect(stats.byPriority.low).toBe(1);
  });

  it("should count by channel", () => {
    const stats = calculateStarStats(stars);
    expect(stats.byChannel["channel-1"]).toBe(2);
    expect(stats.byChannel["channel-2"]).toBe(2);
  });

  it("should count quick access", () => {
    const stats = calculateStarStats(stars);
    expect(stats.quickAccessCount).toBe(2);
  });

  it("should count by category", () => {
    const stats = calculateStarStats(stars);
    expect(stats.byCategory.meeting).toBe(1);
    expect(stats.byCategory.urgent).toBe(1);
  });

  it("should calculate recent activity", () => {
    const stats = calculateStarStats(stars);
    expect(stats.recentActivity).toHaveLength(7);
  });
});

// ============================================================================
// Quick Access Tests
// ============================================================================

describe("getQuickAccessStars", () => {
  const stars = createTestStars();

  it("should return only quick access stars", () => {
    const result = getQuickAccessStars(stars);
    expect(result.every((s) => s.quickAccess)).toBe(true);
  });

  it("should sort by priority", () => {
    const result = getQuickAccessStars(stars);
    if (result.length >= 2) {
      expect(PRIORITY_ORDER[result[0].priority]).toBeGreaterThanOrEqual(
        PRIORITY_ORDER[result[1].priority],
      );
    }
  });

  it("should respect limit", () => {
    const result = getQuickAccessStars(stars, 1);
    expect(result).toHaveLength(1);
  });
});

describe("getHighPriorityStars", () => {
  const stars = createTestStars();

  it("should return only high and urgent priority", () => {
    const result = getHighPriorityStars(stars);
    expect(
      result.every((s) => s.priority === "urgent" || s.priority === "high"),
    ).toBe(true);
  });

  it("should sort by priority then date", () => {
    const result = getHighPriorityStars(stars);
    if (result.length >= 2) {
      expect(PRIORITY_ORDER[result[0].priority]).toBeGreaterThanOrEqual(
        PRIORITY_ORDER[result[1].priority],
      );
    }
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe("isMessageStarred", () => {
  const stars = createTestStars();

  it("should return true for starred message", () => {
    expect(isMessageStarred("msg-1", stars)).toBe(true);
  });

  it("should return false for non-starred message", () => {
    expect(isMessageStarred("msg-999", stars)).toBe(false);
  });
});

describe("getStarForMessage", () => {
  const stars = createTestStars();

  it("should return star for starred message", () => {
    const star = getStarForMessage("msg-1", stars);
    expect(star).toBeDefined();
    expect(star?.messageId).toBe("msg-1");
  });

  it("should return undefined for non-starred message", () => {
    expect(getStarForMessage("msg-999", stars)).toBeUndefined();
  });
});

describe("getAllCategories", () => {
  const stars = createTestStars();

  it("should return unique categories", () => {
    const categories = getAllCategories(stars);
    expect(categories).toContain("meeting");
    expect(categories).toContain("urgent");
    expect(categories).toContain("reference");
  });

  it("should return sorted categories", () => {
    const categories = getAllCategories(stars);
    const sorted = [...categories].sort();
    expect(categories).toEqual(sorted);
  });
});

describe("formatStarCount", () => {
  it("should format zero count", () => {
    expect(formatStarCount(0)).toBe("No starred messages");
  });

  it("should format single count", () => {
    expect(formatStarCount(1)).toBe("1 starred message");
  });

  it("should format multiple count", () => {
    expect(formatStarCount(5)).toBe("5 starred messages");
  });

  it("should format large count with locale", () => {
    expect(formatStarCount(1000)).toBe("1,000 starred messages");
  });
});

// ============================================================================
// STAR_COLORS Tests
// ============================================================================

describe("STAR_COLORS", () => {
  it("should have all expected colors", () => {
    expect(STAR_COLORS.yellow).toBeDefined();
    expect(STAR_COLORS.red).toBeDefined();
    expect(STAR_COLORS.green).toBeDefined();
    expect(STAR_COLORS.blue).toBeDefined();
    expect(STAR_COLORS.purple).toBeDefined();
    expect(STAR_COLORS.orange).toBeDefined();
  });

  it("should have hex values for all colors", () => {
    Object.values(STAR_COLORS).forEach((config) => {
      expect(config.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it("should have labels for all colors", () => {
    Object.values(STAR_COLORS).forEach((config) => {
      expect(typeof config.label).toBe("string");
      expect(config.label.length).toBeGreaterThan(0);
    });
  });

  it("should have valid priorities for all colors", () => {
    const validPriorities = ["low", "medium", "high", "urgent"];
    Object.values(STAR_COLORS).forEach((config) => {
      expect(validPriorities).toContain(config.priority);
    });
  });
});

// ============================================================================
// PRIORITY_ORDER Tests
// ============================================================================

describe("PRIORITY_ORDER", () => {
  it("should have correct ordering", () => {
    expect(PRIORITY_ORDER.urgent).toBeGreaterThan(PRIORITY_ORDER.high);
    expect(PRIORITY_ORDER.high).toBeGreaterThan(PRIORITY_ORDER.medium);
    expect(PRIORITY_ORDER.medium).toBeGreaterThan(PRIORITY_ORDER.low);
  });
});
