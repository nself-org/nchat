/**
 * Pin Manager
 *
 * Core logic for managing pinned messages.
 */

import type {
  PinnedMessage,
  PinMessageInput,
  UnpinMessageInput,
  ReorderPinsInput,
  PinResult,
  PinFilters,
  PinSortBy,
  PinSortOrder,
  PinListOptions,
  ChannelPinStats,
  PinConfig,
} from "./pin-types";
import { DEFAULT_PIN_CONFIG } from "./pin-types";
import {
  canPinMessage,
  canUnpinMessage,
  type UserRole,
} from "./pin-permissions";
import { checkPinLimits, isValidPinNote, PIN_LIMITS } from "./pin-limits";

// ============================================================================
// Pin Manager Class
// ============================================================================

/**
 * Manager class for pinned messages operations.
 */
export class PinManager {
  private channelConfigs: Map<string, PinConfig> = new Map();

  /**
   * Get pin configuration for a channel.
   */
  getChannelConfig(channelId: string): PinConfig {
    return this.channelConfigs.get(channelId) ?? { ...DEFAULT_PIN_CONFIG };
  }

  /**
   * Set pin configuration for a channel.
   */
  setChannelConfig(channelId: string, config: Partial<PinConfig>): void {
    const currentConfig = this.getChannelConfig(channelId);
    this.channelConfigs.set(channelId, { ...currentConfig, ...config });
  }

  /**
   * Validate if a message can be pinned.
   */
  validatePin(
    input: PinMessageInput,
    stats: ChannelPinStats,
    userRole: UserRole,
    userPinCount: number,
    isAlreadyPinned: boolean,
  ): PinResult {
    const config = this.getChannelConfig(input.channelId);

    // Check if already pinned
    if (isAlreadyPinned) {
      return {
        success: false,
        error: "This message is already pinned",
        errorCode: "MESSAGE_ALREADY_PINNED",
      };
    }

    // Check permission
    if (!canPinMessage(userRole, config.pinPermission)) {
      return {
        success: false,
        error: "You do not have permission to pin messages in this channel",
        errorCode: "PERMISSION_DENIED",
      };
    }

    // Check limits
    const limitCheck = checkPinLimits(stats, userPinCount, config);
    if (!limitCheck.canPin) {
      return {
        success: false,
        error: limitCheck.errorMessage,
        errorCode: limitCheck.errorCode,
      };
    }

    // Check note length
    if (input.note && !isValidPinNote(input.note)) {
      return {
        success: false,
        error: `Pin note cannot exceed ${PIN_LIMITS.MAX_NOTE_LENGTH} characters`,
        errorCode: "UNKNOWN_ERROR",
      };
    }

    return { success: true };
  }

  /**
   * Validate if a message can be unpinned.
   */
  validateUnpin(
    input: UnpinMessageInput,
    userRole: UserRole,
    isPinner: boolean,
    pinExists: boolean,
  ): PinResult {
    const config = this.getChannelConfig(input.channelId);

    // Check if pin exists
    if (!pinExists) {
      return {
        success: false,
        error: "Pinned message not found",
        errorCode: "PIN_NOT_FOUND",
      };
    }

    // Check permission
    if (!canUnpinMessage(userRole, config.pinPermission, isPinner)) {
      return {
        success: false,
        error: "You do not have permission to unpin this message",
        errorCode: "PERMISSION_DENIED",
      };
    }

    return { success: true };
  }
}

// ============================================================================
// Filtering and Sorting
// ============================================================================

/**
 * Filter pinned messages.
 */
export function filterPinnedMessages(
  pins: PinnedMessage[],
  filters: PinFilters,
): PinnedMessage[] {
  return pins.filter((pin) => {
    // Filter by pinner
    if (filters.pinnedByUserId && pin.pinnedBy.id !== filters.pinnedByUserId) {
      return false;
    }

    // Filter by date range
    if (filters.pinnedAfter && pin.pinnedAt < filters.pinnedAfter) {
      return false;
    }
    if (filters.pinnedBefore && pin.pinnedAt > filters.pinnedBefore) {
      return false;
    }

    // Filter by message type
    if (filters.messageType && pin.message.type !== filters.messageType) {
      return false;
    }

    // Filter by attachments
    if (filters.hasAttachments !== undefined) {
      const hasAttachments = (pin.message.attachments?.length ?? 0) > 0;
      if (filters.hasAttachments !== hasAttachments) {
        return false;
      }
    }

    // Search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const contentMatch = pin.message.content.toLowerCase().includes(query);
      const noteMatch = pin.note?.toLowerCase().includes(query) ?? false;
      const authorMatch = pin.message.user.displayName
        .toLowerCase()
        .includes(query);

      if (!contentMatch && !noteMatch && !authorMatch) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sort pinned messages.
 */
export function sortPinnedMessages(
  pins: PinnedMessage[],
  sortBy: PinSortBy = "position",
  sortOrder: PinSortOrder = "asc",
): PinnedMessage[] {
  const sorted = [...pins];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "pinnedAt":
        comparison = a.pinnedAt.getTime() - b.pinnedAt.getTime();
        break;
      case "messageDate":
        comparison =
          new Date(a.message.createdAt).getTime() -
          new Date(b.message.createdAt).getTime();
        break;
      case "position":
      default:
        comparison = a.position - b.position;
        break;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Get filtered and sorted pinned messages.
 */
export function getPinnedMessages(
  pins: PinnedMessage[],
  options: PinListOptions,
): PinnedMessage[] {
  let result = [...pins];

  // Filter by channel
  result = result.filter((pin) => pin.channelId === options.channelId);

  // Apply filters
  if (options.filters) {
    result = filterPinnedMessages(result, options.filters);
  }

  // Sort
  result = sortPinnedMessages(
    result,
    options.sortBy ?? "position",
    options.sortOrder ?? "asc",
  );

  // Pagination
  if (options.offset !== undefined) {
    result = result.slice(options.offset);
  }
  if (options.limit !== undefined) {
    result = result.slice(0, options.limit);
  }

  return result;
}

// ============================================================================
// Reordering
// ============================================================================

/**
 * Reorder pinned messages.
 */
export function reorderPins(
  pins: PinnedMessage[],
  newOrder: string[],
): PinnedMessage[] {
  const pinMap = new Map(pins.map((pin) => [pin.id, pin]));

  return newOrder
    .map((id, index) => {
      const pin = pinMap.get(id);
      if (pin) {
        return { ...pin, position: index };
      }
      return null;
    })
    .filter((pin): pin is PinnedMessage => pin !== null);
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Calculate pin statistics for a channel.
 */
export function calculatePinStats(
  pins: PinnedMessage[],
  channelId: string,
  maxPins: number = PIN_LIMITS.DEFAULT_PINS_PER_CHANNEL,
): ChannelPinStats {
  const channelPins = pins.filter((p) => p.channelId === channelId);
  const pinners = new Set(channelPins.map((p) => p.pinnedBy.id));

  const lastPinned = channelPins.reduce<Date | undefined>((latest, pin) => {
    if (!latest || pin.pinnedAt > latest) {
      return pin.pinnedAt;
    }
    return latest;
  }, undefined);

  return {
    channelId,
    totalPins: channelPins.length,
    maxPins,
    remainingSlots: Math.max(0, maxPins - channelPins.length),
    lastPinnedAt: lastPinned,
    pinnerCount: pinners.size,
  };
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const pinManager = new PinManager();
