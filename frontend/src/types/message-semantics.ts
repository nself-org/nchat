/**
 * Message Edit/Delete Semantics Types
 *
 * Platform-specific configurations for message editing and deletion behavior.
 * Supports semantics from WhatsApp, Telegram, Signal, Slack, and Discord.
 */

import type { MessageUser } from "./message";

// ============================================================================
// PLATFORM TYPES
// ============================================================================

/**
 * Supported messaging platform styles.
 */
export type MessagePlatformStyle =
  | "whatsapp"
  | "telegram"
  | "signal"
  | "slack"
  | "discord"
  | "custom";

// ============================================================================
// EDIT SEMANTICS
// ============================================================================

/**
 * Edit window configuration.
 */
export interface EditWindowConfig {
  /** Whether editing is allowed */
  enabled: boolean;
  /** Time window in seconds (0 = unlimited) */
  windowSeconds: number;
  /** Human-readable description */
  description: string;
}

/**
 * Platform-specific edit configurations.
 */
export const PLATFORM_EDIT_WINDOWS: Record<
  MessagePlatformStyle,
  EditWindowConfig
> = {
  whatsapp: {
    enabled: true,
    windowSeconds: 15 * 60, // 15 minutes
    description: "15 minutes after sending",
  },
  telegram: {
    enabled: true,
    windowSeconds: 48 * 60 * 60, // 48 hours
    description: "48 hours after sending",
  },
  signal: {
    enabled: false,
    windowSeconds: 0,
    description: "Editing not supported",
  },
  slack: {
    enabled: true,
    windowSeconds: 0, // Unlimited (configurable)
    description: "Unlimited (configurable by admin)",
  },
  discord: {
    enabled: true,
    windowSeconds: 0, // Unlimited
    description: "Unlimited",
  },
  custom: {
    enabled: true,
    windowSeconds: 0, // Configurable
    description: "Configurable",
  },
};

// ============================================================================
// DELETE SEMANTICS
// ============================================================================

/**
 * Delete scope options.
 */
export type DeleteScope = "for_me" | "for_everyone";

/**
 * Delete window configuration.
 */
export interface DeleteWindowConfig {
  /** Whether delete-for-everyone is allowed */
  deleteForEveryoneEnabled: boolean;
  /** Time window in seconds for delete-for-everyone (0 = unlimited) */
  deleteForEveryoneWindowSeconds: number;
  /** Whether delete-for-me is always available */
  deleteForMeAlways: boolean;
  /** Whether self-messages can always be deleted */
  selfDeleteUnlimited: boolean;
  /** Human-readable description */
  description: string;
}

/**
 * Platform-specific delete configurations.
 */
export const PLATFORM_DELETE_WINDOWS: Record<
  MessagePlatformStyle,
  DeleteWindowConfig
> = {
  whatsapp: {
    deleteForEveryoneEnabled: true,
    deleteForEveryoneWindowSeconds: 2 * 24 * 60 * 60, // 2 days
    deleteForMeAlways: true,
    selfDeleteUnlimited: false,
    description: "2 days for delete-for-everyone, always for delete-for-me",
  },
  telegram: {
    deleteForEveryoneEnabled: true,
    deleteForEveryoneWindowSeconds: 48 * 60 * 60, // 48 hours
    deleteForMeAlways: true,
    selfDeleteUnlimited: true, // Telegram allows unlimited self-delete
    description:
      "48 hours for delete-for-everyone (unlimited for own messages)",
  },
  signal: {
    deleteForEveryoneEnabled: true,
    deleteForEveryoneWindowSeconds: 0, // No limit
    deleteForMeAlways: true,
    selfDeleteUnlimited: true,
    description: "Unlimited for delete-for-everyone",
  },
  slack: {
    deleteForEveryoneEnabled: true,
    deleteForEveryoneWindowSeconds: 0, // Configurable
    deleteForMeAlways: false, // Slack doesn't have delete-for-me
    selfDeleteUnlimited: true,
    description: "Configurable by workspace admin",
  },
  discord: {
    deleteForEveryoneEnabled: true,
    deleteForEveryoneWindowSeconds: 0, // Unlimited
    deleteForMeAlways: false, // Discord doesn't have delete-for-me
    selfDeleteUnlimited: true,
    description: "Unlimited",
  },
  custom: {
    deleteForEveryoneEnabled: true,
    deleteForEveryoneWindowSeconds: 0,
    deleteForMeAlways: true,
    selfDeleteUnlimited: true,
    description: "Configurable",
  },
};

// ============================================================================
// UNDO SEMANTICS
// ============================================================================

/**
 * Undo action types.
 */
export type UndoActionType = "send" | "edit" | "delete" | "reaction";

/**
 * Undo window configuration.
 */
export interface UndoWindowConfig {
  /** Whether undo is enabled */
  enabled: boolean;
  /** Time window in seconds */
  windowSeconds: number;
  /** Actions that support undo */
  supportedActions: UndoActionType[];
}

/**
 * Default undo configuration.
 */
export const DEFAULT_UNDO_CONFIG: UndoWindowConfig = {
  enabled: true,
  windowSeconds: 5, // 5 second undo window
  supportedActions: ["send", "edit", "delete", "reaction"],
};

// ============================================================================
// PERMISSION TYPES
// ============================================================================

/**
 * User role for permission checking.
 */
export type MessagePermissionRole =
  | "owner"
  | "admin"
  | "moderator"
  | "member"
  | "guest";

/**
 * Permission check result.
 */
export interface PermissionCheckResult {
  /** Whether action is allowed */
  allowed: boolean;
  /** Reason if not allowed */
  reason?: string;
  /** Remaining time in seconds if time-limited */
  remainingSeconds?: number;
  /** Whether admin override applies */
  adminOverride?: boolean;
}

// ============================================================================
// DELETED MESSAGE TYPES
// ============================================================================

/**
 * Deleted message state.
 */
export interface DeletedMessageState {
  /** Message ID */
  messageId: string;
  /** Delete scope */
  scope: DeleteScope;
  /** Who deleted the message */
  deletedBy: string;
  /** When deleted */
  deletedAt: Date;
  /** Original content (for audit) */
  originalContent?: string;
  /** Reason for deletion (for mod actions) */
  reason?: string;
  /** Whether it can be restored */
  canRestore: boolean;
  /** Restoration deadline */
  restoreDeadline?: Date;
}

/**
 * Soft-deleted message record (for delete-for-me).
 */
export interface LocalDeletedMessage {
  /** Message ID */
  messageId: string;
  /** User who deleted locally */
  userId: string;
  /** When deleted */
  deletedAt: Date;
}

// ============================================================================
// EDIT HISTORY TYPES (Extended)
// ============================================================================

/**
 * Edit record with before/after content.
 */
export interface MessageEditAuditRecord {
  /** Edit record ID */
  id: string;
  /** Message ID */
  messageId: string;
  /** Channel ID */
  channelId: string;
  /** Who made the edit */
  editedBy: MessageUser;
  /** Content before the edit */
  previousContent: string;
  /** Content after the edit */
  newContent: string;
  /** When the edit was made */
  editedAt: Date;
  /** Change summary */
  changeSummary?: string;
  /** Edit version number */
  versionNumber: number;
  /** Is this a restoration from history */
  isRestoration?: boolean;
  /** If restoration, which version was restored */
  restoredFromVersion?: number;
}

// ============================================================================
// AUDIT EVENT TYPES
// ============================================================================

/**
 * Message action audit event types.
 */
export type MessageAuditEventType =
  | "message_edited"
  | "message_deleted"
  | "message_deleted_for_everyone"
  | "message_deleted_for_me"
  | "message_restored"
  | "message_undo_send"
  | "message_undo_edit"
  | "message_undo_delete"
  | "message_bulk_delete";

/**
 * Audit event for message actions.
 */
export interface MessageAuditEvent {
  /** Event type */
  type: MessageAuditEventType;
  /** Message ID */
  messageId: string;
  /** Channel ID */
  channelId: string;
  /** Actor who performed the action */
  actor: MessageUser;
  /** When the action occurred */
  timestamp: Date;
  /** Previous state (for edits) */
  previousState?: {
    content: string;
    isDeleted: boolean;
  };
  /** New state */
  newState?: {
    content: string;
    isDeleted: boolean;
  };
  /** Additional context */
  context?: {
    reason?: string;
    scope?: DeleteScope;
    isBulk?: boolean;
    bulkCount?: number;
    isModeratorAction?: boolean;
  };
}

// ============================================================================
// UNDO STATE TYPES
// ============================================================================

/**
 * Pending undo action.
 */
export interface PendingUndoAction {
  /** Unique ID for this undo action */
  id: string;
  /** Type of action that can be undone */
  type: UndoActionType;
  /** Message ID affected */
  messageId: string;
  /** Channel ID */
  channelId: string;
  /** When the action was performed */
  performedAt: Date;
  /** When undo expires */
  expiresAt: Date;
  /** Data needed to undo */
  undoData: {
    /** For send: the message to delete */
    /** For edit: the previous content */
    /** For delete: the message to restore */
    previousContent?: string;
    previousState?: "visible" | "deleted";
    deleteScope?: DeleteScope;
  };
  /** Whether undo was performed */
  undone: boolean;
}

// ============================================================================
// SEMANTICS CONFIGURATION
// ============================================================================

/**
 * Complete message semantics configuration.
 */
export interface MessageSemanticsConfig {
  /** Platform style to use */
  platformStyle: MessagePlatformStyle;
  /** Custom edit window (overrides platform default) */
  customEditWindowSeconds?: number;
  /** Custom delete-for-everyone window (overrides platform default) */
  customDeleteWindowSeconds?: number;
  /** Whether edit history is tracked */
  trackEditHistory: boolean;
  /** Whether to show "edited" indicator */
  showEditedIndicator: boolean;
  /** Whether to show deleted message placeholder */
  showDeletedPlaceholder: boolean;
  /** Deleted message placeholder text */
  deletedPlaceholderText: string;
  /** Whether undo is enabled */
  enableUndo: boolean;
  /** Undo window in seconds */
  undoWindowSeconds: number;
  /** Whether to enable delete-for-me */
  enableDeleteForMe: boolean;
  /** Whether admins can edit/delete any message */
  adminOverride: boolean;
  /** Whether to log all edit/delete actions to audit */
  auditAllActions: boolean;
  /** Soft delete retention (hours before hard delete, 0 = never) */
  softDeleteRetentionHours: number;
}

/**
 * Default message semantics configuration.
 */
export const DEFAULT_MESSAGE_SEMANTICS: MessageSemanticsConfig = {
  platformStyle: "slack",
  trackEditHistory: true,
  showEditedIndicator: true,
  showDeletedPlaceholder: true,
  deletedPlaceholderText: "This message was deleted.",
  enableUndo: true,
  undoWindowSeconds: 5,
  enableDeleteForMe: true,
  adminOverride: true,
  auditAllActions: true,
  softDeleteRetentionHours: 24 * 30, // 30 days
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the effective edit window for a platform.
 */
export function getEditWindow(
  config: MessageSemanticsConfig,
): EditWindowConfig {
  if (config.customEditWindowSeconds !== undefined) {
    return {
      enabled: true,
      windowSeconds: config.customEditWindowSeconds,
      description: "Custom configuration",
    };
  }
  return PLATFORM_EDIT_WINDOWS[config.platformStyle];
}

/**
 * Get the effective delete window for a platform.
 */
export function getDeleteWindow(
  config: MessageSemanticsConfig,
): DeleteWindowConfig {
  const base = PLATFORM_DELETE_WINDOWS[config.platformStyle];
  if (config.customDeleteWindowSeconds !== undefined) {
    return {
      ...base,
      deleteForEveryoneWindowSeconds: config.customDeleteWindowSeconds,
      description: "Custom configuration",
    };
  }
  return base;
}

/**
 * Check if a message is within the edit window.
 */
export function isWithinEditWindow(
  messageCreatedAt: Date,
  config: MessageSemanticsConfig,
): boolean {
  const editWindow = getEditWindow(config);
  if (!editWindow.enabled) return false;
  if (editWindow.windowSeconds === 0) return true; // Unlimited

  const now = Date.now();
  const messageTime = messageCreatedAt.getTime();
  const windowMs = editWindow.windowSeconds * 1000;

  return now - messageTime <= windowMs;
}

/**
 * Check if a message is within the delete-for-everyone window.
 */
export function isWithinDeleteWindow(
  messageCreatedAt: Date,
  config: MessageSemanticsConfig,
  isOwnMessage: boolean,
): boolean {
  const deleteWindow = getDeleteWindow(config);
  if (!deleteWindow.deleteForEveryoneEnabled) return false;

  // If unlimited for self-delete and this is user's own message
  if (deleteWindow.selfDeleteUnlimited && isOwnMessage) return true;

  // If unlimited
  if (deleteWindow.deleteForEveryoneWindowSeconds === 0) return true;

  const now = Date.now();
  const messageTime = messageCreatedAt.getTime();
  const windowMs = deleteWindow.deleteForEveryoneWindowSeconds * 1000;

  return now - messageTime <= windowMs;
}

/**
 * Get remaining time in the edit window.
 */
export function getRemainingEditTime(
  messageCreatedAt: Date,
  config: MessageSemanticsConfig,
): number {
  const editWindow = getEditWindow(config);
  if (!editWindow.enabled) return 0;
  if (editWindow.windowSeconds === 0) return Infinity; // Unlimited

  const now = Date.now();
  const messageTime = messageCreatedAt.getTime();
  const windowMs = editWindow.windowSeconds * 1000;
  const elapsed = now - messageTime;

  return Math.max(0, windowMs - elapsed) / 1000;
}

/**
 * Get remaining time in the delete window.
 */
export function getRemainingDeleteTime(
  messageCreatedAt: Date,
  config: MessageSemanticsConfig,
): number {
  const deleteWindow = getDeleteWindow(config);
  if (deleteWindow.deleteForEveryoneWindowSeconds === 0) return Infinity;

  const now = Date.now();
  const messageTime = messageCreatedAt.getTime();
  const windowMs = deleteWindow.deleteForEveryoneWindowSeconds * 1000;
  const elapsed = now - messageTime;

  return Math.max(0, windowMs - elapsed) / 1000;
}

/**
 * Format remaining time for display.
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds === Infinity) return "unlimited";
  if (seconds <= 0) return "expired";

  if (seconds < 60) {
    return `${Math.ceil(seconds)} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  } else if (seconds < 86400) {
    const hours = Math.ceil(seconds / 3600);
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  } else {
    const days = Math.ceil(seconds / 86400);
    return `${days} day${days !== 1 ? "s" : ""}`;
  }
}
