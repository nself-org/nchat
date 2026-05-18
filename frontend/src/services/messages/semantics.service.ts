/**
 * Message Semantics Service
 *
 * Handles edit/delete semantics with platform-specific windows,
 * undo functionality, and audit logging.
 */

import { logger } from "@/lib/logger";
import { logAuditEvent } from "@/lib/audit";
import type { Message, MessageUser, MessageEditRecord } from "@/types/message";
import type {
  MessageSemanticsConfig,
  MessagePlatformStyle,
  DeleteScope,
  PermissionCheckResult,
  DeletedMessageState,
  LocalDeletedMessage,
  PendingUndoAction,
  UndoActionType,
  MessageAuditEvent,
  MessageAuditEventType,
  MessageEditAuditRecord,
} from "@/types/message-semantics";

import {
  DEFAULT_MESSAGE_SEMANTICS,
  getEditWindow,
  getDeleteWindow,
  isWithinEditWindow,
  isWithinDeleteWindow,
  getRemainingEditTime,
  getRemainingDeleteTime,
  formatRemainingTime,
} from "@/types/message-semantics";

// ============================================================================
// TYPES
// ============================================================================

export interface EditMessageInput {
  messageId: string;
  channelId: string;
  newContent: string;
  editorId: string;
  editor: MessageUser;
}

export interface EditMessageResult {
  success: boolean;
  message?: Message;
  editRecord?: MessageEditAuditRecord;
  undoAction?: PendingUndoAction;
  error?: string;
}

export interface DeleteMessageInput {
  messageId: string;
  channelId: string;
  scope: DeleteScope;
  deleterId: string;
  deleter: MessageUser;
  reason?: string;
}

export interface DeleteMessageResult {
  success: boolean;
  deletedState?: DeletedMessageState;
  undoAction?: PendingUndoAction;
  error?: string;
}

export interface UndoResult {
  success: boolean;
  message?: Message;
  error?: string;
}

export interface BulkDeleteInput {
  messageIds: string[];
  channelId: string;
  deleterId: string;
  deleter: MessageUser;
  reason?: string;
}

export interface BulkDeleteResult {
  success: boolean;
  deletedCount: number;
  failedIds: string[];
  errors: Map<string, string>;
}

// ============================================================================
// STORAGE (In-memory for now, should be moved to database)
// ============================================================================

// Pending undo actions (keyed by action ID)
const pendingUndoActions = new Map<string, PendingUndoAction>();

// Local deleted messages (for delete-for-me)
const localDeletedMessages = new Map<string, LocalDeletedMessage[]>();

// Soft-deleted messages (for restoration)
const softDeletedMessages = new Map<string, DeletedMessageState>();

// Edit history cache
const editHistoryCache = new Map<string, MessageEditAuditRecord[]>();

// ============================================================================
// MESSAGE SEMANTICS SERVICE CLASS
// ============================================================================

export class MessageSemanticsService {
  private config: MessageSemanticsConfig;

  constructor(config: Partial<MessageSemanticsConfig> = {}) {
    this.config = { ...DEFAULT_MESSAGE_SEMANTICS, ...config };
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  /**
   * Get current configuration.
   */
  getConfig(): MessageSemanticsConfig {
    return { ...this.config };
  }

  /**
   * Update configuration.
   */
  updateConfig(updates: Partial<MessageSemanticsConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info("MessageSemanticsService config updated", {
      config: this.config,
    });
  }

  /**
   * Set platform style.
   */
  setPlatformStyle(style: MessagePlatformStyle): void {
    this.config.platformStyle = style;
    logger.info("MessageSemanticsService platform style set", { style });
  }

  // ==========================================================================
  // PERMISSION CHECKS
  // ==========================================================================

  /**
   * Check if a user can edit a message.
   */
  canEdit(
    message: Message,
    userId: string,
    userRole: string = "member",
  ): PermissionCheckResult {
    // Check if editing is enabled for this platform
    const editWindow = getEditWindow(this.config);
    if (!editWindow.enabled) {
      return {
        allowed: false,
        reason: "Editing is not enabled for this platform style",
      };
    }

    // Check if user owns the message or is admin
    const isOwner = message.userId === userId;
    const isAdmin = ["owner", "admin"].includes(userRole);
    const isModerator = ["owner", "admin", "moderator"].includes(userRole);

    // Deleted messages cannot be edited
    if (message.isDeleted) {
      return {
        allowed: false,
        reason: "Deleted messages cannot be edited",
      };
    }

    // Admin override
    if (this.config.adminOverride && isAdmin) {
      return {
        allowed: true,
        adminOverride: true,
      };
    }

    // Must be the message owner
    if (!isOwner) {
      return {
        allowed: false,
        reason: "You can only edit your own messages",
      };
    }

    // Check time window
    if (!isWithinEditWindow(message.createdAt, this.config)) {
      const remaining = getRemainingEditTime(message.createdAt, this.config);
      return {
        allowed: false,
        reason: `Edit window has expired (${formatRemainingTime(editWindow.windowSeconds)} limit)`,
        remainingSeconds: 0,
      };
    }

    const remaining = getRemainingEditTime(message.createdAt, this.config);
    return {
      allowed: true,
      remainingSeconds: remaining === Infinity ? undefined : remaining,
    };
  }

  /**
   * Check if a user can delete a message.
   */
  canDelete(
    message: Message,
    userId: string,
    userRole: string = "member",
    scope: DeleteScope = "for_everyone",
  ): PermissionCheckResult {
    const deleteWindow = getDeleteWindow(this.config);
    const isOwner = message.userId === userId;
    const isAdmin = ["owner", "admin"].includes(userRole);
    const isModerator = ["owner", "admin", "moderator"].includes(userRole);

    // Already deleted
    if (message.isDeleted) {
      return {
        allowed: false,
        reason: "Message is already deleted",
      };
    }

    // Delete-for-me is always allowed if enabled
    if (scope === "for_me") {
      if (!this.config.enableDeleteForMe) {
        return {
          allowed: false,
          reason: "Delete-for-me is not enabled",
        };
      }
      if (!deleteWindow.deleteForMeAlways) {
        return {
          allowed: false,
          reason: "Delete-for-me is not available for this platform",
        };
      }
      return { allowed: true };
    }

    // Delete-for-everyone checks
    if (!deleteWindow.deleteForEveryoneEnabled) {
      return {
        allowed: false,
        reason: "Delete-for-everyone is not enabled",
      };
    }

    // Admin/moderator override
    if (this.config.adminOverride && isModerator) {
      return {
        allowed: true,
        adminOverride: true,
      };
    }

    // Must be owner for delete-for-everyone (unless admin)
    if (!isOwner) {
      return {
        allowed: false,
        reason: "You can only delete your own messages",
      };
    }

    // Check if self-delete is unlimited
    if (deleteWindow.selfDeleteUnlimited && isOwner) {
      return { allowed: true };
    }

    // Check time window
    if (!isWithinDeleteWindow(message.createdAt, this.config, isOwner)) {
      return {
        allowed: false,
        reason: `Delete window has expired`,
        remainingSeconds: 0,
      };
    }

    const remaining = getRemainingDeleteTime(message.createdAt, this.config);
    return {
      allowed: true,
      remainingSeconds: remaining === Infinity ? undefined : remaining,
    };
  }

  // ==========================================================================
  // EDIT OPERATIONS
  // ==========================================================================

  /**
   * Edit a message with history tracking and undo support.
   */
  async editMessage(
    input: EditMessageInput,
    message: Message,
    userRole: string = "member",
  ): Promise<EditMessageResult> {
    const { messageId, channelId, newContent, editorId, editor } = input;

    // Permission check
    const permission = this.canEdit(message, editorId, userRole);
    if (!permission.allowed) {
      return {
        success: false,
        error: permission.reason,
      };
    }

    const previousContent = message.content;
    const now = new Date();

    try {
      // Create edit record
      const editHistory = editHistoryCache.get(messageId) || [];
      const editRecord: MessageEditAuditRecord = {
        id: `edit-${messageId}-${editHistory.length + 1}`,
        messageId,
        channelId,
        editedBy: editor,
        previousContent,
        newContent,
        editedAt: now,
        changeSummary: this.generateChangeSummary(previousContent, newContent),
        versionNumber: editHistory.length + 2, // +1 for original, +1 for this edit
      };

      // Store edit record
      editHistoryCache.set(messageId, [...editHistory, editRecord]);

      // Create undo action
      let undoAction: PendingUndoAction | undefined;
      if (this.config.enableUndo) {
        undoAction = this.createUndoAction("edit", messageId, channelId, {
          previousContent,
        });
      }

      // Log audit event
      if (this.config.auditAllActions) {
        await this.logEditEvent({
          type: "message_edited",
          messageId,
          channelId,
          actor: editor,
          timestamp: now,
          previousState: { content: previousContent, isDeleted: false },
          newState: { content: newContent, isDeleted: false },
          context: {
            isModeratorAction: permission.adminOverride,
          },
        });
      }

      // Create updated message (in real impl, this would be from DB)
      const updatedMessage: Message = {
        ...message,
        content: newContent,
        isEdited: true,
        editedAt: now,
        editHistory: [
          ...(message.editHistory || []),
          {
            previousContent,
            newContent,
            editedAt: now,
            editorId,
          },
        ],
      };

      logger.info("Message edited successfully", {
        messageId,
        channelId,
        editorId,
        hasUndo: !!undoAction,
      });

      return {
        success: true,
        message: updatedMessage,
        editRecord,
        undoAction,
      };
    } catch (error) {
      logger.error("Failed to edit message", error as Error, { messageId });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to edit message",
      };
    }
  }

  /**
   * Restore a message to a previous version.
   */
  async restoreVersion(
    messageId: string,
    channelId: string,
    versionNumber: number,
    restorerUserId: string,
    restorer: MessageUser,
    currentMessage: Message,
  ): Promise<EditMessageResult> {
    const editHistory = editHistoryCache.get(messageId);
    if (!editHistory || editHistory.length === 0) {
      return {
        success: false,
        error: "No edit history found for this message",
      };
    }

    // Find the version to restore
    const targetVersion = editHistory.find(
      (e) => e.versionNumber === versionNumber,
    );
    if (!targetVersion) {
      return {
        success: false,
        error: `Version ${versionNumber} not found`,
      };
    }

    // The content to restore is the previousContent of the target version
    // (because that was the content BEFORE that edit)
    const contentToRestore = targetVersion.previousContent;
    const now = new Date();

    try {
      // Create restoration edit record
      const restorationRecord: MessageEditAuditRecord = {
        id: `edit-${messageId}-${editHistory.length + 1}`,
        messageId,
        channelId,
        editedBy: restorer,
        previousContent: currentMessage.content,
        newContent: contentToRestore,
        editedAt: now,
        changeSummary: `Restored to version ${versionNumber}`,
        versionNumber: editHistory.length + 2,
        isRestoration: true,
        restoredFromVersion: versionNumber,
      };

      editHistoryCache.set(messageId, [...editHistory, restorationRecord]);

      // Log audit event
      if (this.config.auditAllActions) {
        await this.logEditEvent({
          type: "message_restored",
          messageId,
          channelId,
          actor: restorer,
          timestamp: now,
          previousState: { content: currentMessage.content, isDeleted: false },
          newState: { content: contentToRestore, isDeleted: false },
        });
      }

      const updatedMessage: Message = {
        ...currentMessage,
        content: contentToRestore,
        isEdited: true,
        editedAt: now,
      };

      logger.info("Message version restored", {
        messageId,
        versionNumber,
        restorerUserId,
      });

      return {
        success: true,
        message: updatedMessage,
        editRecord: restorationRecord,
      };
    } catch (error) {
      logger.error("Failed to restore message version", error as Error, {
        messageId,
        versionNumber,
      });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to restore version",
      };
    }
  }

  /**
   * Get edit history for a message.
   */
  getEditHistory(messageId: string): MessageEditAuditRecord[] {
    return editHistoryCache.get(messageId) || [];
  }

  // ==========================================================================
  // DELETE OPERATIONS
  // ==========================================================================

  /**
   * Delete a message with scope and undo support.
   */
  async deleteMessage(
    input: DeleteMessageInput,
    message: Message,
    userRole: string = "member",
  ): Promise<DeleteMessageResult> {
    const { messageId, channelId, scope, deleterId, deleter, reason } = input;

    // Permission check
    const permission = this.canDelete(message, deleterId, userRole, scope);
    if (!permission.allowed) {
      return {
        success: false,
        error: permission.reason,
      };
    }

    const now = new Date();

    try {
      if (scope === "for_me") {
        // Local delete only
        return await this.deleteForMe(messageId, deleterId, message);
      }

      // Delete for everyone
      const deletedState: DeletedMessageState = {
        messageId,
        scope,
        deletedBy: deleterId,
        deletedAt: now,
        originalContent: message.content,
        reason,
        canRestore: this.config.softDeleteRetentionHours > 0,
        restoreDeadline:
          this.config.softDeleteRetentionHours > 0
            ? new Date(
                now.getTime() +
                  this.config.softDeleteRetentionHours * 60 * 60 * 1000,
              )
            : undefined,
      };

      // Store soft delete state
      softDeletedMessages.set(messageId, deletedState);

      // Create undo action
      let undoAction: PendingUndoAction | undefined;
      if (this.config.enableUndo) {
        undoAction = this.createUndoAction("delete", messageId, channelId, {
          previousContent: message.content,
          previousState: "visible",
          deleteScope: scope,
        });
      }

      // Log audit event
      if (this.config.auditAllActions) {
        await this.logDeleteEvent({
          type: "message_deleted_for_everyone",
          messageId,
          channelId,
          actor: deleter,
          timestamp: now,
          previousState: { content: message.content, isDeleted: false },
          newState: { content: "", isDeleted: true },
          context: {
            reason,
            scope,
            isModeratorAction: permission.adminOverride,
          },
        });
      }

      logger.info("Message deleted for everyone", {
        messageId,
        channelId,
        deleterId,
        hasUndo: !!undoAction,
      });

      return {
        success: true,
        deletedState,
        undoAction,
      };
    } catch (error) {
      logger.error("Failed to delete message", error as Error, { messageId });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete message",
      };
    }
  }

  /**
   * Delete a message for the current user only.
   */
  private async deleteForMe(
    messageId: string,
    userId: string,
    message: Message,
  ): Promise<DeleteMessageResult> {
    const now = new Date();

    const localDelete: LocalDeletedMessage = {
      messageId,
      userId,
      deletedAt: now,
    };

    // Store local delete
    const userDeletes = localDeletedMessages.get(userId) || [];
    userDeletes.push(localDelete);
    localDeletedMessages.set(userId, userDeletes);

    // Log audit event
    if (this.config.auditAllActions) {
      await logAuditEvent({
        action: "delete",
        actor: userId,
        category: "message",
        resource: { type: "message", id: messageId },
        description: "Message deleted for user only",
        metadata: { scope: "for_me" },
      });
    }

    logger.info("Message deleted for user", { messageId, userId });

    return {
      success: true,
      deletedState: {
        messageId,
        scope: "for_me",
        deletedBy: userId,
        deletedAt: now,
        canRestore: true,
      },
    };
  }

  /**
   * Bulk delete messages (admin only).
   */
  async bulkDelete(
    input: BulkDeleteInput,
    messages: Message[],
    userRole: string = "member",
  ): Promise<BulkDeleteResult> {
    const { messageIds, channelId, deleterId, deleter, reason } = input;

    // Only admins/mods can bulk delete
    if (!["owner", "admin", "moderator"].includes(userRole)) {
      return {
        success: false,
        deletedCount: 0,
        failedIds: messageIds,
        errors: new Map([
          ["permission", "Only administrators can bulk delete messages"],
        ]),
      };
    }

    const results = {
      deletedCount: 0,
      failedIds: [] as string[],
      errors: new Map<string, string>(),
    };

    const now = new Date();

    for (const messageId of messageIds) {
      const message = messages.find((m) => m.id === messageId);
      if (!message) {
        results.failedIds.push(messageId);
        results.errors.set(messageId, "Message not found");
        continue;
      }

      const deleteResult = await this.deleteMessage(
        {
          messageId,
          channelId,
          scope: "for_everyone",
          deleterId,
          deleter,
          reason: reason || "Bulk delete",
        },
        message,
        userRole,
      );

      if (deleteResult.success) {
        results.deletedCount++;
      } else {
        results.failedIds.push(messageId);
        results.errors.set(messageId, deleteResult.error || "Unknown error");
      }
    }

    // Log bulk delete audit event
    if (this.config.auditAllActions) {
      await logAuditEvent({
        action: "bulk_delete",
        actor: deleterId,
        category: "message",
        resource: { type: "channel", id: channelId },
        description: `Bulk deleted ${results.deletedCount} messages`,
        metadata: {
          messageCount: results.deletedCount,
          failedCount: results.failedIds.length,
          reason,
        },
      });
    }

    logger.info("Bulk delete completed", {
      channelId,
      deletedCount: results.deletedCount,
      failedCount: results.failedIds.length,
    });

    return {
      success: results.failedIds.length === 0,
      ...results,
    };
  }

  /**
   * Check if a message is locally deleted for a user.
   */
  isLocallyDeleted(messageId: string, userId: string): boolean {
    const userDeletes = localDeletedMessages.get(userId) || [];
    return userDeletes.some((d) => d.messageId === messageId);
  }

  /**
   * Get deleted message state.
   */
  getDeletedState(messageId: string): DeletedMessageState | undefined {
    return softDeletedMessages.get(messageId);
  }

  /**
   * Restore a soft-deleted message.
   */
  async restoreDeletedMessage(
    messageId: string,
    restorerId: string,
    restorer: MessageUser,
    userRole: string = "member",
  ): Promise<UndoResult> {
    const deletedState = softDeletedMessages.get(messageId);
    if (!deletedState) {
      return {
        success: false,
        error: "Message not found or already restored",
      };
    }

    // Check if restoration is still allowed
    if (!deletedState.canRestore) {
      return {
        success: false,
        error: "This message cannot be restored",
      };
    }

    if (
      deletedState.restoreDeadline &&
      new Date() > deletedState.restoreDeadline
    ) {
      return {
        success: false,
        error: "Restoration deadline has passed",
      };
    }

    // Only owner, admin, or original deleter can restore
    const isDeleter = deletedState.deletedBy === restorerId;
    const isAdmin = ["owner", "admin"].includes(userRole);

    if (!isDeleter && !isAdmin) {
      return {
        success: false,
        error: "You do not have permission to restore this message",
      };
    }

    try {
      // Remove from soft deleted
      softDeletedMessages.delete(messageId);

      // Log audit event
      if (this.config.auditAllActions) {
        await logAuditEvent({
          action: "edit", // Restoration is technically an edit
          actor: restorerId,
          category: "message",
          resource: { type: "message", id: messageId },
          description: "Message restored from deletion",
          metadata: {
            originalContent: deletedState.originalContent,
            deletedBy: deletedState.deletedBy,
            deletedAt: deletedState.deletedAt.toISOString(),
          },
        });
      }

      logger.info("Message restored", { messageId, restorerId });

      return {
        success: true,
        // In real impl, would return the restored message from DB
      };
    } catch (error) {
      logger.error("Failed to restore message", error as Error, { messageId });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to restore message",
      };
    }
  }

  // ==========================================================================
  // UNDO OPERATIONS
  // ==========================================================================

  /**
   * Create an undo action.
   */
  private createUndoAction(
    type: UndoActionType,
    messageId: string,
    channelId: string,
    undoData: PendingUndoAction["undoData"],
  ): PendingUndoAction {
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + this.config.undoWindowSeconds * 1000,
    );

    const undoAction: PendingUndoAction = {
      id: `undo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      messageId,
      channelId,
      performedAt: now,
      expiresAt,
      undoData,
      undone: false,
    };

    pendingUndoActions.set(undoAction.id, undoAction);

    // Schedule cleanup
    setTimeout(() => {
      const action = pendingUndoActions.get(undoAction.id);
      if (action && !action.undone) {
        pendingUndoActions.delete(undoAction.id);
        logger.debug("Undo action expired", { id: undoAction.id });
      }
    }, this.config.undoWindowSeconds * 1000);

    return undoAction;
  }

  /**
   * Get pending undo action by ID.
   */
  getUndoAction(undoId: string): PendingUndoAction | undefined {
    const action = pendingUndoActions.get(undoId);
    if (!action) return undefined;

    // Check if expired
    if (new Date() > action.expiresAt) {
      pendingUndoActions.delete(undoId);
      return undefined;
    }

    return action;
  }

  /**
   * Get pending undo action for a message.
   */
  getUndoActionForMessage(messageId: string): PendingUndoAction | undefined {
    for (const action of pendingUndoActions.values()) {
      if (
        action.messageId === messageId &&
        !action.undone &&
        new Date() <= action.expiresAt
      ) {
        return action;
      }
    }
    return undefined;
  }

  /**
   * Execute an undo action.
   */
  async executeUndo(undoId: string, userId: string): Promise<UndoResult> {
    const action = this.getUndoAction(undoId);
    if (!action) {
      return {
        success: false,
        error: "Undo action not found or expired",
      };
    }

    if (action.undone) {
      return {
        success: false,
        error: "Action already undone",
      };
    }

    try {
      // Mark as undone
      action.undone = true;
      pendingUndoActions.set(undoId, action);

      // Execute undo based on type
      switch (action.type) {
        case "edit":
          // Restore previous content
          // In real impl, would call updateMessage with previousContent
          logger.info("Undo edit executed", {
            messageId: action.messageId,
            previousContent: action.undoData.previousContent,
          });
          break;

        case "delete":
          // Restore the message
          softDeletedMessages.delete(action.messageId);
          logger.info("Undo delete executed", { messageId: action.messageId });
          break;

        case "send":
          // Delete the sent message
          logger.info("Undo send executed", { messageId: action.messageId });
          break;

        default:
          logger.warn("Unknown undo action type", { type: action.type });
      }

      // Log audit event
      if (this.config.auditAllActions) {
        const eventType: MessageAuditEventType =
          action.type === "edit"
            ? "message_undo_edit"
            : action.type === "delete"
              ? "message_undo_delete"
              : "message_undo_send";

        await logAuditEvent({
          action: "edit",
          actor: userId,
          category: "message",
          resource: { type: "message", id: action.messageId },
          description: `Undo ${action.type} action`,
          metadata: {
            undoId,
            actionType: action.type,
          },
        });
      }

      return { success: true };
    } catch (error) {
      logger.error("Failed to execute undo", error as Error, { undoId });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to undo action",
      };
    }
  }

  /**
   * Get remaining undo time for an action.
   */
  getRemainingUndoTime(undoId: string): number {
    const action = this.getUndoAction(undoId);
    if (!action) return 0;

    const remaining = action.expiresAt.getTime() - Date.now();
    return Math.max(0, remaining / 1000);
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Generate a summary of changes between two strings.
   */
  private generateChangeSummary(
    oldContent: string,
    newContent: string,
  ): string {
    const oldLength = oldContent.length;
    const newLength = newContent.length;
    const diff = newLength - oldLength;

    if (diff > 0) {
      return `Added ${diff} character${diff !== 1 ? "s" : ""}`;
    } else if (diff < 0) {
      return `Removed ${Math.abs(diff)} character${Math.abs(diff) !== 1 ? "s" : ""}`;
    } else {
      return "Modified content";
    }
  }

  /**
   * Log an edit audit event.
   */
  private async logEditEvent(event: MessageAuditEvent): Promise<void> {
    await logAuditEvent({
      action: "edit",
      actor: event.actor.id,
      category: "message",
      resource: { type: "message", id: event.messageId },
      description: `Message ${event.type.replace("message_", "")}`,
      metadata: {
        channelId: event.channelId,
        previousContent: event.previousState?.content,
        newContent: event.newState?.content,
        ...event.context,
      },
    });
  }

  /**
   * Log a delete audit event.
   */
  private async logDeleteEvent(event: MessageAuditEvent): Promise<void> {
    await logAuditEvent({
      action: "delete",
      actor: event.actor.id,
      category: "message",
      resource: { type: "message", id: event.messageId },
      description: `Message ${event.context?.scope === "for_me" ? "deleted for user" : "deleted for everyone"}`,
      metadata: {
        channelId: event.channelId,
        originalContent: event.previousState?.content,
        reason: event.context?.reason,
        scope: event.context?.scope,
        isModeratorAction: event.context?.isModeratorAction,
      },
    });
  }

  /**
   * Get the placeholder text for a deleted message.
   */
  getDeletedPlaceholder(): string {
    return this.config.deletedPlaceholderText;
  }

  /**
   * Check if deleted placeholder should be shown.
   */
  shouldShowDeletedPlaceholder(): boolean {
    return this.config.showDeletedPlaceholder;
  }

  /**
   * Check if edited indicator should be shown.
   */
  shouldShowEditedIndicator(): boolean {
    return this.config.showEditedIndicator;
  }

  /**
   * Clear all undo actions (for testing).
   */
  clearAllUndoActions(): void {
    pendingUndoActions.clear();
  }

  /**
   * Clear all caches (for testing).
   */
  clearAllCaches(): void {
    pendingUndoActions.clear();
    localDeletedMessages.clear();
    softDeletedMessages.clear();
    editHistoryCache.clear();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let semanticsServiceInstance: MessageSemanticsService | null = null;

/**
 * Get or create the message semantics service singleton.
 */
export function getMessageSemanticsService(
  config?: Partial<MessageSemanticsConfig>,
): MessageSemanticsService {
  if (!semanticsServiceInstance) {
    semanticsServiceInstance = new MessageSemanticsService(config);
  }
  return semanticsServiceInstance;
}

/**
 * Create a new message semantics service instance (for testing).
 */
export function createMessageSemanticsService(
  config?: Partial<MessageSemanticsConfig>,
): MessageSemanticsService {
  return new MessageSemanticsService(config);
}

export default MessageSemanticsService;
