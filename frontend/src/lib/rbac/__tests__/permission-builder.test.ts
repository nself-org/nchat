import {
  PermissionBuilder,
  PermissionRuleEngine,
  permission,
  createRuleEngine,
  roleCondition,
  permissionCondition,
  ownerCondition,
  timeCondition,
  resourceCondition,
  customCondition,
  getRoleDefaultPermissions,
  createMessagePermissionRules,
  createChannelPermissionRules,
  createUserPermissionRules,
  type PermissionContext,
  type PermissionResult,
  type PermissionRule,
} from "../permission-builder";
import { PERMISSIONS, ROLES, type Role } from "@/types/rbac";

describe("Permission Builder", () => {
  describe("PermissionBuilder class", () => {
    it("creates a basic permission rule", () => {
      const rule = permission("test-rule")
        .name("Test Rule")
        .description("A test rule")
        .forPermission(PERMISSIONS.MESSAGE_SEND)
        .build();

      expect(rule.id).toBe("test-rule");
      expect(rule.name).toBe("Test Rule");
      expect(rule.description).toBe("A test rule");
      expect(rule.permission).toBe(PERMISSIONS.MESSAGE_SEND);
      expect(rule.mode).toBe("all");
      expect(rule.priority).toBe(0);
    });

    it("throws error when permission is not set", () => {
      expect(() => {
        permission("no-permission").name("Test").build();
      }).toThrow("Permission must be set using forPermission()");
    });

    it("adds role condition via requireRole", () => {
      const rule = permission("role-test")
        .forPermission(PERMISSIONS.MESSAGE_SEND)
        .requireRole("admin")
        .build();

      expect(rule.conditions).toHaveLength(1);
      expect(rule.conditions[0].type).toBe("role");
    });

    it("adds permission condition via requirePermission", () => {
      const rule = permission("perm-test")
        .forPermission(PERMISSIONS.MESSAGE_SEND)
        .requirePermission(PERMISSIONS.MESSAGE_EDIT)
        .build();

      expect(rule.conditions).toHaveLength(1);
      expect(rule.conditions[0].type).toBe("permission");
    });

    it("adds ownership condition via requireOwnership", () => {
      const rule = permission("owner-test")
        .forPermission(PERMISSIONS.MESSAGE_EDIT)
        .requireOwnership()
        .build();

      expect(rule.conditions).toHaveLength(1);
      expect(rule.conditions[0].type).toBe("owner");
    });

    it("adds time condition via requireTime", () => {
      const rule = permission("time-test")
        .forPermission(PERMISSIONS.MESSAGE_SEND)
        .requireTime({ after: new Date("2024-01-01") })
        .build();

      expect(rule.conditions).toHaveLength(1);
      expect(rule.conditions[0].type).toBe("time");
    });

    it("adds resource condition via requireResource", () => {
      const rule = permission("resource-test")
        .forPermission(PERMISSIONS.MESSAGE_EDIT)
        .requireResource("message", () => true)
        .build();

      expect(rule.conditions).toHaveLength(1);
      expect(rule.conditions[0].type).toBe("resource");
    });

    it("adds custom condition via requireCustom", () => {
      const rule = permission("custom-test")
        .forPermission(PERMISSIONS.MESSAGE_SEND)
        .requireCustom("Custom check", () => true)
        .build();

      expect(rule.conditions).toHaveLength(1);
      expect(rule.conditions[0].type).toBe("custom");
    });

    it("chains multiple conditions", () => {
      const rule = permission("multi-condition")
        .forPermission(PERMISSIONS.MESSAGE_EDIT)
        .requireRole("member")
        .requireOwnership()
        .build();

      expect(rule.conditions).toHaveLength(2);
      expect(rule.mode).toBe("all");
    });

    it("sets requireAll mode", () => {
      const rule = permission("all-mode")
        .forPermission(PERMISSIONS.MESSAGE_SEND)
        .requireAll()
        .build();

      expect(rule.mode).toBe("all");
    });

    it("sets requireAny mode", () => {
      const rule = permission("any-mode")
        .forPermission(PERMISSIONS.MESSAGE_SEND)
        .requireAny()
        .build();

      expect(rule.mode).toBe("any");
    });

    it("sets priority", () => {
      const rule = permission("priority-test")
        .forPermission(PERMISSIONS.MESSAGE_SEND)
        .priority(100)
        .build();

      expect(rule.priority).toBe(100);
    });

    it("allowOwnerOrRole sets any mode with both conditions", () => {
      const rule = permission("owner-or-role")
        .forPermission(PERMISSIONS.MESSAGE_EDIT)
        .allowOwnerOrRole("moderator")
        .build();

      expect(rule.conditions).toHaveLength(2);
      expect(rule.mode).toBe("any");
      expect(rule.conditions[0].type).toBe("owner");
      expect(rule.conditions[1].type).toBe("role");
    });

    it("adds pre-built condition via addCondition", () => {
      const condition = customCondition("Test", () => true);
      const rule = permission("add-condition")
        .forPermission(PERMISSIONS.MESSAGE_SEND)
        .addCondition(condition)
        .build();

      expect(rule.conditions).toHaveLength(1);
      expect(rule.conditions[0]).toBe(condition);
    });
  });

  describe("Condition Builders", () => {
    describe("roleCondition", () => {
      const condition = roleCondition("moderator");

      it("returns true for same role", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "moderator",
        };
        expect(condition.evaluate(context)).toBe(true);
      });

      it("returns true for higher role", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "admin",
        };
        expect(condition.evaluate(context)).toBe(true);
      });

      it("returns true for owner role", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "owner",
        };
        expect(condition.evaluate(context)).toBe(true);
      });

      it("returns false for lower role", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
        };
        expect(condition.evaluate(context)).toBe(false);
      });

      it("returns false for guest role", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "guest",
        };
        expect(condition.evaluate(context)).toBe(false);
      });

      it("has correct type and description", () => {
        expect(condition.type).toBe("role");
        expect(condition.description).toContain("moderator");
      });
    });

    describe("permissionCondition", () => {
      const condition = permissionCondition(PERMISSIONS.CHANNEL_CREATE);

      it("returns true for owner (all permissions)", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "owner",
        };
        expect(condition.evaluate(context)).toBe(true);
      });

      it("returns true for admin with permission", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "admin",
        };
        expect(condition.evaluate(context)).toBe(true);
      });

      it("returns false for moderator without permission", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "moderator",
        };
        expect(condition.evaluate(context)).toBe(false);
      });

      it("returns false for member without permission", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
        };
        expect(condition.evaluate(context)).toBe(false);
      });

      it("returns false for guest", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "guest",
        };
        expect(condition.evaluate(context)).toBe(false);
      });
    });

    describe("ownerCondition", () => {
      const condition = ownerCondition();

      it("returns true when user is resource owner", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
          resourceOwnerId: "user1",
        };
        expect(condition.evaluate(context)).toBe(true);
      });

      it("returns false when user is not resource owner", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
          resourceOwnerId: "user2",
        };
        expect(condition.evaluate(context)).toBe(false);
      });

      it("returns false when resourceOwnerId is undefined", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
        };
        expect(condition.evaluate(context)).toBe(false);
      });

      it("has correct type", () => {
        expect(condition.type).toBe("owner");
      });
    });

    describe("timeCondition", () => {
      it("returns true when current time is after specified time", () => {
        const pastDate = new Date(Date.now() - 1000000);
        const condition = timeCondition({ after: pastDate });
        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
        };
        expect(condition.evaluate(context)).toBe(true);
      });

      it("returns false when current time is before specified time", () => {
        const futureDate = new Date(Date.now() + 1000000);
        const condition = timeCondition({ after: futureDate });
        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
        };
        expect(condition.evaluate(context)).toBe(false);
      });

      it("returns true when current time is before specified before time", () => {
        const futureDate = new Date(Date.now() + 1000000);
        const condition = timeCondition({ before: futureDate });
        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
        };
        expect(condition.evaluate(context)).toBe(true);
      });

      it("returns false when current time is after specified before time", () => {
        const pastDate = new Date(Date.now() - 1000000);
        const condition = timeCondition({ before: pastDate });
        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
        };
        expect(condition.evaluate(context)).toBe(false);
      });

      it("handles combined after and before conditions", () => {
        const pastDate = new Date(Date.now() - 1000000);
        const futureDate = new Date(Date.now() + 1000000);
        const condition = timeCondition({
          after: pastDate,
          before: futureDate,
        });
        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
        };
        expect(condition.evaluate(context)).toBe(true);
      });

      it("has correct type", () => {
        const condition = timeCondition({ after: new Date() });
        expect(condition.type).toBe("time");
      });

      it("builds description with after", () => {
        const date = new Date();
        const condition = timeCondition({ after: date });
        expect(condition.description).toContain("after");
      });

      it("builds description with before", () => {
        const date = new Date();
        const condition = timeCondition({ before: date });
        expect(condition.description).toContain("before");
      });

      it("builds description with withinMinutes", () => {
        const condition = timeCondition({ withinMinutes: 5 });
        expect(condition.description).toContain("5 minutes");
      });
    });

    describe("resourceCondition", () => {
      it("returns true when resource type matches and check passes", () => {
        const condition = resourceCondition("message", () => true);
        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
          resourceType: "message",
        };
        expect(condition.evaluate(context)).toBe(true);
      });

      it("returns false when resource type does not match", () => {
        const condition = resourceCondition("message", () => true);
        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
          resourceType: "channel",
        };
        expect(condition.evaluate(context)).toBe(false);
      });

      it("returns false when check fails", () => {
        const condition = resourceCondition("message", () => false);
        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
          resourceType: "message",
        };
        expect(condition.evaluate(context)).toBe(false);
      });

      it("passes context to check function", () => {
        const checkFn = jest.fn().mockReturnValue(true);
        const condition = resourceCondition("message", checkFn);
        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
          resourceType: "message",
          resourceId: "msg123",
        };
        condition.evaluate(context);
        expect(checkFn).toHaveBeenCalledWith(context);
      });

      it("has correct type", () => {
        const condition = resourceCondition("message", () => true);
        expect(condition.type).toBe("resource");
      });
    });

    describe("customCondition", () => {
      it("evaluates custom function", () => {
        const condition = customCondition("Always true", () => true);
        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
        };
        expect(condition.evaluate(context)).toBe(true);
      });

      it("passes context to evaluate function", () => {
        const evaluateFn = jest.fn().mockReturnValue(true);
        const condition = customCondition("Custom", evaluateFn);
        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
          metadata: { test: true },
        };
        condition.evaluate(context);
        expect(evaluateFn).toHaveBeenCalledWith(context);
      });

      it("uses provided description", () => {
        const condition = customCondition("My custom condition", () => true);
        expect(condition.description).toBe("My custom condition");
      });

      it("has correct type", () => {
        const condition = customCondition("Custom", () => true);
        expect(condition.type).toBe("custom");
      });
    });
  });

  describe("PermissionRuleEngine", () => {
    let engine: PermissionRuleEngine;

    beforeEach(() => {
      engine = createRuleEngine();
    });

    describe("registerRule", () => {
      it("registers a single rule", () => {
        const rule = permission("test")
          .forPermission(PERMISSIONS.MESSAGE_SEND)
          .requireRole("member")
          .build();

        engine.registerRule(rule);

        const rules = engine.getRulesForPermission(PERMISSIONS.MESSAGE_SEND);
        expect(rules).toHaveLength(1);
        expect(rules[0].id).toBe("test");
      });

      it("registers multiple rules for same permission", () => {
        const rule1 = permission("test1")
          .forPermission(PERMISSIONS.MESSAGE_SEND)
          .build();
        const rule2 = permission("test2")
          .forPermission(PERMISSIONS.MESSAGE_SEND)
          .build();

        engine.registerRule(rule1);
        engine.registerRule(rule2);

        const rules = engine.getRulesForPermission(PERMISSIONS.MESSAGE_SEND);
        expect(rules).toHaveLength(2);
      });

      it("sorts rules by priority (highest first)", () => {
        const lowPriority = permission("low")
          .forPermission(PERMISSIONS.MESSAGE_SEND)
          .priority(10)
          .build();
        const highPriority = permission("high")
          .forPermission(PERMISSIONS.MESSAGE_SEND)
          .priority(100)
          .build();

        engine.registerRule(lowPriority);
        engine.registerRule(highPriority);

        const rules = engine.getRulesForPermission(PERMISSIONS.MESSAGE_SEND);
        expect(rules[0].id).toBe("high");
        expect(rules[1].id).toBe("low");
      });
    });

    describe("registerRules", () => {
      it("registers multiple rules at once", () => {
        const rules = [
          permission("r1").forPermission(PERMISSIONS.MESSAGE_SEND).build(),
          permission("r2").forPermission(PERMISSIONS.MESSAGE_EDIT).build(),
        ];

        engine.registerRules(rules);

        expect(engine.getAllRules()).toHaveLength(2);
      });
    });

    describe("unregisterRule", () => {
      it("removes a registered rule", () => {
        const rule = permission("to-remove")
          .forPermission(PERMISSIONS.MESSAGE_SEND)
          .build();

        engine.registerRule(rule);
        const removed = engine.unregisterRule("to-remove");

        expect(removed).toBe(true);
        expect(
          engine.getRulesForPermission(PERMISSIONS.MESSAGE_SEND),
        ).toHaveLength(0);
      });

      it("returns false when rule not found", () => {
        const removed = engine.unregisterRule("non-existent");
        expect(removed).toBe(false);
      });

      it("removes empty permission entry", () => {
        const rule = permission("only-rule")
          .forPermission(PERMISSIONS.MESSAGE_SEND)
          .build();

        engine.registerRule(rule);
        engine.unregisterRule("only-rule");

        expect(
          engine.getRulesForPermission(PERMISSIONS.MESSAGE_SEND),
        ).toHaveLength(0);
      });
    });

    describe("clearRules", () => {
      it("removes all rules", () => {
        engine.registerRule(
          permission("r1").forPermission(PERMISSIONS.MESSAGE_SEND).build(),
        );
        engine.registerRule(
          permission("r2").forPermission(PERMISSIONS.MESSAGE_EDIT).build(),
        );

        engine.clearRules();

        expect(engine.getAllRules()).toHaveLength(0);
      });
    });

    describe("getRulesForPermission", () => {
      it("returns empty array for unregistered permission", () => {
        const rules = engine.getRulesForPermission(PERMISSIONS.MESSAGE_SEND);
        expect(rules).toEqual([]);
      });

      it("returns only rules for specified permission", () => {
        engine.registerRule(
          permission("r1").forPermission(PERMISSIONS.MESSAGE_SEND).build(),
        );
        engine.registerRule(
          permission("r2").forPermission(PERMISSIONS.MESSAGE_EDIT).build(),
        );

        const rules = engine.getRulesForPermission(PERMISSIONS.MESSAGE_SEND);
        expect(rules).toHaveLength(1);
        expect(rules[0].id).toBe("r1");
      });
    });

    describe("getAllRules", () => {
      it("returns all registered rules", () => {
        engine.registerRule(
          permission("r1").forPermission(PERMISSIONS.MESSAGE_SEND).build(),
        );
        engine.registerRule(
          permission("r2").forPermission(PERMISSIONS.MESSAGE_EDIT).build(),
        );
        engine.registerRule(
          permission("r3").forPermission(PERMISSIONS.MESSAGE_SEND).build(),
        );

        const rules = engine.getAllRules();
        expect(rules).toHaveLength(3);
      });
    });

    describe("check", () => {
      it("allows owner all permissions", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "owner",
        };
        const result = engine.check(PERMISSIONS.ADMIN_BILLING, context);

        expect(result.allowed).toBe(true);
        expect(result.grantedBy).toBe("owner-role");
      });

      it("uses registered rules", () => {
        const rule = permission("test-rule")
          .forPermission(PERMISSIONS.MESSAGE_EDIT)
          .requireRole("member")
          .build();

        engine.registerRule(rule);

        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
        };
        const result = engine.check(PERMISSIONS.MESSAGE_EDIT, context);

        expect(result.allowed).toBe(true);
        expect(result.grantedBy).toBe("test-rule");
      });

      it("falls back to default role permissions", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
        };
        const result = engine.check(PERMISSIONS.MESSAGE_SEND, context);

        expect(result.allowed).toBe(true);
        expect(result.grantedBy).toBe("member-role");
      });

      it("denies permission not in role", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "guest",
        };
        const result = engine.check(PERMISSIONS.MESSAGE_SEND, context);

        expect(result.allowed).toBe(false);
        expect(result.deniedBy).toBe("guest-role");
      });

      it("evaluates rules in priority order", () => {
        const lowRule = permission("low")
          .forPermission(PERMISSIONS.MESSAGE_SEND)
          .priority(10)
          .requireRole("admin")
          .build();

        const highRule = permission("high")
          .forPermission(PERMISSIONS.MESSAGE_SEND)
          .priority(100)
          .requireRole("member")
          .build();

        engine.registerRule(lowRule);
        engine.registerRule(highRule);

        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
        };
        const result = engine.check(PERMISSIONS.MESSAGE_SEND, context);

        expect(result.allowed).toBe(true);
        expect(result.grantedBy).toBe("high");
      });

      describe("mode: all", () => {
        it("requires all conditions to pass", () => {
          // Use a fresh engine for this specific test
          const testEngine = createRuleEngine();
          const rule = permission("all-mode")
            .forPermission(PERMISSIONS.MESSAGE_EDIT)
            .requireAll()
            .requireRole("member")
            .requireOwnership()
            .build();

          testEngine.registerRule(rule);

          // Both conditions met
          const context1: PermissionContext = {
            userId: "user1",
            userRole: "member",
            resourceOwnerId: "user1",
          };
          expect(
            testEngine.check(PERMISSIONS.MESSAGE_EDIT, context1).allowed,
          ).toBe(true);

          // Role met, ownership not met
          const context2: PermissionContext = {
            userId: "user1",
            userRole: "member",
            resourceOwnerId: "user2",
          };
          expect(
            testEngine.check(PERMISSIONS.MESSAGE_EDIT, context2).allowed,
          ).toBe(false);
        });
      });

      describe("mode: any", () => {
        it("requires any condition to pass", () => {
          // Use a fresh engine for this specific test
          const testEngine = createRuleEngine();
          const rule = permission("any-mode")
            .forPermission(PERMISSIONS.MESSAGE_EDIT)
            .requireAny()
            .requireRole("admin")
            .requireOwnership()
            .build();

          testEngine.registerRule(rule);

          // Owner of resource (not admin)
          const context1: PermissionContext = {
            userId: "user1",
            userRole: "member",
            resourceOwnerId: "user1",
          };
          expect(
            testEngine.check(PERMISSIONS.MESSAGE_EDIT, context1).allowed,
          ).toBe(true);

          // Admin (not owner)
          const context2: PermissionContext = {
            userId: "user1",
            userRole: "admin",
            resourceOwnerId: "user2",
          };
          expect(
            testEngine.check(PERMISSIONS.MESSAGE_EDIT, context2).allowed,
          ).toBe(true);

          // Neither
          const context3: PermissionContext = {
            userId: "user1",
            userRole: "member",
            resourceOwnerId: "user2",
          };
          expect(
            testEngine.check(PERMISSIONS.MESSAGE_EDIT, context3).allowed,
          ).toBe(false);
        });
      });

      describe("owner protection", () => {
        it("denies modification of owner", () => {
          const context: PermissionContext = {
            userId: "user1",
            userRole: "admin",
            resourceType: "user",
            resourceOwnerId: "user2",
            action: "ban",
            metadata: { targetRole: "owner" },
          };

          const result = engine.check(PERMISSIONS.USER_BAN, context);
          expect(result.allowed).toBe(false);
          expect(result.reason).toBe("Cannot modify owner");
        });

        it("denies demoting owner", () => {
          const context: PermissionContext = {
            userId: "user1",
            userRole: "owner",
            resourceType: "user",
            resourceOwnerId: "user2",
            action: "demote",
            metadata: { targetRole: "owner" },
          };

          const result = engine.check(PERMISSIONS.ROLE_ASSIGN, context);
          expect(result.allowed).toBe(false);
          expect(result.reason).toBe("Cannot modify owner");
        });

        it("denies deleting owner", () => {
          const context: PermissionContext = {
            userId: "user1",
            userRole: "owner",
            resourceType: "user",
            resourceOwnerId: "user2",
            action: "delete",
            metadata: { targetRole: "owner" },
          };

          const result = engine.check(PERMISSIONS.USER_EDIT, context);
          expect(result.allowed).toBe(false);
          expect(result.reason).toBe("Cannot modify owner");
        });

        it("allows viewing owner", () => {
          const context: PermissionContext = {
            userId: "user1",
            userRole: "member",
            resourceType: "user",
            resourceOwnerId: "user2",
            action: "view",
            metadata: { targetRole: "owner" },
          };

          const result = engine.check(PERMISSIONS.USER_VIEW, context);
          expect(result.allowed).toBe(true);
        });
      });
    });

    describe("checkAll", () => {
      it("returns true when all permissions are granted", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "admin",
        };
        const result = engine.checkAll(
          [PERMISSIONS.MESSAGE_SEND, PERMISSIONS.MESSAGE_EDIT],
          context,
        );

        expect(result.allowed).toBe(true);
      });

      it("returns false when any permission is denied", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
        };
        const result = engine.checkAll(
          [PERMISSIONS.MESSAGE_SEND, PERMISSIONS.ADMIN_BILLING],
          context,
        );

        expect(result.allowed).toBe(false);
      });

      it("returns first denied permission result", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "guest",
        };
        const result = engine.checkAll(
          [PERMISSIONS.MESSAGE_SEND, PERMISSIONS.MESSAGE_EDIT],
          context,
        );

        expect(result.allowed).toBe(false);
        expect(result.deniedBy).toBe("guest-role");
      });
    });

    describe("checkAny", () => {
      it("returns true when any permission is granted", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
        };
        const result = engine.checkAny(
          [PERMISSIONS.ADMIN_BILLING, PERMISSIONS.MESSAGE_SEND],
          context,
        );

        expect(result.allowed).toBe(true);
      });

      it("returns false when all permissions are denied", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "guest",
        };
        const result = engine.checkAny(
          [PERMISSIONS.MESSAGE_SEND, PERMISSIONS.MESSAGE_EDIT],
          context,
        );

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("None of the required permissions");
      });
    });
  });

  describe("getRoleDefaultPermissions", () => {
    it("returns all permissions for owner", () => {
      const perms = getRoleDefaultPermissions("owner");
      expect(perms).toEqual(Object.values(PERMISSIONS));
    });

    it("returns correct permissions for admin", () => {
      const perms = getRoleDefaultPermissions("admin");
      expect(perms).toContain(PERMISSIONS.MESSAGE_SEND);
      expect(perms).toContain(PERMISSIONS.CHANNEL_CREATE);
      expect(perms).toContain(PERMISSIONS.USER_BAN);
      expect(perms).not.toContain(PERMISSIONS.ADMIN_BILLING);
    });

    it("returns correct permissions for moderator", () => {
      const perms = getRoleDefaultPermissions("moderator");
      expect(perms).toContain(PERMISSIONS.MESSAGE_SEND);
      expect(perms).toContain(PERMISSIONS.USER_MUTE);
      expect(perms).not.toContain(PERMISSIONS.CHANNEL_CREATE);
    });

    it("returns correct permissions for member", () => {
      const perms = getRoleDefaultPermissions("member");
      expect(perms).toContain(PERMISSIONS.MESSAGE_SEND);
      expect(perms).toContain(PERMISSIONS.USER_VIEW);
      expect(perms).not.toContain(PERMISSIONS.USER_BAN);
    });

    it("returns minimal permissions for guest", () => {
      const perms = getRoleDefaultPermissions("guest");
      expect(perms).toEqual([PERMISSIONS.USER_VIEW]);
    });

    it("returns empty array for unknown role", () => {
      const perms = getRoleDefaultPermissions("unknown" as Role);
      expect(perms).toEqual([]);
    });
  });

  describe("Pre-built Permission Rules", () => {
    describe("createMessagePermissionRules", () => {
      let engine: PermissionRuleEngine;
      let rules: PermissionRule[];

      beforeEach(() => {
        engine = createRuleEngine();
        rules = createMessagePermissionRules();
        engine.registerRules(rules);
      });

      it("creates 5 message permission rules", () => {
        expect(rules).toHaveLength(5);
      });

      it("allows owner to edit own messages", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
          resourceOwnerId: "user1",
        };
        const result = engine.check(PERMISSIONS.MESSAGE_EDIT, context);
        expect(result.allowed).toBe(true);
      });

      it("allows moderator to edit others messages", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "moderator",
          resourceOwnerId: "user2",
        };
        const result = engine.check(PERMISSIONS.MESSAGE_EDIT, context);
        expect(result.allowed).toBe(true);
      });

      it("allows owner to delete own messages", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
          resourceOwnerId: "user1",
        };
        const result = engine.check(PERMISSIONS.MESSAGE_DELETE, context);
        expect(result.allowed).toBe(true);
      });

      it("allows moderator to delete others messages", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "moderator",
        };
        const result = engine.check(PERMISSIONS.MESSAGE_DELETE_OTHERS, context);
        expect(result.allowed).toBe(true);
      });

      it("denies member from deleting others messages", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
        };
        const result = engine.check(PERMISSIONS.MESSAGE_DELETE_OTHERS, context);
        expect(result.allowed).toBe(false);
      });
    });

    describe("createChannelPermissionRules", () => {
      let engine: PermissionRuleEngine;
      let rules: PermissionRule[];

      beforeEach(() => {
        engine = createRuleEngine();
        rules = createChannelPermissionRules();
        engine.registerRules(rules);
      });

      it("creates 4 channel permission rules", () => {
        expect(rules).toHaveLength(4);
      });

      it("allows admin to create channels", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "admin",
        };
        const result = engine.check(PERMISSIONS.CHANNEL_CREATE, context);
        expect(result.allowed).toBe(true);
      });

      it("denies member from creating channels", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "member",
        };
        const result = engine.check(PERMISSIONS.CHANNEL_CREATE, context);
        expect(result.allowed).toBe(false);
      });

      it("allows moderator to manage channels", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "moderator",
        };
        const result = engine.check(PERMISSIONS.CHANNEL_MANAGE, context);
        expect(result.allowed).toBe(true);
      });
    });

    describe("createUserPermissionRules", () => {
      let engine: PermissionRuleEngine;
      let rules: PermissionRule[];

      beforeEach(() => {
        engine = createRuleEngine();
        rules = createUserPermissionRules();
        engine.registerRules(rules);
      });

      it("creates 3 user permission rules", () => {
        expect(rules).toHaveLength(3);
      });

      it("allows admin to ban non-owner users", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "admin",
          metadata: { targetRole: "member" },
        };
        const result = engine.check(PERMISSIONS.USER_BAN, context);
        expect(result.allowed).toBe(true);
      });

      it("denies admin from banning owner", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "admin",
          metadata: { targetRole: "owner" },
        };
        const result = engine.check(PERMISSIONS.USER_BAN, context);
        expect(result.allowed).toBe(false);
      });

      it("allows moderator to kick non-owner users", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "moderator",
          metadata: { targetRole: "member" },
        };
        const result = engine.check(PERMISSIONS.USER_KICK, context);
        expect(result.allowed).toBe(true);
      });

      it("denies moderator from kicking owner", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "moderator",
          metadata: { targetRole: "owner" },
        };
        const result = engine.check(PERMISSIONS.USER_KICK, context);
        expect(result.allowed).toBe(false);
      });

      it("allows moderator to mute non-owner users", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "moderator",
          metadata: { targetRole: "member" },
        };
        const result = engine.check(PERMISSIONS.USER_MUTE, context);
        expect(result.allowed).toBe(true);
      });

      it("denies moderator from muting owner", () => {
        const context: PermissionContext = {
          userId: "user1",
          userRole: "moderator",
          metadata: { targetRole: "owner" },
        };
        const result = engine.check(PERMISSIONS.USER_MUTE, context);
        expect(result.allowed).toBe(false);
      });
    });
  });

  describe("Factory functions", () => {
    describe("permission", () => {
      it("creates a new PermissionBuilder", () => {
        const builder = permission("test");
        expect(builder).toBeInstanceOf(PermissionBuilder);
      });
    });

    describe("createRuleEngine", () => {
      it("creates a new PermissionRuleEngine", () => {
        const engine = createRuleEngine();
        expect(engine).toBeInstanceOf(PermissionRuleEngine);
      });
    });
  });

  describe("Integration scenarios", () => {
    let engine: PermissionRuleEngine;

    beforeEach(() => {
      engine = createRuleEngine();
      engine.registerRules(createMessagePermissionRules());
      engine.registerRules(createChannelPermissionRules());
      engine.registerRules(createUserPermissionRules());
    });

    it("allows complex message editing scenario", () => {
      // Member editing their own message
      const memberOwnMessage: PermissionContext = {
        userId: "user1",
        userRole: "member",
        resourceType: "message",
        resourceOwnerId: "user1",
      };
      expect(
        engine.check(PERMISSIONS.MESSAGE_EDIT, memberOwnMessage).allowed,
      ).toBe(true);

      // Member editing someone else's message
      const memberOthersMessage: PermissionContext = {
        userId: "user1",
        userRole: "member",
        resourceType: "message",
        resourceOwnerId: "user2",
      };
      expect(
        engine.check(PERMISSIONS.MESSAGE_EDIT, memberOthersMessage).allowed,
      ).toBe(false);

      // Moderator editing someone else's message
      const modOthersMessage: PermissionContext = {
        userId: "user1",
        userRole: "moderator",
        resourceType: "message",
        resourceOwnerId: "user2",
      };
      expect(
        engine.check(PERMISSIONS.MESSAGE_EDIT, modOthersMessage).allowed,
      ).toBe(true);
    });

    it("handles user management with hierarchy", () => {
      // Admin banning member
      expect(
        engine.check(PERMISSIONS.USER_BAN, {
          userId: "admin1",
          userRole: "admin",
          metadata: { targetRole: "member" },
        }).allowed,
      ).toBe(true);

      // Admin banning admin (allowed by current rules - only owner is protected)
      // Note: For stricter hierarchy enforcement, add role hierarchy condition to rules
      expect(
        engine.check(PERMISSIONS.USER_BAN, {
          userId: "admin1",
          userRole: "admin",
          metadata: { targetRole: "admin" },
        }).allowed,
      ).toBe(true);

      // Admin banning owner (should fail - owner protection)
      expect(
        engine.check(PERMISSIONS.USER_BAN, {
          userId: "admin1",
          userRole: "admin",
          metadata: { targetRole: "owner" },
        }).allowed,
      ).toBe(false);
    });

    it("combines multiple permission systems", () => {
      // Owner has all permissions regardless of rules
      const ownerContext: PermissionContext = {
        userId: "owner1",
        userRole: "owner",
      };

      expect(engine.check(PERMISSIONS.MESSAGE_SEND, ownerContext).allowed).toBe(
        true,
      );
      expect(
        engine.check(PERMISSIONS.CHANNEL_CREATE, ownerContext).allowed,
      ).toBe(true);
      expect(
        engine.check(PERMISSIONS.ADMIN_BILLING, ownerContext).allowed,
      ).toBe(true);
    });
  });
});
