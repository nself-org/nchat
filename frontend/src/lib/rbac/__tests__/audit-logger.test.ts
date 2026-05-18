import {
  AuditLogger,
  createAuditLogger,
  createMinimalAuditLogger,
  createComprehensiveAuditLogger,
  formatAuditEntry,
  groupByDate,
  groupByUser,
  groupByEventType,
  type AuditLogEntry,
  type AuditLogQuery,
  type AuditEventType,
} from "../audit-logger";
import { PERMISSIONS } from "@/types/rbac";

describe("Audit Logger", () => {
  describe("AuditLogger", () => {
    let logger: AuditLogger;

    beforeEach(() => {
      logger = createAuditLogger();
    });

    describe("Permission Logging", () => {
      describe("logPermissionCheck", () => {
        it("logs a granted permission check", () => {
          const entry = logger.logPermissionCheck({
            userId: "user1",
            permission: PERMISSIONS.MESSAGE_SEND,
            result: { allowed: true, reason: "Granted by role" },
          });

          expect(entry).not.toBeNull();
          expect(entry?.eventType).toBe("permission_granted");
          expect(entry?.userId).toBe("user1");
          expect(entry?.permission).toBe(PERMISSIONS.MESSAGE_SEND);
          expect(entry?.result?.allowed).toBe(true);
        });

        it("logs a denied permission check", () => {
          const entry = logger.logPermissionCheck({
            userId: "user1",
            permission: PERMISSIONS.ADMIN_BILLING,
            result: { allowed: false, reason: "Not authorized" },
          });

          expect(entry).not.toBeNull();
          expect(entry?.eventType).toBe("permission_denied");
          expect(entry?.result?.allowed).toBe(false);
        });

        it("includes optional metadata", () => {
          const entry = logger.logPermissionCheck({
            userId: "user1",
            permission: PERMISSIONS.MESSAGE_SEND,
            result: { allowed: true },
            actorId: "actor1",
            channelId: "channel1",
            resourceType: "message",
            resourceId: "msg123",
            metadata: { custom: "data" },
          });

          expect(entry?.actorId).toBe("actor1");
          expect(entry?.channelId).toBe("channel1");
          expect(entry?.resourceType).toBe("message");
          expect(entry?.resourceId).toBe("msg123");
          expect(entry?.metadata?.custom).toBe("data");
        });

        it("returns null when logging is disabled", () => {
          logger.setEnabled(false);

          const entry = logger.logPermissionCheck({
            userId: "user1",
            permission: PERMISSIONS.MESSAGE_SEND,
            result: { allowed: true },
          });

          expect(entry).toBeNull();
        });

        it("respects logGranted config", () => {
          logger.configure({ logGranted: false });

          const entry = logger.logPermissionCheck({
            userId: "user1",
            permission: PERMISSIONS.MESSAGE_SEND,
            result: { allowed: true },
          });

          expect(entry).toBeNull();
        });

        it("respects logDenied config", () => {
          logger.configure({ logDenied: false });

          const entry = logger.logPermissionCheck({
            userId: "user1",
            permission: PERMISSIONS.MESSAGE_SEND,
            result: { allowed: false },
          });

          expect(entry).toBeNull();
        });
      });

      describe("logAccessDenied", () => {
        it("logs an access denial", () => {
          const entry = logger.logAccessDenied({
            userId: "user1",
            permission: PERMISSIONS.ADMIN_SETTINGS,
            reason: "Insufficient permissions",
          });

          expect(entry).not.toBeNull();
          expect(entry?.eventType).toBe("access_denied");
          expect(entry?.result?.allowed).toBe(false);
          expect(entry?.result?.reason).toBe("Insufficient permissions");
        });

        it("includes resource in metadata", () => {
          const entry = logger.logAccessDenied({
            userId: "user1",
            reason: "Not allowed",
            resource: "/admin/settings",
          });

          expect(entry?.metadata?.resource).toBe("/admin/settings");
        });
      });
    });

    describe("Role Change Logging", () => {
      describe("logRoleAssigned", () => {
        it("logs a role assignment", () => {
          const entry = logger.logRoleAssigned({
            userId: "user1",
            role: "admin",
            actorId: "owner1",
            reason: "Promoted to admin",
          });

          expect(entry).not.toBeNull();
          expect(entry?.eventType).toBe("role_assigned");
          expect(entry?.userId).toBe("user1");
          expect(entry?.role).toBe("admin");
          expect(entry?.actorId).toBe("owner1");
          expect(entry?.metadata?.reason).toBe("Promoted to admin");
        });

        it("returns null when logRoleChanges is false", () => {
          logger.configure({ logRoleChanges: false });

          const entry = logger.logRoleAssigned({
            userId: "user1",
            role: "admin",
            actorId: "owner1",
          });

          expect(entry).toBeNull();
        });
      });

      describe("logRoleRemoved", () => {
        it("logs a role removal", () => {
          const entry = logger.logRoleRemoved({
            userId: "user1",
            role: "admin",
            actorId: "owner1",
            reason: "Demoted",
          });

          expect(entry).not.toBeNull();
          expect(entry?.eventType).toBe("role_removed");
          expect(entry?.metadata?.reason).toBe("Demoted");
        });
      });

      describe("logRoleCreated", () => {
        it("logs role creation", () => {
          const entry = logger.logRoleCreated({
            role: "moderator",
            roleName: "Channel Moderator",
            actorId: "owner1",
          });

          expect(entry).not.toBeNull();
          expect(entry?.eventType).toBe("role_created");
          expect(entry?.metadata?.roleName).toBe("Channel Moderator");
        });
      });

      describe("logRoleUpdated", () => {
        it("logs role update with changes", () => {
          const entry = logger.logRoleUpdated({
            role: "moderator",
            roleName: "Moderator",
            actorId: "owner1",
            changes: {
              permissions: {
                from: ["read"],
                to: ["read", "write"],
              },
            },
          });

          expect(entry).not.toBeNull();
          expect(entry?.eventType).toBe("role_updated");
          expect(entry?.metadata?.changes).toBeDefined();
        });
      });

      describe("logRoleDeleted", () => {
        it("logs role deletion", () => {
          const entry = logger.logRoleDeleted({
            role: "moderator",
            roleName: "Old Moderator",
            actorId: "owner1",
          });

          expect(entry).not.toBeNull();
          expect(entry?.eventType).toBe("role_deleted");
        });
      });
    });

    describe("User Action Logging", () => {
      describe("logUserBanned", () => {
        it("logs a user ban", () => {
          const entry = logger.logUserBanned({
            userId: "user1",
            actorId: "admin1",
            reason: "Spam",
            duration: 3600,
          });

          expect(entry).not.toBeNull();
          expect(entry?.eventType).toBe("user_banned");
          expect(entry?.metadata?.reason).toBe("Spam");
          expect(entry?.metadata?.duration).toBe(3600);
        });

        it("logs channel-specific ban", () => {
          const entry = logger.logUserBanned({
            userId: "user1",
            actorId: "mod1",
            channelId: "channel1",
          });

          expect(entry?.channelId).toBe("channel1");
        });
      });

      describe("logUserUnbanned", () => {
        it("logs a user unban", () => {
          const entry = logger.logUserUnbanned({
            userId: "user1",
            actorId: "admin1",
          });

          expect(entry).not.toBeNull();
          expect(entry?.eventType).toBe("user_unbanned");
        });
      });

      describe("logUserMuted", () => {
        it("logs a user mute", () => {
          const entry = logger.logUserMuted({
            userId: "user1",
            actorId: "mod1",
            duration: 600,
            reason: "Flooding",
          });

          expect(entry).not.toBeNull();
          expect(entry?.eventType).toBe("user_muted");
          expect(entry?.metadata?.duration).toBe(600);
        });
      });

      describe("logUserUnmuted", () => {
        it("logs a user unmute", () => {
          const entry = logger.logUserUnmuted({
            userId: "user1",
            actorId: "mod1",
          });

          expect(entry).not.toBeNull();
          expect(entry?.eventType).toBe("user_unmuted");
        });
      });
    });

    describe("Channel Permission Logging", () => {
      describe("logChannelPermissionOverride", () => {
        it("logs a channel permission override", () => {
          const entry = logger.logChannelPermissionOverride({
            channelId: "channel1",
            targetType: "user",
            targetId: "user1",
            actorId: "admin1",
            allow: [PERMISSIONS.MESSAGE_SEND],
            deny: [PERMISSIONS.MESSAGE_DELETE],
          });

          expect(entry).not.toBeNull();
          expect(entry?.eventType).toBe("channel_permission_override");
          expect(entry?.channelId).toBe("channel1");
          expect(entry?.metadata?.allow).toContain(PERMISSIONS.MESSAGE_SEND);
          expect(entry?.metadata?.deny).toContain(PERMISSIONS.MESSAGE_DELETE);
        });

        it("logs role-based override", () => {
          const entry = logger.logChannelPermissionOverride({
            channelId: "channel1",
            targetType: "role",
            targetId: "member",
            actorId: "admin1",
            allow: [],
            deny: [PERMISSIONS.MESSAGE_SEND],
          });

          expect(entry?.metadata?.targetType).toBe("role");
          expect(entry?.metadata?.targetId).toBe("member");
        });
      });

      describe("logChannelPermissionRevoked", () => {
        it("logs a channel permission revocation", () => {
          const entry = logger.logChannelPermissionRevoked({
            channelId: "channel1",
            targetType: "user",
            targetId: "user1",
            actorId: "admin1",
          });

          expect(entry).not.toBeNull();
          expect(entry?.eventType).toBe("channel_permission_revoked");
        });
      });
    });

    describe("Authentication Logging", () => {
      describe("logLogin", () => {
        it("logs a login event", () => {
          const entry = logger.logLogin({
            userId: "user1",
            ipAddress: "192.168.1.1",
            userAgent: "Mozilla/5.0",
          });

          expect(entry).not.toBeNull();
          expect(entry?.eventType).toBe("login");
          expect(entry?.ipAddress).toBe("192.168.1.1");
          expect(entry?.userAgent).toBe("Mozilla/5.0");
        });
      });

      describe("logLogout", () => {
        it("logs a logout event", () => {
          const entry = logger.logLogout({
            userId: "user1",
          });

          expect(entry).not.toBeNull();
          expect(entry?.eventType).toBe("logout");
        });
      });
    });

    describe("Query Methods", () => {
      beforeEach(() => {
        // Add some test entries
        logger.logPermissionCheck({
          userId: "user1",
          permission: PERMISSIONS.MESSAGE_SEND,
          result: { allowed: true },
        });
        logger.logPermissionCheck({
          userId: "user2",
          permission: PERMISSIONS.MESSAGE_SEND,
          result: { allowed: false },
        });
        logger.logRoleAssigned({
          userId: "user1",
          role: "admin",
          actorId: "owner1",
        });
        logger.logUserBanned({
          userId: "user3",
          actorId: "admin1",
          channelId: "channel1",
        });
      });

      describe("query", () => {
        it("returns all entries without filters", () => {
          const result = logger.query({});
          expect(result.entries.length).toBe(4);
          expect(result.total).toBe(4);
        });

        it("filters by userId", () => {
          const result = logger.query({ userId: "user1" });
          expect(result.entries.length).toBe(2);
          expect(result.entries.every((e) => e.userId === "user1")).toBe(true);
        });

        it("filters by actorId", () => {
          const result = logger.query({ actorId: "owner1" });
          expect(result.entries.length).toBe(1);
        });

        it("filters by eventTypes", () => {
          const result = logger.query({ eventTypes: ["permission_granted"] });
          expect(result.entries.length).toBe(1);
        });

        it("filters by multiple eventTypes", () => {
          const result = logger.query({
            eventTypes: ["permission_granted", "permission_denied"],
          });
          expect(result.entries.length).toBe(2);
        });

        it("filters by permission", () => {
          const result = logger.query({ permission: PERMISSIONS.MESSAGE_SEND });
          expect(result.entries.length).toBe(2);
        });

        it("filters by role", () => {
          const result = logger.query({ role: "admin" });
          expect(result.entries.length).toBe(1);
        });

        it("filters by channelId", () => {
          const result = logger.query({ channelId: "channel1" });
          expect(result.entries.length).toBe(1);
        });

        it("applies limit", () => {
          const result = logger.query({ limit: 2 });
          expect(result.entries.length).toBe(2);
          expect(result.total).toBe(4);
          expect(result.hasMore).toBe(true);
        });

        it("applies offset", () => {
          const result = logger.query({ offset: 2, limit: 2 });
          expect(result.entries.length).toBe(2);
        });

        it("filters by date range", () => {
          const now = new Date();
          const past = new Date(now.getTime() - 1000);
          const future = new Date(now.getTime() + 1000);

          const result = logger.query({
            startDate: past,
            endDate: future,
          });

          expect(result.entries.length).toBe(4);
        });

        it("sorts by timestamp descending", () => {
          const result = logger.query({});
          const timestamps = result.entries.map((e) => e.timestamp.getTime());
          expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
        });
      });

      describe("getByUser", () => {
        it("returns entries for a specific user", () => {
          const entries = logger.getByUser("user1");
          expect(entries.every((e) => e.userId === "user1")).toBe(true);
        });

        it("respects limit", () => {
          const entries = logger.getByUser("user1", 1);
          expect(entries.length).toBe(1);
        });
      });

      describe("getByActor", () => {
        it("returns entries by actor", () => {
          const entries = logger.getByActor("admin1");
          expect(entries.length).toBe(1);
        });
      });

      describe("getByEventType", () => {
        it("returns entries by event type", () => {
          const entries = logger.getByEventType("permission_granted");
          expect(entries.length).toBe(1);
        });
      });

      describe("getRecent", () => {
        it("returns recent entries", () => {
          const entries = logger.getRecent(2);
          expect(entries.length).toBe(2);
        });

        it("defaults to 100 entries", () => {
          const entries = logger.getRecent();
          expect(entries.length).toBeLessThanOrEqual(100);
        });
      });

      describe("getById", () => {
        it("returns entry by ID", () => {
          const entries = logger.getRecent(1);
          const id = entries[0].id;
          const found = logger.getById(id);
          expect(found).toBeDefined();
          expect(found?.id).toBe(id);
        });

        it("returns undefined for non-existent ID", () => {
          expect(logger.getById("non-existent")).toBeUndefined();
        });
      });
    });

    describe("Statistics", () => {
      describe("getStats", () => {
        it("returns correct statistics", () => {
          logger.logPermissionCheck({
            userId: "user1",
            permission: PERMISSIONS.MESSAGE_SEND,
            result: { allowed: true },
          });
          logger.logPermissionCheck({
            userId: "user2",
            permission: PERMISSIONS.MESSAGE_SEND,
            result: { allowed: false },
          });
          logger.logRoleAssigned({
            userId: "user1",
            role: "admin",
            actorId: "owner1",
          });
          logger.logAccessDenied({
            userId: "user3",
            reason: "Forbidden",
          });

          const stats = logger.getStats();

          expect(stats.totalEntries).toBe(4);
          expect(stats.permissionGranted).toBe(1);
          expect(stats.permissionDenied).toBe(1);
          expect(stats.roleChanges).toBe(1);
          expect(stats.accessDenials).toBe(1);
          expect(stats.oldestEntry).toBeDefined();
          expect(stats.newestEntry).toBeDefined();
        });

        it("handles empty log", () => {
          const stats = logger.getStats();
          expect(stats.totalEntries).toBe(0);
          expect(stats.oldestEntry).toBeUndefined();
          expect(stats.newestEntry).toBeUndefined();
        });
      });
    });

    describe("Configuration", () => {
      describe("configure", () => {
        it("updates configuration", () => {
          logger.configure({ maxEntries: 500 });
          expect(logger.getConfig().maxEntries).toBe(500);
        });
      });

      describe("getConfig", () => {
        it("returns current configuration", () => {
          const config = logger.getConfig();
          expect(config.enabled).toBe(true);
          expect(config.maxEntries).toBeDefined();
        });
      });

      describe("setEnabled", () => {
        it("enables logging", () => {
          logger.setEnabled(false);
          expect(logger.isEnabled()).toBe(false);

          logger.setEnabled(true);
          expect(logger.isEnabled()).toBe(true);
        });
      });

      describe("onLog callback", () => {
        it("calls callback when entry is added", () => {
          const callback = jest.fn();
          const loggerWithCallback = createAuditLogger({ onLog: callback });

          loggerWithCallback.logLogin({ userId: "user1" });

          expect(callback).toHaveBeenCalledTimes(1);
          expect(callback).toHaveBeenCalledWith(
            expect.objectContaining({ eventType: "login" }),
          );
        });
      });

      describe("persistFn", () => {
        it("calls persist function when entry is added", async () => {
          const persistFn = jest.fn().mockResolvedValue(undefined);
          const loggerWithPersist = createAuditLogger({ persistFn });

          loggerWithPersist.logLogin({ userId: "user1" });

          // Allow async to complete
          await new Promise((resolve) => setTimeout(resolve, 0));

          expect(persistFn).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe("Maintenance", () => {
      describe("clear", () => {
        it("removes all entries", () => {
          logger.logLogin({ userId: "user1" });
          logger.logLogin({ userId: "user2" });

          logger.clear();

          expect(logger.size).toBe(0);
        });
      });

      describe("size", () => {
        it("returns entry count", () => {
          expect(logger.size).toBe(0);

          logger.logLogin({ userId: "user1" });
          expect(logger.size).toBe(1);
        });
      });

      describe("export", () => {
        it("returns all entries", () => {
          logger.logLogin({ userId: "user1" });
          logger.logLogin({ userId: "user2" });

          const exported = logger.export();
          expect(exported.length).toBe(2);
        });

        it("returns a copy", () => {
          logger.logLogin({ userId: "user1" });

          const exported = logger.export();
          exported.push({} as AuditLogEntry);

          expect(logger.size).toBe(1);
        });
      });

      describe("import", () => {
        it("imports entries", () => {
          const entries: AuditLogEntry[] = [
            {
              id: "1",
              timestamp: new Date(),
              eventType: "login",
              userId: "user1",
            },
          ];

          logger.import(entries);

          expect(logger.size).toBe(1);
        });

        it("handles string timestamps", () => {
          const entries = [
            {
              id: "1",
              timestamp: "2024-01-01T00:00:00Z" as unknown as Date,
              eventType: "login" as AuditEventType,
              userId: "user1",
            },
          ];

          logger.import(entries);

          const exported = logger.export();
          expect(exported[0].timestamp).toBeInstanceOf(Date);
        });

        it("trims to maxEntries", () => {
          const smallLogger = createAuditLogger({ maxEntries: 5 });

          const entries: AuditLogEntry[] = Array(10)
            .fill(null)
            .map((_, i) => ({
              id: `${i}`,
              timestamp: new Date(),
              eventType: "login" as AuditEventType,
              userId: `user${i}`,
            }));

          smallLogger.import(entries);

          expect(smallLogger.size).toBe(5);
        });
      });

      describe("purgeOlderThan", () => {
        it("removes old entries", async () => {
          logger.logLogin({ userId: "user1" });

          // Wait a bit
          await new Promise((resolve) => setTimeout(resolve, 10));

          const cutoff = new Date();

          await new Promise((resolve) => setTimeout(resolve, 10));

          logger.logLogin({ userId: "user2" });

          const purged = logger.purgeOlderThan(cutoff);

          expect(purged).toBe(1);
          expect(logger.size).toBe(1);
        });
      });

      describe("maxEntries limit", () => {
        it("removes oldest entries when limit exceeded", () => {
          const smallLogger = createAuditLogger({ maxEntries: 3 });

          smallLogger.logLogin({ userId: "user1" });
          smallLogger.logLogin({ userId: "user2" });
          smallLogger.logLogin({ userId: "user3" });
          smallLogger.logLogin({ userId: "user4" });

          expect(smallLogger.size).toBe(3);

          const entries = smallLogger.export();
          expect(entries.some((e) => e.userId === "user1")).toBe(false);
          expect(entries.some((e) => e.userId === "user4")).toBe(true);
        });
      });
    });
  });

  describe("Factory Functions", () => {
    describe("createAuditLogger", () => {
      it("creates logger with default config", () => {
        const logger = createAuditLogger();
        const config = logger.getConfig();

        expect(config.enabled).toBe(true);
        expect(config.maxEntries).toBe(10000);
      });

      it("creates logger with custom config", () => {
        const logger = createAuditLogger({ maxEntries: 500 });
        expect(logger.getConfig().maxEntries).toBe(500);
      });
    });

    describe("createMinimalAuditLogger", () => {
      it("creates logger that only logs denials and role changes", () => {
        const logger = createMinimalAuditLogger();
        const config = logger.getConfig();

        expect(config.logGranted).toBe(false);
        expect(config.logDenied).toBe(true);
        expect(config.logRoleChanges).toBe(true);
      });

      it("does not log granted permissions", () => {
        const logger = createMinimalAuditLogger();

        const entry = logger.logPermissionCheck({
          userId: "user1",
          permission: PERMISSIONS.MESSAGE_SEND,
          result: { allowed: true },
        });

        expect(entry).toBeNull();
      });
    });

    describe("createComprehensiveAuditLogger", () => {
      it("creates logger that logs everything", () => {
        const logger = createComprehensiveAuditLogger();
        const config = logger.getConfig();

        expect(config.logPermissionChecks).toBe(true);
        expect(config.logGranted).toBe(true);
        expect(config.logDenied).toBe(true);
        expect(config.logRoleChanges).toBe(true);
      });
    });
  });

  describe("Utility Functions", () => {
    describe("formatAuditEntry", () => {
      it("formats a basic entry", () => {
        const entry: AuditLogEntry = {
          id: "1",
          timestamp: new Date("2024-01-01T12:00:00Z"),
          eventType: "login",
          userId: "user1",
        };

        const formatted = formatAuditEntry(entry);

        expect(formatted).toContain("LOGIN");
        expect(formatted).toContain("user:user1");
      });

      it("includes actor if different from user", () => {
        const entry: AuditLogEntry = {
          id: "1",
          timestamp: new Date(),
          eventType: "role_assigned",
          userId: "user1",
          actorId: "admin1",
          role: "moderator",
        };

        const formatted = formatAuditEntry(entry);

        expect(formatted).toContain("by:admin1");
      });

      it("includes permission", () => {
        const entry: AuditLogEntry = {
          id: "1",
          timestamp: new Date(),
          eventType: "permission_granted",
          userId: "user1",
          permission: PERMISSIONS.MESSAGE_SEND,
          result: { allowed: true },
        };

        const formatted = formatAuditEntry(entry);

        expect(formatted).toContain(`perm:${PERMISSIONS.MESSAGE_SEND}`);
        expect(formatted).toContain("GRANTED");
      });

      it("includes result reason", () => {
        const entry: AuditLogEntry = {
          id: "1",
          timestamp: new Date(),
          eventType: "permission_denied",
          userId: "user1",
          result: { allowed: false, reason: "Not authorized" },
        };

        const formatted = formatAuditEntry(entry);

        expect(formatted).toContain("DENIED");
        expect(formatted).toContain("(Not authorized)");
      });
    });

    describe("groupByDate", () => {
      it("groups entries by date", () => {
        const entries: AuditLogEntry[] = [
          {
            id: "1",
            timestamp: new Date("2024-01-01T10:00:00Z"),
            eventType: "login",
            userId: "user1",
          },
          {
            id: "2",
            timestamp: new Date("2024-01-01T15:00:00Z"),
            eventType: "logout",
            userId: "user1",
          },
          {
            id: "3",
            timestamp: new Date("2024-01-02T10:00:00Z"),
            eventType: "login",
            userId: "user1",
          },
        ];

        const groups = groupByDate(entries);

        expect(groups.size).toBe(2);
        expect(groups.get("2024-01-01")?.length).toBe(2);
        expect(groups.get("2024-01-02")?.length).toBe(1);
      });
    });

    describe("groupByUser", () => {
      it("groups entries by user", () => {
        const entries: AuditLogEntry[] = [
          {
            id: "1",
            timestamp: new Date(),
            eventType: "login",
            userId: "user1",
          },
          {
            id: "2",
            timestamp: new Date(),
            eventType: "logout",
            userId: "user1",
          },
          {
            id: "3",
            timestamp: new Date(),
            eventType: "login",
            userId: "user2",
          },
        ];

        const groups = groupByUser(entries);

        expect(groups.size).toBe(2);
        expect(groups.get("user1")?.length).toBe(2);
        expect(groups.get("user2")?.length).toBe(1);
      });
    });

    describe("groupByEventType", () => {
      it("groups entries by event type", () => {
        const entries: AuditLogEntry[] = [
          {
            id: "1",
            timestamp: new Date(),
            eventType: "login",
            userId: "user1",
          },
          {
            id: "2",
            timestamp: new Date(),
            eventType: "login",
            userId: "user2",
          },
          {
            id: "3",
            timestamp: new Date(),
            eventType: "logout",
            userId: "user1",
          },
        ];

        const groups = groupByEventType(entries);

        expect(groups.size).toBe(2);
        expect(groups.get("login")?.length).toBe(2);
        expect(groups.get("logout")?.length).toBe(1);
      });
    });
  });
});
