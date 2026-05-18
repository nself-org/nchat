/**
 * Permission Engine Tests
 *
 * Comprehensive test suite for the permission engine covering:
 * - Role hierarchy and management
 * - Permission inheritance at all levels
 * - Override system (allow/deny)
 * - Policy simulation
 * - Platform presets
 * - Caching behavior
 * - Audit logging
 */

import {
  PermissionEngine,
  createPermissionEngine,
  createHighPerformanceEngine,
  createRealtimeEngine,
  Role,
  PermissionContext,
  PermissionOverride,
  HypotheticalChange,
  WorkspacePermissions,
  CategoryPermissions,
  ChannelPermissions,
} from "../permission-engine";
import { PERMISSIONS } from "@/types/rbac";

describe("Permission Engine", () => {
  let engine: PermissionEngine;

  beforeEach(() => {
    engine = createPermissionEngine();
  });

  // ===========================================================================
  // Role Hierarchy Tests
  // ===========================================================================
  describe("Role Hierarchy", () => {
    describe("Built-in roles", () => {
      it("initializes with 5 built-in roles", () => {
        const roles = engine.getAllRoles();
        expect(roles.length).toBe(5);
      });

      it("has owner at highest position (100)", () => {
        const owner = engine.getRole("owner");
        expect(owner?.position).toBe(100);
        expect(owner?.isBuiltIn).toBe(true);
      });

      it("has admin at position 90", () => {
        const admin = engine.getRole("admin");
        expect(admin?.position).toBe(90);
        expect(admin?.isBuiltIn).toBe(true);
      });

      it("has moderator at position 70", () => {
        const mod = engine.getRole("moderator");
        expect(mod?.position).toBe(70);
        expect(mod?.isBuiltIn).toBe(true);
      });

      it("has member at position 20", () => {
        const member = engine.getRole("member");
        expect(member?.position).toBe(20);
        expect(member?.isBuiltIn).toBe(true);
        expect(member?.isDefault).toBe(true);
      });

      it("has guest at lowest position (10)", () => {
        const guest = engine.getRole("guest");
        expect(guest?.position).toBe(10);
        expect(guest?.isBuiltIn).toBe(true);
      });

      it("returns roles sorted by position (highest first)", () => {
        const roles = engine.getAllRoles();
        expect(roles[0].id).toBe("owner");
        expect(roles[1].id).toBe("admin");
        expect(roles[2].id).toBe("moderator");
        expect(roles[3].id).toBe("member");
        expect(roles[4].id).toBe("guest");
      });
    });

    describe("Custom role management", () => {
      it("creates a custom role", () => {
        const role = engine.createRole({
          name: "VIP",
          color: "#gold",
          position: 50,
          isDefault: false,
          isMentionable: true,
          permissions: [PERMISSIONS.MESSAGE_SEND, PERMISSIONS.MESSAGE_PIN],
        });

        expect(role.id).toBeDefined();
        expect(role.name).toBe("VIP");
        expect(role.isBuiltIn).toBe(false);
        expect(role.position).toBe(50);
      });

      it("updates a custom role", () => {
        const role = engine.createRole({
          name: "VIP",
          color: "#gold",
          position: 50,
          isDefault: false,
          isMentionable: true,
          permissions: [],
        });

        const updated = engine.updateRole(role.id, { name: "Super VIP" });
        expect(updated?.name).toBe("Super VIP");
      });

      it("prevents modifying built-in role core properties", () => {
        expect(() => {
          engine.updateRole("owner", { position: 50 });
        }).toThrow("Cannot modify core properties of built-in roles");
      });

      it("deletes a custom role", () => {
        const role = engine.createRole({
          name: "Temp",
          color: "#fff",
          position: 30,
          isDefault: false,
          isMentionable: false,
          permissions: [],
        });

        const deleted = engine.deleteRole(role.id);
        expect(deleted).toBe(true);
        expect(engine.getRole(role.id)).toBeUndefined();
      });

      it("prevents deleting built-in roles", () => {
        const deleted = engine.deleteRole("owner");
        expect(deleted).toBe(false);
        expect(engine.getRole("owner")).toBeDefined();
      });
    });

    describe("Role comparison", () => {
      it("compares two roles", () => {
        const owner = engine.getRole("owner")!;
        const member = engine.getRole("member")!;

        const comparison = engine.compareRoles(owner, member);

        expect(comparison.positionDifference).toBe(80); // 100 - 20
        expect(comparison.canAManageB).toBe(true);
        expect(comparison.canBManageA).toBe(false);
        expect(comparison.onlyInA.length).toBeGreaterThan(0);
      });

      it("identifies shared permissions", () => {
        const admin = engine.getRole("admin")!;
        const mod = engine.getRole("moderator")!;

        const comparison = engine.compareRoles(admin, mod);

        expect(comparison.sharedPermissions).toContain(
          PERMISSIONS.MESSAGE_SEND,
        );
        expect(comparison.sharedPermissions).toContain(
          PERMISSIONS.MESSAGE_DELETE_OTHERS,
        );
      });

      it("cannot manage owner role", () => {
        const owner = engine.getRole("owner")!;
        const admin = engine.getRole("admin")!;

        expect(engine.canManageRole(admin, owner)).toBe(false);
        expect(engine.canManageRole(owner, owner)).toBe(false);
      });

      it("gets highest role from list", () => {
        const member = engine.getRole("member")!;
        const admin = engine.getRole("admin")!;
        const guest = engine.getRole("guest")!;

        const highest = engine.getHighestRole([member, guest, admin]);
        expect(highest?.id).toBe("admin");
      });
    });
  });

  // ===========================================================================
  // Permission Checking Tests
  // ===========================================================================
  describe("Permission Checking", () => {
    describe("Owner permissions", () => {
      it("owner has all permissions", () => {
        const context: PermissionContext = {
          userId: "owner-user",
          userRoles: [engine.getRole("owner")!],
          workspaceId: "ws1",
        };

        const result = engine.checkPermission(
          PERMISSIONS.ADMIN_BILLING,
          context,
        );
        expect(result.allowed).toBe(true);
        expect(result.grantedBy).toBe("owner");
      });

      it("owner bypasses all restrictions", () => {
        const context: PermissionContext = {
          userId: "owner-user",
          userRoles: [engine.getRole("owner")!],
          workspaceId: "ws1",
          channelId: "ch1",
        };

        // Even with a channel deny override, owner should have permission
        engine.addOverride({
          level: "channel",
          targetType: "role",
          targetId: "owner",
          permission: PERMISSIONS.MESSAGE_SEND,
          action: "deny",
          priority: 100,
          createdBy: "system",
        });

        const result = engine.checkPermission(
          PERMISSIONS.MESSAGE_SEND,
          context,
        );
        expect(result.allowed).toBe(true);
      });
    });

    describe("Role-based permissions", () => {
      it("admin has admin-level permissions", () => {
        const context: PermissionContext = {
          userId: "admin-user",
          userRoles: [engine.getRole("admin")!],
          workspaceId: "ws1",
        };

        expect(
          engine.checkPermission(PERMISSIONS.MESSAGE_SEND, context).allowed,
        ).toBe(true);
        expect(
          engine.checkPermission(PERMISSIONS.USER_BAN, context).allowed,
        ).toBe(true);
        expect(
          engine.checkPermission(PERMISSIONS.ADMIN_DASHBOARD, context).allowed,
        ).toBe(true);
      });

      it("admin does not have billing permission", () => {
        const context: PermissionContext = {
          userId: "admin-user",
          userRoles: [engine.getRole("admin")!],
          workspaceId: "ws1",
        };

        expect(
          engine.checkPermission(PERMISSIONS.ADMIN_BILLING, context).allowed,
        ).toBe(false);
      });

      it("moderator has moderation permissions", () => {
        const context: PermissionContext = {
          userId: "mod-user",
          userRoles: [engine.getRole("moderator")!],
          workspaceId: "ws1",
        };

        expect(
          engine.checkPermission(PERMISSIONS.MESSAGE_DELETE_OTHERS, context)
            .allowed,
        ).toBe(true);
        expect(
          engine.checkPermission(PERMISSIONS.USER_KICK, context).allowed,
        ).toBe(true);
        expect(
          engine.checkPermission(PERMISSIONS.USER_MUTE, context).allowed,
        ).toBe(true);
      });

      it("moderator does not have ban permission", () => {
        const context: PermissionContext = {
          userId: "mod-user",
          userRoles: [engine.getRole("moderator")!],
          workspaceId: "ws1",
        };

        expect(
          engine.checkPermission(PERMISSIONS.USER_BAN, context).allowed,
        ).toBe(false);
      });

      it("member has basic permissions", () => {
        const context: PermissionContext = {
          userId: "member-user",
          userRoles: [engine.getRole("member")!],
          workspaceId: "ws1",
        };

        expect(
          engine.checkPermission(PERMISSIONS.MESSAGE_SEND, context).allowed,
        ).toBe(true);
        expect(
          engine.checkPermission(PERMISSIONS.MESSAGE_EDIT, context).allowed,
        ).toBe(true);
        expect(
          engine.checkPermission(PERMISSIONS.USER_VIEW, context).allowed,
        ).toBe(true);
      });

      it("member does not have moderation permissions", () => {
        const context: PermissionContext = {
          userId: "member-user",
          userRoles: [engine.getRole("member")!],
          workspaceId: "ws1",
        };

        expect(
          engine.checkPermission(PERMISSIONS.MESSAGE_DELETE_OTHERS, context)
            .allowed,
        ).toBe(false);
        expect(
          engine.checkPermission(PERMISSIONS.USER_BAN, context).allowed,
        ).toBe(false);
      });

      it("guest has minimal permissions", () => {
        const context: PermissionContext = {
          userId: "guest-user",
          userRoles: [engine.getRole("guest")!],
          workspaceId: "ws1",
        };

        expect(
          engine.checkPermission(PERMISSIONS.USER_VIEW, context).allowed,
        ).toBe(true);
        expect(
          engine.checkPermission(PERMISSIONS.MESSAGE_SEND, context).allowed,
        ).toBe(false);
      });
    });

    describe("Multiple role stacking", () => {
      it("user with multiple roles gets combined permissions", () => {
        const vipRole = engine.createRole({
          name: "VIP",
          color: "#gold",
          position: 30,
          isDefault: false,
          isMentionable: true,
          permissions: [PERMISSIONS.MESSAGE_PIN],
        });

        const context: PermissionContext = {
          userId: "vip-member",
          userRoles: [engine.getRole("member")!, vipRole],
          workspaceId: "ws1",
        };

        // Has member permission
        expect(
          engine.checkPermission(PERMISSIONS.MESSAGE_SEND, context).allowed,
        ).toBe(true);
        // Has VIP permission
        expect(
          engine.checkPermission(PERMISSIONS.MESSAGE_PIN, context).allowed,
        ).toBe(true);
      });

      it("highest role determines management capabilities", () => {
        const context: PermissionContext = {
          userId: "multi-role-user",
          userRoles: [engine.getRole("member")!, engine.getRole("moderator")!],
          workspaceId: "ws1",
        };

        const effective = engine.getEffectivePermissions(context);
        expect(effective.highestRole.id).toBe("moderator");
      });
    });
  });

  // ===========================================================================
  // Override System Tests
  // ===========================================================================
  describe("Override System", () => {
    describe("Channel-level overrides", () => {
      it("channel override denies permission", () => {
        engine.configureChannel({
          channelId: "ch1",
          workspaceId: "ws1",
          inheritFromCategory: true,
          syncWithCategory: true,
          overrides: [],
        });

        engine.addOverride(
          {
            level: "channel",
            targetType: "role",
            targetId: "member",
            permission: PERMISSIONS.MESSAGE_SEND,
            action: "deny",
            priority: 10,
            createdBy: "admin",
          },
          "ch1",
        );

        const context: PermissionContext = {
          userId: "member-user",
          userRoles: [engine.getRole("member")!],
          workspaceId: "ws1",
          channelId: "ch1",
        };

        const result = engine.checkPermission(
          PERMISSIONS.MESSAGE_SEND,
          context,
        );
        expect(result.allowed).toBe(false);
        expect(result.state).toBe("denied");
      });

      it("channel override allows additional permission", () => {
        engine.addOverride(
          {
            level: "channel",
            targetType: "role",
            targetId: "member",
            permission: PERMISSIONS.MESSAGE_PIN,
            action: "allow",
            priority: 10,
            createdBy: "admin",
          },
          "ch1",
        );

        const context: PermissionContext = {
          userId: "member-user",
          userRoles: [engine.getRole("member")!],
          workspaceId: "ws1",
          channelId: "ch1",
        };

        // Member normally can't pin, but override allows it
        const result = engine.checkPermission(PERMISSIONS.MESSAGE_PIN, context);
        expect(result.allowed).toBe(true);
      });
    });

    describe("User-specific overrides", () => {
      it("user override takes precedence over role", () => {
        engine.addOverride(
          {
            level: "channel",
            targetType: "user",
            targetId: "special-user",
            permission: PERMISSIONS.ADMIN_DASHBOARD,
            action: "allow",
            priority: 100,
            createdBy: "owner",
          },
          "ch1",
        );

        const context: PermissionContext = {
          userId: "special-user",
          userRoles: [engine.getRole("member")!],
          workspaceId: "ws1",
          channelId: "ch1",
        };

        const result = engine.checkPermission(
          PERMISSIONS.ADMIN_DASHBOARD,
          context,
        );
        expect(result.allowed).toBe(true);
      });

      it("user deny override blocks permission", () => {
        engine.addOverride(
          {
            level: "channel",
            targetType: "user",
            targetId: "restricted-user",
            permission: PERMISSIONS.MESSAGE_SEND,
            action: "deny",
            priority: 100,
            createdBy: "admin",
          },
          "ch1",
        );

        const context: PermissionContext = {
          userId: "restricted-user",
          userRoles: [engine.getRole("member")!],
          workspaceId: "ws1",
          channelId: "ch1",
        };

        const result = engine.checkPermission(
          PERMISSIONS.MESSAGE_SEND,
          context,
        );
        expect(result.allowed).toBe(false);
      });
    });

    describe("Override expiration", () => {
      it("ignores expired overrides", () => {
        const pastDate = new Date();
        pastDate.setMinutes(pastDate.getMinutes() - 10);

        engine.addOverride(
          {
            level: "channel",
            targetType: "user",
            targetId: "temp-muted",
            permission: PERMISSIONS.MESSAGE_SEND,
            action: "deny",
            priority: 100,
            createdBy: "mod",
            expiresAt: pastDate,
          },
          "ch1",
        );

        const context: PermissionContext = {
          userId: "temp-muted",
          userRoles: [engine.getRole("member")!],
          workspaceId: "ws1",
          channelId: "ch1",
        };

        // Override expired, should have permission
        const result = engine.checkPermission(
          PERMISSIONS.MESSAGE_SEND,
          context,
        );
        expect(result.allowed).toBe(true);
      });

      it("applies non-expired overrides", () => {
        const futureDate = new Date();
        futureDate.setMinutes(futureDate.getMinutes() + 10);

        engine.addOverride(
          {
            level: "channel",
            targetType: "user",
            targetId: "temp-muted",
            permission: PERMISSIONS.MESSAGE_SEND,
            action: "deny",
            priority: 100,
            createdBy: "mod",
            expiresAt: futureDate,
          },
          "ch1",
        );

        const context: PermissionContext = {
          userId: "temp-muted",
          userRoles: [engine.getRole("member")!],
          workspaceId: "ws1",
          channelId: "ch1",
        };

        const result = engine.checkPermission(
          PERMISSIONS.MESSAGE_SEND,
          context,
        );
        expect(result.allowed).toBe(false);
      });
    });

    describe("Override management", () => {
      it("removes an override", () => {
        const override = engine.addOverride(
          {
            level: "channel",
            targetType: "role",
            targetId: "member",
            permission: PERMISSIONS.MESSAGE_SEND,
            action: "deny",
            priority: 10,
            createdBy: "admin",
          },
          "ch1",
        );

        const removed = engine.removeOverride(override.id, "channel", "ch1");
        expect(removed).toBe(true);

        const overrides = engine.getOverrides("channel", "ch1");
        expect(overrides.find((o) => o.id === override.id)).toBeUndefined();
      });

      it("gets all overrides for a level", () => {
        engine.addOverride(
          {
            level: "channel",
            targetType: "role",
            targetId: "member",
            permission: PERMISSIONS.MESSAGE_SEND,
            action: "deny",
            priority: 10,
            createdBy: "admin",
          },
          "ch1",
        );

        engine.addOverride(
          {
            level: "channel",
            targetType: "role",
            targetId: "guest",
            permission: PERMISSIONS.USER_VIEW,
            action: "allow",
            priority: 10,
            createdBy: "admin",
          },
          "ch1",
        );

        const overrides = engine.getOverrides("channel", "ch1");
        expect(overrides.length).toBe(2);
      });
    });
  });

  // ===========================================================================
  // Inheritance Tests
  // ===========================================================================
  describe("Permission Inheritance", () => {
    beforeEach(() => {
      // Set up hierarchy
      engine.configureWorkspace({
        workspaceId: "ws1",
        defaultRole: "member",
        defaultPermissions: [PERMISSIONS.USER_VIEW],
        restrictedPermissions: [],
        overrides: [],
      });

      engine.configureCategory({
        categoryId: "cat1",
        workspaceId: "ws1",
        name: "General",
        inheritFromWorkspace: true,
        overrides: [],
      });

      engine.configureChannel({
        channelId: "ch1",
        categoryId: "cat1",
        workspaceId: "ws1",
        inheritFromCategory: true,
        syncWithCategory: true,
        overrides: [],
      });
    });

    it("channel inherits from category", () => {
      engine.addOverride(
        {
          level: "category",
          targetType: "role",
          targetId: "member",
          permission: PERMISSIONS.MESSAGE_PIN,
          action: "allow",
          priority: 10,
          createdBy: "admin",
        },
        "cat1",
      );

      const context: PermissionContext = {
        userId: "member-user",
        userRoles: [engine.getRole("member")!],
        workspaceId: "ws1",
        categoryId: "cat1",
        channelId: "ch1",
      };

      const result = engine.checkPermission(PERMISSIONS.MESSAGE_PIN, context);
      expect(result.allowed).toBe(true);
    });

    it("channel override takes precedence over category", () => {
      // Category allows
      engine.addOverride(
        {
          level: "category",
          targetType: "role",
          targetId: "member",
          permission: PERMISSIONS.MESSAGE_PIN,
          action: "allow",
          priority: 10,
          createdBy: "admin",
        },
        "cat1",
      );

      // Channel denies (higher priority)
      engine.addOverride(
        {
          level: "channel",
          targetType: "role",
          targetId: "member",
          permission: PERMISSIONS.MESSAGE_PIN,
          action: "deny",
          priority: 20,
          createdBy: "admin",
        },
        "ch1",
      );

      const context: PermissionContext = {
        userId: "member-user",
        userRoles: [engine.getRole("member")!],
        workspaceId: "ws1",
        categoryId: "cat1",
        channelId: "ch1",
      };

      const result = engine.checkPermission(PERMISSIONS.MESSAGE_PIN, context);
      expect(result.allowed).toBe(false);
    });

    it("workspace-level permissions apply to all channels", () => {
      engine.addOverride(
        {
          level: "workspace",
          targetType: "role",
          targetId: "guest",
          permission: PERMISSIONS.MESSAGE_SEND,
          action: "allow",
          priority: 5,
          createdBy: "owner",
        },
        "ws1",
      );

      const context: PermissionContext = {
        userId: "guest-user",
        userRoles: [engine.getRole("guest")!],
        workspaceId: "ws1",
        channelId: "ch1",
      };

      const result = engine.checkPermission(PERMISSIONS.MESSAGE_SEND, context);
      expect(result.allowed).toBe(true);
    });
  });

  // ===========================================================================
  // Policy Simulation Tests
  // ===========================================================================
  describe("Policy Simulation", () => {
    it("simulates adding a role", () => {
      const context: PermissionContext = {
        userId: "test-user",
        userRoles: [engine.getRole("member")!],
        workspaceId: "ws1",
      };

      const changes: HypotheticalChange[] = [
        { type: "add_role", roleId: "moderator" },
      ];

      const result = engine.simulatePolicy({
        context,
        hypotheticalChanges: changes,
      });

      expect(result.before.highestRole.id).toBe("member");
      expect(result.after.highestRole.id).toBe("moderator");

      // Should gain moderation permissions
      const gainedKick = result.changedPermissions.find(
        (d) => d.permission === PERMISSIONS.USER_KICK,
      );
      expect(gainedKick?.impact).toBe("gained");
    });

    it("simulates removing a role", () => {
      const context: PermissionContext = {
        userId: "test-user",
        userRoles: [engine.getRole("member")!, engine.getRole("moderator")!],
        workspaceId: "ws1",
      };

      const changes: HypotheticalChange[] = [
        { type: "remove_role", roleId: "moderator" },
      ];

      const result = engine.simulatePolicy({
        context,
        hypotheticalChanges: changes,
      });

      expect(result.before.highestRole.id).toBe("moderator");
      expect(result.after.highestRole.id).toBe("member");

      // Should lose moderation permissions
      const lostKick = result.changedPermissions.find(
        (d) => d.permission === PERMISSIONS.USER_KICK,
      );
      expect(lostKick?.impact).toBe("lost");
    });

    it("warns about dangerous permission changes", () => {
      const context: PermissionContext = {
        userId: "test-user",
        userRoles: [engine.getRole("member")!],
        workspaceId: "ws1",
      };

      const changes: HypotheticalChange[] = [
        { type: "add_role", roleId: "admin" },
      ];

      const result = engine.simulatePolicy({
        context,
        hypotheticalChanges: changes,
      });

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes("dangerous"))).toBe(true);
    });

    it("detects access-breaking changes", () => {
      const context: PermissionContext = {
        userId: "test-user",
        userRoles: [engine.getRole("member")!],
        workspaceId: "ws1",
      };

      // Remove member role (which has USER_VIEW)
      const changes: HypotheticalChange[] = [
        { type: "remove_role", roleId: "member" },
      ];

      const result = engine.simulatePolicy({
        context,
        hypotheticalChanges: changes,
      });

      expect(result.wouldBreakAccess).toBe(true);
    });
  });

  // ===========================================================================
  // Effective Permissions Tests
  // ===========================================================================
  describe("Effective Permissions", () => {
    it("computes all effective permissions", () => {
      const context: PermissionContext = {
        userId: "admin-user",
        userRoles: [engine.getRole("admin")!],
        workspaceId: "ws1",
      };

      const effective = engine.getEffectivePermissions(context);

      expect(effective.userId).toBe("admin-user");
      expect(effective.allowedPermissions.length).toBeGreaterThan(0);
      expect(effective.highestRole.id).toBe("admin");
      expect(effective.isAdmin).toBe(true);
      expect(effective.isOwner).toBe(false);
    });

    it("shows readable effective permissions", () => {
      const context: PermissionContext = {
        userId: "member-user",
        userRoles: [engine.getRole("member")!],
        workspaceId: "ws1",
      };

      const output = engine.showEffectivePermissions(context);

      expect(output).toContain("Effective Permissions");
      expect(output).toContain("member-user");
      expect(output).toContain("Allowed Permissions");
    });

    it("computes permission diff between roles", () => {
      const member = engine.getRole("member")!;
      const admin = engine.getRole("admin")!;

      const diff = engine.getPermissionDiff(member, admin);

      expect(diff.added.length).toBeGreaterThan(0);
      expect(diff.added).toContain(PERMISSIONS.USER_BAN);
      expect(diff.removed.length).toBe(0);
    });
  });

  // ===========================================================================
  // Platform Presets Tests
  // ===========================================================================
  describe("Platform Presets", () => {
    describe("Discord preset", () => {
      it("uses role stacking model", () => {
        const discordEngine = createPermissionEngine({ preset: "discord" });
        const info = discordEngine.getPresetInfo("discord");

        expect(info.name).toBe("Discord");
        expect(info.characteristics).toContain(
          "Roles stack - user gets all permissions from all roles",
        );
      });
    });

    describe("Slack preset", () => {
      it("has collaboration-focused characteristics", () => {
        const slackEngine = createPermissionEngine({ preset: "slack" });
        const info = slackEngine.getPresetInfo("slack");

        expect(info.name).toBe("Slack");
        expect(info.characteristics).toContain("Focus on collaboration");
      });

      it("has simpler permission model", () => {
        const slackEngine = createPermissionEngine({ preset: "slack" });
        const info = slackEngine.getPresetInfo("slack");

        expect(info.characteristics).toContain("Simpler permission model");
      });
    });

    describe("Telegram preset", () => {
      it("restricts member permissions", () => {
        const telegramEngine = createPermissionEngine({ preset: "telegram" });
        const member = telegramEngine.getRole("member")!;

        // Telegram preset has very restrictive permissions for members
        expect(member.permissions.length).toBeLessThanOrEqual(5);
        expect(member.permissions).not.toContain(PERMISSIONS.MESSAGE_PIN);
        expect(member.permissions).not.toContain(PERMISSIONS.USER_BAN);
      });

      it("focuses on admin control", () => {
        const telegramEngine = createPermissionEngine({ preset: "telegram" });
        const info = telegramEngine.getPresetInfo("telegram");

        expect(info.characteristics).toContain("Strict moderation focus");
      });
    });

    describe("Custom preset", () => {
      it("allows full customization", () => {
        const customEngine = createPermissionEngine({ preset: "custom" });
        const info = customEngine.getPresetInfo("custom");

        expect(info.characteristics).toContain(
          "Full control over all settings",
        );
      });
    });

    it("applies preset changes", () => {
      const engine = createPermissionEngine({ preset: "discord" });
      expect(engine.getPreset()).toBe("discord");

      engine.applyPreset("slack");
      expect(engine.getPreset()).toBe("slack");
    });
  });

  // ===========================================================================
  // Caching Tests
  // ===========================================================================
  describe("Caching", () => {
    it("caches effective permissions", () => {
      const context: PermissionContext = {
        userId: "cached-user",
        userRoles: [engine.getRole("member")!],
        workspaceId: "ws1",
      };

      // First call computes
      const result1 = engine.getEffectivePermissions(context);
      // Second call should hit cache
      const result2 = engine.getEffectivePermissions(context);

      expect(result1.computedAt.getTime()).toBe(result2.computedAt.getTime());
    });

    it("invalidates cache on role changes", () => {
      const context: PermissionContext = {
        userId: "cached-user",
        userRoles: [engine.getRole("member")!],
        workspaceId: "ws1",
      };

      engine.getEffectivePermissions(context);

      // Create a role (invalidates cache)
      engine.createRole({
        name: "New Role",
        color: "#fff",
        position: 25,
        isDefault: false,
        isMentionable: false,
        permissions: [],
      });

      // Cache should be invalidated
      expect(engine.getCacheStats().size).toBe(0);
    });

    it("invalidates user-specific cache", () => {
      const context1: PermissionContext = {
        userId: "user1",
        userRoles: [engine.getRole("member")!],
        workspaceId: "ws1",
      };

      const context2: PermissionContext = {
        userId: "user2",
        userRoles: [engine.getRole("member")!],
        workspaceId: "ws1",
      };

      engine.getEffectivePermissions(context1);
      engine.getEffectivePermissions(context2);

      expect(engine.getCacheStats().size).toBe(2);

      engine.invalidateUserCache("user1");

      expect(engine.getCacheStats().size).toBe(1);
    });

    it("supports configurable cache TTL", () => {
      const shortCacheEngine = createPermissionEngine({ cacheTTLMs: 100 });

      expect(shortCacheEngine.getCacheStats().ttlMs).toBe(100);
    });

    it("can disable caching", () => {
      const noCacheEngine = createPermissionEngine({ cacheEnabled: false });

      expect(noCacheEngine.getCacheStats().enabled).toBe(false);
    });
  });

  // ===========================================================================
  // Audit Logging Tests
  // ===========================================================================
  describe("Audit Logging", () => {
    it("logs permission changes", () => {
      engine.logAudit({
        actorId: "admin-user",
        actorRole: "admin",
        action: "grant",
        targetType: "user",
        targetId: "member-user",
        permission: PERMISSIONS.MESSAGE_PIN,
        reason: "Promoted to pinning privileges",
      });

      const log = engine.getAuditLog();
      expect(log.length).toBe(1);
      expect(log[0].permission).toBe(PERMISSIONS.MESSAGE_PIN);
    });

    it("filters audit log by actor", () => {
      engine.logAudit({
        actorId: "admin1",
        actorRole: "admin",
        action: "grant",
        targetType: "user",
        targetId: "user1",
      });

      engine.logAudit({
        actorId: "admin2",
        actorRole: "admin",
        action: "revoke",
        targetType: "user",
        targetId: "user1",
      });

      const filtered = engine.getAuditLog({ actorId: "admin1" });
      expect(filtered.length).toBe(1);
      expect(filtered[0].action).toBe("grant");
    });

    it("filters audit log by date", () => {
      engine.logAudit({
        actorId: "admin",
        actorRole: "admin",
        action: "grant",
        targetType: "role",
        targetId: "member",
      });

      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      const filtered = engine.getAuditLog({ since: futureDate });
      expect(filtered.length).toBe(0);
    });

    it("limits audit log results", () => {
      for (let i = 0; i < 10; i++) {
        engine.logAudit({
          actorId: "admin",
          actorRole: "admin",
          action: "grant",
          targetType: "role",
          targetId: `role-${i}`,
        });
      }

      const limited = engine.getAuditLog({ limit: 5 });
      expect(limited.length).toBe(5);
    });
  });

  // ===========================================================================
  // Export/Import Tests
  // ===========================================================================
  describe("State Export/Import", () => {
    it("exports engine state", () => {
      engine.createRole({
        name: "Custom",
        color: "#fff",
        position: 50,
        isDefault: false,
        isMentionable: false,
        permissions: [PERMISSIONS.MESSAGE_PIN],
      });

      const state = engine.exportState();

      expect(state.roles.length).toBe(6); // 5 built-in + 1 custom
      expect(state.preset).toBe("discord");
    });

    it("imports engine state", () => {
      const state = engine.exportState();

      const newEngine = createPermissionEngine();
      newEngine.importState(state);

      const roles = newEngine.getAllRoles();
      expect(roles.length).toBe(state.roles.length);
    });
  });

  // ===========================================================================
  // Factory Function Tests
  // ===========================================================================
  describe("Factory Functions", () => {
    it("creates default permission engine", () => {
      const defaultEngine = createPermissionEngine();
      expect(defaultEngine.getPreset()).toBe("discord");
    });

    it("creates high-performance engine", () => {
      const hpEngine = createHighPerformanceEngine();
      expect(hpEngine.getCacheStats().ttlMs).toBe(300000);
      expect(hpEngine.getCacheStats().enabled).toBe(true);
    });

    it("creates realtime engine", () => {
      const rtEngine = createRealtimeEngine();
      expect(rtEngine.getCacheStats().ttlMs).toBe(5000);
    });
  });
});
