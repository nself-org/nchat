/**
 * Mention Notifications - Handle mention notification logic
 *
 * Provides utilities for:
 * - Creating mention notifications
 * - Checking notification preferences
 * - Filtering and sorting notifications
 * - Desktop/browser notification integration
 *
 * @example
 * ```typescript
 * import { shouldNotifyForMention, showMentionNotification } from '@/lib/mentions/mention-notifications'
 *
 * if (shouldNotifyForMention(mentionType, preferences)) {
 *   await showMentionNotification(notification)
 * }
 * ```
 */

import type {
  MentionType,
  MentionPreferences,
  MentionNotification,
  ParsedMention,
} from "./mention-types";

import { DEFAULT_MENTION_PREFERENCES } from "./mention-types";

import { logger } from "@/lib/logger";

// ============================================================================
// Notification Permission
// ============================================================================

/**
 * Check if browser notifications are supported
 */
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission():
  | NotificationPermission
  | "unsupported" {
  if (!isNotificationSupported()) {
    return "unsupported";
  }
  return Notification.permission;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (!isNotificationSupported()) {
    return "unsupported";
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    // Fallback for older browsers
    return Notification.permission;
  }
}

// ============================================================================
// Notification Preferences
// ============================================================================

/**
 * Check if a mention type should trigger a notification based on preferences
 */
export function shouldNotifyForMention(
  mentionType: MentionType,
  preferences: MentionPreferences = DEFAULT_MENTION_PREFERENCES,
): boolean {
  switch (mentionType) {
    case "user":
      return preferences.notifyOnMention;
    case "everyone":
      return preferences.notifyOnEveryone;
    case "here":
      return preferences.notifyOnHere;
    case "channel":
      return preferences.notifyOnChannel;
    case "role":
      return preferences.notifyOnMention; // Use same setting as direct mentions
    default:
      return false;
  }
}

/**
 * Check if any mentions in a list should trigger a notification
 */
export function shouldNotifyForAnyMention(
  mentions: ParsedMention[],
  currentUsername: string,
  preferences: MentionPreferences = DEFAULT_MENTION_PREFERENCES,
): boolean {
  for (const mention of mentions) {
    // Check if this is a direct mention of the current user
    if (mention.type === "user") {
      if (mention.identifier.toLowerCase() === currentUsername.toLowerCase()) {
        if (shouldNotifyForMention("user", preferences)) {
          return true;
        }
      }
    } else {
      // Group mentions
      if (shouldNotifyForMention(mention.type, preferences)) {
        return true;
      }
    }
  }
  return false;
}

// ============================================================================
// Desktop Notifications
// ============================================================================

/**
 * Options for showing a desktop notification
 */
export interface DesktopNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
  onClose?: () => void;
  autoClose?: number; // ms
}

/**
 * Show a desktop notification for a mention
 */
export async function showDesktopNotification(
  options: DesktopNotificationOptions,
): Promise<Notification | null> {
  if (!isNotificationSupported()) {
    return null;
  }

  if (Notification.permission !== "granted") {
    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      return null;
    }
  }

  const notification = new Notification(options.title, {
    body: options.body,
    icon: options.icon || "/favicon.ico",
    tag: options.tag,
    requireInteraction: false,
  });

  if (options.onClick) {
    notification.onclick = () => {
      options.onClick?.();
      notification.close();
    };
  }

  if (options.onClose) {
    notification.onclose = options.onClose;
  }

  if (options.autoClose && options.autoClose > 0) {
    setTimeout(() => {
      notification.close();
    }, options.autoClose);
  }

  return notification;
}

/**
 * Show a notification for a mention
 */
export async function showMentionNotification(
  mentionNotification: MentionNotification,
  options: {
    onClick?: () => void;
    onClose?: () => void;
    autoClose?: number;
  } = {},
): Promise<Notification | null> {
  const mentionTypeLabels: Record<MentionType, string> = {
    user: "mentioned you",
    everyone: "mentioned everyone",
    here: "mentioned online members",
    channel: "mentioned the channel",
    role: "mentioned your role",
  };

  const title = `${mentionNotification.senderDisplayName} ${mentionTypeLabels[mentionNotification.mentionType]}`;
  const body = `#${mentionNotification.channelName}: ${mentionNotification.messagePreview}`;

  return showDesktopNotification({
    title,
    body,
    icon: mentionNotification.senderAvatarUrl || undefined,
    tag: `mention-${mentionNotification.id}`,
    onClick: options.onClick,
    onClose: options.onClose,
    autoClose: options.autoClose ?? 5000,
  });
}

// ============================================================================
// Notification Sound
// ============================================================================

/**
 * Sound types for mention notifications
 */
export type MentionSoundType = "default" | "subtle" | "none";

// Sound URLs (relative to public folder)
const MENTION_SOUNDS: Record<MentionSoundType, string | null> = {
  default: "/sounds/mention.mp3",
  subtle: "/sounds/mention-subtle.mp3",
  none: null,
};

let audioContext: AudioContext | null = null;
const audioBuffers: Map<string, AudioBuffer> = new Map();

/**
 * Initialize audio context (must be called after user interaction)
 */
export function initializeMentionAudio(): void {
  if (typeof window === "undefined") return;

  if (!audioContext) {
    audioContext = new (
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();
  }
}

/**
 * Preload mention notification sounds
 */
export async function preloadMentionSounds(): Promise<void> {
  if (typeof window === "undefined" || !audioContext) return;

  for (const [type, url] of Object.entries(MENTION_SOUNDS)) {
    if (url && !audioBuffers.has(type)) {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        audioBuffers.set(type, audioBuffer);
      } catch {
        logger.warn(`Failed to preload mention sound: ${type}`);
      }
    }
  }
}

/**
 * Play mention notification sound
 */
export function playMentionSound(type: MentionSoundType = "default"): void {
  if (type === "none" || typeof window === "undefined") return;

  // Fallback to simple Audio if AudioContext not available
  const soundUrl = MENTION_SOUNDS[type];
  if (!soundUrl) return;

  if (audioContext && audioBuffers.has(type)) {
    const buffer = audioBuffers.get(type)!;
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
  } else {
    // Fallback
    const audio = new Audio(soundUrl);
    audio.volume = type === "subtle" ? 0.5 : 0.8;
    audio.play().catch(() => {
      // Ignore autoplay errors
    });
  }
}

// ============================================================================
// Notification Filtering & Sorting
// ============================================================================

/**
 * Filter notifications by read status
 */
export function filterNotificationsByReadStatus(
  notifications: MentionNotification[],
  readStatus: "all" | "unread" | "read",
): MentionNotification[] {
  switch (readStatus) {
    case "unread":
      return notifications.filter((n) => !n.isRead);
    case "read":
      return notifications.filter((n) => n.isRead);
    default:
      return notifications;
  }
}

/**
 * Filter notifications by channel
 */
export function filterNotificationsByChannel(
  notifications: MentionNotification[],
  channelId: string | null,
): MentionNotification[] {
  if (!channelId) return notifications;
  return notifications.filter((n) => n.channelId === channelId);
}

/**
 * Filter notifications by mention type
 */
export function filterNotificationsByType(
  notifications: MentionNotification[],
  types: MentionType[],
): MentionNotification[] {
  if (types.length === 0) return notifications;
  return notifications.filter((n) => types.includes(n.mentionType));
}

/**
 * Sort notifications
 */
export function sortNotifications(
  notifications: MentionNotification[],
  sortBy: "date" | "channel" | "sender",
  order: "asc" | "desc" = "desc",
): MentionNotification[] {
  const sorted = [...notifications];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "date":
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "channel":
        comparison = a.channelName.localeCompare(b.channelName);
        break;
      case "sender":
        comparison = a.senderDisplayName.localeCompare(b.senderDisplayName);
        break;
    }

    return order === "desc" ? -comparison : comparison;
  });

  return sorted;
}

/**
 * Group notifications by date
 */
export function groupNotificationsByDate(
  notifications: MentionNotification[],
): Map<string, MentionNotification[]> {
  const groups = new Map<string, MentionNotification[]>();

  for (const notification of notifications) {
    const date = new Date(notification.createdAt);
    const dateKey = formatNotificationDate(date);

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(notification);
  }

  return groups;
}

/**
 * Format notification date for grouping
 */
function formatNotificationDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  if (diff < dayMs && date.getDate() === now.getDate()) {
    return "Today";
  }

  if (diff < 2 * dayMs) {
    return "Yesterday";
  }

  if (diff < 7 * dayMs) {
    return "This Week";
  }

  if (diff < 30 * dayMs) {
    return "This Month";
  }

  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

// ============================================================================
// Notification Badge
// ============================================================================

/**
 * Update document title with unread mention count
 */
export function updateDocumentTitleWithMentions(
  baseTitle: string,
  unreadCount: number,
): void {
  if (typeof document === "undefined") return;

  if (unreadCount > 0) {
    document.title = `(${unreadCount}) ${baseTitle}`;
  } else {
    document.title = baseTitle;
  }
}

/**
 * Update favicon badge (if supported)
 */
export function updateFaviconBadge(count: number): void {
  if (typeof document === "undefined") return;

  // This would require a favicon badge library or custom implementation
  // For now, just update the title
  // REMOVED: console.debug(`Favicon badge update: ${count}`)
}

// ============================================================================
// Notification Deduplication
// ============================================================================

const recentNotifications = new Set<string>();
const NOTIFICATION_DEDUP_WINDOW_MS = 5000;

/**
 * Check if a notification should be deduplicated
 */
export function shouldDeduplicateNotification(notificationId: string): boolean {
  if (recentNotifications.has(notificationId)) {
    return true;
  }

  recentNotifications.add(notificationId);
  setTimeout(() => {
    recentNotifications.delete(notificationId);
  }, NOTIFICATION_DEDUP_WINDOW_MS);

  return false;
}

/**
 * Create a deduplication key for a mention
 */
export function createMentionDeduplicationKey(
  messageId: string,
  userId: string,
  mentionType: MentionType,
): string {
  return `${messageId}-${userId}-${mentionType}`;
}
