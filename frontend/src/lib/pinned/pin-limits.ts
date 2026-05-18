/**
 * Pin Limits
 *
 * Limit checking and validation for pinned messages.
 */

import type { PinConfig, ChannelPinStats, PinErrorCode } from "./pin-types";

// ============================================================================
// Default Limits
// ============================================================================

/**
 * System-wide pin limits.
 */
export const PIN_LIMITS = {
  /** Minimum pins per channel */
  MIN_PINS_PER_CHANNEL: 1,
  /** Maximum pins per channel (system limit) */
  MAX_PINS_PER_CHANNEL: 200,
  /** Default pins per channel */
  DEFAULT_PINS_PER_CHANNEL: 50,
  /** Maximum pins per user per channel */
  MAX_PINS_PER_USER_PER_CHANNEL: 25,
  /** Maximum note length */
  MAX_NOTE_LENGTH: 500,
  /** Rate limit: pins per minute */
  PINS_PER_MINUTE: 10,
} as const;

// ============================================================================
// Limit Checking
// ============================================================================

/**
 * Check if a channel has reached its pin limit.
 */
export function hasReachedPinLimit(
  currentPinCount: number,
  maxPins: number = PIN_LIMITS.DEFAULT_PINS_PER_CHANNEL,
): boolean {
  return currentPinCount >= maxPins;
}

/**
 * Get remaining pin slots for a channel.
 */
export function getRemainingPinSlots(
  currentPinCount: number,
  maxPins: number = PIN_LIMITS.DEFAULT_PINS_PER_CHANNEL,
): number {
  return Math.max(0, maxPins - currentPinCount);
}

/**
 * Check if a user has reached their pin limit for a channel.
 */
export function hasUserReachedPinLimit(
  userPinCount: number,
  maxUserPins: number = PIN_LIMITS.MAX_PINS_PER_USER_PER_CHANNEL,
): boolean {
  return userPinCount >= maxUserPins;
}

/**
 * Validate a pin note length.
 */
export function isValidPinNote(note: string | undefined): boolean {
  if (!note) return true;
  return note.length <= PIN_LIMITS.MAX_NOTE_LENGTH;
}

// ============================================================================
// Limit Validation
// ============================================================================

/**
 * Result of pin limit validation.
 */
export interface PinLimitCheckResult {
  canPin: boolean;
  errorCode?: PinErrorCode;
  errorMessage?: string;
  remainingSlots?: number;
}

/**
 * Comprehensive pin limit check.
 */
export function checkPinLimits(
  stats: ChannelPinStats,
  userPinCount: number = 0,
  config?: Partial<PinConfig>,
): PinLimitCheckResult {
  const maxPins = config?.maxPins ?? PIN_LIMITS.DEFAULT_PINS_PER_CHANNEL;

  // Check channel limit
  if (stats.totalPins >= maxPins) {
    return {
      canPin: false,
      errorCode: "PIN_LIMIT_REACHED",
      errorMessage: `This channel has reached its limit of ${maxPins} pinned messages`,
      remainingSlots: 0,
    };
  }

  // Check user limit
  if (userPinCount >= PIN_LIMITS.MAX_PINS_PER_USER_PER_CHANNEL) {
    return {
      canPin: false,
      errorCode: "PIN_LIMIT_REACHED",
      errorMessage: `You have reached your limit of ${PIN_LIMITS.MAX_PINS_PER_USER_PER_CHANNEL} pinned messages in this channel`,
      remainingSlots: getRemainingPinSlots(stats.totalPins, maxPins),
    };
  }

  return {
    canPin: true,
    remainingSlots: getRemainingPinSlots(stats.totalPins, maxPins),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format remaining pin slots message.
 */
export function formatRemainingSlots(
  remaining: number,
  maxPins: number,
): string {
  if (remaining === 0) {
    return `Pin limit reached (${maxPins}/${maxPins})`;
  }
  if (remaining === 1) {
    return `1 pin slot remaining`;
  }
  return `${remaining} pin slots remaining`;
}

/**
 * Get pin limit warning threshold.
 */
export function getPinLimitWarningThreshold(maxPins: number): number {
  return Math.ceil(maxPins * 0.9); // Warn at 90% capacity
}

/**
 * Check if pin count is near limit.
 */
export function isNearPinLimit(currentPins: number, maxPins: number): boolean {
  return currentPins >= getPinLimitWarningThreshold(maxPins);
}

/**
 * Calculate pin usage percentage.
 */
export function getPinUsagePercentage(
  currentPins: number,
  maxPins: number,
): number {
  if (maxPins === 0) return 0;
  return Math.round((currentPins / maxPins) * 100);
}
