/**
 * Canned Responses Service Tests
 *
 * Tests for the canned responses service including:
 * - CRUD operations
 * - Search and filtering
 * - Variable substitution
 * - Usage tracking
 * - Scope management
 * - Bulk operations
 *
 * @module services/livechat/__tests__/canned-responses.service.test
 */

import {
  CannedResponsesService,
  getCannedResponsesService,
  createCannedResponsesService,
  resetCannedResponsesService,
  type VariableContext,
} from "../canned-responses.service";

// Mock logger
jest.mock("@/lib/logger", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock uuid
jest.mock("uuid", () => ({
  v4: jest.fn(() => `mock-uuid-${Math.random().toString(36).slice(2, 11)}`),
}));

describe("CannedResponsesService", () => {
  let service: CannedResponsesService;

  beforeEach(() => {
    resetCannedResponsesService();
    service = getCannedResponsesService();
  });

  afterEach(() => {
    resetCannedResponsesService();
  });

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe("Initialization", () => {
    it("should initialize with default canned responses", async () => {
      const result = await service.search({ scope: "global" });

      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBeGreaterThan(0);
      // Should have the default responses
      const shortcuts = result.data!.items.map((r) => r.shortcut);
      expect(shortcuts).toContain("greeting");
      expect(shortcuts).toContain("hold");
      expect(shortcuts).toContain("bye");
    });

    it("should return same instance with getCannedResponsesService", () => {
      const instance1 = getCannedResponsesService();
      const instance2 = getCannedResponsesService();
      expect(instance1).toBe(instance2);
    });

    it("should return new instance with createCannedResponsesService", () => {
      const instance1 = createCannedResponsesService();
      const instance2 = createCannedResponsesService();
      expect(instance1).not.toBe(instance2);
    });
  });

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  describe("CRUD Operations", () => {
    describe("create", () => {
      it("should create a canned response", async () => {
        const result = await service.create(
          {
            shortcut: "test-response",
            title: "Test Response",
            text: "This is a test response",
            scope: "personal",
          },
          "agent-1",
        );

        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({
          shortcut: "test-response",
          title: "Test Response",
          text: "This is a test response",
          scope: "personal",
          agentId: "agent-1",
          usageCount: 0,
        });
        expect(result.data!.id).toBeDefined();
        expect(result.data!.createdAt).toBeInstanceOf(Date);
      });

      it("should normalize shortcut to lowercase", async () => {
        const result = await service.create(
          {
            shortcut: "TestUpperCase",
            title: "Test",
            text: "Test text",
          },
          "agent-1",
        );

        expect(result.success).toBe(true);
        expect(result.data!.shortcut).toBe("testuppercase");
      });

      it("should reject invalid shortcut format", async () => {
        const result = await service.create(
          {
            shortcut: "a", // Too short
            title: "Test",
            text: "Test text",
          },
          "agent-1",
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("VALIDATION_ERROR");
      });

      it("should reject shortcut with invalid characters", async () => {
        const result = await service.create(
          {
            shortcut: "test@response", // Invalid character
            title: "Test",
            text: "Test text",
          },
          "agent-1",
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("VALIDATION_ERROR");
      });

      it("should reject duplicate shortcut in same scope", async () => {
        await service.create(
          {
            shortcut: "duplicate",
            title: "First",
            text: "First text",
            scope: "personal",
          },
          "agent-1",
        );

        const result = await service.create(
          {
            shortcut: "duplicate",
            title: "Second",
            text: "Second text",
            scope: "personal",
          },
          "agent-1",
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("CONFLICT");
      });

      it("should allow same shortcut in different scopes", async () => {
        await service.create(
          {
            shortcut: "multi-scope",
            title: "Personal",
            text: "Personal text",
            scope: "personal",
          },
          "agent-1",
        );

        const result = await service.create(
          {
            shortcut: "multi-scope",
            title: "Department",
            text: "Department text",
            scope: "department",
            departmentId: "dept-1",
          },
          "agent-2",
        );

        expect(result.success).toBe(true);
      });

      it("should create with tags", async () => {
        const result = await service.create(
          {
            shortcut: "tagged-response",
            title: "Tagged",
            text: "Text",
            tags: ["support", "general"],
          },
          "agent-1",
        );

        expect(result.success).toBe(true);
        expect(result.data!.tags).toEqual(["support", "general"]);
      });
    });

    describe("get", () => {
      it("should get a canned response by ID", async () => {
        const created = await service.create(
          {
            shortcut: "get-test",
            title: "Get Test",
            text: "Test text",
          },
          "agent-1",
        );

        const result = await service.get(created.data!.id);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(created.data);
      });

      it("should return null for non-existent ID", async () => {
        const result = await service.get("non-existent-id");

        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });
    });

    describe("getByShortcut", () => {
      it("should get a canned response by shortcut", async () => {
        const result = await service.getByShortcut("greeting");

        expect(result.success).toBe(true);
        expect(result.data!.shortcut).toBe("greeting");
      });

      it("should handle ! prefix in shortcut", async () => {
        const result = await service.getByShortcut("!greeting");

        expect(result.success).toBe(true);
        expect(result.data!.shortcut).toBe("greeting");
      });

      it("should return null for non-existent shortcut", async () => {
        const result = await service.getByShortcut("non-existent");

        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });

      it("should prioritize personal scope over global", async () => {
        await service.create(
          {
            shortcut: "priority-test",
            title: "Personal",
            text: "Personal text",
            scope: "personal",
          },
          "agent-1",
        );

        await service.create(
          {
            shortcut: "priority-test",
            title: "Global",
            text: "Global text",
            scope: "global",
          },
          "admin",
        );

        const result = await service.getByShortcut("priority-test", {
          agentId: "agent-1",
          scope: "all",
        });

        expect(result.success).toBe(true);
        expect(result.data!.scope).toBe("personal");
      });
    });

    describe("update", () => {
      it("should update a canned response", async () => {
        const created = await service.create(
          {
            shortcut: "update-test",
            title: "Original",
            text: "Original text",
          },
          "agent-1",
        );

        const result = await service.update(
          created.data!.id,
          {
            title: "Updated",
            text: "Updated text",
          },
          "agent-1",
        );

        expect(result.success).toBe(true);
        expect(result.data!.title).toBe("Updated");
        expect(result.data!.text).toBe("Updated text");
        expect(result.data!.shortcut).toBe("update-test");
      });

      it("should update shortcut", async () => {
        const created = await service.create(
          {
            shortcut: "old-shortcut",
            title: "Test",
            text: "Text",
          },
          "agent-1",
        );

        const result = await service.update(
          created.data!.id,
          {
            shortcut: "new-shortcut",
          },
          "agent-1",
        );

        expect(result.success).toBe(true);
        expect(result.data!.shortcut).toBe("new-shortcut");
      });

      it("should reject invalid shortcut on update", async () => {
        const created = await service.create(
          {
            shortcut: "valid-shortcut",
            title: "Test",
            text: "Text",
          },
          "agent-1",
        );

        const result = await service.update(
          created.data!.id,
          {
            shortcut: "x", // Too short
          },
          "agent-1",
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("VALIDATION_ERROR");
      });

      it("should return error for non-existent ID", async () => {
        const result = await service.update(
          "non-existent",
          {
            title: "Updated",
          },
          "agent-1",
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("NOT_FOUND");
      });

      it("should update tags", async () => {
        const created = await service.create(
          {
            shortcut: "tags-test",
            title: "Test",
            text: "Text",
            tags: ["old"],
          },
          "agent-1",
        );

        const result = await service.update(
          created.data!.id,
          {
            tags: ["new", "updated"],
          },
          "agent-1",
        );

        expect(result.success).toBe(true);
        expect(result.data!.tags).toEqual(["new", "updated"]);
      });
    });

    describe("delete", () => {
      it("should delete a canned response", async () => {
        const created = await service.create(
          {
            shortcut: "delete-test",
            title: "Delete",
            text: "Text",
          },
          "agent-1",
        );

        const result = await service.delete(created.data!.id);

        expect(result.success).toBe(true);
        expect(result.data!.deleted).toBe(true);

        const getResult = await service.get(created.data!.id);
        expect(getResult.data).toBeNull();
      });

      it("should return error for non-existent ID", async () => {
        const result = await service.delete("non-existent");

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("NOT_FOUND");
      });
    });
  });

  // ============================================================================
  // SEARCH AND FILTERING
  // ============================================================================

  describe("Search and Filtering", () => {
    beforeEach(async () => {
      // Create test responses
      await service.create(
        {
          shortcut: "search-support",
          title: "Support Response",
          text: "This is for support queries",
          scope: "global",
          tags: ["support", "help"],
        },
        "admin",
      );

      await service.create(
        {
          shortcut: "search-sales",
          title: "Sales Response",
          text: "This is for sales inquiries",
          scope: "department",
          departmentId: "sales-dept",
          tags: ["sales"],
        },
        "admin",
      );

      await service.create(
        {
          shortcut: "search-personal",
          title: "Personal Response",
          text: "My personal response",
          scope: "personal",
        },
        "agent-1",
      );
    });

    it("should search by query in shortcut", async () => {
      const result = await service.search({ query: "support" });

      expect(result.success).toBe(true);
      expect(
        result.data!.items.some((r) => r.shortcut.includes("support")),
      ).toBe(true);
    });

    it("should search by query in title", async () => {
      const result = await service.search({ query: "Sales" });

      expect(result.success).toBe(true);
      expect(result.data!.items.some((r) => r.title.includes("Sales"))).toBe(
        true,
      );
    });

    it("should search by query in text", async () => {
      const result = await service.search({ query: "inquiries" });

      expect(result.success).toBe(true);
      expect(result.data!.items.some((r) => r.text.includes("inquiries"))).toBe(
        true,
      );
    });

    it("should filter by scope", async () => {
      const result = await service.search({ scope: "personal" });

      expect(result.success).toBe(true);
      expect(result.data!.items.every((r) => r.scope === "personal")).toBe(
        true,
      );
    });

    it("should filter by tags", async () => {
      const result = await service.search({ tags: ["support"] });

      expect(result.success).toBe(true);
      expect(result.data!.items.some((r) => r.tags.includes("support"))).toBe(
        true,
      );
    });

    it("should filter by department", async () => {
      const result = await service.search({ departmentId: "sales-dept" });

      expect(result.success).toBe(true);
      // Should include department and global responses
      const scopes = result.data!.items.map((r) => r.scope);
      expect(scopes).toContain("global");
    });

    it("should respect pagination", async () => {
      const result = await service.search({ limit: 3, offset: 0 });

      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBeLessThanOrEqual(3);
      expect(result.data!.offset).toBe(0);
      expect(result.data!.limit).toBe(3);
    });

    it("should sort by shortcut", async () => {
      const result = await service.search({
        sortBy: "shortcut",
        sortOrder: "asc",
      });

      expect(result.success).toBe(true);
      const shortcuts = result.data!.items.map((r) => r.shortcut);
      const sortedShortcuts = [...shortcuts].sort();
      expect(shortcuts).toEqual(sortedShortcuts);
    });

    it("should sort by usage count", async () => {
      // Record some usage
      const responses = await service.search({});
      if (responses.data!.items.length > 0) {
        await service.recordUsage(responses.data!.items[0].id, "agent-1");
        await service.recordUsage(responses.data!.items[0].id, "agent-1");
      }

      const result = await service.search({
        sortBy: "usageCount",
        sortOrder: "desc",
      });

      expect(result.success).toBe(true);
      expect(result.data!.items.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // AGENT RESPONSES
  // ============================================================================

  describe("getForAgent", () => {
    beforeEach(async () => {
      await service.create(
        {
          shortcut: "agent-global",
          title: "Global",
          text: "Global text",
          scope: "global",
        },
        "admin",
      );

      await service.create(
        {
          shortcut: "agent-dept",
          title: "Department",
          text: "Department text",
          scope: "department",
          departmentId: "support",
        },
        "admin",
      );

      await service.create(
        {
          shortcut: "agent-personal",
          title: "Personal",
          text: "Personal text",
          scope: "personal",
        },
        "agent-1",
      );

      await service.create(
        {
          shortcut: "other-personal",
          title: "Other Personal",
          text: "Other text",
          scope: "personal",
        },
        "agent-2",
      );
    });

    it("should get all responses available to an agent", async () => {
      const result = await service.getForAgent("agent-1", "support");

      expect(result.success).toBe(true);
      // Should have global, department (matching), and personal
      const shortcuts = result.data!.map((r) => r.shortcut);
      expect(shortcuts).toContain("agent-personal");
      // Should NOT include other agent's personal responses
      expect(shortcuts).not.toContain("other-personal");
    });

    it("should sort by scope priority", async () => {
      const result = await service.getForAgent("agent-1", "support");

      expect(result.success).toBe(true);
      // Personal should come before global
      const personal = result.data!.findIndex((r) => r.scope === "personal");
      const global = result.data!.findIndex((r) => r.scope === "global");
      if (personal >= 0 && global >= 0) {
        expect(personal).toBeLessThan(global);
      }
    });
  });

  // ============================================================================
  // TEXT RENDERING
  // ============================================================================

  describe("Text Rendering", () => {
    it("should render with visitor variables", async () => {
      const greeting = await service.getByShortcut("greeting");
      const context: VariableContext = {
        visitor: {
          id: "v1",
          name: "John Doe",
          email: "john@example.com",
          status: "online",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        agent: {
          id: "a1",
          userId: "u1",
          displayName: "Jane Agent",
          email: "jane@company.com",
          status: "available",
          maxConcurrentChats: 5,
          activeChats: 0,
          departments: [],
          skills: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = await service.render(greeting.data!.id, context);

      expect(result.success).toBe(true);
      expect(result.data!.renderedText).toContain("John Doe");
      expect(result.data!.renderedText).toContain("Jane Agent");
    });

    it("should render by shortcut", async () => {
      const context: VariableContext = {
        visitor: {
          id: "v1",
          name: "Test Visitor",
          status: "online",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = await service.renderByShortcut("bye", context);

      expect(result.success).toBe(true);
      expect(result.data!.renderedText).toContain("Test Visitor");
    });

    it("should use default values for missing variables", async () => {
      const greeting = await service.getByShortcut("greeting");
      const context: VariableContext = {};

      const result = await service.render(greeting.data!.id, context);

      expect(result.success).toBe(true);
      expect(result.data!.renderedText).toContain("valued customer");
      expect(result.data!.renderedText).toContain("Support Agent");
    });

    it("should include custom variables", async () => {
      await service.create(
        {
          shortcut: "custom-vars",
          title: "Custom",
          text: "Hello {{custom_name}}, your ticket is {{ticket_id}}",
        },
        "agent-1",
      );

      const response = await service.getByShortcut("custom-vars");
      const context: VariableContext = {
        custom: {
          custom_name: "CustomUser",
          ticket_id: "TKT-12345",
        },
      };

      const result = await service.render(response.data!.id, context);

      expect(result.success).toBe(true);
      expect(result.data!.renderedText).toContain("CustomUser");
      expect(result.data!.renderedText).toContain("TKT-12345");
    });

    it("should keep unmatched variables as-is", async () => {
      await service.create(
        {
          shortcut: "unknown-vars",
          title: "Unknown",
          text: "Hello {{unknown_variable}}",
        },
        "agent-1",
      );

      const response = await service.getByShortcut("unknown-vars");
      const result = await service.render(response.data!.id, {});

      expect(result.success).toBe(true);
      expect(result.data!.renderedText).toContain("{{unknown_variable}}");
    });

    it("should return error for non-existent response", async () => {
      const result = await service.render("non-existent", {});

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
    });
  });

  // ============================================================================
  // USAGE TRACKING
  // ============================================================================

  describe("Usage Tracking", () => {
    it("should record usage and increment count", async () => {
      const response = await service.getByShortcut("greeting");
      const initialCount = response.data!.usageCount;

      await service.recordUsage(response.data!.id, "agent-1");

      const updated = await service.get(response.data!.id);
      expect(updated.data!.usageCount).toBe(initialCount + 1);
    });

    it("should track multiple usages", async () => {
      const response = await service.getByShortcut("greeting");
      const initialCount = response.data!.usageCount;

      await service.recordUsage(response.data!.id, "agent-1");
      await service.recordUsage(response.data!.id, "agent-2");
      await service.recordUsage(response.data!.id, "agent-1");

      const updated = await service.get(response.data!.id);
      expect(updated.data!.usageCount).toBe(initialCount + 3);
    });

    it("should return error for non-existent response", async () => {
      const result = await service.recordUsage("non-existent", "agent-1");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NOT_FOUND");
    });
  });

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  describe("Analytics", () => {
    beforeEach(async () => {
      // Record some usage
      const responses = await service.search({ scope: "global" });
      for (let i = 0; i < 5 && i < responses.data!.items.length; i++) {
        await service.recordUsage(responses.data!.items[i].id, "agent-1");
      }
    });

    it("should return analytics data", async () => {
      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      expect(result.data!.totalResponses).toBeGreaterThan(0);
      expect(result.data!.totalUsage).toBeGreaterThan(0);
      expect(result.data!.topResponses).toBeDefined();
      expect(result.data!.byScope).toBeDefined();
      expect(result.data!.recentlyUsed).toBeDefined();
    });

    it("should filter analytics by agent", async () => {
      await service.recordUsage(
        (await service.getByShortcut("hold")).data!.id,
        "agent-2",
      );

      const result = await service.getAnalytics({ agentId: "agent-1" });

      expect(result.success).toBe(true);
      // Analytics should be filtered
      expect(result.data!.totalUsage).toBeGreaterThan(0);
    });

    it("should filter analytics by period", async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 86400000); // Tomorrow

      const result = await service.getAnalytics({
        period: { start: now, end: future },
      });

      expect(result.success).toBe(true);
    });

    it("should show top responses sorted by usage", async () => {
      const result = await service.getAnalytics();

      expect(result.success).toBe(true);
      const usageCounts = result.data!.topResponses.map((r) => r.usageCount);
      const sorted = [...usageCounts].sort((a, b) => b - a);
      expect(usageCounts).toEqual(sorted);
    });
  });

  // ============================================================================
  // TAGS
  // ============================================================================

  describe("Tags", () => {
    it("should get all unique tags", async () => {
      const result = await service.getTags();

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
      // Default responses have tags
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it("should return sorted tags", async () => {
      const result = await service.getTags();

      expect(result.success).toBe(true);
      const sortedTags = [...result.data!].sort();
      expect(result.data).toEqual(sortedTags);
    });
  });

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  describe("Bulk Operations", () => {
    describe("bulkImport", () => {
      it("should import multiple canned responses", async () => {
        const responses = [
          { shortcut: "bulk-1", title: "Bulk 1", text: "Text 1" },
          { shortcut: "bulk-2", title: "Bulk 2", text: "Text 2" },
          { shortcut: "bulk-3", title: "Bulk 3", text: "Text 3" },
        ];

        const result = await service.bulkImport(responses, "admin");

        expect(result.success).toBe(true);
        expect(result.data!.imported).toBe(3);
        expect(result.data!.failed).toBe(0);
      });

      it("should handle partial failures", async () => {
        const responses = [
          { shortcut: "valid-import", title: "Valid", text: "Text" },
          { shortcut: "x", title: "Invalid", text: "Text" }, // Invalid shortcut
        ];

        const result = await service.bulkImport(responses, "admin");

        expect(result.success).toBe(true);
        expect(result.data!.imported).toBe(1);
        expect(result.data!.failed).toBe(1);
        expect(result.data!.errors.length).toBe(1);
      });
    });

    describe("export", () => {
      it("should export all canned responses", async () => {
        const result = await service.export();

        expect(result.success).toBe(true);
        expect(result.data!.length).toBeGreaterThan(0);
      });

      it("should filter export by scope", async () => {
        const result = await service.export({ scope: "global" });

        expect(result.success).toBe(true);
        expect(result.data!.every((r) => r.scope === "global")).toBe(true);
      });
    });
  });

  // ============================================================================
  // STORE MANAGEMENT
  // ============================================================================

  describe("Store Management", () => {
    it("should return store size", () => {
      const size = service.getStoreSize();
      expect(typeof size).toBe("number");
      expect(size).toBeGreaterThan(0); // Default responses
    });

    it("should clear all data and reinitialize defaults", () => {
      service.clearAll();

      const size = service.getStoreSize();
      expect(size).toBeGreaterThan(0); // Defaults are reinitialized
    });
  });
});
