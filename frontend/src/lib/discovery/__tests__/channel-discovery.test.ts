/**
 * Channel Discovery Unit Tests
 *
 * Tests for channel discovery functionality including public channels,
 * recommendations, popular channels, and category filtering.
 */

import {
  ChannelDiscoveryService,
  getChannelDiscoveryService,
  createChannelDiscoveryService,
  CHANNEL_CATEGORIES,
  type ChannelInfo,
  type ChannelCategory,
  type ChannelRecommendationContext,
} from "../channel-discovery";

// ============================================================================
// Test Helpers
// ============================================================================

const createTestChannel = (overrides?: Partial<ChannelInfo>): ChannelInfo => ({
  id: `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: "test-channel",
  slug: "test-channel",
  description: "Test channel description",
  type: "public",
  category: "general",
  memberCount: 10,
  createdAt: new Date(),
  createdBy: "user-1",
  isArchived: false,
  lastActivityAt: new Date(),
  topic: null,
  icon: null,
  color: null,
  ...overrides,
});

// ============================================================================
// ChannelDiscoveryService Tests
// ============================================================================

describe("ChannelDiscoveryService", () => {
  let service: ChannelDiscoveryService;

  beforeEach(() => {
    service = new ChannelDiscoveryService();
  });

  describe("constructor", () => {
    it("should create service instance", () => {
      expect(service).toBeDefined();
    });
  });

  describe("setChannels", () => {
    it("should set channels", () => {
      const channels = [
        createTestChannel({ id: "channel-1" }),
        createTestChannel({ id: "channel-2" }),
      ];
      service.setChannels(channels);

      expect(service.getChannelCount()).toBe(2);
    });

    it("should replace existing channels", () => {
      service.setChannels([createTestChannel({ id: "channel-1" })]);
      service.setChannels([createTestChannel({ id: "channel-2" })]);

      expect(service.getChannelCount()).toBe(1);
      expect(service.getChannel("channel-1")).toBeUndefined();
    });
  });

  describe("addChannel", () => {
    it("should add a channel", () => {
      const channel = createTestChannel({ id: "channel-1" });
      service.addChannel(channel);

      expect(service.getChannel("channel-1")).toBeDefined();
    });

    it("should update existing channel", () => {
      const channel1 = createTestChannel({ id: "channel-1", name: "Original" });
      const channel2 = createTestChannel({ id: "channel-1", name: "Updated" });

      service.addChannel(channel1);
      service.addChannel(channel2);

      expect(service.getChannel("channel-1")?.name).toBe("Updated");
    });
  });

  describe("removeChannel", () => {
    it("should remove a channel", () => {
      service.addChannel(createTestChannel({ id: "channel-1" }));
      service.removeChannel("channel-1");

      expect(service.getChannel("channel-1")).toBeUndefined();
    });
  });

  describe("setUserMemberships", () => {
    it("should set user memberships", () => {
      service.setUserMemberships("user-1", ["channel-1", "channel-2"]);

      expect(service.isMember("user-1", "channel-1")).toBe(true);
      expect(service.isMember("user-1", "channel-2")).toBe(true);
      expect(service.isMember("user-1", "channel-3")).toBe(false);
    });
  });

  describe("getPublicChannels", () => {
    beforeEach(() => {
      service.setChannels([
        createTestChannel({
          id: "public-1",
          type: "public",
          name: "Public One",
        }),
        createTestChannel({
          id: "public-2",
          type: "public",
          name: "Public Two",
        }),
        createTestChannel({
          id: "private-1",
          type: "private",
          name: "Private",
        }),
      ]);
    });

    it("should return only public channels", () => {
      const result = service.getPublicChannels();

      expect(result.channels).toHaveLength(2);
      expect(result.channels.every((c) => c.type === "public")).toBe(true);
    });

    it("should return total count", () => {
      const result = service.getPublicChannels();

      expect(result.totalCount).toBe(2);
    });
  });

  describe("discover", () => {
    beforeEach(() => {
      service.setChannels([
        createTestChannel({
          id: "channel-1",
          type: "public",
          category: "engineering",
          memberCount: 50,
        }),
        createTestChannel({
          id: "channel-2",
          type: "public",
          category: "design",
          memberCount: 30,
        }),
        createTestChannel({
          id: "channel-3",
          type: "public",
          category: "engineering",
          memberCount: 20,
          isArchived: true,
        }),
        createTestChannel({
          id: "channel-4",
          type: "private",
          category: "general",
          memberCount: 10,
        }),
      ]);
    });

    it("should filter by category", () => {
      const result = service.discover({ categories: ["engineering"] });

      expect(result.channels.every((c) => c.category === "engineering")).toBe(
        true,
      );
    });

    it("should exclude archived by default", () => {
      const result = service.discover({});

      expect(result.channels.every((c) => !c.isArchived)).toBe(true);
    });

    it("should include archived when specified", () => {
      const result = service.discover({ excludeArchived: false });

      expect(result.channels.some((c) => c.isArchived)).toBe(true);
    });

    it("should exclude joined channels when specified", () => {
      service.setUserMemberships("user-1", ["channel-1"]);

      const result = service.discover({
        excludeJoined: true,
        userId: "user-1",
      });

      expect(result.channels.every((c) => c.id !== "channel-1")).toBe(true);
    });

    it("should filter by min members", () => {
      const result = service.discover({ minMembers: 40 });

      expect(result.channels.every((c) => c.memberCount >= 40)).toBe(true);
    });

    it("should filter by max members", () => {
      const result = service.discover({ maxMembers: 35 });

      expect(result.channels.every((c) => c.memberCount <= 35)).toBe(true);
    });

    it("should sort by popularity", () => {
      const result = service.discover({ sortBy: "popular" });

      for (let i = 0; i < result.channels.length - 1; i++) {
        expect(result.channels[i].popularityScore).toBeGreaterThanOrEqual(
          result.channels[i + 1].popularityScore,
        );
      }
    });

    it("should sort by members", () => {
      const result = service.discover({ sortBy: "members" });

      for (let i = 0; i < result.channels.length - 1; i++) {
        expect(result.channels[i].memberCount).toBeGreaterThanOrEqual(
          result.channels[i + 1].memberCount,
        );
      }
    });

    it("should sort alphabetically", () => {
      service.setChannels([
        createTestChannel({ id: "c", name: "Zebra", type: "public" }),
        createTestChannel({ id: "a", name: "Alpha", type: "public" }),
        createTestChannel({ id: "b", name: "Beta", type: "public" }),
      ]);

      const result = service.discover({ sortBy: "alphabetical" });

      expect(result.channels[0].name).toBe("Alpha");
      expect(result.channels[1].name).toBe("Beta");
      expect(result.channels[2].name).toBe("Zebra");
    });

    it("should respect limit", () => {
      const result = service.discover({ limit: 1 });

      expect(result.channels.length).toBeLessThanOrEqual(1);
    });

    it("should handle pagination", () => {
      service.setChannels([
        createTestChannel({ id: "c1", type: "public" }),
        createTestChannel({ id: "c2", type: "public" }),
        createTestChannel({ id: "c3", type: "public" }),
      ]);

      const page1 = service.discover({ limit: 2, offset: 0 });
      const page2 = service.discover({ limit: 2, offset: 2 });

      expect(page1.channels).toHaveLength(2);
      expect(page1.hasMore).toBe(true);
      expect(page2.channels).toHaveLength(1);
      expect(page2.hasMore).toBe(false);
    });

    it("should mark isMember correctly", () => {
      service.setUserMemberships("user-1", ["channel-1"]);

      const result = service.discover({ userId: "user-1" });

      const channel1 = result.channels.find((c) => c.id === "channel-1");
      const channel2 = result.channels.find((c) => c.id === "channel-2");

      expect(channel1?.isMember).toBe(true);
      expect(channel2?.isMember).toBe(false);
    });
  });

  describe("getRecommendedChannels", () => {
    beforeEach(() => {
      service.setChannels([
        createTestChannel({
          id: "channel-1",
          name: "JavaScript Developers",
          description: "For JavaScript enthusiasts",
          type: "public",
        }),
        createTestChannel({
          id: "channel-2",
          name: "Python Guild",
          description: "Python programming discussions",
          type: "public",
        }),
        createTestChannel({
          id: "channel-3",
          name: "General",
          description: "General chat",
          type: "public",
        }),
        createTestChannel({
          id: "channel-4",
          name: "Private Engineering",
          type: "private",
        }),
      ]);
    });

    it("should recommend based on interests", () => {
      const context: ChannelRecommendationContext = {
        userId: "user-1",
        joinedChannels: [],
        interests: ["javascript"],
        colleagues: [],
        recentActivity: [],
      };

      const recommendations = service.getRecommendedChannels(context);

      const jsChannel = recommendations.find((c) => c.id === "channel-1");
      expect(jsChannel).toBeDefined();
    });

    it("should exclude already joined channels", () => {
      const context: ChannelRecommendationContext = {
        userId: "user-1",
        joinedChannels: ["channel-1"],
        interests: ["javascript"],
        colleagues: [],
        recentActivity: [],
      };

      const recommendations = service.getRecommendedChannels(context);

      expect(recommendations.every((c) => c.id !== "channel-1")).toBe(true);
    });

    it("should exclude private channels", () => {
      const context: ChannelRecommendationContext = {
        userId: "user-1",
        joinedChannels: [],
        interests: ["engineering"],
        colleagues: [],
        recentActivity: [],
      };

      const recommendations = service.getRecommendedChannels(context);

      expect(recommendations.every((c) => c.type === "public")).toBe(true);
    });

    it("should respect limit", () => {
      const context: ChannelRecommendationContext = {
        userId: "user-1",
        joinedChannels: [],
        interests: [],
        colleagues: [],
        recentActivity: [],
      };

      const recommendations = service.getRecommendedChannels(context, 2);

      expect(recommendations.length).toBeLessThanOrEqual(2);
    });

    it("should mark as recommended", () => {
      const context: ChannelRecommendationContext = {
        userId: "user-1",
        joinedChannels: [],
        interests: ["javascript"],
        colleagues: [],
        recentActivity: [],
      };

      const recommendations = service.getRecommendedChannels(context);

      expect(recommendations.every((c) => c.isRecommended)).toBe(true);
    });
  });

  describe("getPopularChannels", () => {
    it("should return channels sorted by popularity", () => {
      service.setChannels([
        createTestChannel({ id: "c1", type: "public", memberCount: 10 }),
        createTestChannel({ id: "c2", type: "public", memberCount: 100 }),
        createTestChannel({ id: "c3", type: "public", memberCount: 50 }),
      ]);

      const popular = service.getPopularChannels();

      expect(popular[0].memberCount).toBe(100);
    });

    it("should exclude archived channels", () => {
      service.setChannels([
        createTestChannel({ id: "c1", type: "public", isArchived: false }),
        createTestChannel({ id: "c2", type: "public", isArchived: true }),
      ]);

      const popular = service.getPopularChannels();

      expect(popular.every((c) => !c.isArchived)).toBe(true);
    });

    it("should respect limit", () => {
      service.setChannels([
        createTestChannel({ id: "c1", type: "public" }),
        createTestChannel({ id: "c2", type: "public" }),
        createTestChannel({ id: "c3", type: "public" }),
      ]);

      const popular = service.getPopularChannels(2);

      expect(popular.length).toBeLessThanOrEqual(2);
    });
  });

  describe("getRecentlyActiveChannels", () => {
    it("should return channels sorted by activity", () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      service.setChannels([
        createTestChannel({
          id: "c1",
          type: "public",
          lastActivityAt: lastWeek,
        }),
        createTestChannel({ id: "c2", type: "public", lastActivityAt: now }),
        createTestChannel({
          id: "c3",
          type: "public",
          lastActivityAt: yesterday,
        }),
      ]);

      const recent = service.getRecentlyActiveChannels();

      expect(recent[0].id).toBe("c2");
    });

    it("should use activity cache if available", () => {
      const old = new Date("2020-01-01");
      const recent = new Date();

      service.setChannels([
        createTestChannel({ id: "c1", type: "public", lastActivityAt: old }),
      ]);
      service.updateActivity("c1", recent);

      const results = service.getRecentlyActiveChannels();

      expect(results[0].lastActivityAt).toEqual(recent);
    });
  });

  describe("getChannelsByCategory", () => {
    it("should return channels in category", () => {
      service.setChannels([
        createTestChannel({
          id: "c1",
          type: "public",
          category: "engineering",
        }),
        createTestChannel({ id: "c2", type: "public", category: "design" }),
        createTestChannel({
          id: "c3",
          type: "public",
          category: "engineering",
        }),
      ]);

      const result = service.getChannelsByCategory("engineering");

      expect(result.channels.every((c) => c.category === "engineering")).toBe(
        true,
      );
    });
  });

  describe("getCategories", () => {
    it("should return all categories with counts", () => {
      service.setChannels([
        createTestChannel({
          id: "c1",
          type: "public",
          category: "engineering",
        }),
        createTestChannel({
          id: "c2",
          type: "public",
          category: "engineering",
        }),
        createTestChannel({ id: "c3", type: "public", category: "design" }),
      ]);

      const categories = service.getCategories();

      const engineering = categories.find((c) => c.category === "engineering");
      const design = categories.find((c) => c.category === "design");

      expect(engineering?.channelCount).toBe(2);
      expect(design?.channelCount).toBe(1);
    });

    it("should include all predefined categories", () => {
      const categories = service.getCategories();

      expect(categories.length).toBe(Object.keys(CHANNEL_CATEGORIES).length);
    });

    it("should exclude private channels from counts", () => {
      service.setChannels([
        createTestChannel({
          id: "c1",
          type: "public",
          category: "engineering",
        }),
        createTestChannel({
          id: "c2",
          type: "private",
          category: "engineering",
        }),
      ]);

      const categories = service.getCategories();
      const engineering = categories.find((c) => c.category === "engineering");

      expect(engineering?.channelCount).toBe(1);
    });

    it("should sort by channel count", () => {
      service.setChannels([
        createTestChannel({
          id: "c1",
          type: "public",
          category: "engineering",
        }),
        createTestChannel({
          id: "c2",
          type: "public",
          category: "engineering",
        }),
        createTestChannel({ id: "c3", type: "public", category: "design" }),
      ]);

      const categories = service.getCategories();

      expect(categories[0].category).toBe("engineering");
    });
  });

  describe("searchChannels", () => {
    beforeEach(() => {
      service.setChannels([
        createTestChannel({
          id: "c1",
          name: "JavaScript",
          description: "JavaScript discussions",
          type: "public",
        }),
        createTestChannel({
          id: "c2",
          name: "TypeScript",
          description: "TypeScript and type safety",
          type: "public",
        }),
        createTestChannel({
          id: "c3",
          name: "Python",
          description: "Python programming",
          type: "public",
        }),
      ]);
    });

    it("should search by name", () => {
      const result = service.searchChannels("JavaScript");

      expect(result.channels.some((c) => c.name === "JavaScript")).toBe(true);
    });

    it("should search by description", () => {
      const result = service.searchChannels("type safety");

      expect(result.channels.some((c) => c.name === "TypeScript")).toBe(true);
    });

    it("should be case insensitive", () => {
      const result = service.searchChannels("javascript");

      expect(result.channels.some((c) => c.name === "JavaScript")).toBe(true);
    });

    it("should rank exact matches higher", () => {
      const result = service.searchChannels("JavaScript");

      expect(result.channels[0].name).toBe("JavaScript");
    });

    it("should return all channels for empty query", () => {
      const result = service.searchChannels("");

      expect(result.channels.length).toBe(3);
    });

    it("should return empty for no matches", () => {
      const result = service.searchChannels("nonexistent");

      expect(result.channels).toHaveLength(0);
    });
  });

  describe("getChannel", () => {
    it("should return channel by ID", () => {
      service.addChannel(createTestChannel({ id: "channel-1", name: "Test" }));

      const channel = service.getChannel("channel-1");

      expect(channel?.name).toBe("Test");
    });

    it("should return undefined for non-existing channel", () => {
      const channel = service.getChannel("non-existent");

      expect(channel).toBeUndefined();
    });
  });

  describe("isMember", () => {
    it("should return true for member", () => {
      service.setUserMemberships("user-1", ["channel-1"]);

      expect(service.isMember("user-1", "channel-1")).toBe(true);
    });

    it("should return false for non-member", () => {
      service.setUserMemberships("user-1", ["channel-1"]);

      expect(service.isMember("user-1", "channel-2")).toBe(false);
    });

    it("should return false for unknown user", () => {
      expect(service.isMember("unknown", "channel-1")).toBe(false);
    });
  });

  describe("getChannelCount", () => {
    it("should return total channel count", () => {
      service.setChannels([
        createTestChannel({ id: "c1" }),
        createTestChannel({ id: "c2" }),
      ]);

      expect(service.getChannelCount()).toBe(2);
    });

    it("should return count by type", () => {
      service.setChannels([
        createTestChannel({ id: "c1", type: "public" }),
        createTestChannel({ id: "c2", type: "public" }),
        createTestChannel({ id: "c3", type: "private" }),
      ]);

      expect(service.getChannelCount("public")).toBe(2);
      expect(service.getChannelCount("private")).toBe(1);
    });
  });

  describe("clear", () => {
    it("should clear all data", () => {
      service.setChannels([createTestChannel({ id: "c1" })]);
      service.setUserMemberships("user-1", ["c1"]);

      service.clear();

      expect(service.getChannelCount()).toBe(0);
      expect(service.isMember("user-1", "c1")).toBe(false);
    });
  });
});

// ============================================================================
// Factory Functions Tests
// ============================================================================

describe("Factory Functions", () => {
  describe("getChannelDiscoveryService", () => {
    it("should return singleton instance", () => {
      const service1 = getChannelDiscoveryService();
      const service2 = getChannelDiscoveryService();
      expect(service1).toBe(service2);
    });
  });

  describe("createChannelDiscoveryService", () => {
    it("should create new instance each time", () => {
      const service1 = createChannelDiscoveryService();
      const service2 = createChannelDiscoveryService();
      expect(service1).not.toBe(service2);
    });
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("CHANNEL_CATEGORIES", () => {
  it("should have all expected categories", () => {
    expect(CHANNEL_CATEGORIES.general).toBeDefined();
    expect(CHANNEL_CATEGORIES.engineering).toBeDefined();
    expect(CHANNEL_CATEGORIES.design).toBeDefined();
    expect(CHANNEL_CATEGORIES.marketing).toBeDefined();
    expect(CHANNEL_CATEGORIES.sales).toBeDefined();
    expect(CHANNEL_CATEGORIES.support).toBeDefined();
    expect(CHANNEL_CATEGORIES.social).toBeDefined();
    expect(CHANNEL_CATEGORIES.announcements).toBeDefined();
    expect(CHANNEL_CATEGORIES.other).toBeDefined();
  });

  it("should have labels, descriptions, and icons for each category", () => {
    for (const category of Object.values(CHANNEL_CATEGORIES)) {
      expect(category.label).toBeDefined();
      expect(category.description).toBeDefined();
      expect(category.icon).toBeDefined();
    }
  });
});
