/**
 * Channel Store Unit Tests
 *
 * Tests for the channel store including setting active channel, adding channels,
 * updating channels, mute/unmute, star/unstar, and category management.
 */

import { act } from "@testing-library/react";
import {
  useChannelStore,
  Channel,
  ChannelType,
  ChannelCategory,
  ChannelMember,
} from "../channel-store";

// ============================================================================
// Test Helpers
// ============================================================================

const createTestChannel = (overrides?: Partial<Channel>): Channel => ({
  id: `channel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: "test-channel",
  slug: "test-channel",
  description: "Test channel description",
  type: "public",
  categoryId: null,
  createdBy: "user-1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  topic: null,
  icon: null,
  color: null,
  isArchived: false,
  isDefault: false,
  memberCount: 5,
  lastMessageAt: null,
  lastMessagePreview: null,
  ...overrides,
});

const createTestCategory = (
  overrides?: Partial<ChannelCategory>,
): ChannelCategory => ({
  id: `category-${Date.now()}`,
  name: "Test Category",
  position: 0,
  isCollapsed: false,
  channelIds: [],
  ...overrides,
});

const createTestMember = (
  overrides?: Partial<ChannelMember>,
): ChannelMember => ({
  userId: `user-${Date.now()}`,
  role: "member",
  joinedAt: new Date().toISOString(),
  lastReadAt: null,
  lastReadMessageId: null,
  ...overrides,
});

// ============================================================================
// Setup/Teardown
// ============================================================================

describe("Channel Store", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useChannelStore.getState().resetChannelStore();
    });
  });

  // ==========================================================================
  // Channel CRUD Tests
  // ==========================================================================

  describe("Channel CRUD Operations", () => {
    describe("setChannels", () => {
      it("should set channels from array", () => {
        const channels = [
          createTestChannel({ id: "channel-1", name: "General" }),
          createTestChannel({ id: "channel-2", name: "Random" }),
        ];

        act(() => {
          useChannelStore.getState().setChannels(channels);
        });

        const state = useChannelStore.getState();
        expect(state.channels.size).toBe(2);
        expect(state.channels.get("channel-1")?.name).toBe("General");
        expect(state.channels.get("channel-2")?.name).toBe("Random");
      });

      it("should create slug-to-id mapping", () => {
        const channels = [
          createTestChannel({ id: "channel-1", slug: "general" }),
          createTestChannel({ id: "channel-2", slug: "random" }),
        ];

        act(() => {
          useChannelStore.getState().setChannels(channels);
        });

        const state = useChannelStore.getState();
        expect(state.channelsBySlug.get("general")).toBe("channel-1");
        expect(state.channelsBySlug.get("random")).toBe("channel-2");
      });

      it("should overwrite existing channels", () => {
        const initial = [createTestChannel({ id: "channel-1", name: "Old" })];
        const updated = [createTestChannel({ id: "channel-1", name: "New" })];

        act(() => {
          useChannelStore.getState().setChannels(initial);
          useChannelStore.getState().setChannels(updated);
        });

        const state = useChannelStore.getState();
        expect(state.channels.size).toBe(1);
        expect(state.channels.get("channel-1")?.name).toBe("New");
      });
    });

    describe("addChannel", () => {
      it("should add a new channel", () => {
        const channel = createTestChannel({
          id: "channel-1",
          name: "New Channel",
        });

        act(() => {
          useChannelStore.getState().addChannel(channel);
        });

        const state = useChannelStore.getState();
        expect(state.channels.has("channel-1")).toBe(true);
        expect(state.channelsBySlug.has(channel.slug)).toBe(true);
      });

      it("should not affect existing channels", () => {
        const existing = createTestChannel({
          id: "channel-1",
          name: "Existing",
        });
        const newChannel = createTestChannel({ id: "channel-2", name: "New" });

        act(() => {
          useChannelStore.getState().addChannel(existing);
          useChannelStore.getState().addChannel(newChannel);
        });

        const state = useChannelStore.getState();
        expect(state.channels.size).toBe(2);
        expect(state.channels.get("channel-1")?.name).toBe("Existing");
      });
    });

    describe("updateChannel", () => {
      it("should update an existing channel", () => {
        const channel = createTestChannel({
          id: "channel-1",
          name: "Original",
        });

        act(() => {
          useChannelStore.getState().addChannel(channel);
          useChannelStore.getState().updateChannel("channel-1", {
            name: "Updated",
            description: "New description",
          });
        });

        const state = useChannelStore.getState();
        const updated = state.channels.get("channel-1");
        expect(updated?.name).toBe("Updated");
        expect(updated?.description).toBe("New description");
      });

      it("should update slug mapping when slug changes", () => {
        const channel = createTestChannel({
          id: "channel-1",
          slug: "old-slug",
        });

        act(() => {
          useChannelStore.getState().addChannel(channel);
          useChannelStore
            .getState()
            .updateChannel("channel-1", { slug: "new-slug" });
        });

        const state = useChannelStore.getState();
        expect(state.channelsBySlug.has("old-slug")).toBe(false);
        expect(state.channelsBySlug.get("new-slug")).toBe("channel-1");
      });

      it("should not update non-existent channel", () => {
        act(() => {
          useChannelStore
            .getState()
            .updateChannel("non-existent", { name: "Updated" });
        });

        const state = useChannelStore.getState();
        expect(state.channels.has("non-existent")).toBe(false);
      });
    });

    describe("removeChannel", () => {
      it("should remove a channel", () => {
        const channel = createTestChannel({ id: "channel-1" });

        act(() => {
          useChannelStore.getState().addChannel(channel);
          useChannelStore.getState().removeChannel("channel-1");
        });

        const state = useChannelStore.getState();
        expect(state.channels.has("channel-1")).toBe(false);
        expect(state.channelsBySlug.has(channel.slug)).toBe(false);
      });

      it("should clear channel from muted/starred/pinned sets", () => {
        const channel = createTestChannel({ id: "channel-1" });

        act(() => {
          useChannelStore.getState().addChannel(channel);
          useChannelStore.getState().setChannelMuted("channel-1", true);
          useChannelStore.getState().setChannelStarred("channel-1", true);
          useChannelStore.getState().setChannelPinned("channel-1", true);
          useChannelStore.getState().removeChannel("channel-1");
        });

        const state = useChannelStore.getState();
        expect(state.mutedChannels.has("channel-1")).toBe(false);
        expect(state.starredChannels.has("channel-1")).toBe(false);
        expect(state.pinnedChannels.has("channel-1")).toBe(false);
      });

      it("should update active channel if removed channel was active", () => {
        const channel1 = createTestChannel({ id: "channel-1" });
        const channel2 = createTestChannel({ id: "channel-2" });

        act(() => {
          useChannelStore.getState().addChannel(channel1);
          useChannelStore.getState().addChannel(channel2);
          useChannelStore.getState().setActiveChannel("channel-1");
          useChannelStore.getState().setActiveChannel("channel-2");
          useChannelStore.getState().removeChannel("channel-2");
        });

        const state = useChannelStore.getState();
        expect(state.activeChannelId).toBe("channel-1");
      });
    });

    describe("getChannelById", () => {
      it("should get channel by ID", () => {
        const channel = createTestChannel({ id: "channel-1", name: "Test" });

        act(() => {
          useChannelStore.getState().addChannel(channel);
        });

        const found = useChannelStore.getState().getChannelById("channel-1");
        expect(found?.name).toBe("Test");
      });

      it("should return undefined for non-existent channel", () => {
        const found = useChannelStore.getState().getChannelById("non-existent");
        expect(found).toBeUndefined();
      });
    });

    describe("getChannelBySlug", () => {
      it("should get channel by slug", () => {
        const channel = createTestChannel({
          id: "channel-1",
          slug: "test-slug",
        });

        act(() => {
          useChannelStore.getState().addChannel(channel);
        });

        const found = useChannelStore.getState().getChannelBySlug("test-slug");
        expect(found?.id).toBe("channel-1");
      });

      it("should return undefined for non-existent slug", () => {
        const found = useChannelStore
          .getState()
          .getChannelBySlug("non-existent");
        expect(found).toBeUndefined();
      });
    });
  });

  // ==========================================================================
  // Active Channel Tests
  // ==========================================================================

  describe("Active Channel", () => {
    describe("setActiveChannel", () => {
      it("should set the active channel", () => {
        const channel = createTestChannel({ id: "channel-1" });

        act(() => {
          useChannelStore.getState().addChannel(channel);
          useChannelStore.getState().setActiveChannel("channel-1");
        });

        const state = useChannelStore.getState();
        expect(state.activeChannelId).toBe("channel-1");
      });

      it("should store previous channel", () => {
        const channel1 = createTestChannel({ id: "channel-1" });
        const channel2 = createTestChannel({ id: "channel-2" });

        act(() => {
          useChannelStore.getState().addChannel(channel1);
          useChannelStore.getState().addChannel(channel2);
          useChannelStore.getState().setActiveChannel("channel-1");
          useChannelStore.getState().setActiveChannel("channel-2");
        });

        const state = useChannelStore.getState();
        expect(state.activeChannelId).toBe("channel-2");
        expect(state.previousChannelId).toBe("channel-1");
      });

      it("should add channel to recent channels", () => {
        const channel = createTestChannel({ id: "channel-1" });

        act(() => {
          useChannelStore.getState().addChannel(channel);
          useChannelStore.getState().setActiveChannel("channel-1");
        });

        const state = useChannelStore.getState();
        expect(state.recentChannels).toContain("channel-1");
      });

      it("should move channel to front of recent list", () => {
        const channel1 = createTestChannel({ id: "channel-1" });
        const channel2 = createTestChannel({ id: "channel-2" });

        act(() => {
          useChannelStore.getState().addChannel(channel1);
          useChannelStore.getState().addChannel(channel2);
          useChannelStore.getState().setActiveChannel("channel-1");
          useChannelStore.getState().setActiveChannel("channel-2");
          useChannelStore.getState().setActiveChannel("channel-1");
        });

        const state = useChannelStore.getState();
        expect(state.recentChannels[0]).toBe("channel-1");
      });

      it("should set active channel to null", () => {
        const channel = createTestChannel({ id: "channel-1" });

        act(() => {
          useChannelStore.getState().addChannel(channel);
          useChannelStore.getState().setActiveChannel("channel-1");
          useChannelStore.getState().setActiveChannel(null);
        });

        const state = useChannelStore.getState();
        expect(state.activeChannelId).toBeNull();
      });
    });

    describe("goToPreviousChannel", () => {
      it("should go to previous channel", () => {
        const channel1 = createTestChannel({ id: "channel-1" });
        const channel2 = createTestChannel({ id: "channel-2" });

        act(() => {
          useChannelStore.getState().addChannel(channel1);
          useChannelStore.getState().addChannel(channel2);
          useChannelStore.getState().setActiveChannel("channel-1");
          useChannelStore.getState().setActiveChannel("channel-2");
          useChannelStore.getState().goToPreviousChannel();
        });

        const state = useChannelStore.getState();
        expect(state.activeChannelId).toBe("channel-1");
        expect(state.previousChannelId).toBe("channel-2");
      });

      it("should not change if no previous channel", () => {
        const channel = createTestChannel({ id: "channel-1" });

        act(() => {
          useChannelStore.getState().addChannel(channel);
          useChannelStore.getState().setActiveChannel("channel-1");
          useChannelStore.getState().goToPreviousChannel();
        });

        const state = useChannelStore.getState();
        expect(state.activeChannelId).toBe("channel-1");
      });
    });
  });

  // ==========================================================================
  // Mute/Star/Pin Tests
  // ==========================================================================

  describe("Mute/Star/Pin Operations", () => {
    describe("toggleMuteChannel", () => {
      it("should mute a channel", () => {
        act(() => {
          useChannelStore.getState().toggleMuteChannel("channel-1");
        });

        const state = useChannelStore.getState();
        expect(state.mutedChannels.has("channel-1")).toBe(true);
      });

      it("should unmute a muted channel", () => {
        act(() => {
          useChannelStore.getState().toggleMuteChannel("channel-1");
          useChannelStore.getState().toggleMuteChannel("channel-1");
        });

        const state = useChannelStore.getState();
        expect(state.mutedChannels.has("channel-1")).toBe(false);
      });
    });

    describe("setChannelMuted", () => {
      it("should set muted state explicitly", () => {
        act(() => {
          useChannelStore.getState().setChannelMuted("channel-1", true);
        });

        let state = useChannelStore.getState();
        expect(state.mutedChannels.has("channel-1")).toBe(true);

        act(() => {
          useChannelStore.getState().setChannelMuted("channel-1", false);
        });

        state = useChannelStore.getState();
        expect(state.mutedChannels.has("channel-1")).toBe(false);
      });
    });

    describe("toggleStarChannel", () => {
      it("should star a channel", () => {
        act(() => {
          useChannelStore.getState().toggleStarChannel("channel-1");
        });

        const state = useChannelStore.getState();
        expect(state.starredChannels.has("channel-1")).toBe(true);
      });

      it("should unstar a starred channel", () => {
        act(() => {
          useChannelStore.getState().toggleStarChannel("channel-1");
          useChannelStore.getState().toggleStarChannel("channel-1");
        });

        const state = useChannelStore.getState();
        expect(state.starredChannels.has("channel-1")).toBe(false);
      });
    });

    describe("setChannelStarred", () => {
      it("should set starred state explicitly", () => {
        act(() => {
          useChannelStore.getState().setChannelStarred("channel-1", true);
        });

        let state = useChannelStore.getState();
        expect(state.starredChannels.has("channel-1")).toBe(true);

        act(() => {
          useChannelStore.getState().setChannelStarred("channel-1", false);
        });

        state = useChannelStore.getState();
        expect(state.starredChannels.has("channel-1")).toBe(false);
      });
    });

    describe("togglePinChannel", () => {
      it("should pin a channel", () => {
        act(() => {
          useChannelStore.getState().togglePinChannel("channel-1");
        });

        const state = useChannelStore.getState();
        expect(state.pinnedChannels.has("channel-1")).toBe(true);
      });

      it("should unpin a pinned channel", () => {
        act(() => {
          useChannelStore.getState().togglePinChannel("channel-1");
          useChannelStore.getState().togglePinChannel("channel-1");
        });

        const state = useChannelStore.getState();
        expect(state.pinnedChannels.has("channel-1")).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Category Management Tests
  // ==========================================================================

  describe("Category Management", () => {
    describe("setCategories", () => {
      it("should set categories", () => {
        const categories = [
          createTestCategory({ id: "cat-1", name: "Category 1" }),
          createTestCategory({ id: "cat-2", name: "Category 2" }),
        ];

        act(() => {
          useChannelStore.getState().setCategories(categories);
        });

        const state = useChannelStore.getState();
        expect(state.categories).toHaveLength(2);
      });
    });

    describe("addCategory", () => {
      it("should add a category", () => {
        const category = createTestCategory({
          id: "cat-1",
          name: "New Category",
        });

        act(() => {
          useChannelStore.getState().addCategory(category);
        });

        const state = useChannelStore.getState();
        expect(state.categories).toHaveLength(1);
        expect(state.categories[0].name).toBe("New Category");
      });
    });

    describe("updateCategory", () => {
      it("should update a category", () => {
        const category = createTestCategory({ id: "cat-1", name: "Original" });

        act(() => {
          useChannelStore.getState().addCategory(category);
          useChannelStore
            .getState()
            .updateCategory("cat-1", { name: "Updated" });
        });

        const state = useChannelStore.getState();
        expect(state.categories[0].name).toBe("Updated");
      });
    });

    describe("removeCategory", () => {
      it("should remove a category", () => {
        const category = createTestCategory({ id: "cat-1" });

        act(() => {
          useChannelStore.getState().addCategory(category);
          useChannelStore.getState().removeCategory("cat-1");
        });

        const state = useChannelStore.getState();
        expect(state.categories).toHaveLength(0);
      });

      it("should remove category from collapsed set", () => {
        const category = createTestCategory({ id: "cat-1" });

        act(() => {
          useChannelStore.getState().addCategory(category);
          useChannelStore.getState().setCategoryCollapsed("cat-1", true);
          useChannelStore.getState().removeCategory("cat-1");
        });

        const state = useChannelStore.getState();
        expect(state.collapsedCategories.has("cat-1")).toBe(false);
      });
    });

    describe("toggleCategoryCollapse", () => {
      it("should toggle category collapsed state", () => {
        const category = createTestCategory({ id: "cat-1" });

        act(() => {
          useChannelStore.getState().addCategory(category);
          useChannelStore.getState().toggleCategoryCollapse("cat-1");
        });

        let state = useChannelStore.getState();
        expect(state.collapsedCategories.has("cat-1")).toBe(true);

        act(() => {
          useChannelStore.getState().toggleCategoryCollapse("cat-1");
        });

        state = useChannelStore.getState();
        expect(state.collapsedCategories.has("cat-1")).toBe(false);
      });
    });

    describe("moveChannelToCategory", () => {
      it("should move channel to a category", () => {
        const channel = createTestChannel({ id: "channel-1" });
        const category = createTestCategory({ id: "cat-1", channelIds: [] });

        act(() => {
          useChannelStore.getState().addChannel(channel);
          useChannelStore.getState().addCategory(category);
          useChannelStore
            .getState()
            .moveChannelToCategory("channel-1", "cat-1");
        });

        const state = useChannelStore.getState();
        expect(state.categories[0].channelIds).toContain("channel-1");
        expect(state.channels.get("channel-1")?.categoryId).toBe("cat-1");
      });

      it("should remove channel from previous category", () => {
        const channel = createTestChannel({
          id: "channel-1",
          categoryId: "cat-1",
        });
        const cat1 = createTestCategory({
          id: "cat-1",
          channelIds: ["channel-1"],
        });
        const cat2 = createTestCategory({ id: "cat-2", channelIds: [] });

        act(() => {
          useChannelStore.getState().addChannel(channel);
          useChannelStore.getState().addCategory(cat1);
          useChannelStore.getState().addCategory(cat2);
          useChannelStore
            .getState()
            .moveChannelToCategory("channel-1", "cat-2");
        });

        const state = useChannelStore.getState();
        expect(state.categories[0].channelIds).not.toContain("channel-1");
        expect(state.categories[1].channelIds).toContain("channel-1");
      });
    });

    describe("reorderCategories", () => {
      it("should reorder categories", () => {
        const cat1 = createTestCategory({
          id: "cat-1",
          name: "First",
          position: 0,
        });
        const cat2 = createTestCategory({
          id: "cat-2",
          name: "Second",
          position: 1,
        });

        act(() => {
          useChannelStore.getState().addCategory(cat1);
          useChannelStore.getState().addCategory(cat2);
          useChannelStore.getState().reorderCategories(["cat-2", "cat-1"]);
        });

        const state = useChannelStore.getState();
        expect(state.categories[0].id).toBe("cat-2");
        expect(state.categories[1].id).toBe("cat-1");
      });
    });
  });

  // ==========================================================================
  // Hidden Channels Tests
  // ==========================================================================

  describe("Hidden Channels", () => {
    describe("hideChannel", () => {
      it("should hide a channel", () => {
        act(() => {
          useChannelStore.getState().hideChannel("channel-1");
        });

        const state = useChannelStore.getState();
        expect(state.hiddenChannels.has("channel-1")).toBe(true);
      });
    });

    describe("unhideChannel", () => {
      it("should unhide a channel", () => {
        act(() => {
          useChannelStore.getState().hideChannel("channel-1");
          useChannelStore.getState().unhideChannel("channel-1");
        });

        const state = useChannelStore.getState();
        expect(state.hiddenChannels.has("channel-1")).toBe(false);
      });
    });

    describe("setHiddenChannels", () => {
      it("should set hidden channels from array", () => {
        act(() => {
          useChannelStore
            .getState()
            .setHiddenChannels(["channel-1", "channel-2"]);
        });

        const state = useChannelStore.getState();
        expect(state.hiddenChannels.size).toBe(2);
        expect(state.hiddenChannels.has("channel-1")).toBe(true);
        expect(state.hiddenChannels.has("channel-2")).toBe(true);
      });
    });
  });

  // ==========================================================================
  // Recent Channels Tests
  // ==========================================================================

  describe("Recent Channels", () => {
    describe("addToRecentChannels", () => {
      it("should add channel to recent channels", () => {
        act(() => {
          useChannelStore.getState().addToRecentChannels("channel-1");
        });

        const state = useChannelStore.getState();
        expect(state.recentChannels).toContain("channel-1");
      });

      it("should move existing channel to front", () => {
        act(() => {
          useChannelStore.getState().addToRecentChannels("channel-1");
          useChannelStore.getState().addToRecentChannels("channel-2");
          useChannelStore.getState().addToRecentChannels("channel-1");
        });

        const state = useChannelStore.getState();
        expect(state.recentChannels[0]).toBe("channel-1");
      });

      it("should limit recent channels to 10", () => {
        act(() => {
          for (let i = 0; i < 15; i++) {
            useChannelStore.getState().addToRecentChannels(`channel-${i}`);
          }
        });

        const state = useChannelStore.getState();
        expect(state.recentChannels.length).toBeLessThanOrEqual(10);
      });
    });

    describe("clearRecentChannels", () => {
      it("should clear recent channels", () => {
        act(() => {
          useChannelStore.getState().addToRecentChannels("channel-1");
          useChannelStore.getState().addToRecentChannels("channel-2");
          useChannelStore.getState().clearRecentChannels();
        });

        const state = useChannelStore.getState();
        expect(state.recentChannels).toHaveLength(0);
      });
    });
  });

  // ==========================================================================
  // Member Management Tests
  // ==========================================================================

  describe("Member Management", () => {
    describe("updateChannelMembers", () => {
      it("should update channel members", () => {
        const channel = createTestChannel({ id: "channel-1", memberCount: 0 });
        const members = [
          createTestMember({ userId: "user-1" }),
          createTestMember({ userId: "user-2" }),
        ];

        act(() => {
          useChannelStore.getState().addChannel(channel);
          useChannelStore.getState().updateChannelMembers("channel-1", members);
        });

        const state = useChannelStore.getState();
        const updated = state.channels.get("channel-1");
        expect(updated?.members).toHaveLength(2);
        expect(updated?.memberCount).toBe(2);
      });
    });

    describe("addChannelMember", () => {
      it("should add a member to channel", () => {
        const channel = createTestChannel({ id: "channel-1", memberCount: 0 });
        const member = createTestMember({ userId: "user-1" });

        act(() => {
          useChannelStore.getState().addChannel(channel);
          useChannelStore.getState().addChannelMember("channel-1", member);
        });

        const state = useChannelStore.getState();
        const updated = state.channels.get("channel-1");
        expect(updated?.members).toHaveLength(1);
        expect(updated?.memberCount).toBe(1);
      });
    });

    describe("removeChannelMember", () => {
      it("should remove a member from channel", () => {
        const channel = createTestChannel({
          id: "channel-1",
          members: [
            createTestMember({ userId: "user-1" }),
            createTestMember({ userId: "user-2" }),
          ],
          memberCount: 2,
        });

        act(() => {
          useChannelStore.getState().addChannel(channel);
          useChannelStore.getState().removeChannelMember("channel-1", "user-1");
        });

        const state = useChannelStore.getState();
        const updated = state.channels.get("channel-1");
        expect(updated?.members).toHaveLength(1);
        expect(updated?.members?.[0].userId).toBe("user-2");
      });
    });

    describe("updateChannelMember", () => {
      it("should update a channel member", () => {
        const channel = createTestChannel({
          id: "channel-1",
          members: [createTestMember({ userId: "user-1", role: "member" })],
          memberCount: 1,
        });

        act(() => {
          useChannelStore.getState().addChannel(channel);
          useChannelStore
            .getState()
            .updateChannelMember("channel-1", "user-1", {
              role: "admin",
            });
        });

        const state = useChannelStore.getState();
        const updated = state.channels.get("channel-1");
        expect(updated?.members?.[0].role).toBe("admin");
      });
    });
  });

  // ==========================================================================
  // Loading/Error State Tests
  // ==========================================================================

  describe("Loading/Error State", () => {
    describe("setLoading", () => {
      it("should set loading state", () => {
        act(() => {
          useChannelStore.getState().setLoading(true);
        });

        let state = useChannelStore.getState();
        expect(state.isLoading).toBe(true);

        act(() => {
          useChannelStore.getState().setLoading(false);
        });

        state = useChannelStore.getState();
        expect(state.isLoading).toBe(false);
      });
    });

    describe("setLoadingChannel", () => {
      it("should set loading channel", () => {
        act(() => {
          useChannelStore.getState().setLoadingChannel("channel-1");
        });

        let state = useChannelStore.getState();
        expect(state.isLoadingChannel).toBe("channel-1");

        act(() => {
          useChannelStore.getState().setLoadingChannel(null);
        });

        state = useChannelStore.getState();
        expect(state.isLoadingChannel).toBeNull();
      });
    });

    describe("setError", () => {
      it("should set error state", () => {
        act(() => {
          useChannelStore.getState().setError("Something went wrong");
        });

        let state = useChannelStore.getState();
        expect(state.error).toBe("Something went wrong");

        act(() => {
          useChannelStore.getState().setError(null);
        });

        state = useChannelStore.getState();
        expect(state.error).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Archive Tests
  // ==========================================================================

  describe("Archive Operations", () => {
    describe("archiveChannel", () => {
      it("should archive a channel", () => {
        const channel = createTestChannel({
          id: "channel-1",
          isArchived: false,
        });

        act(() => {
          useChannelStore.getState().addChannel(channel);
          useChannelStore.getState().archiveChannel("channel-1");
        });

        const state = useChannelStore.getState();
        expect(state.channels.get("channel-1")?.isArchived).toBe(true);
      });
    });

    describe("unarchiveChannel", () => {
      it("should unarchive a channel", () => {
        const channel = createTestChannel({
          id: "channel-1",
          isArchived: true,
        });

        act(() => {
          useChannelStore.getState().addChannel(channel);
          useChannelStore.getState().unarchiveChannel("channel-1");
        });

        const state = useChannelStore.getState();
        expect(state.channels.get("channel-1")?.isArchived).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Selector Tests
  // ==========================================================================

  describe("Selectors", () => {
    beforeEach(() => {
      const channels = [
        createTestChannel({ id: "ch-1", type: "public", isArchived: false }),
        createTestChannel({ id: "ch-2", type: "public", isArchived: false }),
        createTestChannel({ id: "ch-3", type: "private", isArchived: false }),
        createTestChannel({ id: "ch-4", type: "direct", isArchived: false }),
        createTestChannel({ id: "ch-5", type: "public", isArchived: true }),
      ];

      act(() => {
        useChannelStore.getState().setChannels(channels);
        useChannelStore.getState().setActiveChannel("ch-1");
        useChannelStore.getState().setChannelStarred("ch-2", true);
        useChannelStore.getState().setChannelMuted("ch-3", true);
      });
    });

    it("selectActiveChannel should return active channel", () => {
      const { selectActiveChannel } = require("../channel-store");
      const state = useChannelStore.getState();
      const active = selectActiveChannel(state);
      expect(active?.id).toBe("ch-1");
    });

    it("selectChannelList should return all channels", () => {
      const { selectChannelList } = require("../channel-store");
      const state = useChannelStore.getState();
      const channels = selectChannelList(state);
      expect(channels).toHaveLength(5);
    });

    it("selectPublicChannels should return only public non-archived channels", () => {
      const { selectPublicChannels } = require("../channel-store");
      const state = useChannelStore.getState();
      const channels = selectPublicChannels(state);
      expect(channels).toHaveLength(2);
      channels.forEach((c: Channel) => {
        expect(c.type).toBe("public");
        expect(c.isArchived).toBe(false);
      });
    });

    it("selectPrivateChannels should return only private channels", () => {
      const { selectPrivateChannels } = require("../channel-store");
      const state = useChannelStore.getState();
      const channels = selectPrivateChannels(state);
      expect(channels).toHaveLength(1);
      expect(channels[0].type).toBe("private");
    });

    it("selectDirectMessages should return DMs", () => {
      const { selectDirectMessages } = require("../channel-store");
      const state = useChannelStore.getState();
      const channels = selectDirectMessages(state);
      expect(channels).toHaveLength(1);
    });

    it("selectStarredChannels should return starred channels", () => {
      const { selectStarredChannels } = require("../channel-store");
      const state = useChannelStore.getState();
      const channels = selectStarredChannels(state);
      expect(channels).toHaveLength(1);
      expect(channels[0].id).toBe("ch-2");
    });

    it("selectMutedChannels should return muted channels", () => {
      const { selectMutedChannels } = require("../channel-store");
      const state = useChannelStore.getState();
      const channels = selectMutedChannels(state);
      expect(channels).toHaveLength(1);
      expect(channels[0].id).toBe("ch-3");
    });

    it("selectIsChannelMuted should check if channel is muted", () => {
      const { selectIsChannelMuted } = require("../channel-store");
      const state = useChannelStore.getState();
      expect(selectIsChannelMuted("ch-3")(state)).toBe(true);
      expect(selectIsChannelMuted("ch-1")(state)).toBe(false);
    });

    it("selectIsChannelStarred should check if channel is starred", () => {
      const { selectIsChannelStarred } = require("../channel-store");
      const state = useChannelStore.getState();
      expect(selectIsChannelStarred("ch-2")(state)).toBe(true);
      expect(selectIsChannelStarred("ch-1")(state)).toBe(false);
    });
  });

  // ==========================================================================
  // Reset Store Test
  // ==========================================================================

  describe("Reset Store", () => {
    it("should reset store to initial state", () => {
      const channel = createTestChannel({ id: "channel-1" });

      act(() => {
        useChannelStore.getState().addChannel(channel);
        useChannelStore.getState().setActiveChannel("channel-1");
        useChannelStore.getState().setChannelMuted("channel-1", true);
        useChannelStore.getState().setChannelStarred("channel-1", true);
        useChannelStore.getState().resetChannelStore();
      });

      const state = useChannelStore.getState();
      expect(state.channels.size).toBe(0);
      expect(state.activeChannelId).toBeNull();
      expect(state.mutedChannels.size).toBe(0);
      expect(state.starredChannels.size).toBe(0);
    });
  });
});
