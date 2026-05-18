/**
 * Digest - Notification batching and digest behavior
 *
 * Provides:
 * - DigestConfig with frequency (realtime, hourly, daily, weekly)
 * - DigestEntry grouping by channel, sender, type
 * - Batch notification aggregation
 * - Smart grouping (combine similar notifications)
 * - generateDigest() function
 * - Priority-based bypass (urgent notifications skip digest)
 */

import type {
  NotificationType,
  NotificationPriority,
  NotificationDeliveryMethod,
} from "./notification-types";

// ============================================================================
// Types
// ============================================================================

/**
 * Digest frequency options
 */
export type DigestFrequency = "realtime" | "hourly" | "daily" | "weekly";

/**
 * Digest grouping strategy
 */
export type DigestGroupBy = "channel" | "sender" | "type" | "priority";

/**
 * Digest configuration
 */
export interface DigestConfig {
  /** Delivery frequency */
  frequency: DigestFrequency;
  /** Whether the digest is enabled */
  enabled: boolean;
  /** Time to send daily/weekly digests (HH:mm) */
  deliveryTime: string;
  /** Day for weekly digest (0=Sunday, 6=Saturday) */
  weeklyDay: number;
  /** Timezone for scheduling */
  timezone: string;
  /** How to group notifications in the digest */
  groupBy: DigestGroupBy[];
  /** Maximum entries in a single digest */
  maxEntries: number;
  /** Whether to include read notifications */
  includeRead: boolean;
  /** Priority levels that bypass digest (delivered immediately) */
  bypassPriorities: NotificationPriority[];
  /** Notification types that bypass digest */
  bypassTypes: NotificationType[];
  /** Delivery methods for the digest itself */
  deliveryMethods: NotificationDeliveryMethod[];
  /** Whether to use smart grouping (merge similar notifications) */
  smartGrouping: boolean;
  /** Minimum notifications to trigger a digest (below this, they're sent individually) */
  minimumBatchSize: number;
}

/**
 * A single notification entry that will be included in a digest
 */
export interface DigestEntry {
  /** Unique identifier */
  id: string;
  /** Notification type */
  type: NotificationType;
  /** Priority */
  priority: NotificationPriority;
  /** Title */
  title: string;
  /** Body/content */
  body: string;
  /** Channel info */
  channelId?: string;
  channelName?: string;
  /** Sender info */
  senderId?: string;
  senderName?: string;
  /** When this notification was created */
  createdAt: string;
  /** Whether this has been read */
  isRead: boolean;
  /** Original notification metadata */
  metadata?: Record<string, unknown>;
}

/**
 * A group of related notifications in the digest
 */
export interface DigestGroup {
  /** Group key (generated from groupBy fields) */
  key: string;
  /** Display label for the group */
  label: string;
  /** Group type */
  groupBy: DigestGroupBy;
  /** Value of the group (channel ID, sender name, type, etc.) */
  groupValue: string;
  /** Notifications in this group */
  entries: DigestEntry[];
  /** Summary statistics for this group */
  stats: {
    total: number;
    unread: number;
    highPriority: number;
  };
}

/**
 * A complete notification digest ready for delivery
 */
export interface Digest {
  /** Unique digest ID */
  id: string;
  /** When the digest was generated */
  generatedAt: string;
  /** Period covered by this digest */
  period: {
    from: string;
    to: string;
  };
  /** Grouped notifications */
  groups: DigestGroup[];
  /** Ungrouped/overflow entries */
  ungroupedEntries: DigestEntry[];
  /** Summary statistics */
  summary: DigestSummary;
  /** Entries that bypassed the digest */
  bypassed: DigestEntry[];
}

/**
 * Summary statistics for a digest
 */
export interface DigestSummary {
  /** Total notifications in the period */
  totalNotifications: number;
  /** Unread notifications */
  unreadCount: number;
  /** Notifications grouped */
  groupedCount: number;
  /** Number of groups */
  groupCount: number;
  /** Notifications that bypassed digest */
  bypassedCount: number;
  /** Breakdown by type */
  byType: Partial<Record<NotificationType, number>>;
  /** Breakdown by priority */
  byPriority: Partial<Record<NotificationPriority, number>>;
  /** Most active channels */
  topChannels: Array<{ channelId: string; channelName: string; count: number }>;
  /** Most active senders */
  topSenders: Array<{ senderId: string; senderName: string; count: number }>;
}

/**
 * Digest delivery state for tracking
 */
export interface DigestDeliveryState {
  /** Last time a digest was sent */
  lastSentAt: string | null;
  /** Next scheduled digest time */
  nextScheduledAt: string | null;
  /** Number of pending entries since last digest */
  pendingCount: number;
  /** Whether there are pending entries above the threshold */
  isReady: boolean;
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_DIGEST_CONFIG: DigestConfig = {
  frequency: "daily",
  enabled: false,
  deliveryTime: "09:00",
  weeklyDay: 1, // Monday
  timezone: "UTC",
  groupBy: ["channel", "type"],
  maxEntries: 100,
  includeRead: false,
  bypassPriorities: ["urgent"],
  bypassTypes: [],
  deliveryMethods: ["email", "in_app"],
  smartGrouping: true,
  minimumBatchSize: 3,
};

// ============================================================================
// Digest Config Management
// ============================================================================

/**
 * Create a digest config with defaults
 */
export function createDigestConfig(
  overrides?: Partial<DigestConfig>,
): DigestConfig {
  return {
    ...DEFAULT_DIGEST_CONFIG,
    ...overrides,
  };
}

/**
 * Check if a notification should bypass the digest
 */
export function shouldBypassDigest(
  config: DigestConfig,
  entry: DigestEntry,
): boolean {
  // Realtime mode means everything bypasses
  if (config.frequency === "realtime") return true;

  // Digest is disabled
  if (!config.enabled) return true;

  // Check priority bypass
  if (config.bypassPriorities.includes(entry.priority)) return true;

  // Check type bypass
  if (config.bypassTypes.includes(entry.type)) return true;

  return false;
}

/**
 * Check if the digest should be sent now
 */
export function shouldSendDigest(
  config: DigestConfig,
  state: DigestDeliveryState,
  now?: Date,
): boolean {
  if (!config.enabled) return false;
  if (config.frequency === "realtime") return false;

  const currentTime = now ?? new Date();

  // Check if we have enough pending entries
  if (state.pendingCount < config.minimumBatchSize) return false;

  // Check timing
  if (state.nextScheduledAt) {
    return currentTime >= new Date(state.nextScheduledAt);
  }

  // Fallback: check based on last sent time
  if (state.lastSentAt) {
    const lastSent = new Date(state.lastSentAt);
    const minInterval = getMinInterval(config.frequency);
    return currentTime.getTime() - lastSent.getTime() >= minInterval;
  }

  return true;
}

/**
 * Get the minimum interval between digests in milliseconds
 */
function getMinInterval(frequency: DigestFrequency): number {
  switch (frequency) {
    case "hourly":
      return 55 * 60 * 1000; // 55 minutes
    case "daily":
      return 23 * 60 * 60 * 1000; // 23 hours
    case "weekly":
      return 6 * 24 * 60 * 60 * 1000; // 6 days
    default:
      return 0;
  }
}

/**
 * Get the next scheduled digest time
 */
export function getNextDigestTime(
  config: DigestConfig,
  lastSentAt?: string,
  now?: Date,
): Date | null {
  if (!config.enabled || config.frequency === "realtime") return null;

  const currentTime = now ?? new Date();

  switch (config.frequency) {
    case "hourly": {
      const next = new Date(currentTime);
      next.setHours(next.getHours() + 1, 0, 0, 0);
      return next;
    }
    case "daily": {
      const [hours, minutes] = config.deliveryTime.split(":").map(Number);
      const next = new Date(currentTime);
      next.setHours(hours, minutes, 0, 0);
      if (next <= currentTime) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }
    case "weekly": {
      const [hours, minutes] = config.deliveryTime.split(":").map(Number);
      const next = new Date(currentTime);
      const currentDay = next.getDay();
      let daysToAdd = config.weeklyDay - currentDay;
      if (daysToAdd < 0) daysToAdd += 7;
      if (daysToAdd === 0) {
        next.setHours(hours, minutes, 0, 0);
        if (next <= currentTime) daysToAdd = 7;
      }
      next.setDate(next.getDate() + daysToAdd);
      next.setHours(hours, minutes, 0, 0);
      return next;
    }
    default:
      return null;
  }
}

// ============================================================================
// Digest Generation
// ============================================================================

/**
 * Generate a digest from notification entries
 *
 * This is the primary function that takes raw notification entries and produces
 * a structured digest with grouping, statistics, and bypass handling.
 */
export function generateDigest(
  entries: DigestEntry[],
  config: DigestConfig,
  period?: { from: Date; to: Date },
): Digest {
  const now = new Date();
  const digestPeriod = period ?? {
    from: getDefaultPeriodStart(config.frequency, now),
    to: now,
  };

  // Filter entries within period
  let filteredEntries = entries.filter((entry) => {
    const entryTime = new Date(entry.createdAt);
    return entryTime >= digestPeriod.from && entryTime <= digestPeriod.to;
  });

  // Optionally filter out read notifications
  if (!config.includeRead) {
    filteredEntries = filteredEntries.filter((entry) => !entry.isRead);
  }

  // Separate bypassed entries
  const bypassed: DigestEntry[] = [];
  const digestEntries: DigestEntry[] = [];

  for (const entry of filteredEntries) {
    if (shouldBypassDigest(config, entry)) {
      bypassed.push(entry);
    } else {
      digestEntries.push(entry);
    }
  }

  // Limit entries
  const limited = digestEntries.slice(0, config.maxEntries);

  // Group notifications
  const groups = config.smartGrouping
    ? smartGroup(limited, config.groupBy)
    : simpleGroup(limited, config.groupBy);

  // Generate summary
  const summary = generateSummary(filteredEntries, groups, bypassed);

  return {
    id: `digest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    generatedAt: now.toISOString(),
    period: {
      from: digestPeriod.from.toISOString(),
      to: digestPeriod.to.toISOString(),
    },
    groups,
    ungroupedEntries: limited.filter(
      (entry) => !groups.some((g) => g.entries.some((e) => e.id === entry.id)),
    ),
    summary,
    bypassed,
  };
}

/**
 * Simple grouping - group by specified fields
 */
function simpleGroup(
  entries: DigestEntry[],
  groupByFields: DigestGroupBy[],
): DigestGroup[] {
  if (groupByFields.length === 0 || entries.length === 0) return [];

  const primaryGroupBy = groupByFields[0];
  const groupMap = new Map<string, DigestEntry[]>();

  for (const entry of entries) {
    const key = getGroupKey(entry, primaryGroupBy);
    const existing = groupMap.get(key) ?? [];
    existing.push(entry);
    groupMap.set(key, existing);
  }

  return Array.from(groupMap.entries()).map(([key, groupEntries]) => ({
    key,
    label: getGroupLabel(groupEntries[0], primaryGroupBy),
    groupBy: primaryGroupBy,
    groupValue: key,
    entries: groupEntries.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
    stats: {
      total: groupEntries.length,
      unread: groupEntries.filter((e) => !e.isRead).length,
      highPriority: groupEntries.filter(
        (e) => e.priority === "urgent" || e.priority === "high",
      ).length,
    },
  }));
}

/**
 * Smart grouping - combine similar notifications intelligently
 */
function smartGroup(
  entries: DigestEntry[],
  groupByFields: DigestGroupBy[],
): DigestGroup[] {
  if (entries.length === 0) return [];

  // First, do a multi-level group
  const primaryGroups = simpleGroup(entries, groupByFields);

  // Then merge small groups with the same type
  const mergedGroups: DigestGroup[] = [];
  const typeGroups = new Map<string, DigestGroup[]>();

  for (const group of primaryGroups) {
    if (group.entries.length <= 1) {
      // Small groups: collect for potential merging
      const type = group.entries[0]?.type ?? "unknown";
      const existing = typeGroups.get(type) ?? [];
      existing.push(group);
      typeGroups.set(type, existing);
    } else {
      mergedGroups.push(group);
    }
  }

  // Merge small single-entry groups of the same type
  for (const [type, groups] of typeGroups.entries()) {
    if (groups.length >= 2) {
      // Merge into one group
      const allEntries = groups.flatMap((g) => g.entries);
      mergedGroups.push({
        key: `merged_${type}`,
        label: `${allEntries.length} ${formatNotificationType(type)} notifications`,
        groupBy: "type",
        groupValue: type,
        entries: allEntries.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
        stats: {
          total: allEntries.length,
          unread: allEntries.filter((e) => !e.isRead).length,
          highPriority: allEntries.filter(
            (e) => e.priority === "urgent" || e.priority === "high",
          ).length,
        },
      });
    } else {
      // Keep as individual groups
      mergedGroups.push(...groups);
    }
  }

  // Sort groups by most activity
  return mergedGroups.sort((a, b) => b.stats.total - a.stats.total);
}

// ============================================================================
// Summary Generation
// ============================================================================

/**
 * Generate digest summary statistics
 */
function generateSummary(
  allEntries: DigestEntry[],
  groups: DigestGroup[],
  bypassed: DigestEntry[],
): DigestSummary {
  const byType: Partial<Record<NotificationType, number>> = {};
  const byPriority: Partial<Record<NotificationPriority, number>> = {};
  const channelCounts = new Map<string, { name: string; count: number }>();
  const senderCounts = new Map<string, { name: string; count: number }>();

  for (const entry of allEntries) {
    // Count by type
    byType[entry.type] = (byType[entry.type] ?? 0) + 1;

    // Count by priority
    byPriority[entry.priority] = (byPriority[entry.priority] ?? 0) + 1;

    // Count by channel
    if (entry.channelId) {
      const existing = channelCounts.get(entry.channelId);
      if (existing) {
        existing.count++;
      } else {
        channelCounts.set(entry.channelId, {
          name: entry.channelName ?? entry.channelId,
          count: 1,
        });
      }
    }

    // Count by sender
    if (entry.senderId) {
      const existing = senderCounts.get(entry.senderId);
      if (existing) {
        existing.count++;
      } else {
        senderCounts.set(entry.senderId, {
          name: entry.senderName ?? entry.senderId,
          count: 1,
        });
      }
    }
  }

  // Sort and limit top channels/senders
  const topChannels = Array.from(channelCounts.entries())
    .map(([channelId, data]) => ({
      channelId,
      channelName: data.name,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topSenders = Array.from(senderCounts.entries())
    .map(([senderId, data]) => ({
      senderId,
      senderName: data.name,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const groupedEntryIds = new Set(
    groups.flatMap((g) => g.entries.map((e) => e.id)),
  );

  return {
    totalNotifications: allEntries.length,
    unreadCount: allEntries.filter((e) => !e.isRead).length,
    groupedCount: groupedEntryIds.size,
    groupCount: groups.length,
    bypassedCount: bypassed.length,
    byType,
    byPriority,
    topChannels,
    topSenders,
  };
}

// ============================================================================
// Delivery State Management
// ============================================================================

/**
 * Create initial digest delivery state
 */
export function createDeliveryState(): DigestDeliveryState {
  return {
    lastSentAt: null,
    nextScheduledAt: null,
    pendingCount: 0,
    isReady: false,
  };
}

/**
 * Update delivery state after sending a digest
 */
export function markDigestSent(
  state: DigestDeliveryState,
  config: DigestConfig,
  now?: Date,
): DigestDeliveryState {
  const currentTime = now ?? new Date();
  const nextTime = getNextDigestTime(
    config,
    currentTime.toISOString(),
    currentTime,
  );

  return {
    lastSentAt: currentTime.toISOString(),
    nextScheduledAt: nextTime?.toISOString() ?? null,
    pendingCount: 0,
    isReady: false,
  };
}

/**
 * Add pending notification to delivery state
 */
export function addPendingNotification(
  state: DigestDeliveryState,
  config: DigestConfig,
): DigestDeliveryState {
  const newCount = state.pendingCount + 1;
  return {
    ...state,
    pendingCount: newCount,
    isReady: newCount >= config.minimumBatchSize,
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get a group key for an entry
 */
function getGroupKey(entry: DigestEntry, groupBy: DigestGroupBy): string {
  switch (groupBy) {
    case "channel":
      return entry.channelId ?? "no-channel";
    case "sender":
      return entry.senderId ?? "no-sender";
    case "type":
      return entry.type;
    case "priority":
      return entry.priority;
    default:
      return "default";
  }
}

/**
 * Get a display label for a group
 */
function getGroupLabel(entry: DigestEntry, groupBy: DigestGroupBy): string {
  switch (groupBy) {
    case "channel":
      return entry.channelName ? `#${entry.channelName}` : "Direct Messages";
    case "sender":
      return entry.senderName ?? "Unknown Sender";
    case "type":
      return formatNotificationType(entry.type);
    case "priority":
      return `${entry.priority.charAt(0).toUpperCase() + entry.priority.slice(1)} Priority`;
    default:
      return "Notifications";
  }
}

/**
 * Format a notification type as a readable string
 */
function formatNotificationType(type: string): string {
  const typeLabels: Record<string, string> = {
    mention: "Mention",
    direct_message: "Direct Message",
    thread_reply: "Thread Reply",
    reaction: "Reaction",
    channel_invite: "Channel Invite",
    channel_update: "Channel Update",
    system: "System",
    announcement: "Announcement",
    keyword: "Keyword Alert",
  };
  return typeLabels[type] ?? type;
}

/**
 * Get the default period start for a given frequency
 */
function getDefaultPeriodStart(frequency: DigestFrequency, now: Date): Date {
  const start = new Date(now);
  switch (frequency) {
    case "hourly":
      start.setHours(start.getHours() - 1);
      break;
    case "daily":
      start.setDate(start.getDate() - 1);
      break;
    case "weekly":
      start.setDate(start.getDate() - 7);
      break;
    default:
      start.setDate(start.getDate() - 1);
  }
  return start;
}

/**
 * Format a digest as plain text
 */
export function formatDigestAsText(digest: Digest): string {
  const lines: string[] = [];

  lines.push("=".repeat(50));
  lines.push("NOTIFICATION DIGEST");
  lines.push("=".repeat(50));
  lines.push("");

  const fromDate = new Date(digest.period.from).toLocaleDateString();
  const toDate = new Date(digest.period.to).toLocaleDateString();
  lines.push(`Period: ${fromDate} - ${toDate}`);
  lines.push(
    `Total: ${digest.summary.totalNotifications} notifications (${digest.summary.unreadCount} unread)`,
  );
  lines.push("");

  for (const group of digest.groups) {
    lines.push(`--- ${group.label} (${group.stats.total} notifications) ---`);
    for (const entry of group.entries.slice(0, 5)) {
      const status = entry.isRead ? "[Read]" : "[Unread]";
      lines.push(`  ${status} ${entry.title}: ${entry.body}`);
    }
    if (group.entries.length > 5) {
      lines.push(`  ... and ${group.entries.length - 5} more`);
    }
    lines.push("");
  }

  if (digest.ungroupedEntries.length > 0) {
    lines.push("--- Other Notifications ---");
    for (const entry of digest.ungroupedEntries.slice(0, 5)) {
      lines.push(`  ${entry.title}: ${entry.body}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
