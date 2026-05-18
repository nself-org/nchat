/**
 * @jest-environment node
 *
 * Extended Workspace Service Tests
 *
 * Tests for advanced workspace management features including:
 * - Ownership transfer
 * - Emergency access
 * - Analytics
 * - Storage quotas
 * - Message retention
 * - Member lifecycle
 * - Onboarding configuration
 */

import { ExtendedWorkspaceService } from "../workspace-extended.service";

// Mock Apollo Client
const mockMutate = jest.fn();
const mockQuery = jest.fn();

const mockClient = {
  mutate: mockMutate,
  query: mockQuery,
} as any;

describe("ExtendedWorkspaceService", () => {
  let service: ExtendedWorkspaceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExtendedWorkspaceService(mockClient);
  });

  // ==========================================================================
  // OWNERSHIP TRANSFER TESTS
  // ==========================================================================

  describe("initiateOwnershipTransfer", () => {
    it("should throw error if workspace not found", async () => {
      mockQuery.mockResolvedValueOnce({
        data: { nchat_workspaces_by_pk: null },
      });

      await expect(
        service.initiateOwnershipTransfer({
          workspaceId: "ws-1",
          currentOwnerId: "user-1",
          newOwnerId: "user-2",
        }),
      ).rejects.toThrow("Workspace not found");
    });

    it("should throw error if current user is not owner", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspaces_by_pk: {
            id: "ws-1",
            owner_id: "other-user",
            name: "Test",
            slug: "test",
            member_count: 5,
            created_at: "2024-01-01",
          },
        },
      });

      await expect(
        service.initiateOwnershipTransfer({
          workspaceId: "ws-1",
          currentOwnerId: "user-1",
          newOwnerId: "user-2",
        }),
      ).rejects.toThrow("Only the current owner can transfer ownership");
    });

    it("should throw error if new owner is not a member", async () => {
      // Mock getWorkspace
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspaces_by_pk: {
            id: "ws-1",
            owner_id: "user-1",
            name: "Test",
            slug: "test",
            member_count: 5,
            created_at: "2024-01-01",
          },
        },
      });

      // Mock checkMembership for new owner
      mockQuery.mockResolvedValueOnce({
        data: { nchat_workspace_members: [] },
      });

      await expect(
        service.initiateOwnershipTransfer({
          workspaceId: "ws-1",
          currentOwnerId: "user-1",
          newOwnerId: "user-2",
        }),
      ).rejects.toThrow("New owner must be a workspace member");
    });

    it("should return pending confirmation when requireConfirmation is true", async () => {
      // Mock getWorkspace
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspaces_by_pk: {
            id: "ws-1",
            owner_id: "user-1",
            name: "Test",
            slug: "test",
            member_count: 5,
            created_at: "2024-01-01",
          },
        },
      });

      // Mock checkMembership for new owner
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspace_members: [
            {
              id: "member-2",
              user_id: "user-2",
              role: "admin",
              workspace_id: "ws-1",
              joined_at: "2024-01-01",
            },
          ],
        },
      });

      const result = await service.initiateOwnershipTransfer({
        workspaceId: "ws-1",
        currentOwnerId: "user-1",
        newOwnerId: "user-2",
        requireConfirmation: true,
      });

      expect(result.success).toBe(true);
      expect(result.pendingConfirmation).toBe(true);
      expect(result.transferId).toBeDefined();
    });

    it("should execute immediate transfer when requireConfirmation is false", async () => {
      // Mock getWorkspace
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspaces_by_pk: {
            id: "ws-1",
            owner_id: "user-1",
            name: "Test",
            slug: "test",
            member_count: 5,
            created_at: "2024-01-01",
          },
        },
      });

      // Mock checkMembership for new owner
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspace_members: [
            {
              id: "member-2",
              user_id: "user-2",
              role: "admin",
              workspace_id: "ws-1",
              joined_at: "2024-01-01",
            },
          ],
        },
      });

      // Mock transferOwnership mutation
      mockMutate.mockResolvedValueOnce({
        data: {
          update_nchat_workspaces_by_pk: { id: "ws-1", owner_id: "user-2" },
        },
      });

      // Mock updated membership queries
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspace_members: [
            {
              id: "member-2",
              user_id: "user-2",
              role: "owner",
              workspace_id: "ws-1",
              joined_at: "2024-01-01",
            },
          ],
        },
      });
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspace_members: [
            {
              id: "member-1",
              user_id: "user-1",
              role: "admin",
              workspace_id: "ws-1",
              joined_at: "2024-01-01",
            },
          ],
        },
      });

      const result = await service.initiateOwnershipTransfer({
        workspaceId: "ws-1",
        currentOwnerId: "user-1",
        newOwnerId: "user-2",
        requireConfirmation: false,
      });

      expect(result.success).toBe(true);
      expect(result.pendingConfirmation).toBe(false);
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  describe("confirmOwnershipTransfer", () => {
    it("should return success", async () => {
      const result = await service.confirmOwnershipTransfer(
        "transfer-1",
        "user-2",
      );
      expect(result.success).toBe(true);
    });
  });

  describe("cancelOwnershipTransfer", () => {
    it("should return true", async () => {
      const result = await service.cancelOwnershipTransfer(
        "transfer-1",
        "user-1",
      );
      expect(result).toBe(true);
    });
  });

  // ==========================================================================
  // EMERGENCY ACCESS TESTS
  // ==========================================================================

  describe("grantEmergencyAccess", () => {
    it("should throw error if workspace not found", async () => {
      mockQuery.mockResolvedValueOnce({
        data: { nchat_workspaces_by_pk: null },
      });

      await expect(
        service.grantEmergencyAccess("ws-1", "user-2", "user-1"),
      ).rejects.toThrow("Workspace not found");
    });

    it("should throw error if granter is not owner", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspaces_by_pk: {
            id: "ws-1",
            owner_id: "other-user",
            name: "Test",
            slug: "test",
            member_count: 5,
            created_at: "2024-01-01",
          },
        },
      });

      await expect(
        service.grantEmergencyAccess("ws-1", "user-2", "user-1"),
      ).rejects.toThrow("Only the owner can grant emergency access");
    });

    it("should throw error if backup owner is not a member", async () => {
      // Mock getWorkspace
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspaces_by_pk: {
            id: "ws-1",
            owner_id: "user-1",
            name: "Test",
            slug: "test",
            member_count: 5,
            created_at: "2024-01-01",
          },
        },
      });

      // Mock checkMembership
      mockQuery.mockResolvedValueOnce({
        data: { nchat_workspace_members: [] },
      });

      await expect(
        service.grantEmergencyAccess("ws-1", "user-2", "user-1"),
      ).rejects.toThrow("Backup owner must be a workspace member");
    });

    it("should create emergency access grant", async () => {
      // Mock getWorkspace
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspaces_by_pk: {
            id: "ws-1",
            owner_id: "user-1",
            name: "Test",
            slug: "test",
            member_count: 5,
            created_at: "2024-01-01",
          },
        },
      });

      // Mock checkMembership
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspace_members: [
            {
              id: "member-2",
              user_id: "user-2",
              role: "admin",
              workspace_id: "ws-1",
              joined_at: "2024-01-01",
            },
          ],
        },
      });

      // Mock mutation
      mockMutate.mockResolvedValueOnce({
        data: {
          insert_nchat_workspace_emergency_access_one: {
            id: "access-1",
            workspace_id: "ws-1",
            backup_owner_id: "user-2",
            granted_by: "user-1",
            granted_at: "2024-01-01",
            expires_at: null,
            is_active: true,
          },
        },
      });

      const result = await service.grantEmergencyAccess(
        "ws-1",
        "user-2",
        "user-1",
      );

      expect(result.id).toBe("access-1");
      expect(result.backupOwnerId).toBe("user-2");
      expect(result.isActive).toBe(true);
    });
  });

  describe("getEmergencyAccess", () => {
    it("should return empty array when no grants", async () => {
      mockQuery.mockResolvedValueOnce({
        data: { nchat_workspace_emergency_access: [] },
      });

      const result = await service.getEmergencyAccess("ws-1");
      expect(result).toEqual([]);
    });

    it("should return emergency access grants", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspace_emergency_access: [
            {
              id: "access-1",
              workspace_id: "ws-1",
              backup_owner_id: "user-2",
              granted_by: "user-1",
              granted_at: "2024-01-01",
              expires_at: null,
              is_active: true,
              backup_owner: {
                id: "user-2",
                username: "backup",
                display_name: "Backup User",
                email: "backup@example.com",
                avatar_url: null,
              },
            },
          ],
        },
      });

      const result = await service.getEmergencyAccess("ws-1");

      expect(result).toHaveLength(1);
      expect(result[0].backupOwnerId).toBe("user-2");
      expect(result[0].backupOwner?.displayName).toBe("Backup User");
    });
  });

  describe("revokeEmergencyAccess", () => {
    it("should revoke access", async () => {
      mockMutate.mockResolvedValueOnce({
        data: {
          update_nchat_workspace_emergency_access_by_pk: {
            id: "access-1",
            is_active: false,
          },
        },
      });

      const result = await service.revokeEmergencyAccess("access-1");
      expect(result).toBe(true);
    });
  });

  // ==========================================================================
  // ANALYTICS TESTS
  // ==========================================================================

  describe("getAnalytics", () => {
    it("should return current stats when no historical data", async () => {
      // Mock analytics query - no data
      mockQuery.mockResolvedValueOnce({
        data: { nchat_workspace_analytics: [] },
      });

      // Mock getWorkspaceStats
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspaces_by_pk: {
            id: "ws-1",
            member_count: 10,
            created_at: "2024-01-01",
            channels_aggregate: { aggregate: { count: 5 } },
            online_members: { aggregate: { count: 3 } },
          },
        },
      });

      const result = await service.getAnalytics("ws-1", "month");

      expect(result).not.toBeNull();
      expect(result?.memberCount).toBe(10);
      expect(result?.channelCount).toBe(5);
      expect(result?.period).toBe("month");
    });

    it("should return historical analytics data", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspace_analytics: [
            {
              id: "analytics-1",
              workspace_id: "ws-1",
              period: "month",
              member_count: 100,
              active_members: 80,
              new_members: 10,
              left_members: 2,
              message_count: 5000,
              file_count: 100,
              storage_used_bytes: 1073741824,
              channel_count: 20,
              active_channels: 15,
              peak_online_members: 50,
              average_online_members: 30,
              created_at: "2024-01-31",
            },
          ],
        },
      });

      const result = await service.getAnalytics("ws-1", "month");

      expect(result).not.toBeNull();
      expect(result?.memberCount).toBe(100);
      expect(result?.activeMembers).toBe(80);
      expect(result?.newMembers).toBe(10);
      expect(result?.messageCount).toBe(5000);
      expect(result?.storageUsedBytes).toBe(1073741824);
    });
  });

  describe("getExtendedStats", () => {
    it("should return combined stats", async () => {
      // Mock getWorkspaceStats
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspaces_by_pk: {
            id: "ws-1",
            member_count: 10,
            created_at: "2024-01-01",
            channels_aggregate: { aggregate: { count: 5 } },
            online_members: { aggregate: { count: 3 } },
          },
        },
      });

      // Mock getStorageQuota
      mockQuery.mockResolvedValueOnce({
        data: { nchat_workspace_storage_quotas_by_pk: null },
      });

      // Mock getMessageRetention
      mockQuery.mockResolvedValueOnce({
        data: { nchat_workspace_retention_policies_by_pk: null },
      });

      const result = await service.getExtendedStats("ws-1");

      expect(result.basic).not.toBeNull();
      expect(result.basic?.memberCount).toBe(10);
      expect(result.storage).toBeNull();
      expect(result.retention).toBeNull();
    });
  });

  // ==========================================================================
  // STORAGE QUOTA TESTS
  // ==========================================================================

  describe("getStorageQuota", () => {
    it("should return null when no quota configured", async () => {
      mockQuery.mockResolvedValueOnce({
        data: { nchat_workspace_storage_quotas_by_pk: null },
      });

      const result = await service.getStorageQuota("ws-1");
      expect(result).toBeNull();
    });

    it("should return storage quota", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspace_storage_quotas_by_pk: {
            workspace_id: "ws-1",
            total_bytes: 10737418240,
            used_bytes: 1073741824,
            file_count: 100,
            max_file_size: 104857600,
            allowed_file_types: ["*"],
            quota_enforced: true,
            warning_threshold: 0.8,
          },
        },
      });

      const result = await service.getStorageQuota("ws-1");

      expect(result).not.toBeNull();
      expect(result?.totalBytes).toBe(10737418240);
      expect(result?.usedBytes).toBe(1073741824);
      expect(result?.quotaEnforced).toBe(true);
    });
  });

  describe("updateStorageQuota", () => {
    it("should update storage quota with defaults", async () => {
      // Mock current quota
      mockQuery.mockResolvedValueOnce({
        data: { nchat_workspace_storage_quotas_by_pk: null },
      });

      // Mock mutation
      mockMutate.mockResolvedValueOnce({
        data: {
          insert_nchat_workspace_storage_quotas_one: {
            workspace_id: "ws-1",
            total_bytes: 10737418240,
          },
        },
      });

      // Mock updated quota fetch
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspace_storage_quotas_by_pk: {
            workspace_id: "ws-1",
            total_bytes: 10737418240,
            used_bytes: 0,
            file_count: 0,
            max_file_size: 104857600,
            allowed_file_types: ["*"],
            quota_enforced: true,
            warning_threshold: 0.8,
          },
        },
      });

      const result = await service.updateStorageQuota("ws-1", {
        quotaEnforced: true,
      });

      expect(result).not.toBeNull();
      expect(result.totalBytes).toBe(10737418240);
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // MESSAGE RETENTION TESTS
  // ==========================================================================

  describe("getMessageRetention", () => {
    it("should return null when no policy configured", async () => {
      mockQuery.mockResolvedValueOnce({
        data: { nchat_workspace_retention_policies_by_pk: null },
      });

      const result = await service.getMessageRetention("ws-1");
      expect(result).toBeNull();
    });

    it("should return retention policy", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspace_retention_policies_by_pk: {
            workspace_id: "ws-1",
            enabled: true,
            retention_days: 90,
            exclude_channel_ids: ["ch-1"],
            exclude_pinned_messages: true,
            exclude_files_older_than: null,
            last_cleanup_at: "2024-01-01",
            messages_deleted: 100,
          },
        },
      });

      const result = await service.getMessageRetention("ws-1");

      expect(result).not.toBeNull();
      expect(result?.enabled).toBe(true);
      expect(result?.retentionDays).toBe(90);
      expect(result?.excludePinnedMessages).toBe(true);
    });
  });

  describe("updateMessageRetention", () => {
    it("should update retention policy", async () => {
      // Mock current policy
      mockQuery.mockResolvedValueOnce({
        data: { nchat_workspace_retention_policies_by_pk: null },
      });

      // Mock mutation
      mockMutate.mockResolvedValueOnce({
        data: {
          insert_nchat_workspace_retention_policies_one: {
            workspace_id: "ws-1",
            enabled: true,
          },
        },
      });

      // Mock updated policy fetch
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspace_retention_policies_by_pk: {
            workspace_id: "ws-1",
            enabled: true,
            retention_days: 365,
            exclude_channel_ids: [],
            exclude_pinned_messages: true,
            exclude_files_older_than: null,
            last_cleanup_at: null,
            messages_deleted: 0,
          },
        },
      });

      const result = await service.updateMessageRetention("ws-1", {
        enabled: true,
      });

      expect(result).not.toBeNull();
      expect(result.enabled).toBe(true);
      expect(mockMutate).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // NOTIFICATION PREFERENCES TESTS
  // ==========================================================================

  describe("getNotificationPrefs", () => {
    it("should return null when no preferences set", async () => {
      mockQuery.mockResolvedValueOnce({
        data: { nchat_workspace_notification_prefs_by_pk: null },
      });

      const result = await service.getNotificationPrefs("ws-1", "user-1");
      expect(result).toBeNull();
    });

    it("should return notification preferences", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspace_notification_prefs_by_pk: {
            workspace_id: "ws-1",
            user_id: "user-1",
            enabled: true,
            mute_all: false,
            mute_until: null,
            digest_enabled: true,
            digest_frequency: "daily",
            notify_on_mention: true,
            notify_on_dm: true,
            notify_on_channel: false,
            sound_enabled: true,
            desktop_enabled: true,
            mobile_enabled: true,
            email_enabled: false,
          },
        },
      });

      const result = await service.getNotificationPrefs("ws-1", "user-1");

      expect(result).not.toBeNull();
      expect(result?.enabled).toBe(true);
      expect(result?.digestEnabled).toBe(true);
      expect(result?.digestFrequency).toBe("daily");
    });
  });

  describe("updateNotificationPrefs", () => {
    it("should update notification preferences", async () => {
      // Mock current prefs
      mockQuery.mockResolvedValueOnce({
        data: { nchat_workspace_notification_prefs_by_pk: null },
      });

      // Mock mutation
      mockMutate.mockResolvedValueOnce({
        data: {
          insert_nchat_workspace_notification_prefs_one: {
            workspace_id: "ws-1",
            user_id: "user-1",
            enabled: false,
          },
        },
      });

      // Mock updated prefs fetch
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspace_notification_prefs_by_pk: {
            workspace_id: "ws-1",
            user_id: "user-1",
            enabled: false,
            mute_all: true,
            mute_until: null,
            digest_enabled: false,
            digest_frequency: "never",
            notify_on_mention: true,
            notify_on_dm: true,
            notify_on_channel: false,
            sound_enabled: false,
            desktop_enabled: false,
            mobile_enabled: true,
            email_enabled: false,
          },
        },
      });

      const result = await service.updateNotificationPrefs("ws-1", "user-1", {
        enabled: false,
        muteAll: true,
      });

      expect(result).not.toBeNull();
      expect(result.enabled).toBe(false);
      expect(result.muteAll).toBe(true);
    });
  });

  // ==========================================================================
  // MEMBER LIFECYCLE TESTS
  // ==========================================================================

  describe("deactivateMember", () => {
    it("should throw error if deactivator lacks permission", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspace_members: [
            {
              id: "member-1",
              role: "member",
              workspace_id: "ws-1",
              user_id: "user-1",
              joined_at: "2024-01-01",
            },
          ],
        },
      });

      await expect(
        service.deactivateMember("ws-1", "user-2", "user-1"),
      ).rejects.toThrow("Only owners and admins can deactivate members");
    });

    it("should throw error when trying to deactivate owner", async () => {
      // Mock deactivator membership check
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspace_members: [
            {
              id: "member-1",
              role: "admin",
              workspace_id: "ws-1",
              user_id: "admin-1",
              joined_at: "2024-01-01",
            },
          ],
        },
      });

      // Mock workspace
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspaces_by_pk: {
            id: "ws-1",
            owner_id: "owner-1",
            name: "Test",
            slug: "test",
            member_count: 5,
            created_at: "2024-01-01",
          },
        },
      });

      await expect(
        service.deactivateMember("ws-1", "owner-1", "admin-1"),
      ).rejects.toThrow("Cannot deactivate workspace owner");
    });

    it("should deactivate member successfully", async () => {
      // Mock deactivator membership check
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspace_members: [
            {
              id: "member-1",
              role: "admin",
              workspace_id: "ws-1",
              user_id: "admin-1",
              joined_at: "2024-01-01",
            },
          ],
        },
      });

      // Mock workspace
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspaces_by_pk: {
            id: "ws-1",
            owner_id: "owner-1",
            name: "Test",
            slug: "test",
            member_count: 5,
            created_at: "2024-01-01",
          },
        },
      });

      // Mock mutation
      mockMutate.mockResolvedValueOnce({
        data: {
          delete_nchat_workspace_members: { affected_rows: 1 },
          insert_nchat_workspace_deactivated_members_one: {
            id: "deactivation-1",
            workspace_id: "ws-1",
            user_id: "user-2",
            deactivated_by: "admin-1",
            deactivated_at: "2024-01-01",
            reason: "Inactive",
            can_rejoin: true,
          },
          update_nchat_workspaces_by_pk: { id: "ws-1", member_count: 4 },
        },
      });

      const result = await service.deactivateMember(
        "ws-1",
        "user-2",
        "admin-1",
        "Inactive",
      );

      expect(result.id).toBe("deactivation-1");
      expect(result.userId).toBe("user-2");
      expect(result.reason).toBe("Inactive");
      expect(result.canRejoin).toBe(true);
    });
  });

  describe("reactivateMember", () => {
    it("should throw error if deactivation record not found", async () => {
      mockQuery.mockResolvedValueOnce({
        data: { nchat_workspace_deactivated_members_by_pk: null },
      });

      await expect(service.reactivateMember("deactivation-1")).rejects.toThrow(
        "Deactivation record not found",
      );
    });

    it("should throw error if member cannot rejoin", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspace_deactivated_members_by_pk: {
            workspace_id: "ws-1",
            user_id: "user-2",
            can_rejoin: false,
          },
        },
      });

      await expect(service.reactivateMember("deactivation-1")).rejects.toThrow(
        "This member is not allowed to rejoin",
      );
    });

    it("should reactivate member successfully", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspace_deactivated_members_by_pk: {
            workspace_id: "ws-1",
            user_id: "user-2",
            can_rejoin: true,
          },
        },
      });

      mockMutate.mockResolvedValueOnce({
        data: {
          delete_nchat_workspace_deactivated_members_by_pk: {
            id: "deactivation-1",
          },
          insert_nchat_workspace_members_one: {
            id: "member-new",
            workspace_id: "ws-1",
            user_id: "user-2",
            role: "member",
            joined_at: "2024-01-02",
          },
          update_nchat_workspaces_by_pk: { id: "ws-1", member_count: 5 },
        },
      });

      const result = await service.reactivateMember("deactivation-1");

      expect(result.id).toBe("member-new");
      expect(result.userId).toBe("user-2");
      expect(result.role).toBe("member");
    });
  });

  describe("getDeactivatedMembers", () => {
    it("should return empty list", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspace_deactivated_members: [],
          nchat_workspace_deactivated_members_aggregate: {
            aggregate: { count: 0 },
          },
        },
      });

      const result = await service.getDeactivatedMembers("ws-1");

      expect(result.members).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it("should return deactivated members with pagination", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspace_deactivated_members: [
            {
              id: "deactivation-1",
              workspace_id: "ws-1",
              user_id: "user-2",
              deactivated_by: "admin-1",
              deactivated_at: "2024-01-01",
              reason: "Inactive",
              can_rejoin: true,
              user: {
                id: "user-2",
                username: "inactive",
                display_name: "Inactive User",
                email: "inactive@example.com",
                avatar_url: null,
              },
            },
          ],
          nchat_workspace_deactivated_members_aggregate: {
            aggregate: { count: 10 },
          },
        },
      });

      const result = await service.getDeactivatedMembers("ws-1", 5, 0);

      expect(result.members).toHaveLength(1);
      expect(result.total).toBe(10);
      expect(result.hasMore).toBe(true);
      expect(result.members[0].user?.displayName).toBe("Inactive User");
    });
  });

  // ==========================================================================
  // ONBOARDING TESTS
  // ==========================================================================

  describe("getOnboardingConfig", () => {
    it("should return null when no config", async () => {
      mockQuery.mockResolvedValueOnce({
        data: { nchat_workspace_onboarding_by_pk: null },
      });

      const result = await service.getOnboardingConfig("ws-1");
      expect(result).toBeNull();
    });

    it("should return onboarding config", async () => {
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspace_onboarding_by_pk: {
            workspace_id: "ws-1",
            enabled: true,
            steps: [
              {
                id: "step-1",
                title: "Welcome",
                description: "Welcome message",
                type: "welcome",
                required: true,
                order: 1,
              },
            ],
            welcome_message: "Welcome to the workspace!",
            rules_agreement_required: true,
            profile_completion_required: true,
            assign_default_channels: true,
            default_channel_ids: ["ch-1", "ch-2"],
          },
        },
      });

      const result = await service.getOnboardingConfig("ws-1");

      expect(result).not.toBeNull();
      expect(result?.enabled).toBe(true);
      expect(result?.steps).toHaveLength(1);
      expect(result?.welcomeMessage).toBe("Welcome to the workspace!");
      expect(result?.rulesAgreementRequired).toBe(true);
    });
  });

  describe("updateOnboardingConfig", () => {
    it("should update onboarding config", async () => {
      // Mock current config
      mockQuery.mockResolvedValueOnce({
        data: { nchat_workspace_onboarding_by_pk: null },
      });

      // Mock mutation
      mockMutate.mockResolvedValueOnce({
        data: {
          insert_nchat_workspace_onboarding_one: {
            workspace_id: "ws-1",
            enabled: true,
          },
        },
      });

      // Mock updated config fetch
      mockQuery.mockResolvedValueOnce({
        data: {
          nchat_workspace_onboarding_by_pk: {
            workspace_id: "ws-1",
            enabled: true,
            steps: [],
            welcome_message: "Hello!",
            rules_agreement_required: false,
            profile_completion_required: false,
            assign_default_channels: true,
            default_channel_ids: [],
          },
        },
      });

      const result = await service.updateOnboardingConfig("ws-1", {
        enabled: true,
        welcomeMessage: "Hello!",
      });

      expect(result).not.toBeNull();
      expect(result.enabled).toBe(true);
      expect(result.welcomeMessage).toBe("Hello!");
    });
  });
});
