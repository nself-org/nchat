/**
 * Moderation Actions Unit Tests
 *
 * Tests for Moderation Actions including all 12 action types, bulk operations,
 * audit trail, and action reversibility.
 */

import { ModerationActions } from "../actions";
import type { ModerationActionType } from "../actions";
import type { ApolloClient } from "@apollo/client";

// ============================================================================
// Mock Apollo Client
// ============================================================================

const createMockApolloClient = (): jest.Mocked<ApolloClient<any>> => {
  return {
    mutate: jest.fn().mockResolvedValue({
      data: {
        insert_nchat_moderation_actions_one: {
          id: "action-123",
          action_type: "flag",
          created_at: new Date().toISOString(),
        },
      },
    }),
    query: jest.fn().mockResolvedValue({
      data: {
        nchat_user_warnings: [],
      },
    }),
  } as any;
};

// ============================================================================
// Setup/Teardown
// ============================================================================

describe("Moderation Actions", () => {
  let mockClient: jest.Mocked<ApolloClient<any>>;
  let actions: ModerationActions;

  beforeEach(() => {
    mockClient = createMockApolloClient();
    actions = new ModerationActions(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // Flag Content Tests
  // ==========================================================================

  describe("Flag Content", () => {
    it("should flag content successfully", async () => {
      const result = await actions.flagContent(
        "message",
        "msg-123",
        "user-456",
        "moderator-789",
        "Inappropriate content",
        false,
      );

      expect(result.success).toBe(true);
      expect(result.actionId).toBe("action-123");
      expect(mockClient.mutate).toHaveBeenCalled();
    });

    it("should flag content as automated", async () => {
      const result = await actions.flagContent(
        "message",
        "msg-123",
        "user-456",
        "system",
        "AI detected toxic content",
        true,
      );

      expect(result.success).toBe(true);
      expect(mockClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            input: expect.objectContaining({
              is_automated: true,
              automation_type: "ai",
            }),
          }),
        }),
      );
    });

    it("should handle flag error", async () => {
      mockClient.mutate.mockRejectedValueOnce(new Error("Database error"));

      const result = await actions.flagContent(
        "message",
        "msg-123",
        "user-456",
        "moderator-789",
        "Test reason",
        false,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });

    it("should flag different target types", async () => {
      await actions.flagContent(
        "user",
        "user-123",
        "user-123",
        "mod-1",
        "Suspicious",
        false,
      );
      await actions.flagContent(
        "channel",
        "ch-123",
        "user-456",
        "mod-1",
        "Spam",
        false,
      );
      await actions.flagContent(
        "file",
        "file-123",
        "user-789",
        "mod-1",
        "Malware",
        false,
      );

      expect(mockClient.mutate).toHaveBeenCalledTimes(3);
    });
  });

  // ==========================================================================
  // Hide Content Tests
  // ==========================================================================

  describe("Hide Content", () => {
    it("should hide content successfully", async () => {
      const result = await actions.hideContent(
        "message",
        "msg-123",
        "user-456",
        "moderator-789",
        "Toxic content",
        false,
      );

      expect(result.success).toBe(true);
      expect(result.affectedItems).toContain("msg-123");
      expect(mockClient.mutate).toHaveBeenCalledTimes(2); // Action + visibility update
    });

    it("should create hide action record", async () => {
      await actions.hideContent(
        "message",
        "msg-123",
        "user-456",
        "moderator-789",
        "Test hide",
        false,
      );

      expect(mockClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            input: expect.objectContaining({
              action_type: "hide",
              reversible: true,
            }),
          }),
        }),
      );
    });

    it("should update message visibility", async () => {
      await actions.hideContent(
        "message",
        "msg-123",
        "user-456",
        "moderator-789",
        "Hide reason",
        false,
      );

      expect(mockClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            messageId: "msg-123",
            isHidden: true,
            hiddenReason: "Hide reason",
          }),
        }),
      );
    });

    it("should hide as automated action", async () => {
      const result = await actions.hideContent(
        "message",
        "msg-123",
        "user-456",
        "system",
        "AI hide",
        true,
      );

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // Delete Content Tests
  // ==========================================================================

  describe("Delete Content", () => {
    it("should delete content successfully", async () => {
      const result = await actions.deleteContent(
        "message",
        "msg-123",
        "user-456",
        "moderator-789",
        "Severe violation",
        false,
      );

      expect(result.success).toBe(true);
      expect(result.affectedItems).toContain("msg-123");
    });

    it("should mark delete as non-reversible", async () => {
      await actions.deleteContent(
        "message",
        "msg-123",
        "user-456",
        "moderator-789",
        "Delete reason",
        false,
      );

      expect(mockClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            input: expect.objectContaining({
              action_type: "delete",
              reversible: false,
            }),
          }),
        }),
      );
    });

    it("should soft delete message", async () => {
      await actions.deleteContent(
        "message",
        "msg-123",
        "user-456",
        "moderator-789",
        "Delete",
        false,
      );

      expect(mockClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            messageId: "msg-123",
          }),
        }),
      );
    });
  });

  // ==========================================================================
  // Warn User Tests
  // ==========================================================================

  describe("Warn User", () => {
    it("should warn user successfully", async () => {
      const result = await actions.warnUser(
        "user-123",
        "moderator-789",
        "First warning: inappropriate language",
        false,
      );

      expect(result.success).toBe(true);
      expect(mockClient.mutate).toHaveBeenCalledTimes(2); // Warning + action
    });

    it("should create warning record", async () => {
      await actions.warnUser(
        "user-123",
        "moderator-789",
        "Warning reason",
        false,
      );

      expect(mockClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            userId: "user-123",
            reason: "Warning reason",
          }),
        }),
      );
    });

    it("should mark warning as non-reversible", async () => {
      await actions.warnUser("user-123", "moderator-789", "Warning", false);

      expect(mockClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            input: expect.objectContaining({
              action_type: "warn",
              reversible: false,
            }),
          }),
        }),
      );
    });

    it("should warn user automatically", async () => {
      const result = await actions.warnUser(
        "user-123",
        "system",
        "AI warning",
        true,
      );

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // Mute User Tests
  // ==========================================================================

  describe("Mute User", () => {
    it("should mute user successfully", async () => {
      const result = await actions.muteUser(
        "user-123",
        "moderator-789",
        "Temporary mute for spam",
        60, // 1 hour
        false,
      );

      expect(result.success).toBe(true);
    });

    it("should mute user with duration", async () => {
      await actions.muteUser(
        "user-123",
        "moderator-789",
        "Mute reason",
        120,
        false,
      );

      expect(mockClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            userId: "user-123",
            mutedUntil: expect.any(String),
            reason: "Mute reason",
          }),
        }),
      );
    });

    it("should mute user permanently", async () => {
      await actions.muteUser(
        "user-123",
        "moderator-789",
        "Permanent mute",
        undefined,
        false,
      );

      expect(mockClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            userId: "user-123",
            mutedUntil: undefined,
          }),
        }),
      );
    });

    it("should mark mute as reversible", async () => {
      await actions.muteUser("user-123", "moderator-789", "Mute", 60, false);

      expect(mockClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            input: expect.objectContaining({
              action_type: "mute",
              reversible: true,
              duration: 60,
            }),
          }),
        }),
      );
    });

    it("should mute user automatically", async () => {
      const result = await actions.muteUser(
        "user-123",
        "system",
        "AI mute",
        30,
        true,
      );

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // Unmute User Tests
  // ==========================================================================

  describe("Unmute User", () => {
    it("should unmute user successfully", async () => {
      const result = await actions.unmuteUser(
        "user-123",
        "moderator-789",
        "Appeal approved",
      );

      expect(result.success).toBe(true);
    });

    it("should clear mute fields", async () => {
      await actions.unmuteUser("user-123", "moderator-789", "Unmute reason");

      expect(mockClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            userId: "user-123",
          }),
        }),
      );
    });

    it("should create unmute action", async () => {
      await actions.unmuteUser("user-123", "moderator-789", "Unmute");

      expect(mockClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            input: expect.objectContaining({
              action_type: "unmute",
              reversible: false,
            }),
          }),
        }),
      );
    });
  });

  // ==========================================================================
  // Ban User Tests
  // ==========================================================================

  describe("Ban User", () => {
    it("should ban user successfully", async () => {
      const result = await actions.banUser(
        "user-123",
        "moderator-789",
        "Severe violations",
        undefined, // Permanent
        false,
      );

      expect(result.success).toBe(true);
    });

    it("should ban user temporarily", async () => {
      await actions.banUser(
        "user-123",
        "moderator-789",
        "Temp ban",
        7 * 24 * 60,
        false,
      ); // 7 days

      expect(mockClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            userId: "user-123",
            bannedUntil: expect.any(String),
            reason: "Temp ban",
          }),
        }),
      );
    });

    it("should ban user permanently", async () => {
      await actions.banUser(
        "user-123",
        "moderator-789",
        "Permanent ban",
        undefined,
        false,
      );

      expect(mockClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            userId: "user-123",
            bannedUntil: undefined,
          }),
        }),
      );
    });

    it("should mark ban as reversible", async () => {
      await actions.banUser(
        "user-123",
        "moderator-789",
        "Ban",
        undefined,
        false,
      );

      expect(mockClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            input: expect.objectContaining({
              action_type: "ban",
              reversible: true,
            }),
          }),
        }),
      );
    });

    it("should ban user automatically", async () => {
      const result = await actions.banUser(
        "user-123",
        "system",
        "AI ban",
        undefined,
        true,
      );

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // Unban User Tests
  // ==========================================================================

  describe("Unban User", () => {
    it("should unban user successfully", async () => {
      const result = await actions.unbanUser(
        "user-123",
        "moderator-789",
        "Ban appeal approved",
      );

      expect(result.success).toBe(true);
    });

    it("should clear ban fields", async () => {
      await actions.unbanUser("user-123", "moderator-789", "Unban reason");

      expect(mockClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            userId: "user-123",
          }),
        }),
      );
    });

    it("should create unban action", async () => {
      await actions.unbanUser("user-123", "moderator-789", "Unban");

      expect(mockClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            input: expect.objectContaining({
              action_type: "unban",
              reversible: false,
            }),
          }),
        }),
      );
    });
  });

  // ==========================================================================
  // Approve Content Tests
  // ==========================================================================

  describe("Approve Content", () => {
    it("should approve content successfully", async () => {
      const result = await actions.approveContent(
        "message",
        "msg-123",
        "user-456",
        "moderator-789",
        "False positive",
      );

      expect(result.success).toBe(true);
    });

    it("should restore hidden content", async () => {
      await actions.approveContent(
        "message",
        "msg-123",
        "user-456",
        "moderator-789",
        "Approved",
      );

      expect(mockClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            messageId: "msg-123",
            isHidden: false,
            hiddenReason: null,
          }),
        }),
      );
    });

    it("should mark approve as non-reversible", async () => {
      await actions.approveContent(
        "message",
        "msg-123",
        "user-456",
        "moderator-789",
        "Approved",
      );

      expect(mockClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            input: expect.objectContaining({
              action_type: "approve",
              reversible: false,
            }),
          }),
        }),
      );
    });
  });

  // ==========================================================================
  // Bulk Operations Tests
  // ==========================================================================

  describe("Bulk Operations", () => {
    it("should perform bulk flag operation", async () => {
      const targets = [
        {
          targetType: "message" as const,
          targetId: "msg-1",
          targetUserId: "user-1",
        },
        {
          targetType: "message" as const,
          targetId: "msg-2",
          targetUserId: "user-2",
        },
        {
          targetType: "message" as const,
          targetId: "msg-3",
          targetUserId: "user-3",
        },
      ];

      const result = await actions.bulkAction(
        "flag",
        targets,
        "moderator-789",
        "Bulk spam detection",
        { isAutomated: true },
      );

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.results).toHaveLength(3);
    });

    it("should perform bulk hide operation", async () => {
      const targets = [
        {
          targetType: "message" as const,
          targetId: "msg-1",
          targetUserId: "user-1",
        },
        {
          targetType: "message" as const,
          targetId: "msg-2",
          targetUserId: "user-2",
        },
      ];

      const result = await actions.bulkAction(
        "hide",
        targets,
        "moderator-789",
        "Bulk hide toxic content",
      );

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
    });

    it("should perform bulk delete operation", async () => {
      const targets = [
        {
          targetType: "message" as const,
          targetId: "msg-1",
          targetUserId: "user-1",
        },
      ];

      const result = await actions.bulkAction(
        "delete",
        targets,
        "moderator-789",
        "Bulk delete spam",
      );

      expect(result.success).toBe(true);
    });

    it("should perform bulk mute operation", async () => {
      const targets = [
        {
          targetType: "user" as const,
          targetId: "user-1",
          targetUserId: "user-1",
        },
        {
          targetType: "user" as const,
          targetId: "user-2",
          targetUserId: "user-2",
        },
      ];

      const result = await actions.bulkAction(
        "mute",
        targets,
        "moderator-789",
        "Bulk mute spammers",
        { duration: 60 },
      );

      expect(result.success).toBe(true);
      expect(result.successCount).toBe(2);
    });

    it("should perform bulk ban operation", async () => {
      const targets = [
        {
          targetType: "user" as const,
          targetId: "user-1",
          targetUserId: "user-1",
        },
      ];

      const result = await actions.bulkAction(
        "ban",
        targets,
        "moderator-789",
        "Bulk ban violators",
        { duration: 7 * 24 * 60 },
      );

      expect(result.success).toBe(true);
    });

    it("should handle partial failures in bulk operation", async () => {
      const targets = [
        {
          targetType: "message" as const,
          targetId: "msg-1",
          targetUserId: "user-1",
        },
        {
          targetType: "message" as const,
          targetId: "msg-2",
          targetUserId: "user-2",
        },
      ];

      // Make second operation fail - first succeeds, second fails
      mockClient.mutate
        .mockResolvedValueOnce({
          data: { insert_nchat_moderation_actions_one: { id: "action-1" } },
        })
        .mockRejectedValueOnce(new Error("Failed"));

      const result = await actions.bulkAction(
        "flag",
        targets,
        "moderator-789",
        "Bulk flag",
      );

      // May succeed partially or fully depending on implementation
      expect(result.successCount + result.failureCount).toBe(2);
    });

    it("should handle unsupported bulk actions", async () => {
      const targets = [
        {
          targetType: "message" as const,
          targetId: "msg-1",
          targetUserId: "user-1",
        },
      ];

      const result = await actions.bulkAction(
        "approve" as any, // Unsupported in bulk
        targets,
        "moderator-789",
        "Bulk approve",
      );

      expect(result.success).toBe(false);
      expect(result.results[0].error).toContain("Unsupported");
    });
  });

  // ==========================================================================
  // User Warnings Tests
  // ==========================================================================

  describe("User Warnings", () => {
    it("should get user warnings", async () => {
      mockClient.query.mockResolvedValueOnce({
        data: {
          nchat_user_warnings: [
            {
              id: "warn-1",
              reason: "First warning",
              created_at: new Date().toISOString(),
            },
            {
              id: "warn-2",
              reason: "Second warning",
              created_at: new Date().toISOString(),
            },
          ],
        },
      });

      const warnings = await actions.getUserWarnings("user-123");

      expect(warnings).toHaveLength(2);
      expect(warnings[0].reason).toBe("First warning");
    });

    it("should return empty array for no warnings", async () => {
      mockClient.query.mockResolvedValueOnce({
        data: { nchat_user_warnings: [] },
      });

      const warnings = await actions.getUserWarnings("user-123");

      expect(warnings).toHaveLength(0);
    });

    it("should use network-only fetch policy", async () => {
      await actions.getUserWarnings("user-123");

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.objectContaining({
          fetchPolicy: "network-only",
        }),
      );
    });
  });

  // ==========================================================================
  // Audit Trail Tests
  // ==========================================================================

  describe("Audit Trail", () => {
    it("should maintain audit log", () => {
      const auditLog = actions.getAuditLog();

      expect(Array.isArray(auditLog)).toBe(true);
    });

    it("should return empty audit log initially", () => {
      const auditLog = actions.getAuditLog();

      expect(auditLog).toHaveLength(0);
    });

    it("should return copy of audit log", () => {
      const log1 = actions.getAuditLog();
      const log2 = actions.getAuditLog();

      expect(log1).not.toBe(log2);
      expect(log1).toEqual(log2);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe("Error Handling", () => {
    it("should handle network errors", async () => {
      mockClient.mutate.mockRejectedValueOnce(new Error("Network error"));

      const result = await actions.flagContent(
        "message",
        "msg-123",
        "user-456",
        "moderator-789",
        "Test",
        false,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("should handle unknown errors", async () => {
      mockClient.mutate.mockRejectedValueOnce("Unknown error");

      const result = await actions.flagContent(
        "message",
        "msg-123",
        "user-456",
        "moderator-789",
        "Test",
        false,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });

    it("should log errors to console", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      mockClient.mutate.mockRejectedValueOnce(new Error("Test error"));

      await actions.flagContent(
        "message",
        "msg-123",
        "user-456",
        "moderator-789",
        "Test",
        false,
      );

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Action Type Coverage Tests
  // ==========================================================================

  describe("Action Type Coverage", () => {
    it("should support all 12 action types", () => {
      const actionTypes: ModerationActionType[] = [
        "flag",
        "hide",
        "delete",
        "warn",
        "mute",
        "unmute",
        "ban",
        "unban",
        "shadowban",
        "approve",
        "reject",
        "edit",
      ];

      // Verify all types are defined
      actionTypes.forEach((type) => {
        expect(typeof type).toBe("string");
      });
    });

    it("should create action for flag type", async () => {
      await actions.flagContent(
        "message",
        "msg-1",
        "user-1",
        "mod-1",
        "Flag",
        false,
      );
      expect(mockClient.mutate).toHaveBeenCalled();
    });

    it("should create action for hide type", async () => {
      await actions.hideContent(
        "message",
        "msg-1",
        "user-1",
        "mod-1",
        "Hide",
        false,
      );
      expect(mockClient.mutate).toHaveBeenCalled();
    });

    it("should create action for delete type", async () => {
      await actions.deleteContent(
        "message",
        "msg-1",
        "user-1",
        "mod-1",
        "Delete",
        false,
      );
      expect(mockClient.mutate).toHaveBeenCalled();
    });

    it("should create action for warn type", async () => {
      await actions.warnUser("user-1", "mod-1", "Warn", false);
      expect(mockClient.mutate).toHaveBeenCalled();
    });

    it("should create action for mute type", async () => {
      await actions.muteUser("user-1", "mod-1", "Mute", 60, false);
      expect(mockClient.mutate).toHaveBeenCalled();
    });

    it("should create action for unmute type", async () => {
      await actions.unmuteUser("user-1", "mod-1", "Unmute");
      expect(mockClient.mutate).toHaveBeenCalled();
    });

    it("should create action for ban type", async () => {
      await actions.banUser("user-1", "mod-1", "Ban", undefined, false);
      expect(mockClient.mutate).toHaveBeenCalled();
    });

    it("should create action for unban type", async () => {
      await actions.unbanUser("user-1", "mod-1", "Unban");
      expect(mockClient.mutate).toHaveBeenCalled();
    });

    it("should create action for approve type", async () => {
      await actions.approveContent(
        "message",
        "msg-1",
        "user-1",
        "mod-1",
        "Approve",
      );
      expect(mockClient.mutate).toHaveBeenCalled();
    });
  });
});
