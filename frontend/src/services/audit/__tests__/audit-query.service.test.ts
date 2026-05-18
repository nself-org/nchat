/**
 * Audit Query Service Tests
 *
 * Comprehensive test suite for the audit query service.
 */

import {
  AuditQueryService,
  createAuditQueryService,
  getAuditQueryService,
  type AdvancedQueryOptions,
} from "../audit-query.service";
import type {
  AuditLogEntry,
  AuditCategory,
  AuditSeverity,
} from "@/lib/audit/audit-types";

// Helper to create mock entries
function createMockEntry(
  overrides: Partial<AuditLogEntry> = {},
): AuditLogEntry {
  return {
    id: `entry-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    category: "user",
    action: "login",
    severity: "info",
    actor: {
      id: "user-123",
      type: "user",
      username: "testuser",
      displayName: "Test User",
    },
    description: "Test event",
    success: true,
    ...overrides,
  };
}

describe("AuditQueryService", () => {
  let service: AuditQueryService;

  beforeEach(() => {
    service = createAuditQueryService();
  });

  // ===========================================================================
  // Data Management Tests
  // ===========================================================================
  describe("Data Management", () => {
    it("sets entries", () => {
      const entries = [createMockEntry(), createMockEntry()];
      service.setEntries(entries);

      expect(service.getTotalCount()).toBe(2);
    });

    it("adds entries", () => {
      service.setEntries([createMockEntry()]);
      service.addEntries([createMockEntry(), createMockEntry()]);

      expect(service.getTotalCount()).toBe(3);
    });

    it("clears all entries", () => {
      service.setEntries([createMockEntry(), createMockEntry()]);
      service.clear();

      expect(service.getTotalCount()).toBe(0);
    });

    it("gets entry by ID", () => {
      const entry = createMockEntry({ id: "specific-id" });
      service.setEntries([entry]);

      const found = service.getById("specific-id");
      expect(found).toBeDefined();
      expect(found?.id).toBe("specific-id");
    });

    it("returns undefined for non-existent ID", () => {
      service.setEntries([createMockEntry()]);
      const found = service.getById("non-existent");

      expect(found).toBeUndefined();
    });
  });

  // ===========================================================================
  // Query Tests
  // ===========================================================================
  describe("Query", () => {
    beforeEach(() => {
      const entries = [
        createMockEntry({
          id: "1",
          category: "user",
          severity: "info",
          action: "login",
        }),
        createMockEntry({
          id: "2",
          category: "user",
          severity: "warning",
          action: "password_change",
        }),
        createMockEntry({
          id: "3",
          category: "security",
          severity: "critical",
          action: "suspicious_activity",
        }),
        createMockEntry({
          id: "4",
          category: "admin",
          severity: "warning",
          action: "role_change",
          success: false,
        }),
        createMockEntry({
          id: "5",
          category: "message",
          severity: "info",
          action: "create",
        }),
      ];
      service.setEntries(entries);
    });

    it("queries all entries without filters", async () => {
      const result = await service.query();

      expect(result.entries.length).toBe(5);
      expect(result.pagination.totalCount).toBe(5);
    });

    it("filters by category", async () => {
      const result = await service.query({
        filters: { category: ["user"] },
      });

      expect(result.entries.length).toBe(2);
      expect(result.entries.every((e) => e.category === "user")).toBe(true);
    });

    it("filters by multiple categories", async () => {
      const result = await service.query({
        filters: { category: ["user", "security"] },
      });

      expect(result.entries.length).toBe(3);
    });

    it("filters by severity", async () => {
      const result = await service.query({
        filters: { severity: ["warning"] },
      });

      expect(result.entries.length).toBe(2);
      expect(result.entries.every((e) => e.severity === "warning")).toBe(true);
    });

    it("filters by success", async () => {
      const result = await service.query({
        filters: { success: false },
      });

      expect(result.entries.length).toBe(1);
      expect(result.entries[0].id).toBe("4");
    });

    it("filters by actor ID", async () => {
      const entries = [
        createMockEntry({ actor: { id: "user-1", type: "user" } }),
        createMockEntry({ actor: { id: "user-2", type: "user" } }),
        createMockEntry({ actor: { id: "user-1", type: "user" } }),
      ];
      service.setEntries(entries);

      const result = await service.query({
        filters: { actorId: "user-1" },
      });

      expect(result.entries.length).toBe(2);
    });

    it("filters by date range", async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);
      const tomorrow = new Date(now.getTime() + 86400000);

      const entries = [
        createMockEntry({ timestamp: yesterday }),
        createMockEntry({ timestamp: now }),
        createMockEntry({ timestamp: tomorrow }),
      ];
      service.setEntries(entries);

      const result = await service.query({
        dateRange: {
          start: new Date(now.getTime() - 1000),
          end: new Date(now.getTime() + 1000),
        },
      });

      expect(result.entries.length).toBe(1);
    });

    it("supports search query", async () => {
      const entries = [
        createMockEntry({ description: "User logged in from Chrome" }),
        createMockEntry({ description: "User logged out" }),
        createMockEntry({ description: "Password changed" }),
      ];
      service.setEntries(entries);

      const result = await service.query({
        searchQuery: "chrome",
      });

      expect(result.entries.length).toBe(1);
    });

    it("paginates results", async () => {
      const entries = Array.from({ length: 20 }, (_, i) =>
        createMockEntry({ id: `entry-${i}` }),
      );
      service.setEntries(entries);

      const page1 = await service.query({
        pagination: { page: 1, pageSize: 5 },
      });
      const page2 = await service.query({
        pagination: { page: 2, pageSize: 5 },
      });

      expect(page1.entries.length).toBe(5);
      expect(page2.entries.length).toBe(5);
      expect(page1.pagination.totalPages).toBe(4);
    });

    it("sorts by timestamp descending by default", async () => {
      const entries = [
        createMockEntry({ id: "1", timestamp: new Date("2024-01-01") }),
        createMockEntry({ id: "2", timestamp: new Date("2024-01-03") }),
        createMockEntry({ id: "3", timestamp: new Date("2024-01-02") }),
      ];
      service.setEntries(entries);

      const result = await service.query();

      expect(result.entries[0].id).toBe("2");
      expect(result.entries[1].id).toBe("3");
      expect(result.entries[2].id).toBe("1");
    });

    it("sorts by severity", async () => {
      const result = await service.query({
        sort: { field: "severity", direction: "desc" },
      });

      // Critical should be first when sorting desc
      expect(result.entries[0].severity).toBe("critical");
    });

    it("includes aggregations when requested", async () => {
      const result = await service.query({
        includeAggregations: true,
      });

      expect(result.aggregations).toBeDefined();
      expect(result.aggregations?.byCategory).toBeDefined();
      expect(result.aggregations?.bySeverity).toBeDefined();
    });

    it("returns cursor for pagination", async () => {
      const entries = Array.from({ length: 10 }, (_, i) =>
        createMockEntry({ id: `entry-${i}` }),
      );
      service.setEntries(entries);

      const result = await service.query({
        pagination: { page: 1, pageSize: 5 },
      });

      expect(result.cursor).toBeDefined();
    });

    it("queries by cursor", async () => {
      const entries = Array.from({ length: 10 }, (_, i) =>
        createMockEntry({ id: `entry-${i}` }),
      );
      service.setEntries(entries);

      const page1 = await service.query({
        pagination: { page: 1, pageSize: 5 },
      });
      const page2 = await service.queryByCursor(page1.cursor!, 5);

      expect(page2.entries.length).toBe(5);
      expect(page2.pagination.page).toBe(2);
    });
  });

  // ===========================================================================
  // Convenience Query Methods
  // ===========================================================================
  describe("Convenience Query Methods", () => {
    beforeEach(() => {
      service.setEntries([
        createMockEntry({
          category: "user",
          actor: { id: "user-1", type: "user" },
        }),
        createMockEntry({
          category: "security",
          actor: { id: "user-2", type: "user" },
          severity: "critical",
        }),
        createMockEntry({
          category: "security",
          actor: { id: "user-1", type: "user" },
          severity: "error",
        }),
        createMockEntry({
          category: "message",
          resource: { type: "message", id: "msg-1" },
        }),
        createMockEntry({ category: "admin", success: false }),
      ]);
    });

    it("getByActor returns entries for specific actor", async () => {
      const result = await service.getByActor("user-1");
      expect(result.entries.length).toBe(2);
    });

    it("getByResource returns entries for specific resource", async () => {
      const result = await service.getByResource("msg-1");
      expect(result.entries.length).toBe(1);
    });

    it("getByCategory returns entries for category", async () => {
      const result = await service.getByCategory("security");
      expect(result.entries.length).toBe(2);
    });

    it("getByCategory accepts multiple categories", async () => {
      const result = await service.getByCategory(["user", "admin"]);
      expect(result.entries.length).toBe(2);
    });

    it("getBySeverity returns entries for severity", async () => {
      const result = await service.getBySeverity("critical");
      expect(result.entries.length).toBe(1);
    });

    it("getFailedEntries returns failed entries", async () => {
      const result = await service.getFailedEntries();
      expect(result.entries.length).toBe(1);
    });

    it("getSecurityEvents returns security category entries", async () => {
      const result = await service.getSecurityEvents();
      expect(result.entries.length).toBe(2);
    });

    it("getHighSeverityEvents returns error and critical entries", async () => {
      const result = await service.getHighSeverityEvents();
      expect(result.entries.length).toBe(2);
    });

    it("search performs full-text search", async () => {
      const entries = [
        createMockEntry({ description: "User logged in from Chrome browser" }),
        createMockEntry({ description: "File uploaded successfully" }),
      ];
      service.setEntries(entries);

      const result = await service.search("chrome");
      expect(result.entries.length).toBe(1);
    });
  });

  // ===========================================================================
  // Aggregation Tests
  // ===========================================================================
  describe("Aggregations", () => {
    beforeEach(() => {
      const entries = [
        createMockEntry({
          category: "user",
          severity: "info",
          actor: { id: "user-1", type: "user", displayName: "User One" },
          timestamp: new Date("2024-01-01T10:00:00"),
          success: true,
        }),
        createMockEntry({
          category: "user",
          severity: "warning",
          actor: { id: "user-1", type: "user", displayName: "User One" },
          timestamp: new Date("2024-01-01T14:00:00"),
          success: true,
        }),
        createMockEntry({
          category: "security",
          severity: "critical",
          actor: { id: "user-2", type: "user", displayName: "User Two" },
          timestamp: new Date("2024-01-02T10:00:00"),
          success: false,
          resource: { type: "file", id: "file-1" },
        }),
        createMockEntry({
          category: "admin",
          severity: "warning",
          actor: { id: "admin-1", type: "admin" },
          timestamp: new Date("2024-01-02T12:00:00"),
          success: true,
        }),
      ];
      service.setEntries(entries);
    });

    it("computes category aggregations", async () => {
      const result = await service.query({ includeAggregations: true });

      expect(result.aggregations?.byCategory.user).toBe(2);
      expect(result.aggregations?.byCategory.security).toBe(1);
      expect(result.aggregations?.byCategory.admin).toBe(1);
    });

    it("computes severity aggregations", async () => {
      const result = await service.query({ includeAggregations: true });

      expect(result.aggregations?.bySeverity.info).toBe(1);
      expect(result.aggregations?.bySeverity.warning).toBe(2);
      expect(result.aggregations?.bySeverity.critical).toBe(1);
    });

    it("computes success/failure aggregations", async () => {
      const result = await service.query({ includeAggregations: true });

      expect(result.aggregations?.bySuccess.success).toBe(3);
      expect(result.aggregations?.bySuccess.failure).toBe(1);
    });

    it("computes top actors", async () => {
      const result = await service.query({ includeAggregations: true });

      expect(result.aggregations?.topActors.length).toBeGreaterThan(0);
      const topActor = result.aggregations?.topActors[0];
      expect(topActor?.actorId).toBe("user-1");
      expect(topActor?.count).toBe(2);
    });

    it("computes by-hour aggregations", async () => {
      const result = await service.query({ includeAggregations: true });

      expect(result.aggregations?.byHour.length).toBeGreaterThan(0);
    });

    it("computes by-day aggregations", async () => {
      const result = await service.query({ includeAggregations: true });

      expect(result.aggregations?.byDay.length).toBe(2);
    });

    it("gets time aggregations with different granularities", () => {
      const hourly = service.getTimeAggregations({ granularity: "hour" });
      const daily = service.getTimeAggregations({ granularity: "day" });

      expect(hourly.length).toBeGreaterThan(daily.length);
    });
  });

  // ===========================================================================
  // Statistics Tests
  // ===========================================================================
  describe("Statistics", () => {
    beforeEach(() => {
      service.setEntries([
        createMockEntry({ category: "user", severity: "info", success: true }),
        createMockEntry({
          category: "user",
          severity: "warning",
          success: true,
        }),
        createMockEntry({
          category: "security",
          severity: "error",
          success: false,
        }),
        createMockEntry({
          category: "security",
          severity: "critical",
          success: false,
        }),
        createMockEntry({ category: "admin", severity: "info", success: true }),
      ]);
    });

    it("returns total event count", async () => {
      const stats = await service.getStatistics();
      expect(stats.totalEvents).toBe(5);
    });

    it("returns events by category", async () => {
      const stats = await service.getStatistics();
      expect(stats.eventsByCategory.user).toBe(2);
      expect(stats.eventsByCategory.security).toBe(2);
      expect(stats.eventsByCategory.admin).toBe(1);
    });

    it("returns events by severity", async () => {
      const stats = await service.getStatistics();
      expect(stats.eventsBySeverity.info).toBe(2);
      expect(stats.eventsBySeverity.warning).toBe(1);
      expect(stats.eventsBySeverity.error).toBe(1);
      expect(stats.eventsBySeverity.critical).toBe(1);
    });

    it("returns failed events count", async () => {
      const stats = await service.getStatistics();
      expect(stats.failedEvents).toBe(2);
    });

    it("returns success rate", async () => {
      const stats = await service.getStatistics();
      expect(stats.successRate).toBe(0.6); // 3 success out of 5
    });

    it("returns top actors", async () => {
      const stats = await service.getStatistics();
      expect(stats.topActors.length).toBeGreaterThan(0);
    });

    it("returns top actions", async () => {
      const stats = await service.getStatistics();
      expect(stats.topActions.length).toBeGreaterThan(0);
    });

    it("filters statistics by category", async () => {
      const stats = await service.getStatistics({ category: ["security"] });
      expect(stats.totalEvents).toBe(2);
    });
  });

  // ===========================================================================
  // Export Tests
  // ===========================================================================
  describe("Export", () => {
    beforeEach(() => {
      service.setEntries([
        createMockEntry({ id: "1", category: "user", action: "login" }),
        createMockEntry({
          id: "2",
          category: "security",
          action: "api_key_create",
        }),
      ]);
    });

    it("exports to CSV format", async () => {
      const result = await service.export({ format: "csv" });

      expect(result.filename).toContain(".csv");
      expect(result.mimeType).toBe("text/csv");
      expect(result.recordCount).toBe(2);
      expect(typeof result.data).toBe("string");
    });

    it("exports to JSON format", async () => {
      const result = await service.export({ format: "json" });

      expect(result.filename).toContain(".json");
      expect(result.mimeType).toBe("application/json");

      const parsed = JSON.parse(result.data as string);
      expect(parsed.entries.length).toBe(2);
    });

    it("applies filters to export", async () => {
      const result = await service.export({
        format: "json",
        filters: { category: ["user"] },
      });

      const parsed = JSON.parse(result.data as string);
      expect(parsed.entries.length).toBe(1);
    });

    it("includes metadata in export when requested", async () => {
      service.setEntries([
        createMockEntry({ metadata: { browser: "Chrome" } }),
      ]);

      const result = await service.export({
        format: "json",
        includeMetadata: true,
      });

      const parsed = JSON.parse(result.data as string);
      expect(parsed.entries[0].metadata).toBeDefined();
    });

    it("excludes metadata when not requested", async () => {
      service.setEntries([
        createMockEntry({ metadata: { browser: "Chrome" } }),
      ]);

      const result = await service.export({
        format: "json",
        includeMetadata: false,
      });

      const parsed = JSON.parse(result.data as string);
      expect(parsed.entries[0].metadata).toBeUndefined();
    });

    it("creates async export job", async () => {
      const job = await service.createExportJob({ format: "csv" });

      expect(job.id).toBeDefined();
      // Job may immediately start processing, so accept pending or processing
      expect(["pending", "processing", "completed"]).toContain(job.status);
      expect(job.format).toBe("csv");
    });

    it("retrieves export job status", async () => {
      const job = await service.createExportJob({ format: "csv" });

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      const status = service.getExportJob(job.id);
      expect(status).toBeDefined();
      expect(["pending", "processing", "completed"]).toContain(status?.status);
    });
  });

  // ===========================================================================
  // Retention Policy Tests
  // ===========================================================================
  describe("Retention Policies", () => {
    beforeEach(() => {
      const now = new Date();
      const entries = [
        createMockEntry({
          id: "1",
          timestamp: new Date(now.getTime() - 100 * 86400000),
          category: "user",
        }), // 100 days ago
        createMockEntry({
          id: "2",
          timestamp: new Date(now.getTime() - 50 * 86400000),
          category: "security",
        }), // 50 days ago
        createMockEntry({
          id: "3",
          timestamp: new Date(now.getTime() - 10 * 86400000),
          category: "user",
        }), // 10 days ago
        createMockEntry({ id: "4", timestamp: now, category: "security" }), // Today
      ];
      service.setEntries(entries);
    });

    it("applies retention policy and removes old entries", async () => {
      const policy = {
        id: "test-policy",
        name: "Test Policy",
        enabled: true,
        retentionDays: 30,
        archiveEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await service.applyRetentionPolicy(policy);

      expect(result.entriesDeleted).toBe(2); // Entries older than 30 days
      expect(result.entriesRetained).toBe(2);
      expect(service.getTotalCount()).toBe(2);
    });

    it("filters by category during retention", async () => {
      const policy = {
        id: "test-policy",
        name: "User Events Policy",
        enabled: true,
        retentionDays: 30,
        categories: ["user" as AuditCategory],
        archiveEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await service.applyRetentionPolicy(policy);

      // Only deletes old 'user' entries, security entries are retained regardless of age
      expect(result.entriesDeleted).toBe(1);
    });

    it("filters by severity during retention", async () => {
      const now = new Date();
      service.setEntries([
        createMockEntry({
          id: "1",
          timestamp: new Date(now.getTime() - 100 * 86400000),
          severity: "info",
        }),
        createMockEntry({
          id: "2",
          timestamp: new Date(now.getTime() - 100 * 86400000),
          severity: "critical",
        }),
        createMockEntry({ id: "3", timestamp: now, severity: "info" }),
      ]);

      const policy = {
        id: "test-policy",
        name: "Info Events Policy",
        enabled: true,
        retentionDays: 30,
        severities: ["info" as AuditSeverity],
        archiveEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await service.applyRetentionPolicy(policy);

      expect(result.entriesDeleted).toBe(1); // Only old 'info' entry
      expect(result.entriesRetained).toBe(2);
    });

    it("sets and applies all retention policies", async () => {
      const policies = [
        {
          id: "policy-1",
          name: "Short Retention",
          enabled: true,
          retentionDays: 60,
          archiveEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      service.setRetentionPolicies(policies);
      const results = await service.applyAllRetentionPolicies();

      expect(results.length).toBe(1);
    });
  });

  // ===========================================================================
  // Singleton Factory Tests
  // ===========================================================================
  describe("Singleton Factory", () => {
    it("returns same instance for getAuditQueryService", () => {
      const instance1 = getAuditQueryService();
      const instance2 = getAuditQueryService();

      expect(instance1).toBe(instance2);
    });

    it("creates new instances with createAuditQueryService", () => {
      const instance1 = createAuditQueryService();
      const instance2 = createAuditQueryService();

      expect(instance1).not.toBe(instance2);
    });
  });
});
