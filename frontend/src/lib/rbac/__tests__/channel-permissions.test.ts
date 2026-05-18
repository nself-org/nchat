import {
  ChannelPermissionManager,
  createChannelPermissionManager,
  createOverride,
  createBan,
  createInvite,
  createReadOnlyOverride,
  createAnnouncementOverride,
  createMutedUserOverride,
  type ChannelPermissionOverride,
  type ChannelBan,
  type ChannelInvite,
  type ChannelPermissionContext,
} from "../channel-permissions";
import { PERMISSIONS, type Permission } from "@/types/rbac";

describe("Channel Permissions", () => {
  describe("ChannelPermissionManager", () => {
    let manager: ChannelPermissionManager;

    beforeEach(() => {
      manager = createChannelPermissionManager();
    });

    describe("Override Management", () => {
      describe("addOverride", () => {
        it("adds a new override", () => {
          const override = createOverride({
            channelId: "channel1",
            targetType: "user",
            targetId: "user1",
            allow: [PERMISSIONS.MESSAGE_SEND],
            createdBy: "admin1",
          });

          manager.addOverride(override);

          const overrides = manager.getOverrides("channel1");
          expect(overrides).toHaveLength(1);
          expect(overrides[0].targetId).toBe("user1");
        });

        it("replaces existing override for same target", () => {
          const override1 = createOverride({
            channelId: "channel1",
            targetType: "user",
            targetId: "user1",
            allow: [PERMISSIONS.MESSAGE_SEND],
            createdBy: "admin1",
          });

          const override2 = createOverride({
            channelId: "channel1",
            targetType: "user",
            targetId: "user1",
            allow: [PERMISSIONS.MESSAGE_EDIT],
            createdBy: "admin1",
          });

          manager.addOverride(override1);
          manager.addOverride(override2);

          const overrides = manager.getOverrides("channel1");
          expect(overrides).toHaveLength(1);
          expect(overrides[0].allow).toContain(PERMISSIONS.MESSAGE_EDIT);
        });

        it("allows multiple overrides for different targets", () => {
          const userOverride = createOverride({
            channelId: "channel1",
            targetType: "user",
            targetId: "user1",
            createdBy: "admin1",
          });

          const roleOverride = createOverride({
            channelId: "channel1",
            targetType: "role",
            targetId: "member",
            createdBy: "admin1",
          });

          manager.addOverride(userOverride);
          manager.addOverride(roleOverride);

          const overrides = manager.getOverrides("channel1");
          expect(overrides).toHaveLength(2);
        });
      });

      describe("removeOverride", () => {
        it("removes an existing override", () => {
          const override = createOverride({
            channelId: "channel1",
            targetType: "user",
            targetId: "user1",
            createdBy: "admin1",
          });

          manager.addOverride(override);
          const removed = manager.removeOverride("channel1", "user", "user1");

          expect(removed).toBe(true);
          expect(manager.getOverrides("channel1")).toHaveLength(0);
        });

        it("returns false when override not found", () => {
          const removed = manager.removeOverride("channel1", "user", "user1");
          expect(removed).toBe(false);
        });

        it("only removes the specified override", () => {
          const override1 = createOverride({
            channelId: "channel1",
            targetType: "user",
            targetId: "user1",
            createdBy: "admin1",
          });

          const override2 = createOverride({
            channelId: "channel1",
            targetType: "user",
            targetId: "user2",
            createdBy: "admin1",
          });

          manager.addOverride(override1);
          manager.addOverride(override2);
          manager.removeOverride("channel1", "user", "user1");

          const overrides = manager.getOverrides("channel1");
          expect(overrides).toHaveLength(1);
          expect(overrides[0].targetId).toBe("user2");
        });
      });

      describe("getOverrides", () => {
        it("returns empty array for channel with no overrides", () => {
          expect(manager.getOverrides("channel1")).toEqual([]);
        });

        it("returns all overrides for a channel", () => {
          manager.addOverride(
            createOverride({
              channelId: "channel1",
              targetType: "user",
              targetId: "user1",
              createdBy: "admin1",
            }),
          );

          manager.addOverride(
            createOverride({
              channelId: "channel1",
              targetType: "role",
              targetId: "member",
              createdBy: "admin1",
            }),
          );

          expect(manager.getOverrides("channel1")).toHaveLength(2);
        });
      });

      describe("getOverride", () => {
        it("returns undefined when override not found", () => {
          expect(
            manager.getOverride("channel1", "user", "user1"),
          ).toBeUndefined();
        });

        it("returns specific override", () => {
          const override = createOverride({
            channelId: "channel1",
            targetType: "user",
            targetId: "user1",
            allow: [PERMISSIONS.MESSAGE_SEND],
            createdBy: "admin1",
          });

          manager.addOverride(override);

          const found = manager.getOverride("channel1", "user", "user1");
          expect(found).toBeDefined();
          expect(found?.allow).toContain(PERMISSIONS.MESSAGE_SEND);
        });
      });

      describe("clearOverrides", () => {
        it("removes all overrides for a channel", () => {
          manager.addOverride(
            createOverride({
              channelId: "channel1",
              targetType: "user",
              targetId: "user1",
              createdBy: "admin1",
            }),
          );

          manager.addOverride(
            createOverride({
              channelId: "channel1",
              targetType: "role",
              targetId: "member",
              createdBy: "admin1",
            }),
          );

          manager.clearOverrides("channel1");

          expect(manager.getOverrides("channel1")).toHaveLength(0);
        });
      });
    });

    describe("Ban Management", () => {
      describe("banUser", () => {
        it("bans a user from a channel", () => {
          const ban = createBan({
            channelId: "channel1",
            userId: "user1",
            bannedBy: "admin1",
          });

          manager.banUser(ban);

          expect(manager.isBanned("channel1", "user1")).toBe(true);
        });

        it("replaces existing ban for same user", () => {
          const ban1 = createBan({
            channelId: "channel1",
            userId: "user1",
            bannedBy: "admin1",
            reason: "First reason",
          });

          const ban2 = createBan({
            channelId: "channel1",
            userId: "user1",
            bannedBy: "admin1",
            reason: "Second reason",
          });

          manager.banUser(ban1);
          manager.banUser(ban2);

          const bans = manager.getChannelBans("channel1");
          expect(bans).toHaveLength(1);
          expect(bans[0].reason).toBe("Second reason");
        });
      });

      describe("unbanUser", () => {
        it("unbans a user from a channel", () => {
          const ban = createBan({
            channelId: "channel1",
            userId: "user1",
            bannedBy: "admin1",
          });

          manager.banUser(ban);
          const result = manager.unbanUser("channel1", "user1");

          expect(result).toBe(true);
          expect(manager.isBanned("channel1", "user1")).toBe(false);
        });

        it("returns false when user is not banned", () => {
          const result = manager.unbanUser("channel1", "user1");
          expect(result).toBe(false);
        });
      });

      describe("isBanned", () => {
        it("returns false for non-banned user", () => {
          expect(manager.isBanned("channel1", "user1")).toBe(false);
        });

        it("returns true for banned user", () => {
          manager.banUser(
            createBan({
              channelId: "channel1",
              userId: "user1",
              bannedBy: "admin1",
            }),
          );

          expect(manager.isBanned("channel1", "user1")).toBe(true);
        });

        it("returns false for expired ban", () => {
          const pastDate = new Date();
          pastDate.setMinutes(pastDate.getMinutes() - 10);

          manager.banUser(
            createBan({
              channelId: "channel1",
              userId: "user1",
              bannedBy: "admin1",
              expiresAt: pastDate,
            }),
          );

          expect(manager.isBanned("channel1", "user1")).toBe(false);
        });

        it("returns true for non-expired ban", () => {
          const futureDate = new Date();
          futureDate.setMinutes(futureDate.getMinutes() + 10);

          manager.banUser(
            createBan({
              channelId: "channel1",
              userId: "user1",
              bannedBy: "admin1",
              expiresAt: futureDate,
            }),
          );

          expect(manager.isBanned("channel1", "user1")).toBe(true);
        });
      });

      describe("getBan", () => {
        it("returns undefined for non-banned user", () => {
          expect(manager.getBan("channel1", "user1")).toBeUndefined();
        });

        it("returns ban entry", () => {
          manager.banUser(
            createBan({
              channelId: "channel1",
              userId: "user1",
              bannedBy: "admin1",
              reason: "Spam",
            }),
          );

          const ban = manager.getBan("channel1", "user1");
          expect(ban).toBeDefined();
          expect(ban?.reason).toBe("Spam");
        });
      });

      describe("getChannelBans", () => {
        it("returns empty array for channel with no bans", () => {
          expect(manager.getChannelBans("channel1")).toEqual([]);
        });

        it("returns all bans for a channel", () => {
          manager.banUser(
            createBan({
              channelId: "channel1",
              userId: "user1",
              bannedBy: "admin1",
            }),
          );

          manager.banUser(
            createBan({
              channelId: "channel1",
              userId: "user2",
              bannedBy: "admin1",
            }),
          );

          expect(manager.getChannelBans("channel1")).toHaveLength(2);
        });
      });

      describe("clearBans", () => {
        it("removes all bans for a channel", () => {
          manager.banUser(
            createBan({
              channelId: "channel1",
              userId: "user1",
              bannedBy: "admin1",
            }),
          );

          manager.clearBans("channel1");

          expect(manager.getChannelBans("channel1")).toHaveLength(0);
        });
      });
    });

    describe("Invite Management", () => {
      describe("createInvite", () => {
        it("creates a channel invite", () => {
          const invite = createInvite({
            channelId: "channel1",
            createdBy: "user1",
          });

          manager.createInvite(invite);

          const invites = manager.getChannelInvites("channel1");
          expect(invites).toHaveLength(1);
        });

        it("allows multiple invites for same channel", () => {
          manager.createInvite(
            createInvite({
              channelId: "channel1",
              createdBy: "user1",
            }),
          );

          manager.createInvite(
            createInvite({
              channelId: "channel1",
              createdBy: "user2",
            }),
          );

          expect(manager.getChannelInvites("channel1")).toHaveLength(2);
        });
      });

      describe("getInviteByCode", () => {
        it("returns undefined for invalid code", () => {
          expect(manager.getInviteByCode("invalid")).toBeUndefined();
        });

        it("returns invite by code", () => {
          const invite = createInvite({
            channelId: "channel1",
            createdBy: "user1",
            code: "ABC123",
          });

          manager.createInvite(invite);

          const found = manager.getInviteByCode("ABC123");
          expect(found).toBeDefined();
          expect(found?.channelId).toBe("channel1");
        });
      });

      describe("useInvite", () => {
        it("increments use count", () => {
          const invite = createInvite({
            channelId: "channel1",
            createdBy: "user1",
            code: "ABC123",
          });

          manager.createInvite(invite);

          const result = manager.useInvite("ABC123");
          const found = manager.getInviteByCode("ABC123");

          expect(result).toBe(true);
          expect(found?.uses).toBe(1);
        });

        it("returns false for invalid code", () => {
          expect(manager.useInvite("invalid")).toBe(false);
        });

        it("returns false for expired invite", () => {
          const pastDate = new Date();
          pastDate.setMinutes(pastDate.getMinutes() - 10);

          const invite = createInvite({
            channelId: "channel1",
            createdBy: "user1",
            code: "ABC123",
            expiresAt: pastDate,
          });

          manager.createInvite(invite);

          expect(manager.useInvite("ABC123")).toBe(false);
        });

        it("deactivates invite when max uses reached", () => {
          const invite = createInvite({
            channelId: "channel1",
            createdBy: "user1",
            code: "ABC123",
            maxUses: 2,
          });

          manager.createInvite(invite);

          manager.useInvite("ABC123");
          manager.useInvite("ABC123");

          const found = manager.getInviteByCode("ABC123");
          expect(found?.isActive).toBe(false);
        });

        it("returns false for deactivated invite", () => {
          const invite = createInvite({
            channelId: "channel1",
            createdBy: "user1",
            code: "ABC123",
            maxUses: 1,
          });

          manager.createInvite(invite);
          manager.useInvite("ABC123");

          expect(manager.useInvite("ABC123")).toBe(false);
        });
      });

      describe("isInviteValid", () => {
        it("returns true for valid invite", () => {
          const invite = createInvite({
            channelId: "channel1",
            createdBy: "user1",
          });

          expect(manager.isInviteValid(invite)).toBe(true);
        });

        it("returns false for inactive invite", () => {
          const invite = createInvite({
            channelId: "channel1",
            createdBy: "user1",
          });
          invite.isActive = false;

          expect(manager.isInviteValid(invite)).toBe(false);
        });

        it("returns false for expired invite", () => {
          const pastDate = new Date();
          pastDate.setMinutes(pastDate.getMinutes() - 10);

          const invite = createInvite({
            channelId: "channel1",
            createdBy: "user1",
            expiresAt: pastDate,
          });

          expect(manager.isInviteValid(invite)).toBe(false);
        });

        it("returns false for max uses reached", () => {
          const invite = createInvite({
            channelId: "channel1",
            createdBy: "user1",
            maxUses: 5,
          });
          invite.uses = 5;

          expect(manager.isInviteValid(invite)).toBe(false);
        });
      });

      describe("revokeInvite", () => {
        it("deactivates an invite", () => {
          const invite = createInvite({
            channelId: "channel1",
            createdBy: "user1",
            code: "ABC123",
          });

          manager.createInvite(invite);

          const result = manager.revokeInvite("ABC123");
          const found = manager.getInviteByCode("ABC123");

          expect(result).toBe(true);
          expect(found?.isActive).toBe(false);
        });

        it("returns false for invalid code", () => {
          expect(manager.revokeInvite("invalid")).toBe(false);
        });
      });

      describe("getActiveInvites", () => {
        it("returns only active invites", () => {
          manager.createInvite(
            createInvite({
              channelId: "channel1",
              createdBy: "user1",
              code: "ACTIVE",
            }),
          );

          const inactiveInvite = createInvite({
            channelId: "channel1",
            createdBy: "user1",
            code: "INACTIVE",
          });
          inactiveInvite.isActive = false;
          manager.createInvite(inactiveInvite);

          const activeInvites = manager.getActiveInvites("channel1");
          expect(activeInvites).toHaveLength(1);
          expect(activeInvites[0].code).toBe("ACTIVE");
        });
      });

      describe("clearInvites", () => {
        it("removes all invites for a channel", () => {
          manager.createInvite(
            createInvite({
              channelId: "channel1",
              createdBy: "user1",
            }),
          );

          manager.clearInvites("channel1");

          expect(manager.getChannelInvites("channel1")).toHaveLength(0);
        });
      });
    });

    describe("Permission Checking", () => {
      const basePermissions: Permission[] = [
        PERMISSIONS.MESSAGE_SEND,
        PERMISSIONS.MESSAGE_EDIT,
        PERMISSIONS.USER_VIEW,
      ];

      describe("checkPermission", () => {
        it("allows owner all permissions", () => {
          const context: ChannelPermissionContext = {
            userId: "owner1",
            userRole: "owner",
            channelId: "channel1",
          };

          const result = manager.checkPermission(
            PERMISSIONS.ADMIN_BILLING,
            context,
            basePermissions,
          );

          expect(result.allowed).toBe(true);
          expect(result.grantedBy).toBe("owner-role");
        });

        it("denies banned user all permissions", () => {
          manager.banUser(
            createBan({
              channelId: "channel1",
              userId: "user1",
              bannedBy: "admin1",
            }),
          );

          const context: ChannelPermissionContext = {
            userId: "user1",
            userRole: "member",
            channelId: "channel1",
          };

          const result = manager.checkPermission(
            PERMISSIONS.MESSAGE_SEND,
            context,
            basePermissions,
          );

          expect(result.allowed).toBe(false);
          expect(result.deniedBy).toBe("channel-ban");
        });

        it("applies user override deny", () => {
          manager.addOverride(
            createOverride({
              channelId: "channel1",
              targetType: "user",
              targetId: "user1",
              deny: [PERMISSIONS.MESSAGE_SEND],
              createdBy: "admin1",
            }),
          );

          const context: ChannelPermissionContext = {
            userId: "user1",
            userRole: "member",
            channelId: "channel1",
          };

          const result = manager.checkPermission(
            PERMISSIONS.MESSAGE_SEND,
            context,
            basePermissions,
          );

          expect(result.allowed).toBe(false);
          expect(result.deniedBy).toContain("channel-override-user");
        });

        it("applies user override allow", () => {
          manager.addOverride(
            createOverride({
              channelId: "channel1",
              targetType: "user",
              targetId: "user1",
              allow: [PERMISSIONS.ADMIN_BILLING],
              createdBy: "admin1",
            }),
          );

          const context: ChannelPermissionContext = {
            userId: "user1",
            userRole: "member",
            channelId: "channel1",
          };

          const result = manager.checkPermission(
            PERMISSIONS.ADMIN_BILLING,
            context,
            basePermissions,
          );

          expect(result.allowed).toBe(true);
          expect(result.grantedBy).toContain("channel-override-user");
        });

        it("applies role override deny", () => {
          manager.addOverride(
            createOverride({
              channelId: "channel1",
              targetType: "role",
              targetId: "member",
              deny: [PERMISSIONS.MESSAGE_SEND],
              createdBy: "admin1",
            }),
          );

          const context: ChannelPermissionContext = {
            userId: "user1",
            userRole: "member",
            channelId: "channel1",
          };

          const result = manager.checkPermission(
            PERMISSIONS.MESSAGE_SEND,
            context,
            basePermissions,
          );

          expect(result.allowed).toBe(false);
          expect(result.deniedBy).toContain("channel-override-role");
        });

        it("applies role override allow", () => {
          manager.addOverride(
            createOverride({
              channelId: "channel1",
              targetType: "role",
              targetId: "member",
              allow: [PERMISSIONS.ADMIN_DASHBOARD],
              createdBy: "admin1",
            }),
          );

          const context: ChannelPermissionContext = {
            userId: "user1",
            userRole: "member",
            channelId: "channel1",
          };

          const result = manager.checkPermission(
            PERMISSIONS.ADMIN_DASHBOARD,
            context,
            basePermissions,
          );

          expect(result.allowed).toBe(true);
          expect(result.grantedBy).toContain("channel-override-role");
        });

        it("user override takes precedence over role override", () => {
          // Role denies
          manager.addOverride(
            createOverride({
              channelId: "channel1",
              targetType: "role",
              targetId: "member",
              deny: [PERMISSIONS.MESSAGE_SEND],
              createdBy: "admin1",
            }),
          );

          // User allows
          manager.addOverride(
            createOverride({
              channelId: "channel1",
              targetType: "user",
              targetId: "user1",
              allow: [PERMISSIONS.MESSAGE_SEND],
              createdBy: "admin1",
            }),
          );

          const context: ChannelPermissionContext = {
            userId: "user1",
            userRole: "member",
            channelId: "channel1",
          };

          const result = manager.checkPermission(
            PERMISSIONS.MESSAGE_SEND,
            context,
            basePermissions,
          );

          expect(result.allowed).toBe(true);
        });

        it("falls back to base permissions", () => {
          const context: ChannelPermissionContext = {
            userId: "user1",
            userRole: "member",
            channelId: "channel1",
          };

          const result = manager.checkPermission(
            PERMISSIONS.MESSAGE_SEND,
            context,
            basePermissions,
          );

          expect(result.allowed).toBe(true);
          expect(result.grantedBy).toBe("member-role");
        });

        it("denies permission not in base permissions", () => {
          const context: ChannelPermissionContext = {
            userId: "user1",
            userRole: "member",
            channelId: "channel1",
          };

          const result = manager.checkPermission(
            PERMISSIONS.ADMIN_BILLING,
            context,
            basePermissions,
          );

          expect(result.allowed).toBe(false);
        });
      });

      describe("getEffectivePermissions", () => {
        it("returns empty permissions for banned user", () => {
          manager.banUser(
            createBan({
              channelId: "channel1",
              userId: "user1",
              bannedBy: "admin1",
            }),
          );

          const context: ChannelPermissionContext = {
            userId: "user1",
            userRole: "member",
            channelId: "channel1",
          };

          const effective = manager.getEffectivePermissions(
            context,
            basePermissions,
          );

          expect(effective.permissions).toHaveLength(0);
          expect(effective.isBanned).toBe(true);
        });

        it("applies role overrides", () => {
          manager.addOverride(
            createOverride({
              channelId: "channel1",
              targetType: "role",
              targetId: "member",
              allow: [PERMISSIONS.ADMIN_DASHBOARD],
              deny: [PERMISSIONS.MESSAGE_EDIT],
              createdBy: "admin1",
            }),
          );

          const context: ChannelPermissionContext = {
            userId: "user1",
            userRole: "member",
            channelId: "channel1",
          };

          const effective = manager.getEffectivePermissions(
            context,
            basePermissions,
          );

          expect(effective.permissions).toContain(PERMISSIONS.ADMIN_DASHBOARD);
          expect(effective.permissions).not.toContain(PERMISSIONS.MESSAGE_EDIT);
        });

        it("applies user overrides after role overrides", () => {
          manager.addOverride(
            createOverride({
              channelId: "channel1",
              targetType: "role",
              targetId: "member",
              deny: [PERMISSIONS.MESSAGE_SEND],
              createdBy: "admin1",
            }),
          );

          manager.addOverride(
            createOverride({
              channelId: "channel1",
              targetType: "user",
              targetId: "user1",
              allow: [PERMISSIONS.MESSAGE_SEND],
              createdBy: "admin1",
            }),
          );

          const context: ChannelPermissionContext = {
            userId: "user1",
            userRole: "member",
            channelId: "channel1",
          };

          const effective = manager.getEffectivePermissions(
            context,
            basePermissions,
          );

          expect(effective.permissions).toContain(PERMISSIONS.MESSAGE_SEND);
          expect(effective.overrides).toHaveLength(2);
        });

        it("includes ban expiry information", () => {
          const futureDate = new Date();
          futureDate.setHours(futureDate.getHours() + 1);

          manager.banUser(
            createBan({
              channelId: "channel1",
              userId: "user1",
              bannedBy: "admin1",
              expiresAt: futureDate,
            }),
          );

          const context: ChannelPermissionContext = {
            userId: "user1",
            userRole: "member",
            channelId: "channel1",
          };

          const effective = manager.getEffectivePermissions(
            context,
            basePermissions,
          );

          expect(effective.isBanned).toBe(true);
          expect(effective.banExpiresAt).toEqual(futureDate);
        });
      });

      describe("canInvite", () => {
        it("returns true for user with channel manage permission", () => {
          const context: ChannelPermissionContext = {
            userId: "admin1",
            userRole: "admin",
            channelId: "channel1",
          };

          const result = manager.canInvite(context, [
            PERMISSIONS.CHANNEL_MANAGE,
          ]);

          expect(result).toBe(true);
        });

        it("returns true for moderator role", () => {
          const context: ChannelPermissionContext = {
            userId: "mod1",
            userRole: "moderator",
            channelId: "channel1",
          };

          const result = manager.canInvite(context, []);

          expect(result).toBe(true);
        });

        it("returns false for member without override", () => {
          const context: ChannelPermissionContext = {
            userId: "user1",
            userRole: "member",
            channelId: "channel1",
          };

          const result = manager.canInvite(context, []);

          expect(result).toBe(false);
        });

        it("returns true for member with invite override", () => {
          manager.addOverride(
            createOverride({
              channelId: "channel1",
              targetType: "user",
              targetId: "user1",
              allow: [PERMISSIONS.CHANNEL_MANAGE],
              createdBy: "admin1",
            }),
          );

          const context: ChannelPermissionContext = {
            userId: "user1",
            userRole: "member",
            channelId: "channel1",
          };

          const result = manager.canInvite(context, []);

          expect(result).toBe(true);
        });
      });

      describe("canManagePermissions", () => {
        it("returns true for owner", () => {
          const context: ChannelPermissionContext = {
            userId: "owner1",
            userRole: "owner",
            channelId: "channel1",
          };

          expect(manager.canManagePermissions(context)).toBe(true);
        });

        it("returns true for admin", () => {
          const context: ChannelPermissionContext = {
            userId: "admin1",
            userRole: "admin",
            channelId: "channel1",
          };

          expect(manager.canManagePermissions(context)).toBe(true);
        });

        it("returns true for channel owner", () => {
          const context: ChannelPermissionContext = {
            userId: "user1",
            userRole: "member",
            channelId: "channel1",
            channelOwnerId: "user1",
          };

          expect(manager.canManagePermissions(context)).toBe(true);
        });

        it("returns false for regular member", () => {
          const context: ChannelPermissionContext = {
            userId: "user1",
            userRole: "member",
            channelId: "channel1",
          };

          expect(manager.canManagePermissions(context)).toBe(false);
        });
      });

      describe("canBan", () => {
        it("prevents banning owner", () => {
          const context: ChannelPermissionContext = {
            userId: "admin1",
            userRole: "admin",
            channelId: "channel1",
          };

          const result = manager.canBan(context, "owner1", "owner");

          expect(result.allowed).toBe(false);
          expect(result.reason).toBe("Cannot ban owner");
        });

        it("prevents banning self", () => {
          const context: ChannelPermissionContext = {
            userId: "admin1",
            userRole: "admin",
            channelId: "channel1",
          };

          const result = manager.canBan(context, "admin1", "admin");

          expect(result.allowed).toBe(false);
          expect(result.reason).toBe("Cannot ban yourself");
        });

        it("allows owner to ban anyone except owner", () => {
          const context: ChannelPermissionContext = {
            userId: "owner1",
            userRole: "owner",
            channelId: "channel1",
          };

          expect(manager.canBan(context, "admin1", "admin").allowed).toBe(true);
          expect(manager.canBan(context, "mod1", "moderator").allowed).toBe(
            true,
          );
          expect(manager.canBan(context, "user1", "member").allowed).toBe(true);
        });

        it("allows admin to ban non-admin", () => {
          const context: ChannelPermissionContext = {
            userId: "admin1",
            userRole: "admin",
            channelId: "channel1",
          };

          expect(manager.canBan(context, "mod1", "moderator").allowed).toBe(
            true,
          );
          expect(manager.canBan(context, "user1", "member").allowed).toBe(true);
        });

        it("prevents admin from banning other admin", () => {
          const context: ChannelPermissionContext = {
            userId: "admin1",
            userRole: "admin",
            channelId: "channel1",
          };

          const result = manager.canBan(context, "admin2", "admin");

          expect(result.allowed).toBe(false);
          expect(result.reason).toContain("Admin cannot ban other admins");
        });

        it("allows moderator to ban member/guest", () => {
          const context: ChannelPermissionContext = {
            userId: "mod1",
            userRole: "moderator",
            channelId: "channel1",
          };

          expect(manager.canBan(context, "user1", "member").allowed).toBe(true);
          expect(manager.canBan(context, "guest1", "guest").allowed).toBe(true);
        });

        it("prevents moderator from banning moderator or above", () => {
          const context: ChannelPermissionContext = {
            userId: "mod1",
            userRole: "moderator",
            channelId: "channel1",
          };

          expect(manager.canBan(context, "mod2", "moderator").allowed).toBe(
            false,
          );
          expect(manager.canBan(context, "admin1", "admin").allowed).toBe(
            false,
          );
        });

        it("prevents member from banning anyone", () => {
          const context: ChannelPermissionContext = {
            userId: "user1",
            userRole: "member",
            channelId: "channel1",
          };

          expect(manager.canBan(context, "user2", "member").allowed).toBe(
            false,
          );
          expect(manager.canBan(context, "guest1", "guest").allowed).toBe(
            false,
          );
        });
      });
    });

    describe("Utility Methods", () => {
      describe("clearChannel", () => {
        it("clears all data for a channel", () => {
          manager.addOverride(
            createOverride({
              channelId: "channel1",
              targetType: "user",
              targetId: "user1",
              createdBy: "admin1",
            }),
          );

          manager.banUser(
            createBan({
              channelId: "channel1",
              userId: "user2",
              bannedBy: "admin1",
            }),
          );

          manager.createInvite(
            createInvite({
              channelId: "channel1",
              createdBy: "user1",
            }),
          );

          manager.clearChannel("channel1");

          expect(manager.getOverrides("channel1")).toHaveLength(0);
          expect(manager.getChannelBans("channel1")).toHaveLength(0);
          expect(manager.getChannelInvites("channel1")).toHaveLength(0);
        });
      });

      describe("getChannelIds", () => {
        it("returns all channel IDs with data", () => {
          manager.addOverride(
            createOverride({
              channelId: "channel1",
              targetType: "user",
              targetId: "user1",
              createdBy: "admin1",
            }),
          );

          manager.banUser(
            createBan({
              channelId: "channel2",
              userId: "user1",
              bannedBy: "admin1",
            }),
          );

          manager.createInvite(
            createInvite({
              channelId: "channel3",
              createdBy: "user1",
            }),
          );

          const ids = manager.getChannelIds();
          expect(ids).toContain("channel1");
          expect(ids).toContain("channel2");
          expect(ids).toContain("channel3");
        });
      });

      describe("exportData / importData", () => {
        it("exports and imports data correctly", () => {
          manager.addOverride(
            createOverride({
              channelId: "channel1",
              targetType: "user",
              targetId: "user1",
              allow: [PERMISSIONS.MESSAGE_SEND],
              createdBy: "admin1",
            }),
          );

          manager.banUser(
            createBan({
              channelId: "channel1",
              userId: "user2",
              bannedBy: "admin1",
            }),
          );

          const exported = manager.exportData();

          const newManager = createChannelPermissionManager();
          newManager.importData(exported);

          expect(newManager.getOverrides("channel1")).toHaveLength(1);
          expect(newManager.isBanned("channel1", "user2")).toBe(true);
        });

        it("handles partial import", () => {
          const newManager = createChannelPermissionManager();
          newManager.importData({ bans: {} });

          expect(newManager.getChannelIds()).toHaveLength(0);
        });
      });
    });
  });

  describe("Factory Functions", () => {
    describe("createOverride", () => {
      it("creates a valid override with defaults", () => {
        const override = createOverride({
          channelId: "channel1",
          targetType: "user",
          targetId: "user1",
          createdBy: "admin1",
        });

        expect(override.id).toBeDefined();
        expect(override.channelId).toBe("channel1");
        expect(override.targetType).toBe("user");
        expect(override.targetId).toBe("user1");
        expect(override.allow).toEqual([]);
        expect(override.deny).toEqual([]);
        expect(override.createdAt).toBeInstanceOf(Date);
        expect(override.createdBy).toBe("admin1");
      });

      it("accepts custom allow/deny lists", () => {
        const override = createOverride({
          channelId: "channel1",
          targetType: "role",
          targetId: "member",
          allow: [PERMISSIONS.MESSAGE_SEND],
          deny: [PERMISSIONS.MESSAGE_DELETE],
          createdBy: "admin1",
        });

        expect(override.allow).toContain(PERMISSIONS.MESSAGE_SEND);
        expect(override.deny).toContain(PERMISSIONS.MESSAGE_DELETE);
      });

      it("accepts expiry date", () => {
        const expiresAt = new Date();
        const override = createOverride({
          channelId: "channel1",
          targetType: "user",
          targetId: "user1",
          createdBy: "admin1",
          expiresAt,
        });

        expect(override.expiresAt).toBe(expiresAt);
      });
    });

    describe("createBan", () => {
      it("creates a valid ban with defaults", () => {
        const ban = createBan({
          channelId: "channel1",
          userId: "user1",
          bannedBy: "admin1",
        });

        expect(ban.id).toBeDefined();
        expect(ban.channelId).toBe("channel1");
        expect(ban.userId).toBe("user1");
        expect(ban.bannedBy).toBe("admin1");
        expect(ban.bannedAt).toBeInstanceOf(Date);
        expect(ban.reason).toBeUndefined();
        expect(ban.expiresAt).toBeUndefined();
      });

      it("accepts reason and expiry", () => {
        const expiresAt = new Date();
        const ban = createBan({
          channelId: "channel1",
          userId: "user1",
          bannedBy: "admin1",
          reason: "Spam",
          expiresAt,
        });

        expect(ban.reason).toBe("Spam");
        expect(ban.expiresAt).toBe(expiresAt);
      });
    });

    describe("createInvite", () => {
      it("creates a valid invite with defaults", () => {
        const invite = createInvite({
          channelId: "channel1",
          createdBy: "user1",
        });

        expect(invite.id).toBeDefined();
        expect(invite.channelId).toBe("channel1");
        expect(invite.code).toBeDefined();
        expect(invite.code.length).toBe(8);
        expect(invite.createdBy).toBe("user1");
        expect(invite.createdAt).toBeInstanceOf(Date);
        expect(invite.uses).toBe(0);
        expect(invite.isActive).toBe(true);
      });

      it("accepts custom code", () => {
        const invite = createInvite({
          channelId: "channel1",
          createdBy: "user1",
          code: "CUSTOM123",
        });

        expect(invite.code).toBe("CUSTOM123");
      });

      it("accepts max uses and expiry", () => {
        const expiresAt = new Date();
        const invite = createInvite({
          channelId: "channel1",
          createdBy: "user1",
          maxUses: 10,
          expiresAt,
        });

        expect(invite.maxUses).toBe(10);
        expect(invite.expiresAt).toBe(expiresAt);
      });
    });

    describe("createChannelPermissionManager", () => {
      it("creates a new manager instance", () => {
        const manager = createChannelPermissionManager();
        expect(manager).toBeInstanceOf(ChannelPermissionManager);
      });
    });
  });

  describe("Pre-built Configurations", () => {
    describe("createReadOnlyOverride", () => {
      it("creates a read-only override", () => {
        const override = createReadOnlyOverride("channel1", "member", "admin1");

        expect(override.channelId).toBe("channel1");
        expect(override.targetType).toBe("role");
        expect(override.targetId).toBe("member");
        expect(override.allow).toContain(PERMISSIONS.USER_VIEW);
        expect(override.deny).toContain(PERMISSIONS.MESSAGE_SEND);
        expect(override.deny).toContain(PERMISSIONS.MESSAGE_EDIT);
        expect(override.deny).toContain(PERMISSIONS.MESSAGE_DELETE);
        expect(override.deny).toContain(PERMISSIONS.MESSAGE_PIN);
      });
    });

    describe("createAnnouncementOverride", () => {
      it("creates an announcement channel override", () => {
        const override = createAnnouncementOverride("channel1", "admin1");

        expect(override.channelId).toBe("channel1");
        expect(override.targetType).toBe("role");
        expect(override.targetId).toBe("member");
        expect(override.allow).toContain(PERMISSIONS.USER_VIEW);
        expect(override.deny).toContain(PERMISSIONS.MESSAGE_SEND);
      });
    });

    describe("createMutedUserOverride", () => {
      it("creates a muted user override with expiry", () => {
        const override = createMutedUserOverride(
          "channel1",
          "user1",
          "admin1",
          30,
        );

        expect(override.channelId).toBe("channel1");
        expect(override.targetType).toBe("user");
        expect(override.targetId).toBe("user1");
        expect(override.deny).toContain(PERMISSIONS.MESSAGE_SEND);
        expect(override.expiresAt).toBeDefined();

        // Expiry should be about 30 minutes from now
        const expectedExpiry = new Date();
        expectedExpiry.setMinutes(expectedExpiry.getMinutes() + 30);
        const diff = Math.abs(
          override.expiresAt!.getTime() - expectedExpiry.getTime(),
        );
        expect(diff).toBeLessThan(1000); // Within 1 second
      });
    });
  });
});
