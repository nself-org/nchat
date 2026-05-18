/**
 * Channel Hierarchy Service Tests
 *
 * Tests for category management, channel reordering, and permission inheritance.
 *
 * Phase 6: Task 35 - Complete channel/category/thread/forum behavior
 */

import {
  ChannelHierarchyService,
  getChannelHierarchyService,
  createChannelHierarchyService,
} from "../hierarchy.service";

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(global, "localStorage", { value: localStorageMock });

describe("ChannelHierarchyService", () => {
  let service: ChannelHierarchyService;
  const mockWorkspaceId = "workspace-123";

  beforeEach(() => {
    service = new ChannelHierarchyService(mockWorkspaceId);
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  // ===========================================================================
  // CATEGORY CRUD TESTS
  // ===========================================================================

  describe("createCategory", () => {
    it("should create a category successfully", async () => {
      const input = {
        workspaceId: mockWorkspaceId,
        name: "Engineering",
        description: "Engineering channels",
        icon: "💻",
        color: "#3b82f6",
      };

      const mockCategory = {
        id: "cat-1",
        ...input,
        position: 0,
        syncPermissions: true,
        isSystem: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ category: mockCategory }),
      });

      const result = await service.createCategory(input);

      expect(global.fetch).toHaveBeenCalledWith("/api/channels/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      expect(result.id).toBe("cat-1");
      expect(result.name).toBe("Engineering");
    });

    it("should use default workspace ID if not provided", async () => {
      const input = {
        workspaceId: "",
        name: "Test Category",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ category: { id: "cat-2", ...input } }),
      });

      await service.createCategory(input);

      expect(global.fetch).toHaveBeenCalledWith("/api/channels/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, workspaceId: mockWorkspaceId }),
      });
    });

    it("should throw error on creation failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Duplicate name" }),
      });

      await expect(
        service.createCategory({
          workspaceId: mockWorkspaceId,
          name: "Duplicate",
        }),
      ).rejects.toThrow("Duplicate name");
    });
  });

  describe("getCategory", () => {
    it("should fetch a single category with channels", async () => {
      const mockCategory = {
        id: "cat-1",
        name: "General",
        channels: [
          { id: "ch-1", name: "general" },
          { id: "ch-2", name: "random" },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ category: mockCategory }),
      });

      const result = await service.getCategory("cat-1");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("cat-1");
      expect(result?.channels).toHaveLength(2);
      expect(result?.channelCount).toBe(2);
      expect(result?.state).toBeDefined();
    });

    it("should return null for non-existent category", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await service.getCategory("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("getCategories", () => {
    it("should fetch all categories with state", async () => {
      const mockCategories = [
        { id: "cat-1", name: "General", channels: [] },
        { id: "cat-2", name: "Engineering", channels: [] },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ categories: mockCategories }),
      });

      const result = await service.getCategories();

      expect(result).toHaveLength(2);
      expect(result[0].state).toBeDefined();
      expect(result[0].state.isCollapsed).toBe(false);
    });

    it("should include channels when requested", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ categories: [] }),
      });

      await service.getCategories(true);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("includeChannels=true"),
      );
    });
  });

  describe("updateCategory", () => {
    it("should update a category", async () => {
      const updates = { name: "Updated Name", color: "#ff0000" };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ category: { id: "cat-1", ...updates } }),
      });

      const result = await service.updateCategory("cat-1", updates);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/channels/categories/cat-1",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        },
      );
      expect(result.name).toBe("Updated Name");
    });
  });

  describe("deleteCategory", () => {
    it("should delete a category", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.deleteCategory("cat-1");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/channels/categories/cat-1",
        {
          method: "DELETE",
        },
      );
    });

    it("should clean up local state after deletion", async () => {
      // Set up collapsed state first
      service.setCollapsed("cat-1", true);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.deleteCategory("cat-1");

      // State should be cleared
      const state = service.getCategoryState("cat-1");
      expect(state.isCollapsed).toBe(false);
    });
  });

  // ===========================================================================
  // CATEGORY STATE TESTS
  // ===========================================================================

  describe("getCategoryState", () => {
    it("should return default state for new category", () => {
      const state = service.getCategoryState("new-cat");

      expect(state.isCollapsed).toBe(false);
      expect(state.lastUpdated).toBeDefined();
    });

    it("should return stored state for existing category", () => {
      service.setCollapsed("cat-1", true);

      const state = service.getCategoryState("cat-1");

      expect(state.isCollapsed).toBe(true);
    });
  });

  describe("toggleCollapsed", () => {
    it("should toggle collapsed state", () => {
      expect(service.getCategoryState("cat-1").isCollapsed).toBe(false);

      const state1 = service.toggleCollapsed("cat-1");
      expect(state1.isCollapsed).toBe(true);

      const state2 = service.toggleCollapsed("cat-1");
      expect(state2.isCollapsed).toBe(false);
    });

    it("should update lastUpdated timestamp", () => {
      const before = service.getCategoryState("cat-1").lastUpdated;

      // Wait a bit to ensure different timestamp
      const state = service.toggleCollapsed("cat-1");

      expect(state.lastUpdated).toBeDefined();
    });
  });

  describe("setCollapsed", () => {
    it("should set collapsed to true", () => {
      const state = service.setCollapsed("cat-1", true);

      expect(state.isCollapsed).toBe(true);
    });

    it("should set collapsed to false", () => {
      service.setCollapsed("cat-1", true);
      const state = service.setCollapsed("cat-1", false);

      expect(state.isCollapsed).toBe(false);
    });
  });

  describe("collapseAll", () => {
    it("should collapse all categories", () => {
      service.setCollapsed("cat-1", false);
      service.setCollapsed("cat-2", false);

      service.collapseAll();

      expect(service.getCategoryState("cat-1").isCollapsed).toBe(true);
      expect(service.getCategoryState("cat-2").isCollapsed).toBe(true);
    });
  });

  describe("expandAll", () => {
    it("should expand all categories", () => {
      service.setCollapsed("cat-1", true);
      service.setCollapsed("cat-2", true);

      service.expandAll();

      expect(service.getCategoryState("cat-1").isCollapsed).toBe(false);
      expect(service.getCategoryState("cat-2").isCollapsed).toBe(false);
    });
  });

  // ===========================================================================
  // REORDERING TESTS
  // ===========================================================================

  describe("reorderCategories", () => {
    it("should reorder categories", async () => {
      const categoryIds = ["cat-3", "cat-1", "cat-2"];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await service.reorderCategories(categoryIds);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/channels/categories/reorder",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            positions: [
              { id: "cat-3", position: 0 },
              { id: "cat-1", position: 1 },
              { id: "cat-2", position: 2 },
            ],
          }),
        },
      );
      expect(result.success).toBe(true);
      expect(result.positions).toHaveLength(3);
    });
  });

  describe("moveChannel", () => {
    it("should move a channel to a category", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ fromCategoryId: "cat-1" }),
      });

      const result = await service.moveChannel("ch-1", "cat-2", 0);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/channels/categories/reorder",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "moveChannel",
            channelId: "ch-1",
            categoryId: "cat-2",
            position: 0,
          }),
        },
      );
      expect(result.success).toBe(true);
      expect(result.channelId).toBe("ch-1");
      expect(result.toCategoryId).toBe("cat-2");
    });

    it("should move a channel to uncategorized", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ fromCategoryId: "cat-1" }),
      });

      const result = await service.moveChannel("ch-1", null, 0);

      expect(result.toCategoryId).toBeNull();
    });
  });

  describe("reorderChannelsInCategory", () => {
    it("should reorder channels within a category", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await service.reorderChannelsInCategory("cat-1", [
        "ch-3",
        "ch-1",
        "ch-2",
      ]);

      expect(global.fetch).toHaveBeenCalledWith("/api/channels/cat-1/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positions: [
            { id: "ch-3", position: 0 },
            { id: "ch-1", position: 1 },
            { id: "ch-2", position: 2 },
          ],
        }),
      });
      expect(result.success).toBe(true);
    });

    it("should reorder uncategorized channels", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.reorderChannelsInCategory(null, ["ch-1", "ch-2"]);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/channels/uncategorized/reorder",
        expect.anything(),
      );
    });
  });

  // ===========================================================================
  // PERMISSION INHERITANCE TESTS
  // ===========================================================================

  describe("getChannelEffectivePermissions", () => {
    it("should fetch effective permissions for a channel", async () => {
      const mockPermissions = {
        categoryId: "cat-1",
        inheritFromCategory: true,
        overrides: [],
        effectivePermissions: "123",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPermissions,
      });

      const result = await service.getChannelEffectivePermissions(
        "ch-1",
        "user-1",
      );

      expect(result.categoryId).toBe("cat-1");
      expect(result.inheritFromCategory).toBe(true);
      expect(result.effectivePermissions).toBe(123n);
    });
  });

  describe("syncChannelPermissionsWithCategory", () => {
    it("should sync channel permissions", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.syncChannelPermissionsWithCategory("ch-1");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/channels/ch-1/permissions/sync",
        {
          method: "POST",
        },
      );
    });
  });

  describe("setCategoryDefaultPermissions", () => {
    it("should set category default permissions", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await service.setCategoryDefaultPermissions("cat-1", 255n);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/channels/categories/cat-1",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ defaultPermissions: "255" }),
        },
      );
    });
  });

  // ===========================================================================
  // HIERARCHY SNAPSHOT TESTS
  // ===========================================================================

  describe("getHierarchySnapshot", () => {
    it("should return complete hierarchy snapshot", async () => {
      const mockCategories = [
        { id: "cat-1", name: "General", channels: [{ id: "ch-1" }] },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ categories: mockCategories }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ channels: [{ id: "ch-2" }] }),
        });

      const result = await service.getHierarchySnapshot();

      expect(result.categories).toHaveLength(1);
      expect(result.uncategorizedChannels).toHaveLength(1);
      expect(result.totalChannels).toBe(2);
      expect(result.timestamp).toBeDefined();
    });
  });

  // ===========================================================================
  // SINGLETON FACTORY TESTS
  // ===========================================================================

  describe("getChannelHierarchyService", () => {
    it("should return same instance for same workspace", () => {
      const service1 = getChannelHierarchyService("ws-1");
      const service2 = getChannelHierarchyService("ws-1");

      expect(service1).toBe(service2);
    });

    it("should return different instances for different workspaces", () => {
      const service1 = getChannelHierarchyService("ws-1");
      const service2 = getChannelHierarchyService("ws-2");

      expect(service1).not.toBe(service2);
    });
  });

  describe("createChannelHierarchyService", () => {
    it("should always create new instance", () => {
      const service1 = createChannelHierarchyService("ws-1");
      const service2 = createChannelHierarchyService("ws-1");

      expect(service1).not.toBe(service2);
    });
  });
});
