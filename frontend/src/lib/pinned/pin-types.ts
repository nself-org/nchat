/**
 * Pinned Messages Types
 *
 * TypeScript type definitions for the pinned messages system.
 */

import type { Message, MessageUser } from "@/types/message";

// ============================================================================
// Pin Types
// ============================================================================

/**
 * Who can pin messages in a channel.
 */
export type PinPermission = "admins-only" | "moderators" | "members" | "anyone";

/**
 * Pin configuration for a channel.
 */
export interface PinConfig {
  /** Maximum number of pinned messages per channel */
  maxPins: number;
  /** Who can pin messages */
  pinPermission: PinPermission;
  /** Whether to show pinned banner in channel header */
  showBanner: boolean;
  /** Whether to notify channel members when a message is pinned */
  notifyOnPin: boolean;
}

/**
 * Default pin configuration.
 */
export const DEFAULT_PIN_CONFIG: PinConfig = {
  maxPins: 50,
  pinPermission: "moderators",
  showBanner: true,
  notifyOnPin: true,
};

/**
 * Pinned message record.
 */
export interface PinnedMessage {
  /** Unique pin ID */
  id: string;
  /** ID of the pinned message */
  messageId: string;
  /** Channel ID where the message is pinned */
  channelId: string;
  /** User who pinned the message */
  pinnedBy: MessageUser;
  /** When the message was pinned */
  pinnedAt: Date;
  /** The actual message content */
  message: Message;
  /** Optional note about why it was pinned */
  note?: string;
  /** Position in the pinned list (for ordering) */
  position: number;
}

/**
 * Input for pinning a message.
 */
export interface PinMessageInput {
  /** Message ID to pin */
  messageId: string;
  /** Channel ID */
  channelId: string;
  /** Optional note */
  note?: string;
}

/**
 * Input for unpinning a message.
 */
export interface UnpinMessageInput {
  /** Pin ID or Message ID to unpin */
  pinId?: string;
  messageId?: string;
  /** Channel ID */
  channelId: string;
}

/**
 * Input for reordering pinned messages.
 */
export interface ReorderPinsInput {
  /** Channel ID */
  channelId: string;
  /** Array of pin IDs in new order */
  pinIds: string[];
}

/**
 * Pin action result.
 */
export interface PinResult {
  success: boolean;
  pinnedMessage?: PinnedMessage;
  error?: string;
  errorCode?: PinErrorCode;
}

/**
 * Pin error codes.
 */
export type PinErrorCode =
  | "PIN_LIMIT_REACHED"
  | "MESSAGE_ALREADY_PINNED"
  | "MESSAGE_NOT_FOUND"
  | "PERMISSION_DENIED"
  | "CHANNEL_NOT_FOUND"
  | "PIN_NOT_FOUND"
  | "UNKNOWN_ERROR";

/**
 * Pin event for real-time updates.
 */
export interface PinEvent {
  type: "pin_added" | "pin_removed" | "pins_reordered";
  channelId: string;
  pinnedMessage?: PinnedMessage;
  messageId?: string;
  pinnedBy?: MessageUser;
  timestamp: Date;
}

// ============================================================================
// Pin Filter Types
// ============================================================================

/**
 * Filter options for pinned messages.
 */
export interface PinFilters {
  /** Filter by user who pinned */
  pinnedByUserId?: string;
  /** Filter by date range - from */
  pinnedAfter?: Date;
  /** Filter by date range - to */
  pinnedBefore?: Date;
  /** Filter by message type */
  messageType?: string;
  /** Search in message content */
  searchQuery?: string;
  /** Filter messages with attachments */
  hasAttachments?: boolean;
}

/**
 * Sort options for pinned messages.
 */
export type PinSortBy = "pinnedAt" | "messageDate" | "position";
export type PinSortOrder = "asc" | "desc";

/**
 * Pinned messages list options.
 */
export interface PinListOptions {
  channelId: string;
  filters?: PinFilters;
  sortBy?: PinSortBy;
  sortOrder?: PinSortOrder;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Pin Stats
// ============================================================================

/**
 * Pin statistics for a channel.
 */
export interface ChannelPinStats {
  /** Channel ID */
  channelId: string;
  /** Total number of pinned messages */
  totalPins: number;
  /** Maximum allowed pins */
  maxPins: number;
  /** Remaining pin slots */
  remainingSlots: number;
  /** Most recent pin date */
  lastPinnedAt?: Date;
  /** Users who have pinned messages */
  pinnerCount: number;
}
