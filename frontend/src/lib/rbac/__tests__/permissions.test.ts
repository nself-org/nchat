import {
  hasPermission,
  hasRole,
  canManageRole,
  isOwner,
  canModifyUser,
  getRolePermissions,
  getRoleDisplayName,
  getAllRolesSorted,
  DEFAULT_ROLE_PERMISSIONS,
} from "../permissions";
import {
  ROLES,
  PERMISSIONS,
  ROLE_HIERARCHY,
  type Role,
  type Permission,
} from "@/types/rbac";

describe("RBAC Permissions System", () => {
  describe("hasPermission", () => {
    describe("Owner role", () => {
      it("has all message permissions", () => {
        expect(hasPermission("owner", PERMISSIONS.MESSAGE_SEND)).toBe(true);
        expect(hasPermission("owner", PERMISSIONS.MESSAGE_EDIT)).toBe(true);
        expect(hasPermission("owner", PERMISSIONS.MESSAGE_DELETE)).toBe(true);
        expect(hasPermission("owner", PERMISSIONS.MESSAGE_DELETE_OTHERS)).toBe(
          true,
        );
        expect(hasPermission("owner", PERMISSIONS.MESSAGE_PIN)).toBe(true);
      });

      it("has all channel permissions", () => {
        expect(hasPermission("owner", PERMISSIONS.CHANNEL_CREATE)).toBe(true);
        expect(hasPermission("owner", PERMISSIONS.CHANNEL_EDIT)).toBe(true);
        expect(hasPermission("owner", PERMISSIONS.CHANNEL_DELETE)).toBe(true);
        expect(hasPermission("owner", PERMISSIONS.CHANNEL_MANAGE)).toBe(true);
      });

      it("has all user permissions", () => {
        expect(hasPermission("owner", PERMISSIONS.USER_VIEW)).toBe(true);
        expect(hasPermission("owner", PERMISSIONS.USER_EDIT)).toBe(true);
        expect(hasPermission("owner", PERMISSIONS.USER_BAN)).toBe(true);
        expect(hasPermission("owner", PERMISSIONS.USER_KICK)).toBe(true);
        expect(hasPermission("owner", PERMISSIONS.USER_MUTE)).toBe(true);
      });

      it("has all role permissions", () => {
        expect(hasPermission("owner", PERMISSIONS.ROLE_VIEW)).toBe(true);
        expect(hasPermission("owner", PERMISSIONS.ROLE_CREATE)).toBe(true);
        expect(hasPermission("owner", PERMISSIONS.ROLE_EDIT)).toBe(true);
        expect(hasPermission("owner", PERMISSIONS.ROLE_DELETE)).toBe(true);
        expect(hasPermission("owner", PERMISSIONS.ROLE_ASSIGN)).toBe(true);
      });

      it("has all admin permissions", () => {
        expect(hasPermission("owner", PERMISSIONS.ADMIN_DASHBOARD)).toBe(true);
        expect(hasPermission("owner", PERMISSIONS.ADMIN_SETTINGS)).toBe(true);
        expect(hasPermission("owner", PERMISSIONS.ADMIN_BILLING)).toBe(true);
        expect(hasPermission("owner", PERMISSIONS.ADMIN_AUDIT_LOG)).toBe(true);
      });
    });

    describe("Admin role", () => {
      it("has admin-level message permissions", () => {
        expect(hasPermission("admin", PERMISSIONS.MESSAGE_SEND)).toBe(true);
        expect(hasPermission("admin", PERMISSIONS.MESSAGE_EDIT)).toBe(true);
        expect(hasPermission("admin", PERMISSIONS.MESSAGE_DELETE)).toBe(true);
        expect(hasPermission("admin", PERMISSIONS.MESSAGE_DELETE_OTHERS)).toBe(
          true,
        );
        expect(hasPermission("admin", PERMISSIONS.MESSAGE_PIN)).toBe(true);
      });

      it("has admin-level channel permissions", () => {
        expect(hasPermission("admin", PERMISSIONS.CHANNEL_CREATE)).toBe(true);
        expect(hasPermission("admin", PERMISSIONS.CHANNEL_EDIT)).toBe(true);
        expect(hasPermission("admin", PERMISSIONS.CHANNEL_DELETE)).toBe(true);
        expect(hasPermission("admin", PERMISSIONS.CHANNEL_MANAGE)).toBe(true);
      });

      it("has admin-level user permissions", () => {
        expect(hasPermission("admin", PERMISSIONS.USER_VIEW)).toBe(true);
        expect(hasPermission("admin", PERMISSIONS.USER_EDIT)).toBe(true);
        expect(hasPermission("admin", PERMISSIONS.USER_BAN)).toBe(true);
        expect(hasPermission("admin", PERMISSIONS.USER_KICK)).toBe(true);
        expect(hasPermission("admin", PERMISSIONS.USER_MUTE)).toBe(true);
      });

      it("has limited role permissions", () => {
        expect(hasPermission("admin", PERMISSIONS.ROLE_VIEW)).toBe(true);
        expect(hasPermission("admin", PERMISSIONS.ROLE_ASSIGN)).toBe(true);
        expect(hasPermission("admin", PERMISSIONS.ROLE_CREATE)).toBe(false);
        expect(hasPermission("admin", PERMISSIONS.ROLE_EDIT)).toBe(false);
        expect(hasPermission("admin", PERMISSIONS.ROLE_DELETE)).toBe(false);
      });

      it("has limited admin permissions", () => {
        expect(hasPermission("admin", PERMISSIONS.ADMIN_DASHBOARD)).toBe(true);
        expect(hasPermission("admin", PERMISSIONS.ADMIN_SETTINGS)).toBe(true);
        expect(hasPermission("admin", PERMISSIONS.ADMIN_AUDIT_LOG)).toBe(true);
        expect(hasPermission("admin", PERMISSIONS.ADMIN_BILLING)).toBe(false);
      });
    });

    describe("Moderator role", () => {
      it("has moderator-level message permissions", () => {
        expect(hasPermission("moderator", PERMISSIONS.MESSAGE_SEND)).toBe(true);
        expect(hasPermission("moderator", PERMISSIONS.MESSAGE_EDIT)).toBe(true);
        expect(hasPermission("moderator", PERMISSIONS.MESSAGE_DELETE)).toBe(
          true,
        );
        expect(
          hasPermission("moderator", PERMISSIONS.MESSAGE_DELETE_OTHERS),
        ).toBe(true);
        expect(hasPermission("moderator", PERMISSIONS.MESSAGE_PIN)).toBe(true);
      });

      it("has limited channel permissions", () => {
        expect(hasPermission("moderator", PERMISSIONS.CHANNEL_MANAGE)).toBe(
          true,
        );
        expect(hasPermission("moderator", PERMISSIONS.CHANNEL_CREATE)).toBe(
          false,
        );
        expect(hasPermission("moderator", PERMISSIONS.CHANNEL_EDIT)).toBe(
          false,
        );
        expect(hasPermission("moderator", PERMISSIONS.CHANNEL_DELETE)).toBe(
          false,
        );
      });

      it("has limited user permissions", () => {
        expect(hasPermission("moderator", PERMISSIONS.USER_VIEW)).toBe(true);
        expect(hasPermission("moderator", PERMISSIONS.USER_MUTE)).toBe(true);
        expect(hasPermission("moderator", PERMISSIONS.USER_KICK)).toBe(true);
        expect(hasPermission("moderator", PERMISSIONS.USER_EDIT)).toBe(false);
        expect(hasPermission("moderator", PERMISSIONS.USER_BAN)).toBe(false);
      });

      it("has no role permissions", () => {
        expect(hasPermission("moderator", PERMISSIONS.ROLE_VIEW)).toBe(false);
        expect(hasPermission("moderator", PERMISSIONS.ROLE_CREATE)).toBe(false);
        expect(hasPermission("moderator", PERMISSIONS.ROLE_EDIT)).toBe(false);
        expect(hasPermission("moderator", PERMISSIONS.ROLE_DELETE)).toBe(false);
        expect(hasPermission("moderator", PERMISSIONS.ROLE_ASSIGN)).toBe(false);
      });

      it("has limited admin permissions", () => {
        expect(hasPermission("moderator", PERMISSIONS.ADMIN_DASHBOARD)).toBe(
          true,
        );
        expect(hasPermission("moderator", PERMISSIONS.ADMIN_SETTINGS)).toBe(
          false,
        );
        expect(hasPermission("moderator", PERMISSIONS.ADMIN_BILLING)).toBe(
          false,
        );
        expect(hasPermission("moderator", PERMISSIONS.ADMIN_AUDIT_LOG)).toBe(
          false,
        );
      });
    });

    describe("Member role", () => {
      it("has basic message permissions", () => {
        expect(hasPermission("member", PERMISSIONS.MESSAGE_SEND)).toBe(true);
        expect(hasPermission("member", PERMISSIONS.MESSAGE_EDIT)).toBe(true);
        expect(hasPermission("member", PERMISSIONS.MESSAGE_DELETE)).toBe(true);
        expect(hasPermission("member", PERMISSIONS.MESSAGE_DELETE_OTHERS)).toBe(
          false,
        );
        expect(hasPermission("member", PERMISSIONS.MESSAGE_PIN)).toBe(false);
      });

      it("has no channel permissions", () => {
        expect(hasPermission("member", PERMISSIONS.CHANNEL_CREATE)).toBe(false);
        expect(hasPermission("member", PERMISSIONS.CHANNEL_EDIT)).toBe(false);
        expect(hasPermission("member", PERMISSIONS.CHANNEL_DELETE)).toBe(false);
        expect(hasPermission("member", PERMISSIONS.CHANNEL_MANAGE)).toBe(false);
      });

      it("has minimal user permissions", () => {
        expect(hasPermission("member", PERMISSIONS.USER_VIEW)).toBe(true);
        expect(hasPermission("member", PERMISSIONS.USER_EDIT)).toBe(false);
        expect(hasPermission("member", PERMISSIONS.USER_BAN)).toBe(false);
        expect(hasPermission("member", PERMISSIONS.USER_KICK)).toBe(false);
        expect(hasPermission("member", PERMISSIONS.USER_MUTE)).toBe(false);
      });

      it("has view-only role permissions", () => {
        expect(hasPermission("member", PERMISSIONS.ROLE_VIEW)).toBe(true);
        expect(hasPermission("member", PERMISSIONS.ROLE_CREATE)).toBe(false);
        expect(hasPermission("member", PERMISSIONS.ROLE_EDIT)).toBe(false);
        expect(hasPermission("member", PERMISSIONS.ROLE_DELETE)).toBe(false);
        expect(hasPermission("member", PERMISSIONS.ROLE_ASSIGN)).toBe(false);
      });

      it("has no admin permissions", () => {
        expect(hasPermission("member", PERMISSIONS.ADMIN_DASHBOARD)).toBe(
          false,
        );
        expect(hasPermission("member", PERMISSIONS.ADMIN_SETTINGS)).toBe(false);
        expect(hasPermission("member", PERMISSIONS.ADMIN_BILLING)).toBe(false);
        expect(hasPermission("member", PERMISSIONS.ADMIN_AUDIT_LOG)).toBe(
          false,
        );
      });
    });

    describe("Guest role", () => {
      it("has minimal permissions", () => {
        expect(hasPermission("guest", PERMISSIONS.USER_VIEW)).toBe(true);
      });

      it("has no message permissions", () => {
        expect(hasPermission("guest", PERMISSIONS.MESSAGE_SEND)).toBe(false);
        expect(hasPermission("guest", PERMISSIONS.MESSAGE_EDIT)).toBe(false);
        expect(hasPermission("guest", PERMISSIONS.MESSAGE_DELETE)).toBe(false);
        expect(hasPermission("guest", PERMISSIONS.MESSAGE_DELETE_OTHERS)).toBe(
          false,
        );
        expect(hasPermission("guest", PERMISSIONS.MESSAGE_PIN)).toBe(false);
      });

      it("has no channel permissions", () => {
        expect(hasPermission("guest", PERMISSIONS.CHANNEL_CREATE)).toBe(false);
        expect(hasPermission("guest", PERMISSIONS.CHANNEL_EDIT)).toBe(false);
        expect(hasPermission("guest", PERMISSIONS.CHANNEL_DELETE)).toBe(false);
        expect(hasPermission("guest", PERMISSIONS.CHANNEL_MANAGE)).toBe(false);
      });

      it("has no user management permissions", () => {
        expect(hasPermission("guest", PERMISSIONS.USER_EDIT)).toBe(false);
        expect(hasPermission("guest", PERMISSIONS.USER_BAN)).toBe(false);
        expect(hasPermission("guest", PERMISSIONS.USER_KICK)).toBe(false);
        expect(hasPermission("guest", PERMISSIONS.USER_MUTE)).toBe(false);
      });

      it("has no role permissions", () => {
        expect(hasPermission("guest", PERMISSIONS.ROLE_VIEW)).toBe(false);
        expect(hasPermission("guest", PERMISSIONS.ROLE_CREATE)).toBe(false);
        expect(hasPermission("guest", PERMISSIONS.ROLE_EDIT)).toBe(false);
        expect(hasPermission("guest", PERMISSIONS.ROLE_DELETE)).toBe(false);
        expect(hasPermission("guest", PERMISSIONS.ROLE_ASSIGN)).toBe(false);
      });

      it("has no admin permissions", () => {
        expect(hasPermission("guest", PERMISSIONS.ADMIN_DASHBOARD)).toBe(false);
        expect(hasPermission("guest", PERMISSIONS.ADMIN_SETTINGS)).toBe(false);
        expect(hasPermission("guest", PERMISSIONS.ADMIN_BILLING)).toBe(false);
        expect(hasPermission("guest", PERMISSIONS.ADMIN_AUDIT_LOG)).toBe(false);
      });
    });
  });

  describe("hasRole", () => {
    describe("Role hierarchy is respected", () => {
      it("owner has all roles", () => {
        expect(hasRole("owner", "owner")).toBe(true);
        expect(hasRole("owner", "admin")).toBe(true);
        expect(hasRole("owner", "moderator")).toBe(true);
        expect(hasRole("owner", "member")).toBe(true);
        expect(hasRole("owner", "guest")).toBe(true);
      });

      it("admin has admin and below", () => {
        expect(hasRole("admin", "owner")).toBe(false);
        expect(hasRole("admin", "admin")).toBe(true);
        expect(hasRole("admin", "moderator")).toBe(true);
        expect(hasRole("admin", "member")).toBe(true);
        expect(hasRole("admin", "guest")).toBe(true);
      });

      it("moderator has moderator and below", () => {
        expect(hasRole("moderator", "owner")).toBe(false);
        expect(hasRole("moderator", "admin")).toBe(false);
        expect(hasRole("moderator", "moderator")).toBe(true);
        expect(hasRole("moderator", "member")).toBe(true);
        expect(hasRole("moderator", "guest")).toBe(true);
      });

      it("member has member and below", () => {
        expect(hasRole("member", "owner")).toBe(false);
        expect(hasRole("member", "admin")).toBe(false);
        expect(hasRole("member", "moderator")).toBe(false);
        expect(hasRole("member", "member")).toBe(true);
        expect(hasRole("member", "guest")).toBe(true);
      });

      it("guest only has guest", () => {
        expect(hasRole("guest", "owner")).toBe(false);
        expect(hasRole("guest", "admin")).toBe(false);
        expect(hasRole("guest", "moderator")).toBe(false);
        expect(hasRole("guest", "member")).toBe(false);
        expect(hasRole("guest", "guest")).toBe(true);
      });
    });

    it("uses correct hierarchy values", () => {
      expect(ROLE_HIERARCHY.owner).toBe(100);
      expect(ROLE_HIERARCHY.admin).toBe(90);
      expect(ROLE_HIERARCHY.moderator).toBe(70);
      expect(ROLE_HIERARCHY.member).toBe(20);
      expect(ROLE_HIERARCHY.guest).toBe(10);
    });
  });

  describe("canManageRole", () => {
    describe("Owner role management", () => {
      it("owner can manage all roles except owner", () => {
        expect(canManageRole("owner", "admin")).toBe(true);
        expect(canManageRole("owner", "moderator")).toBe(true);
        expect(canManageRole("owner", "member")).toBe(true);
        expect(canManageRole("owner", "guest")).toBe(true);
      });

      it("owner cannot manage other owners", () => {
        expect(canManageRole("owner", "owner")).toBe(false);
      });
    });

    describe("Admin role management", () => {
      it("admin can manage roles below them", () => {
        expect(canManageRole("admin", "moderator")).toBe(true);
        expect(canManageRole("admin", "member")).toBe(true);
        expect(canManageRole("admin", "guest")).toBe(true);
      });

      it("admin cannot manage owner or admin", () => {
        expect(canManageRole("admin", "owner")).toBe(false);
        expect(canManageRole("admin", "admin")).toBe(false);
      });
    });

    describe("Moderator role management", () => {
      it("moderator can manage roles below them", () => {
        expect(canManageRole("moderator", "member")).toBe(true);
        expect(canManageRole("moderator", "guest")).toBe(true);
      });

      it("moderator cannot manage owner, admin, or moderator", () => {
        expect(canManageRole("moderator", "owner")).toBe(false);
        expect(canManageRole("moderator", "admin")).toBe(false);
        expect(canManageRole("moderator", "moderator")).toBe(false);
      });
    });

    describe("Member role management", () => {
      it("member can manage roles below them", () => {
        expect(canManageRole("member", "guest")).toBe(true);
      });

      it("member cannot manage owner, admin, moderator, or member", () => {
        expect(canManageRole("member", "owner")).toBe(false);
        expect(canManageRole("member", "admin")).toBe(false);
        expect(canManageRole("member", "moderator")).toBe(false);
        expect(canManageRole("member", "member")).toBe(false);
      });
    });

    describe("Guest role management", () => {
      it("guest cannot manage any role", () => {
        expect(canManageRole("guest", "owner")).toBe(false);
        expect(canManageRole("guest", "admin")).toBe(false);
        expect(canManageRole("guest", "moderator")).toBe(false);
        expect(canManageRole("guest", "member")).toBe(false);
        expect(canManageRole("guest", "guest")).toBe(false);
      });
    });
  });

  describe("isOwner", () => {
    it("returns true for owner role", () => {
      expect(isOwner("owner")).toBe(true);
    });

    it("returns false for all other roles", () => {
      expect(isOwner("admin")).toBe(false);
      expect(isOwner("moderator")).toBe(false);
      expect(isOwner("member")).toBe(false);
      expect(isOwner("guest")).toBe(false);
    });
  });

  describe("canModifyUser", () => {
    describe("Owner protection", () => {
      it("nobody can delete an owner", () => {
        expect(canModifyUser("owner", "owner", "delete")).toBe(false);
        expect(canModifyUser("admin", "owner", "delete")).toBe(false);
        expect(canModifyUser("moderator", "owner", "delete")).toBe(false);
        expect(canModifyUser("member", "owner", "delete")).toBe(false);
        expect(canModifyUser("guest", "owner", "delete")).toBe(false);
      });

      it("nobody can demote an owner", () => {
        expect(canModifyUser("owner", "owner", "demote")).toBe(false);
        expect(canModifyUser("admin", "owner", "demote")).toBe(false);
        expect(canModifyUser("moderator", "owner", "demote")).toBe(false);
        expect(canModifyUser("member", "owner", "demote")).toBe(false);
        expect(canModifyUser("guest", "owner", "demote")).toBe(false);
      });

      it("nobody can ban an owner", () => {
        expect(canModifyUser("owner", "owner", "ban")).toBe(false);
        expect(canModifyUser("admin", "owner", "ban")).toBe(false);
        expect(canModifyUser("moderator", "owner", "ban")).toBe(false);
        expect(canModifyUser("member", "owner", "ban")).toBe(false);
        expect(canModifyUser("guest", "owner", "ban")).toBe(false);
      });
    });

    describe("Role hierarchy for user modification", () => {
      it("owner can modify users with any role except owner", () => {
        expect(canModifyUser("owner", "admin", "delete")).toBe(true);
        expect(canModifyUser("owner", "admin", "demote")).toBe(true);
        expect(canModifyUser("owner", "admin", "ban")).toBe(true);
        expect(canModifyUser("owner", "moderator", "delete")).toBe(true);
        expect(canModifyUser("owner", "member", "delete")).toBe(true);
        expect(canModifyUser("owner", "guest", "delete")).toBe(true);
      });

      it("admin can modify users below them", () => {
        expect(canModifyUser("admin", "moderator", "delete")).toBe(true);
        expect(canModifyUser("admin", "moderator", "demote")).toBe(true);
        expect(canModifyUser("admin", "moderator", "ban")).toBe(true);
        expect(canModifyUser("admin", "member", "delete")).toBe(true);
        expect(canModifyUser("admin", "guest", "delete")).toBe(true);
      });

      it("admin cannot modify admin or above", () => {
        expect(canModifyUser("admin", "admin", "delete")).toBe(false);
        expect(canModifyUser("admin", "admin", "demote")).toBe(false);
        expect(canModifyUser("admin", "admin", "ban")).toBe(false);
      });

      it("moderator can modify users below them", () => {
        expect(canModifyUser("moderator", "member", "delete")).toBe(true);
        expect(canModifyUser("moderator", "member", "demote")).toBe(true);
        expect(canModifyUser("moderator", "member", "ban")).toBe(true);
        expect(canModifyUser("moderator", "guest", "delete")).toBe(true);
      });

      it("moderator cannot modify moderator or above", () => {
        expect(canModifyUser("moderator", "moderator", "delete")).toBe(false);
        expect(canModifyUser("moderator", "admin", "delete")).toBe(false);
      });

      it("member can modify only guest", () => {
        expect(canModifyUser("member", "guest", "delete")).toBe(true);
        expect(canModifyUser("member", "guest", "demote")).toBe(true);
        expect(canModifyUser("member", "guest", "ban")).toBe(true);
      });

      it("member cannot modify member or above", () => {
        expect(canModifyUser("member", "member", "delete")).toBe(false);
        expect(canModifyUser("member", "moderator", "delete")).toBe(false);
        expect(canModifyUser("member", "admin", "delete")).toBe(false);
      });

      it("guest cannot modify anyone", () => {
        expect(canModifyUser("guest", "guest", "delete")).toBe(false);
        expect(canModifyUser("guest", "member", "delete")).toBe(false);
        expect(canModifyUser("guest", "moderator", "delete")).toBe(false);
        expect(canModifyUser("guest", "admin", "delete")).toBe(false);
      });
    });
  });

  describe("getRolePermissions", () => {
    it("returns all permissions for owner", () => {
      const ownerPerms = getRolePermissions("owner");
      expect(ownerPerms).toEqual(Object.values(PERMISSIONS));
      expect(ownerPerms.length).toBe(Object.values(PERMISSIONS).length);
    });

    it("returns correct permissions for admin", () => {
      const adminPerms = getRolePermissions("admin");
      expect(adminPerms).toContain(PERMISSIONS.MESSAGE_SEND);
      expect(adminPerms).toContain(PERMISSIONS.USER_BAN);
      expect(adminPerms).toContain(PERMISSIONS.ADMIN_DASHBOARD);
      expect(adminPerms).not.toContain(PERMISSIONS.ROLE_CREATE);
      expect(adminPerms).not.toContain(PERMISSIONS.ADMIN_BILLING);
    });

    it("returns correct permissions for moderator", () => {
      const modPerms = getRolePermissions("moderator");
      expect(modPerms).toContain(PERMISSIONS.MESSAGE_SEND);
      expect(modPerms).toContain(PERMISSIONS.MESSAGE_DELETE_OTHERS);
      expect(modPerms).toContain(PERMISSIONS.USER_KICK);
      expect(modPerms).not.toContain(PERMISSIONS.USER_BAN);
      expect(modPerms).not.toContain(PERMISSIONS.CHANNEL_CREATE);
    });

    it("returns correct permissions for member", () => {
      const memberPerms = getRolePermissions("member");
      expect(memberPerms).toContain(PERMISSIONS.MESSAGE_SEND);
      expect(memberPerms).toContain(PERMISSIONS.MESSAGE_EDIT);
      expect(memberPerms).toContain(PERMISSIONS.USER_VIEW);
      expect(memberPerms).not.toContain(PERMISSIONS.MESSAGE_DELETE_OTHERS);
      expect(memberPerms).not.toContain(PERMISSIONS.ADMIN_DASHBOARD);
    });

    it("returns minimal permissions for guest", () => {
      const guestPerms = getRolePermissions("guest");
      expect(guestPerms).toEqual([PERMISSIONS.USER_VIEW]);
      expect(guestPerms.length).toBe(1);
    });

    it("returns empty array for unknown role", () => {
      const unknownPerms = getRolePermissions("unknown" as Role);
      expect(unknownPerms).toEqual([]);
    });
  });

  describe("getRoleDisplayName", () => {
    it("capitalizes first letter of role name", () => {
      expect(getRoleDisplayName("owner")).toBe("Owner");
      expect(getRoleDisplayName("admin")).toBe("Admin");
      expect(getRoleDisplayName("moderator")).toBe("Moderator");
      expect(getRoleDisplayName("member")).toBe("Member");
      expect(getRoleDisplayName("guest")).toBe("Guest");
    });
  });

  describe("getAllRolesSorted", () => {
    it("returns all roles sorted by hierarchy (highest first)", () => {
      const sortedRoles = getAllRolesSorted();
      expect(sortedRoles).toEqual([
        "owner",
        "admin",
        "moderator",
        "member",
        "guest",
      ]);
    });

    it("returns all 5 roles", () => {
      const sortedRoles = getAllRolesSorted();
      expect(sortedRoles.length).toBe(5);
    });

    it("has owner at index 0 (highest)", () => {
      const sortedRoles = getAllRolesSorted();
      expect(sortedRoles[0]).toBe("owner");
    });

    it("has guest at last index (lowest)", () => {
      const sortedRoles = getAllRolesSorted();
      expect(sortedRoles[sortedRoles.length - 1]).toBe("guest");
    });
  });

  describe("DEFAULT_ROLE_PERMISSIONS", () => {
    it("has entries for all roles", () => {
      expect(DEFAULT_ROLE_PERMISSIONS).toHaveProperty("owner");
      expect(DEFAULT_ROLE_PERMISSIONS).toHaveProperty("admin");
      expect(DEFAULT_ROLE_PERMISSIONS).toHaveProperty("moderator");
      expect(DEFAULT_ROLE_PERMISSIONS).toHaveProperty("member");
      expect(DEFAULT_ROLE_PERMISSIONS).toHaveProperty("guest");
    });

    it("owner permissions include all defined permissions", () => {
      const allPermissions = Object.values(PERMISSIONS);
      const ownerPerms = DEFAULT_ROLE_PERMISSIONS.owner;

      allPermissions.forEach((perm) => {
        expect(ownerPerms).toContain(perm);
      });
    });

    it("permission count decreases down the hierarchy", () => {
      const ownerCount = DEFAULT_ROLE_PERMISSIONS.owner.length;
      const adminCount = DEFAULT_ROLE_PERMISSIONS.admin.length;
      const modCount = DEFAULT_ROLE_PERMISSIONS.moderator.length;
      const memberCount = DEFAULT_ROLE_PERMISSIONS.member.length;
      const guestCount = DEFAULT_ROLE_PERMISSIONS.guest.length;

      expect(ownerCount).toBeGreaterThan(adminCount);
      expect(adminCount).toBeGreaterThan(modCount);
      expect(modCount).toBeGreaterThan(memberCount);
      expect(memberCount).toBeGreaterThan(guestCount);
    });
  });

  describe("Edge cases and security", () => {
    it("users can only manage roles strictly below them", () => {
      const roles: Role[] = ["owner", "admin", "moderator", "member", "guest"];

      roles.forEach((actorRole, actorIndex) => {
        roles.forEach((targetRole, targetIndex) => {
          const canManage = canManageRole(actorRole, targetRole);

          if (actorRole === "owner") {
            // Owner can manage anyone except owner
            expect(canManage).toBe(targetRole !== "owner");
          } else {
            // Others can only manage roles strictly below them
            expect(canManage).toBe(
              ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole],
            );
          }
        });
      });
    });

    it("owner is the only role that can access billing", () => {
      expect(hasPermission("owner", PERMISSIONS.ADMIN_BILLING)).toBe(true);
      expect(hasPermission("admin", PERMISSIONS.ADMIN_BILLING)).toBe(false);
      expect(hasPermission("moderator", PERMISSIONS.ADMIN_BILLING)).toBe(false);
      expect(hasPermission("member", PERMISSIONS.ADMIN_BILLING)).toBe(false);
      expect(hasPermission("guest", PERMISSIONS.ADMIN_BILLING)).toBe(false);
    });

    it("owner is the only role that can create/edit/delete roles", () => {
      const roleModifyPerms = [
        PERMISSIONS.ROLE_CREATE,
        PERMISSIONS.ROLE_EDIT,
        PERMISSIONS.ROLE_DELETE,
      ];

      roleModifyPerms.forEach((perm) => {
        expect(hasPermission("owner", perm)).toBe(true);
        expect(hasPermission("admin", perm)).toBe(false);
        expect(hasPermission("moderator", perm)).toBe(false);
        expect(hasPermission("member", perm)).toBe(false);
        expect(hasPermission("guest", perm)).toBe(false);
      });
    });
  });
});
