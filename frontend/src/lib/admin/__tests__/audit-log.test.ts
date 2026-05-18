/**
 * Audit Log Unit Tests
 *
 * Tests for audit log handling utilities including creating entries,
 * querying, filtering, sorting, and exporting.
 */

import {
  generateAuditId,
  createAuditLogEntry,
  logUserCreate,
  logUserDelete,
  logUserSuspend,
  logUserUnsuspend,
  logRoleChange,
  logPasswordReset,
  logChannelAction,
  logSettingsUpdate,
  logMessageDelete,
  filterByAction,
  filterByTargetType,
  filterByActor,
  filterByTarget,
  filterByDateRange,
  filterBySearch,
  applyFilters,
  sortAuditLog,
  paginateAuditLog,
  queryAuditLog,
  exportToJson,
  exportToCsv,
  exportAuditLog,
  getActionLabel,
  getActionCategory,
  getActionColor,
  formatAuditTimestamp,
  getAuditSummary,
  getMostActiveActors,
  type AuditLogEntry,
  type AuditLogFilters,
  type AuditAction,
} from "../audit-log";

// ============================================================================
// Test Helpers
// ============================================================================

const createTestEntry = (
  overrides?: Partial<AuditLogEntry>,
): AuditLogEntry => ({
  id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  timestamp: new Date().toISOString(),
  actorId: "actor-1",
  actorEmail: "admin@example.com",
  action: "user.create",
  targetType: "user",
  targetId: "target-1",
  details: {},
  ...overrides,
});

// ============================================================================
// Entry Creation Tests
// ============================================================================

describe("Entry Creation", () => {
  describe("generateAuditId", () => {
    it("should generate unique IDs", () => {
      const id1 = generateAuditId();
      const id2 = generateAuditId();

      expect(id1).not.toBe(id2);
    });

    it("should generate IDs with audit prefix", () => {
      const id = generateAuditId();

      expect(id.startsWith("audit-")).toBe(true);
    });
  });

  describe("createAuditLogEntry", () => {
    it("should create entry with required fields", () => {
      const entry = createAuditLogEntry({
        actorId: "actor-1",
        actorEmail: "admin@example.com",
        action: "user.create",
        targetType: "user",
        targetId: "user-1",
      });

      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeDefined();
      expect(entry.actorId).toBe("actor-1");
      expect(entry.actorEmail).toBe("admin@example.com");
      expect(entry.action).toBe("user.create");
      expect(entry.targetType).toBe("user");
      expect(entry.targetId).toBe("user-1");
      expect(entry.details).toEqual({});
    });

    it("should create entry with optional fields", () => {
      const entry = createAuditLogEntry({
        actorId: "actor-1",
        actorEmail: "admin@example.com",
        action: "user.create",
        targetType: "user",
        targetId: "user-1",
        details: { username: "john" },
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0",
      });

      expect(entry.details).toEqual({ username: "john" });
      expect(entry.ipAddress).toBe("192.168.1.1");
      expect(entry.userAgent).toBe("Mozilla/5.0");
    });
  });

  describe("logUserCreate", () => {
    it("should create user create entry", () => {
      const entry = logUserCreate("actor-1", "admin@example.com", "user-1", {
        username: "john",
        email: "john@example.com",
        role: "member",
      });

      expect(entry.action).toBe("user.create");
      expect(entry.targetType).toBe("user");
      expect(entry.targetId).toBe("user-1");
      expect(entry.details.username).toBe("john");
    });
  });

  describe("logUserDelete", () => {
    it("should create user delete entry", () => {
      const entry = logUserDelete("actor-1", "admin@example.com", "user-1", {
        username: "john",
        reason: "Violated TOS",
      });

      expect(entry.action).toBe("user.delete");
      expect(entry.details.reason).toBe("Violated TOS");
    });
  });

  describe("logUserSuspend", () => {
    it("should create user suspend entry", () => {
      const entry = logUserSuspend("actor-1", "admin@example.com", "user-1", {
        username: "john",
        reason: "Spam",
        duration: 7 * 24 * 60 * 60 * 1000,
      });

      expect(entry.action).toBe("user.suspend");
      expect(entry.details.reason).toBe("Spam");
      expect(entry.details.duration).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });

  describe("logUserUnsuspend", () => {
    it("should create user unsuspend entry", () => {
      const entry = logUserUnsuspend("actor-1", "admin@example.com", "user-1", {
        username: "john",
      });

      expect(entry.action).toBe("user.unsuspend");
    });
  });

  describe("logRoleChange", () => {
    it("should create role change entry", () => {
      const entry = logRoleChange("actor-1", "admin@example.com", "user-1", {
        username: "john",
        oldRole: "member",
        newRole: "admin",
      });

      expect(entry.action).toBe("user.role_change");
      expect(entry.details.oldRole).toBe("member");
      expect(entry.details.newRole).toBe("admin");
    });
  });

  describe("logPasswordReset", () => {
    it("should create password reset entry", () => {
      const entry = logPasswordReset("actor-1", "admin@example.com", "user-1", {
        username: "john",
        method: "temporary",
      });

      expect(entry.action).toBe("user.password_reset");
      expect(entry.details.method).toBe("temporary");
    });
  });

  describe("logChannelAction", () => {
    it("should create channel action entry", () => {
      const entry = logChannelAction(
        "actor-1",
        "admin@example.com",
        "channel.create",
        "channel-1",
        { name: "general" },
      );

      expect(entry.action).toBe("channel.create");
      expect(entry.targetType).toBe("channel");
      expect(entry.details.name).toBe("general");
    });
  });

  describe("logSettingsUpdate", () => {
    it("should create settings update entry", () => {
      const entry = logSettingsUpdate("actor-1", "admin@example.com", {
        changes: {
          theme: { old: "light", new: "dark" },
        },
      });

      expect(entry.action).toBe("settings.update");
      expect(entry.targetType).toBe("settings");
      expect(entry.targetId).toBe("global");
    });
  });

  describe("logMessageDelete", () => {
    it("should create message delete entry", () => {
      const entry = logMessageDelete("actor-1", "admin@example.com", "msg-1", {
        channelId: "channel-1",
        authorId: "user-2",
        reason: "Inappropriate content",
      });

      expect(entry.action).toBe("message.delete");
      expect(entry.targetType).toBe("message");
      expect(entry.details.reason).toBe("Inappropriate content");
    });
  });
});

// ============================================================================
// Filter Tests
// ============================================================================

describe("Filter Functions", () => {
  const entries = [
    createTestEntry({
      action: "user.create",
      targetType: "user",
      actorId: "actor-1",
      actorEmail: "admin@example.com",
    }),
    createTestEntry({
      action: "user.delete",
      targetType: "user",
      actorId: "actor-1",
      actorEmail: "admin@example.com",
    }),
    createTestEntry({
      action: "channel.create",
      targetType: "channel",
      actorId: "actor-2",
      actorEmail: "mod@example.com",
    }),
    createTestEntry({
      action: "settings.update",
      targetType: "settings",
      actorId: "actor-1",
      actorEmail: "admin@example.com",
    }),
  ];

  describe("filterByAction", () => {
    it("should filter by single action", () => {
      const result = filterByAction(entries, "user.create");

      expect(result.length).toBe(1);
      expect(result[0].action).toBe("user.create");
    });

    it("should filter by multiple actions", () => {
      const result = filterByAction(entries, ["user.create", "user.delete"]);

      expect(result.length).toBe(2);
    });

    it("should return all entries for empty array", () => {
      const result = filterByAction(entries, []);

      expect(result.length).toBe(4);
    });
  });

  describe("filterByTargetType", () => {
    it("should filter by single target type", () => {
      const result = filterByTargetType(entries, "user");

      expect(result.length).toBe(2);
    });

    it("should filter by multiple target types", () => {
      const result = filterByTargetType(entries, ["user", "channel"]);

      expect(result.length).toBe(3);
    });
  });

  describe("filterByActor", () => {
    it("should filter by actor ID", () => {
      const result = filterByActor(entries, "actor-1");

      expect(result.length).toBe(3);
    });

    it("should filter by actor email", () => {
      const result = filterByActor(entries, undefined, "mod");

      expect(result.length).toBe(1);
    });

    it("should filter by both", () => {
      const result = filterByActor(entries, "actor-1", "admin");

      expect(result.length).toBe(3);
    });
  });

  describe("filterByTarget", () => {
    it("should filter by target ID", () => {
      const entriesWithTarget = [
        createTestEntry({ targetId: "user-1" }),
        createTestEntry({ targetId: "user-2" }),
        createTestEntry({ targetId: "user-1" }),
      ];

      const result = filterByTarget(entriesWithTarget, "user-1");

      expect(result.length).toBe(2);
    });
  });

  describe("filterByDateRange", () => {
    const entriesWithDates = [
      createTestEntry({ timestamp: "2025-01-01T00:00:00Z" }),
      createTestEntry({ timestamp: "2025-01-15T00:00:00Z" }),
      createTestEntry({ timestamp: "2025-02-01T00:00:00Z" }),
    ];

    it("should filter by start date", () => {
      const result = filterByDateRange(
        entriesWithDates,
        new Date("2025-01-10"),
      );

      expect(result.length).toBe(2);
    });

    it("should filter by end date", () => {
      const result = filterByDateRange(
        entriesWithDates,
        undefined,
        new Date("2025-01-20"),
      );

      expect(result.length).toBe(2);
    });

    it("should filter by both dates", () => {
      const result = filterByDateRange(
        entriesWithDates,
        new Date("2025-01-10"),
        new Date("2025-01-20"),
      );

      expect(result.length).toBe(1);
    });
  });

  describe("filterBySearch", () => {
    const entriesWithDetails = [
      createTestEntry({
        action: "user.create",
        actorEmail: "admin@example.com",
        details: { username: "john" },
      }),
      createTestEntry({
        action: "user.delete",
        actorEmail: "mod@example.com",
        details: { username: "jane" },
      }),
    ];

    it("should search in action", () => {
      const result = filterBySearch(entriesWithDetails, "create");

      expect(result.length).toBe(1);
    });

    it("should search in actor email", () => {
      const result = filterBySearch(entriesWithDetails, "mod");

      expect(result.length).toBe(1);
    });

    it("should search in details", () => {
      const result = filterBySearch(entriesWithDetails, "john");

      expect(result.length).toBe(1);
    });

    it("should return all entries for empty search", () => {
      const result = filterBySearch(entriesWithDetails, "");

      expect(result.length).toBe(2);
    });
  });

  describe("applyFilters", () => {
    it("should apply multiple filters", () => {
      const filters: AuditLogFilters = {
        action: ["user.create", "user.delete"],
        targetType: "user",
      };
      const result = applyFilters(entries, filters);

      expect(result.length).toBe(2);
    });
  });
});

// ============================================================================
// Sort Tests
// ============================================================================

describe("Sort Functions", () => {
  describe("sortAuditLog", () => {
    const entries = [
      createTestEntry({
        timestamp: "2025-01-15T00:00:00Z",
        action: "user.delete",
        actorEmail: "bob@example.com",
      }),
      createTestEntry({
        timestamp: "2025-01-01T00:00:00Z",
        action: "user.create",
        actorEmail: "alice@example.com",
      }),
      createTestEntry({
        timestamp: "2025-01-10T00:00:00Z",
        action: "channel.create",
        actorEmail: "charlie@example.com",
      }),
    ];

    it("should sort by timestamp ascending", () => {
      const result = sortAuditLog(entries, {
        field: "timestamp",
        direction: "asc",
      });

      expect(result[0].timestamp).toBe("2025-01-01T00:00:00Z");
      expect(result[2].timestamp).toBe("2025-01-15T00:00:00Z");
    });

    it("should sort by timestamp descending", () => {
      const result = sortAuditLog(entries, {
        field: "timestamp",
        direction: "desc",
      });

      expect(result[0].timestamp).toBe("2025-01-15T00:00:00Z");
      expect(result[2].timestamp).toBe("2025-01-01T00:00:00Z");
    });

    it("should sort by action", () => {
      const result = sortAuditLog(entries, {
        field: "action",
        direction: "asc",
      });

      expect(result[0].action).toBe("channel.create");
      expect(result[2].action).toBe("user.delete");
    });

    it("should sort by actor email", () => {
      const result = sortAuditLog(entries, {
        field: "actorEmail",
        direction: "asc",
      });

      expect(result[0].actorEmail).toBe("alice@example.com");
      expect(result[2].actorEmail).toBe("charlie@example.com");
    });
  });
});

// ============================================================================
// Pagination Tests
// ============================================================================

describe("Pagination Functions", () => {
  const entries = Array.from({ length: 25 }, (_, i) =>
    createTestEntry({ id: `audit-${i}` }),
  );

  describe("paginateAuditLog", () => {
    it("should return correct page size", () => {
      const result = paginateAuditLog(entries, { page: 1, pageSize: 10 });

      expect(result.entries.length).toBe(10);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it("should calculate total pages correctly", () => {
      const result = paginateAuditLog(entries, { page: 1, pageSize: 10 });

      expect(result.totalPages).toBe(3);
      expect(result.total).toBe(25);
    });

    it("should handle hasNext and hasPrev", () => {
      const page1 = paginateAuditLog(entries, { page: 1, pageSize: 10 });
      expect(page1.hasNext).toBe(true);
      expect(page1.hasPrev).toBe(false);

      const page2 = paginateAuditLog(entries, { page: 2, pageSize: 10 });
      expect(page2.hasNext).toBe(true);
      expect(page2.hasPrev).toBe(true);

      const page3 = paginateAuditLog(entries, { page: 3, pageSize: 10 });
      expect(page3.hasNext).toBe(false);
      expect(page3.hasPrev).toBe(true);
    });
  });

  describe("queryAuditLog", () => {
    it("should combine filters, sort, and pagination", () => {
      const entriesWithActions = [
        createTestEntry({
          action: "user.create",
          timestamp: "2025-01-01T00:00:00Z",
        }),
        createTestEntry({
          action: "user.delete",
          timestamp: "2025-01-02T00:00:00Z",
        }),
        createTestEntry({
          action: "user.create",
          timestamp: "2025-01-03T00:00:00Z",
        }),
      ];

      const result = queryAuditLog(
        entriesWithActions,
        { action: "user.create" },
        { field: "timestamp", direction: "asc" },
        { page: 1, pageSize: 10 },
      );

      expect(result.entries.length).toBe(2);
      expect(result.entries[0].timestamp).toBe("2025-01-01T00:00:00Z");
    });

    it("should use default sort when not provided", () => {
      const result = queryAuditLog(entries);

      expect(result.pageSize).toBe(50); // Default
    });
  });
});

// ============================================================================
// Export Tests
// ============================================================================

describe("Export Functions", () => {
  const entries = [
    createTestEntry({
      id: "audit-1",
      timestamp: "2025-01-15T12:00:00Z",
      actorId: "actor-1",
      actorEmail: "admin@example.com",
      action: "user.create",
      targetType: "user",
      targetId: "user-1",
      details: { username: "john" },
    }),
    createTestEntry({
      id: "audit-2",
      timestamp: "2025-01-15T13:00:00Z",
      actorId: "actor-1",
      actorEmail: "admin@example.com",
      action: "user.delete",
      targetType: "user",
      targetId: "user-2",
      details: { username: "jane" },
    }),
  ];

  describe("exportToJson", () => {
    it("should export entries to JSON", () => {
      const json = exportToJson(entries);
      const parsed = JSON.parse(json);

      expect(parsed.length).toBe(2);
      expect(parsed[0].id).toBe("audit-1");
    });

    it("should exclude details when includeDetails is false", () => {
      const json = exportToJson(entries, false);
      const parsed = JSON.parse(json);

      expect(parsed[0].details).toBeUndefined();
    });
  });

  describe("exportToCsv", () => {
    it("should export entries to CSV", () => {
      const csv = exportToCsv(entries);
      const lines = csv.split("\n");

      expect(lines.length).toBe(3); // Header + 2 entries
      expect(lines[0]).toContain("id");
      expect(lines[0]).toContain("timestamp");
      expect(lines[1]).toContain("audit-1");
    });

    it("should include details column", () => {
      const csv = exportToCsv(entries, true);

      expect(csv).toContain("details");
      expect(csv).toContain("username");
    });

    it("should exclude details when includeDetails is false", () => {
      const csv = exportToCsv(entries, false);
      const headerLine = csv.split("\n")[0];

      expect(headerLine).not.toContain("details");
    });
  });

  describe("exportAuditLog", () => {
    it("should export as JSON with options", () => {
      const result = exportAuditLog(entries, { format: "json" });

      expect(result.mimeType).toBe("application/json");
      expect(result.filename).toContain(".json");
      expect(result.entryCount).toBe(2);
    });

    it("should export as CSV with options", () => {
      const result = exportAuditLog(entries, { format: "csv" });

      expect(result.mimeType).toBe("text/csv");
      expect(result.filename).toContain(".csv");
      expect(result.entryCount).toBe(2);
    });

    it("should apply filters before export", () => {
      const result = exportAuditLog(entries, {
        format: "json",
        filters: { action: "user.create" },
      });

      expect(result.entryCount).toBe(1);
    });
  });
});

// ============================================================================
// Utility Tests
// ============================================================================

describe("Utility Functions", () => {
  describe("getActionLabel", () => {
    it("should return human-readable labels", () => {
      expect(getActionLabel("user.create")).toBe("Created user");
      expect(getActionLabel("user.delete")).toBe("Deleted user");
      expect(getActionLabel("channel.archive")).toBe("Archived channel");
      expect(getActionLabel("settings.update")).toBe("Updated settings");
    });
  });

  describe("getActionCategory", () => {
    it("should categorize user actions", () => {
      expect(getActionCategory("user.create")).toBe("User");
      expect(getActionCategory("user.delete")).toBe("User");
    });

    it("should categorize channel actions", () => {
      expect(getActionCategory("channel.create")).toBe("Channel");
      expect(getActionCategory("channel.delete")).toBe("Channel");
    });

    it("should categorize settings actions", () => {
      expect(getActionCategory("settings.update")).toBe("Settings");
    });

    it("should categorize data actions", () => {
      expect(getActionCategory("export.create")).toBe("Data");
      expect(getActionCategory("import.complete")).toBe("Data");
    });
  });

  describe("getActionColor", () => {
    it("should return red for destructive actions", () => {
      expect(getActionColor("user.delete")).toBe("#EF4444");
      expect(getActionColor("user.suspend")).toBe("#EF4444");
    });

    it("should return green for constructive actions", () => {
      expect(getActionColor("user.create")).toBe("#22C55E");
      expect(getActionColor("user.unsuspend")).toBe("#22C55E");
    });

    it("should return amber for modification actions", () => {
      expect(getActionColor("settings.update")).toBe("#F59E0B");
      expect(getActionColor("user.role_change")).toBe("#F59E0B");
    });
  });

  describe("formatAuditTimestamp", () => {
    it("should format timestamp for display", () => {
      const formatted = formatAuditTimestamp("2025-01-15T12:30:45Z");

      expect(formatted).toContain("2025");
      expect(formatted).toContain("Jan");
      expect(formatted).toContain("15");
    });
  });

  describe("getAuditSummary", () => {
    it("should summarize entries by action", () => {
      const entries = [
        createTestEntry({ action: "user.create" }),
        createTestEntry({ action: "user.create" }),
        createTestEntry({ action: "user.delete" }),
        createTestEntry({ action: "channel.create" }),
      ];

      const summary = getAuditSummary(entries);

      expect(summary["user.create"]).toBe(2);
      expect(summary["user.delete"]).toBe(1);
      expect(summary["channel.create"]).toBe(1);
    });
  });

  describe("getMostActiveActors", () => {
    it("should return most active actors", () => {
      const entries = [
        createTestEntry({
          actorId: "actor-1",
          actorEmail: "alice@example.com",
        }),
        createTestEntry({
          actorId: "actor-1",
          actorEmail: "alice@example.com",
        }),
        createTestEntry({
          actorId: "actor-1",
          actorEmail: "alice@example.com",
        }),
        createTestEntry({ actorId: "actor-2", actorEmail: "bob@example.com" }),
        createTestEntry({ actorId: "actor-2", actorEmail: "bob@example.com" }),
        createTestEntry({
          actorId: "actor-3",
          actorEmail: "charlie@example.com",
        }),
      ];

      const result = getMostActiveActors(entries, 2);

      expect(result.length).toBe(2);
      expect(result[0].actorId).toBe("actor-1");
      expect(result[0].actionCount).toBe(3);
      expect(result[1].actorId).toBe("actor-2");
      expect(result[1].actionCount).toBe(2);
    });

    it("should limit results", () => {
      const entries = Array.from({ length: 20 }, (_, i) =>
        createTestEntry({
          actorId: `actor-${i}`,
          actorEmail: `user${i}@example.com`,
        }),
      );

      const result = getMostActiveActors(entries, 5);

      expect(result.length).toBe(5);
    });
  });
});
