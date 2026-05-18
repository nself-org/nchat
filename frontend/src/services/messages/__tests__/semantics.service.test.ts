/**
 * Message Semantics Service Tests
 *
 * Comprehensive tests for edit/delete semantics with platform-specific windows,
 * undo functionality, and permission checking.
 */

import {
  MessageSemanticsService,
  createMessageSemanticsService,
} from "../semantics.service";
import type { Message, MessageUser } from "@/types/message";
import type {
  MessageSemanticsConfig,
  MessagePlatformStyle,
} from "@/types/message-semantics";
import {
  PLATFORM_EDIT_WINDOWS,
  PLATFORM_DELETE_WINDOWS,
  DEFAULT_MESSAGE_SEMANTICS,
} from "@/types/message-semantics";

// Mock the audit logger
jest.mock("@/lib/audit", () => ({
  logAuditEvent: jest.fn().mockResolvedValue(undefined),
}));

// Mock the logger
jest.mock("@/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createTestUser = (overrides: Partial<MessageUser> = {}): MessageUser => ({
  id: "user-1",
  username: "testuser",
  displayName: "Test User",
  avatarUrl: "https://example.com/avatar.jpg",
  role: "member",
  ...overrides,
});

const createTestMessage = (overrides: Partial<Message> = {}): Message => ({
  id: "msg-1",
  channelId: "channel-1",
  content: "Original message content",
  type: "text",
  userId: "user-1",
  user: createTestUser(),
  createdAt: new Date(),
  isEdited: false,
  isDeleted: false,
  ...overrides,
});

const createOldMessage = (ageMs: number): Message => {
  return createTestMessage({
    createdAt: new Date(Date.now() - ageMs),
  });
};

// ============================================================================
// PLATFORM WINDOW TESTS
// ============================================================================

describe("MessageSemanticsService", () => {
  let service: MessageSemanticsService;

  beforeEach(() => {
    service = createMessageSemanticsService();
    service.clearAllCaches();
  });

  // ==========================================================================
  // Platform Edit Window Tests
  // ==========================================================================

  describe("Platform Edit Windows", () => {
    it("should have correct WhatsApp edit window (15 minutes)", () => {
      expect(PLATFORM_EDIT_WINDOWS.whatsapp.windowSeconds).toBe(15 * 60);
      expect(PLATFORM_EDIT_WINDOWS.whatsapp.enabled).toBe(true);
    });

    it("should have correct Telegram edit window (48 hours)", () => {
      expect(PLATFORM_EDIT_WINDOWS.telegram.windowSeconds).toBe(48 * 60 * 60);
      expect(PLATFORM_EDIT_WINDOWS.telegram.enabled).toBe(true);
    });

    it("should have Signal editing disabled", () => {
      expect(PLATFORM_EDIT_WINDOWS.signal.enabled).toBe(false);
    });

    it("should have unlimited Slack edit window", () => {
      expect(PLATFORM_EDIT_WINDOWS.slack.windowSeconds).toBe(0);
      expect(PLATFORM_EDIT_WINDOWS.slack.enabled).toBe(true);
    });

    it("should have unlimited Discord edit window", () => {
      expect(PLATFORM_EDIT_WINDOWS.discord.windowSeconds).toBe(0);
      expect(PLATFORM_EDIT_WINDOWS.discord.enabled).toBe(true);
    });
  });

  // ==========================================================================
  // Platform Delete Window Tests
  // ==========================================================================

  describe("Platform Delete Windows", () => {
    it("should have correct WhatsApp delete window (2 days)", () => {
      expect(
        PLATFORM_DELETE_WINDOWS.whatsapp.deleteForEveryoneWindowSeconds,
      ).toBe(2 * 24 * 60 * 60);
      expect(PLATFORM_DELETE_WINDOWS.whatsapp.deleteForMeAlways).toBe(true);
    });

    it("should have correct Telegram delete window (48 hours)", () => {
      expect(
        PLATFORM_DELETE_WINDOWS.telegram.deleteForEveryoneWindowSeconds,
      ).toBe(48 * 60 * 60);
      expect(PLATFORM_DELETE_WINDOWS.telegram.selfDeleteUnlimited).toBe(true);
    });

    it("should have unlimited Signal delete window", () => {
      expect(
        PLATFORM_DELETE_WINDOWS.signal.deleteForEveryoneWindowSeconds,
      ).toBe(0);
      expect(PLATFORM_DELETE_WINDOWS.signal.deleteForEveryoneEnabled).toBe(
        true,
      );
    });

    it("should have Slack with no delete-for-me", () => {
      expect(PLATFORM_DELETE_WINDOWS.slack.deleteForMeAlways).toBe(false);
    });

    it("should have Discord with no delete-for-me", () => {
      expect(PLATFORM_DELETE_WINDOWS.discord.deleteForMeAlways).toBe(false);
    });
  });

  // ==========================================================================
  // Edit Permission Tests
  // ==========================================================================

  describe("Edit Permissions", () => {
    it("should allow owner to edit their own message within window", () => {
      service.setPlatformStyle("slack");
      const message = createTestMessage();
      const result = service.canEdit(message, "user-1", "member");

      expect(result.allowed).toBe(true);
    });

    it("should deny non-owner from editing message", () => {
      const message = createTestMessage();
      const result = service.canEdit(message, "other-user", "member");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("only edit your own");
    });

    it("should deny editing deleted messages", () => {
      const message = createTestMessage({ isDeleted: true });
      const result = service.canEdit(message, "user-1", "member");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Deleted messages");
    });

    it("should allow admin to edit any message when adminOverride is true", () => {
      service.updateConfig({ adminOverride: true });
      const message = createTestMessage({ userId: "other-user" });
      const result = service.canEdit(message, "admin-user", "admin");

      expect(result.allowed).toBe(true);
      expect(result.adminOverride).toBe(true);
    });

    it("should deny edit when platform does not support editing (Signal)", () => {
      service.setPlatformStyle("signal");
      const message = createTestMessage();
      const result = service.canEdit(message, "user-1", "member");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("not enabled");
    });

    it("should deny edit when WhatsApp window (15 min) has passed", () => {
      service.setPlatformStyle("whatsapp");
      const message = createOldMessage(16 * 60 * 1000); // 16 minutes old
      const result = service.canEdit(message, message.userId, "member");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("expired");
    });

    it("should allow edit within WhatsApp window", () => {
      service.setPlatformStyle("whatsapp");
      const message = createOldMessage(10 * 60 * 1000); // 10 minutes old
      const result = service.canEdit(message, message.userId, "member");

      expect(result.allowed).toBe(true);
      expect(result.remainingSeconds).toBeLessThan(6 * 60); // Less than 6 minutes remaining
    });

    it("should deny edit when Telegram window (48 hours) has passed", () => {
      service.setPlatformStyle("telegram");
      const message = createOldMessage(49 * 60 * 60 * 1000); // 49 hours old
      const result = service.canEdit(message, message.userId, "member");

      expect(result.allowed).toBe(false);
    });

    it("should allow edit within Telegram window", () => {
      service.setPlatformStyle("telegram");
      const message = createOldMessage(24 * 60 * 60 * 1000); // 24 hours old
      const result = service.canEdit(message, message.userId, "member");

      expect(result.allowed).toBe(true);
    });
  });

  // ==========================================================================
  // Delete Permission Tests
  // ==========================================================================

  describe("Delete Permissions", () => {
    it("should allow owner to delete their own message", () => {
      const message = createTestMessage();
      const result = service.canDelete(
        message,
        "user-1",
        "member",
        "for_everyone",
      );

      expect(result.allowed).toBe(true);
    });

    it("should deny non-owner from deleting message", () => {
      const message = createTestMessage();
      const result = service.canDelete(
        message,
        "other-user",
        "member",
        "for_everyone",
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("only delete your own");
    });

    it("should deny deleting already deleted messages", () => {
      const message = createTestMessage({ isDeleted: true });
      const result = service.canDelete(
        message,
        "user-1",
        "member",
        "for_everyone",
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("already deleted");
    });

    it("should allow moderator to delete any message with adminOverride", () => {
      service.updateConfig({ adminOverride: true });
      const message = createTestMessage({ userId: "other-user" });
      const result = service.canDelete(
        message,
        "mod-user",
        "moderator",
        "for_everyone",
      );

      expect(result.allowed).toBe(true);
      expect(result.adminOverride).toBe(true);
    });

    it("should allow delete-for-me when enabled and platform supports it", () => {
      // WhatsApp supports delete-for-me
      service.setPlatformStyle("whatsapp");
      service.updateConfig({ enableDeleteForMe: true });
      const message = createTestMessage();
      const result = service.canDelete(message, "user-1", "member", "for_me");

      expect(result.allowed).toBe(true);
    });

    it("should deny delete-for-me when disabled", () => {
      service.updateConfig({ enableDeleteForMe: false });
      const message = createTestMessage();
      const result = service.canDelete(message, "user-1", "member", "for_me");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("not enabled");
    });

    it("should deny delete-for-everyone when window passed (WhatsApp)", () => {
      service.setPlatformStyle("whatsapp");
      const message = createOldMessage(3 * 24 * 60 * 60 * 1000); // 3 days old
      const result = service.canDelete(
        message,
        message.userId,
        "member",
        "for_everyone",
      );

      expect(result.allowed).toBe(false);
    });

    it("should allow unlimited self-delete on Telegram", () => {
      service.setPlatformStyle("telegram");
      const message = createOldMessage(7 * 24 * 60 * 60 * 1000); // 7 days old
      const result = service.canDelete(
        message,
        message.userId,
        "member",
        "for_everyone",
      );

      expect(result.allowed).toBe(true);
    });
  });

  // ==========================================================================
  // Edit Message Tests
  // ==========================================================================

  describe("Edit Message", () => {
    it("should successfully edit a message", async () => {
      const message = createTestMessage();
      const editor = createTestUser();

      const result = await service.editMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          newContent: "Updated content",
          editorId: editor.id,
          editor,
        },
        message,
        "member",
      );

      expect(result.success).toBe(true);
      expect(result.message?.content).toBe("Updated content");
      expect(result.message?.isEdited).toBe(true);
      expect(result.editRecord).toBeDefined();
    });

    it("should create edit history record", async () => {
      const message = createTestMessage();
      const editor = createTestUser();

      await service.editMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          newContent: "Updated content",
          editorId: editor.id,
          editor,
        },
        message,
        "member",
      );

      const history = service.getEditHistory(message.id);
      expect(history).toHaveLength(1);
      expect(history[0].previousContent).toBe("Original message content");
      expect(history[0].newContent).toBe("Updated content");
    });

    it("should create undo action when enabled", async () => {
      service.updateConfig({ enableUndo: true });
      const message = createTestMessage();
      const editor = createTestUser();

      const result = await service.editMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          newContent: "Updated content",
          editorId: editor.id,
          editor,
        },
        message,
        "member",
      );

      expect(result.undoAction).toBeDefined();
      expect(result.undoAction?.type).toBe("edit");
      expect(result.undoAction?.undoData.previousContent).toBe(
        "Original message content",
      );
    });

    it("should track multiple edits in history", async () => {
      const message = createTestMessage();
      const editor = createTestUser();

      await service.editMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          newContent: "First edit",
          editorId: editor.id,
          editor,
        },
        message,
        "member",
      );

      const updatedMessage = {
        ...message,
        content: "First edit",
        isEdited: true,
      };

      await service.editMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          newContent: "Second edit",
          editorId: editor.id,
          editor,
        },
        updatedMessage,
        "member",
      );

      const history = service.getEditHistory(message.id);
      expect(history).toHaveLength(2);
      expect(history[0].newContent).toBe("First edit");
      expect(history[1].newContent).toBe("Second edit");
    });

    it("should fail edit when permission denied", async () => {
      const message = createTestMessage();
      const otherUser = createTestUser({ id: "other-user" });

      const result = await service.editMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          newContent: "Updated content",
          editorId: otherUser.id,
          editor: otherUser,
        },
        message,
        "member",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("only edit your own");
    });
  });

  // ==========================================================================
  // Delete Message Tests
  // ==========================================================================

  describe("Delete Message", () => {
    it("should successfully delete a message for everyone", async () => {
      const message = createTestMessage();
      const deleter = createTestUser();

      const result = await service.deleteMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          scope: "for_everyone",
          deleterId: deleter.id,
          deleter,
        },
        message,
        "member",
      );

      expect(result.success).toBe(true);
      expect(result.deletedState?.scope).toBe("for_everyone");
      expect(result.deletedState?.originalContent).toBe(
        "Original message content",
      );
    });

    it("should successfully delete a message for me", async () => {
      // Use WhatsApp which supports delete-for-me
      service.setPlatformStyle("whatsapp");
      service.updateConfig({ enableDeleteForMe: true });
      const message = createTestMessage();
      const deleter = createTestUser();

      const result = await service.deleteMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          scope: "for_me",
          deleterId: deleter.id,
          deleter,
        },
        message,
        "member",
      );

      expect(result.success).toBe(true);
      expect(result.deletedState?.scope).toBe("for_me");
    });

    it("should track locally deleted messages", async () => {
      // Use WhatsApp which supports delete-for-me
      service.setPlatformStyle("whatsapp");
      service.updateConfig({ enableDeleteForMe: true });
      const message = createTestMessage();
      const deleter = createTestUser();

      await service.deleteMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          scope: "for_me",
          deleterId: deleter.id,
          deleter,
        },
        message,
        "member",
      );

      expect(service.isLocallyDeleted(message.id, deleter.id)).toBe(true);
      expect(service.isLocallyDeleted(message.id, "other-user")).toBe(false);
    });

    it("should create undo action for delete", async () => {
      service.updateConfig({ enableUndo: true });
      const message = createTestMessage();
      const deleter = createTestUser();

      const result = await service.deleteMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          scope: "for_everyone",
          deleterId: deleter.id,
          deleter,
        },
        message,
        "member",
      );

      expect(result.undoAction).toBeDefined();
      expect(result.undoAction?.type).toBe("delete");
    });

    it("should store soft-deleted message state", async () => {
      const message = createTestMessage();
      const deleter = createTestUser();

      await service.deleteMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          scope: "for_everyone",
          deleterId: deleter.id,
          deleter,
        },
        message,
        "member",
      );

      const state = service.getDeletedState(message.id);
      expect(state).toBeDefined();
      expect(state?.canRestore).toBe(true);
    });

    it("should include reason in delete state when provided", async () => {
      const message = createTestMessage();
      const deleter = createTestUser({ role: "moderator" });

      await service.deleteMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          scope: "for_everyone",
          deleterId: deleter.id,
          deleter,
          reason: "Spam content",
        },
        message,
        "moderator",
      );

      const state = service.getDeletedState(message.id);
      expect(state?.reason).toBe("Spam content");
    });
  });

  // ==========================================================================
  // Bulk Delete Tests
  // ==========================================================================

  describe("Bulk Delete", () => {
    it("should successfully bulk delete messages as admin", async () => {
      const messages = [
        createTestMessage({ id: "msg-1" }),
        createTestMessage({ id: "msg-2" }),
        createTestMessage({ id: "msg-3" }),
      ];

      const admin = createTestUser({ id: "admin-1", role: "admin" });

      const result = await service.bulkDelete(
        {
          messageIds: ["msg-1", "msg-2", "msg-3"],
          channelId: "channel-1",
          deleterId: admin.id,
          deleter: admin,
          reason: "Cleanup",
        },
        messages,
        "admin",
      );

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(3);
      expect(result.failedIds).toHaveLength(0);
    });

    it("should deny bulk delete for non-admin", async () => {
      const messages = [createTestMessage({ id: "msg-1" })];
      const member = createTestUser();

      const result = await service.bulkDelete(
        {
          messageIds: ["msg-1"],
          channelId: "channel-1",
          deleterId: member.id,
          deleter: member,
        },
        messages,
        "member",
      );

      expect(result.success).toBe(false);
      expect(result.errors.has("permission")).toBe(true);
    });

    it("should handle partial failures in bulk delete", async () => {
      const messages = [
        createTestMessage({ id: "msg-1" }),
        // msg-2 is missing
      ];

      const admin = createTestUser({ id: "admin-1", role: "admin" });

      const result = await service.bulkDelete(
        {
          messageIds: ["msg-1", "msg-2"],
          channelId: "channel-1",
          deleterId: admin.id,
          deleter: admin,
        },
        messages,
        "admin",
      );

      expect(result.deletedCount).toBe(1);
      expect(result.failedIds).toContain("msg-2");
    });
  });

  // ==========================================================================
  // Restore Version Tests
  // ==========================================================================

  describe("Restore Version", () => {
    it("should restore message to previous version", async () => {
      const message = createTestMessage();
      const editor = createTestUser();

      // Make an edit first
      await service.editMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          newContent: "Edited content",
          editorId: editor.id,
          editor,
        },
        message,
        "member",
      );

      const editedMessage = {
        ...message,
        content: "Edited content",
        isEdited: true,
      };

      // Restore to version 2 (the first edit record contains the original content as previousContent)
      const result = await service.restoreVersion(
        message.id,
        message.channelId,
        2, // Version 2 is the first edit record
        editor.id,
        editor,
        editedMessage,
      );

      expect(result.success).toBe(true);
      expect(result.message?.content).toBe("Original message content");
      expect(result.editRecord?.isRestoration).toBe(true);
    });

    it("should fail restore when no edit history exists", async () => {
      const message = createTestMessage();
      const editor = createTestUser();

      const result = await service.restoreVersion(
        message.id,
        message.channelId,
        1,
        editor.id,
        editor,
        message,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("No edit history");
    });

    it("should fail restore when version not found", async () => {
      const message = createTestMessage();
      const editor = createTestUser();

      // Make an edit
      await service.editMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          newContent: "Edited",
          editorId: editor.id,
          editor,
        },
        message,
        "member",
      );

      // Try to restore to non-existent version
      const result = await service.restoreVersion(
        message.id,
        message.channelId,
        999,
        editor.id,
        editor,
        message,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  // ==========================================================================
  // Undo Tests
  // ==========================================================================

  describe("Undo Actions", () => {
    it("should execute undo for edit", async () => {
      service.updateConfig({ enableUndo: true, undoWindowSeconds: 10 });
      const message = createTestMessage();
      const editor = createTestUser();

      const editResult = await service.editMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          newContent: "Updated content",
          editorId: editor.id,
          editor,
        },
        message,
        "member",
      );

      expect(editResult.undoAction).toBeDefined();

      const undoResult = await service.executeUndo(
        editResult.undoAction!.id,
        editor.id,
      );
      expect(undoResult.success).toBe(true);
    });

    it("should execute undo for delete", async () => {
      service.updateConfig({ enableUndo: true, undoWindowSeconds: 10 });
      const message = createTestMessage();
      const deleter = createTestUser();

      const deleteResult = await service.deleteMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          scope: "for_everyone",
          deleterId: deleter.id,
          deleter,
        },
        message,
        "member",
      );

      expect(deleteResult.undoAction).toBeDefined();

      // Message should be in soft-deleted state
      expect(service.getDeletedState(message.id)).toBeDefined();

      // Execute undo
      const undoResult = await service.executeUndo(
        deleteResult.undoAction!.id,
        deleter.id,
      );
      expect(undoResult.success).toBe(true);

      // Message should no longer be in soft-deleted state
      expect(service.getDeletedState(message.id)).toBeUndefined();
    });

    it("should fail undo when expired", async () => {
      service.updateConfig({ enableUndo: true, undoWindowSeconds: 0.1 }); // 100ms window
      const message = createTestMessage();
      const editor = createTestUser();

      const editResult = await service.editMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          newContent: "Updated content",
          editorId: editor.id,
          editor,
        },
        message,
        "member",
      );

      // Wait for undo to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      const undoResult = await service.executeUndo(
        editResult.undoAction!.id,
        editor.id,
      );
      expect(undoResult.success).toBe(false);
      expect(undoResult.error).toContain("expired");
    });

    it("should fail undo when already undone", async () => {
      service.updateConfig({ enableUndo: true, undoWindowSeconds: 10 });
      const message = createTestMessage();
      const editor = createTestUser();

      const editResult = await service.editMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          newContent: "Updated content",
          editorId: editor.id,
          editor,
        },
        message,
        "member",
      );

      // First undo should succeed
      await service.executeUndo(editResult.undoAction!.id, editor.id);

      // Second undo should fail
      const secondUndo = await service.executeUndo(
        editResult.undoAction!.id,
        editor.id,
      );
      expect(secondUndo.success).toBe(false);
      expect(secondUndo.error).toContain("already undone");
    });

    it("should get pending undo action for message", async () => {
      service.updateConfig({ enableUndo: true, undoWindowSeconds: 10 });
      const message = createTestMessage();
      const editor = createTestUser();

      await service.editMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          newContent: "Updated content",
          editorId: editor.id,
          editor,
        },
        message,
        "member",
      );

      const pending = service.getUndoActionForMessage(message.id);
      expect(pending).toBeDefined();
      expect(pending?.messageId).toBe(message.id);
    });

    it("should return remaining undo time", async () => {
      service.updateConfig({ enableUndo: true, undoWindowSeconds: 5 });
      const message = createTestMessage();
      const editor = createTestUser();

      const result = await service.editMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          newContent: "Updated content",
          editorId: editor.id,
          editor,
        },
        message,
        "member",
      );

      const remaining = service.getRemainingUndoTime(result.undoAction!.id);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(5);
    });
  });

  // ==========================================================================
  // Restore Deleted Message Tests
  // ==========================================================================

  describe("Restore Deleted Message", () => {
    it("should restore soft-deleted message", async () => {
      const message = createTestMessage();
      const deleter = createTestUser();

      await service.deleteMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          scope: "for_everyone",
          deleterId: deleter.id,
          deleter,
        },
        message,
        "member",
      );

      const restoreResult = await service.restoreDeletedMessage(
        message.id,
        deleter.id,
        deleter,
        "member",
      );

      expect(restoreResult.success).toBe(true);
      expect(service.getDeletedState(message.id)).toBeUndefined();
    });

    it("should allow admin to restore any deleted message", async () => {
      const message = createTestMessage();
      const deleter = createTestUser();
      const admin = createTestUser({ id: "admin-1", role: "admin" });

      await service.deleteMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          scope: "for_everyone",
          deleterId: deleter.id,
          deleter,
        },
        message,
        "member",
      );

      const restoreResult = await service.restoreDeletedMessage(
        message.id,
        admin.id,
        admin,
        "admin",
      );

      expect(restoreResult.success).toBe(true);
    });

    it("should deny non-deleter/non-admin from restoring", async () => {
      const message = createTestMessage();
      const deleter = createTestUser();
      const otherUser = createTestUser({ id: "other-user" });

      await service.deleteMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          scope: "for_everyone",
          deleterId: deleter.id,
          deleter,
        },
        message,
        "member",
      );

      const restoreResult = await service.restoreDeletedMessage(
        message.id,
        otherUser.id,
        otherUser,
        "member",
      );

      expect(restoreResult.success).toBe(false);
      expect(restoreResult.error).toContain("permission");
    });

    it("should fail restore for non-existent deleted message", async () => {
      const user = createTestUser();

      const restoreResult = await service.restoreDeletedMessage(
        "non-existent-msg",
        user.id,
        user,
        "member",
      );

      expect(restoreResult.success).toBe(false);
      expect(restoreResult.error).toContain("not found");
    });
  });

  // ==========================================================================
  // Configuration Tests
  // ==========================================================================

  describe("Configuration", () => {
    it("should use default configuration", () => {
      const config = service.getConfig();
      expect(config.platformStyle).toBe(
        DEFAULT_MESSAGE_SEMANTICS.platformStyle,
      );
      expect(config.enableUndo).toBe(DEFAULT_MESSAGE_SEMANTICS.enableUndo);
    });

    it("should update configuration", () => {
      service.updateConfig({
        platformStyle: "whatsapp",
        undoWindowSeconds: 10,
      });
      const config = service.getConfig();

      expect(config.platformStyle).toBe("whatsapp");
      expect(config.undoWindowSeconds).toBe(10);
    });

    it("should set platform style", () => {
      service.setPlatformStyle("telegram");
      expect(service.getConfig().platformStyle).toBe("telegram");
    });

    it("should use custom edit window when set", () => {
      service.updateConfig({ customEditWindowSeconds: 3600 }); // 1 hour
      const message = createOldMessage(30 * 60 * 1000); // 30 min old

      const result = service.canEdit(message, message.userId, "member");
      expect(result.allowed).toBe(true);
    });

    it("should use custom delete window when set", () => {
      service.updateConfig({ customDeleteWindowSeconds: 3600 }); // 1 hour
      const message = createOldMessage(30 * 60 * 1000); // 30 min old

      const result = service.canDelete(
        message,
        message.userId,
        "member",
        "for_everyone",
      );
      expect(result.allowed).toBe(true);
    });

    it("should return correct deleted placeholder text", () => {
      service.updateConfig({
        deletedPlaceholderText: "Custom deleted message text",
      });
      expect(service.getDeletedPlaceholder()).toBe(
        "Custom deleted message text",
      );
    });

    it("should check if deleted placeholder should show", () => {
      service.updateConfig({ showDeletedPlaceholder: false });
      expect(service.shouldShowDeletedPlaceholder()).toBe(false);

      service.updateConfig({ showDeletedPlaceholder: true });
      expect(service.shouldShowDeletedPlaceholder()).toBe(true);
    });

    it("should check if edited indicator should show", () => {
      service.updateConfig({ showEditedIndicator: false });
      expect(service.shouldShowEditedIndicator()).toBe(false);

      service.updateConfig({ showEditedIndicator: true });
      expect(service.shouldShowEditedIndicator()).toBe(true);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe("Edge Cases", () => {
    it("should handle empty content edit", async () => {
      const message = createTestMessage();
      const editor = createTestUser();

      const result = await service.editMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          newContent: "",
          editorId: editor.id,
          editor,
        },
        message,
        "member",
      );

      expect(result.success).toBe(true);
      expect(result.message?.content).toBe("");
    });

    it("should handle very long content", async () => {
      const message = createTestMessage();
      const editor = createTestUser();
      const longContent = "x".repeat(10000);

      const result = await service.editMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          newContent: longContent,
          editorId: editor.id,
          editor,
        },
        message,
        "member",
      );

      expect(result.success).toBe(true);
      expect(result.message?.content).toBe(longContent);
    });

    it("should generate correct change summary", async () => {
      const message = createTestMessage({ content: "Hello" });
      const editor = createTestUser();

      const result = await service.editMessage(
        {
          messageId: message.id,
          channelId: message.channelId,
          newContent: "Hello World",
          editorId: editor.id,
          editor,
        },
        message,
        "member",
      );

      expect(result.editRecord?.changeSummary).toContain("Added");
    });

    it("should handle concurrent edits", async () => {
      const message = createTestMessage();
      const editor = createTestUser();

      // Perform two edits concurrently
      const [result1, result2] = await Promise.all([
        service.editMessage(
          {
            messageId: message.id,
            channelId: message.channelId,
            newContent: "First edit",
            editorId: editor.id,
            editor,
          },
          message,
          "member",
        ),
        service.editMessage(
          {
            messageId: message.id,
            channelId: message.channelId,
            newContent: "Second edit",
            editorId: editor.id,
            editor,
          },
          message,
          "member",
        ),
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(service.getEditHistory(message.id).length).toBe(2);
    });
  });
});
