/**
 * DM Notifications - Notification management for direct messages
 *
 * Handles per-DM notification settings, muting, and notification preferences
 */

import type {
  DirectMessage,
  DMNotificationSetting,
  DMNotificationPreference,
  DMMessage,
  DMParticipant,
} from "./dm-types";

// ============================================================================
// Types
// ============================================================================

export interface NotificationEvent {
  type: "message" | "mention" | "reaction";
  dmId: string;
  messageId?: string;
  userId: string;
  content?: string;
  timestamp: string;
}

export interface MuteOptions {
  duration: number | null; // null = indefinitely
  unit?: "minutes" | "hours" | "days";
}

export interface NotificationDisplay {
  title: string;
  body: string;
  icon?: string;
  badge?: number;
  tag?: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// Default Preferences
// ============================================================================

export function getDefaultNotificationPreference(
  dmId: string,
  userId: string,
): DMNotificationPreference {
  return {
    dmId,
    userId,
    setting: "all",
    muteUntil: null,
    soundEnabled: true,
    desktopEnabled: true,
    mobileEnabled: true,
    emailEnabled: false,
    keywords: [],
  };
}

// ============================================================================
// Mute Functions
// ============================================================================

/**
 * Calculate mute expiry time
 */
export function calculateMuteExpiry(options: MuteOptions): string | null {
  if (options.duration === null) {
    return null; // Muted indefinitely
  }

  const now = new Date();
  let milliseconds = options.duration;

  switch (options.unit) {
    case "minutes":
      milliseconds *= 60 * 1000;
      break;
    case "hours":
      milliseconds *= 60 * 60 * 1000;
      break;
    case "days":
      milliseconds *= 24 * 60 * 60 * 1000;
      break;
    default:
      milliseconds *= 60 * 1000; // Default to minutes
  }

  return new Date(now.getTime() + milliseconds).toISOString();
}

/**
 * Check if a DM is currently muted
 */
export function isDMMuted(participant: DMParticipant): boolean {
  if (!participant.isMuted) {
    return false;
  }

  if (!participant.mutedUntil) {
    return true; // Muted indefinitely
  }

  return new Date(participant.mutedUntil) > new Date();
}

/**
 * Get time remaining for mute
 */
export function getMuteTimeRemaining(mutedUntil: string | null): {
  isExpired: boolean;
  remaining: string | null;
  remainingMs: number | null;
} {
  if (!mutedUntil) {
    return { isExpired: false, remaining: "Indefinitely", remainingMs: null };
  }

  const expiry = new Date(mutedUntil);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();

  if (diff <= 0) {
    return { isExpired: true, remaining: null, remainingMs: 0 };
  }

  // Format remaining time
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  let remaining: string;
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    remaining = `${days} day${days > 1 ? "s" : ""}`;
  } else if (hours > 0) {
    remaining = `${hours}h ${minutes}m`;
  } else {
    remaining = `${minutes} minute${minutes > 1 ? "s" : ""}`;
  }

  return { isExpired: false, remaining, remainingMs: diff };
}

/**
 * Get preset mute durations
 */
export function getMutePresets(): Array<{
  label: string;
  value: MuteOptions;
}> {
  return [
    { label: "15 minutes", value: { duration: 15, unit: "minutes" } },
    { label: "1 hour", value: { duration: 1, unit: "hours" } },
    { label: "8 hours", value: { duration: 8, unit: "hours" } },
    { label: "24 hours", value: { duration: 24, unit: "hours" } },
    { label: "7 days", value: { duration: 7, unit: "days" } },
    { label: "Until I turn it back on", value: { duration: null } },
  ];
}

// ============================================================================
// Notification Checking
// ============================================================================

/**
 * Check if a notification should be shown for a message
 */
export function shouldShowNotification(
  message: DMMessage,
  preference: DMNotificationPreference,
  currentUserId: string,
): boolean {
  // Don't notify for own messages
  if (message.userId === currentUserId) {
    return false;
  }

  // Check mute status
  if (preference.muteUntil) {
    if (new Date(preference.muteUntil) > new Date()) {
      return false;
    }
  }

  // Check notification setting
  switch (preference.setting) {
    case "none":
      return false;
    case "mentions":
      return checkForMention(message, currentUserId, preference.keywords);
    case "all":
    default:
      return true;
  }
}

/**
 * Check if a message mentions the user or contains keywords
 */
function checkForMention(
  message: DMMessage,
  userId: string,
  keywords: string[],
): boolean {
  const content = message.content.toLowerCase();

  // Check for @mention
  if (content.includes(`@${userId}`)) {
    return true;
  }

  // Check for keywords
  if (keywords.length > 0) {
    return keywords.some((keyword) => content.includes(keyword.toLowerCase()));
  }

  return false;
}

/**
 * Check if desktop notifications are enabled
 */
export function shouldShowDesktopNotification(
  preference: DMNotificationPreference,
): boolean {
  return preference.desktopEnabled && shouldNotifyBasedOnSetting(preference);
}

/**
 * Check if mobile push notifications are enabled
 */
export function shouldShowMobileNotification(
  preference: DMNotificationPreference,
): boolean {
  return preference.mobileEnabled && shouldNotifyBasedOnSetting(preference);
}

/**
 * Check if notification sound should play
 */
export function shouldPlaySound(preference: DMNotificationPreference): boolean {
  return preference.soundEnabled && shouldNotifyBasedOnSetting(preference);
}

function shouldNotifyBasedOnSetting(
  preference: DMNotificationPreference,
): boolean {
  // Check mute
  if (preference.muteUntil) {
    if (new Date(preference.muteUntil) > new Date()) {
      return false;
    }
  }

  return preference.setting !== "none";
}

// ============================================================================
// Notification Display
// ============================================================================

/**
 * Create notification display content for a DM message
 */
export function createNotificationDisplay(
  message: DMMessage,
  dm: DirectMessage,
  currentUserId: string,
): NotificationDisplay {
  // Get sender name
  const senderName = message.user.displayName || message.user.username;

  // Get DM display name
  let dmName: string;
  if (dm.type === "direct") {
    dmName = senderName;
  } else {
    dmName = dm.name || "Group Chat";
  }

  // Create body
  let body: string;
  switch (message.type) {
    case "image":
      body = `${senderName} sent a photo`;
      break;
    case "video":
      body = `${senderName} sent a video`;
      break;
    case "audio":
    case "voice":
      body = `${senderName} sent a voice message`;
      break;
    case "file":
      body = `${senderName} sent a file`;
      break;
    case "sticker":
      body = `${senderName} sent a sticker`;
      break;
    case "gif":
      body = `${senderName} sent a GIF`;
      break;
    default:
      body =
        dm.type === "group"
          ? `${senderName}: ${truncateMessage(message.content, 100)}`
          : truncateMessage(message.content, 100);
  }

  return {
    title: dmName,
    body,
    icon: message.user.avatarUrl || undefined,
    tag: `dm-${dm.id}`,
    data: {
      dmId: dm.id,
      messageId: message.id,
      type: "dm_message",
    },
  };
}

/**
 * Truncate message for notification preview
 */
function truncateMessage(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.slice(0, maxLength - 3) + "...";
}

// ============================================================================
// Badge Count
// ============================================================================

/**
 * Calculate total unread badge count for DMs
 */
export function calculateBadgeCount(
  dms: DirectMessage[],
  preferences: Map<string, DMNotificationPreference>,
): number {
  return dms.reduce((total, dm) => {
    const pref = preferences.get(dm.id);

    // Don't count muted DMs
    if (pref && pref.muteUntil && new Date(pref.muteUntil) > new Date()) {
      return total;
    }

    return total + (dm.unreadCount || 0);
  }, 0);
}

/**
 * Get unread DMs count (not muted)
 */
export function getUnmutedUnreadCount(
  dms: DirectMessage[],
  mutedDmIds: Set<string>,
): number {
  return dms.reduce((total, dm) => {
    if (mutedDmIds.has(dm.id)) {
      return total;
    }
    return total + (dm.unreadCount || 0);
  }, 0);
}

// ============================================================================
// Notification Grouping
// ============================================================================

/**
 * Group notifications by DM for summary display
 */
export function groupNotificationsByDM(
  events: NotificationEvent[],
): Map<string, NotificationEvent[]> {
  const grouped = new Map<string, NotificationEvent[]>();

  events.forEach((event) => {
    const existing = grouped.get(event.dmId) || [];
    existing.push(event);
    grouped.set(event.dmId, existing);
  });

  return grouped;
}

/**
 * Create summary notification for multiple messages
 */
export function createSummaryNotification(
  events: NotificationEvent[],
  dm: DirectMessage,
): NotificationDisplay {
  const count = events.length;
  const dmName = dm.name || "Direct Message";

  return {
    title: dmName,
    body: `${count} new message${count > 1 ? "s" : ""}`,
    tag: `dm-summary-${dm.id}`,
    badge: count,
    data: {
      dmId: dm.id,
      type: "dm_summary",
      count,
    },
  };
}
