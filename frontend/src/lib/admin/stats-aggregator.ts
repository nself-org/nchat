/**
 * Stats Aggregator - Statistics aggregation utilities for the admin dashboard
 *
 * Provides functions to aggregate and calculate statistics for users,
 * messages, channels, and storage.
 */

// ============================================================================
// Types
// ============================================================================

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    new: number;
    growth: number; // percentage
  };
  messages: {
    total: number;
    today: number;
    avgPerDay: number;
    peakHour: number;
  };
  channels: {
    total: number;
    public: number;
    private: number;
    mostActive: string[];
  };
  storage: {
    used: number; // bytes
    limit: number;
    percentage: number;
  };
}

export interface UserStatsInput {
  id: string;
  isActive: boolean;
  createdAt: string;
  lastSeenAt?: string;
}

export interface MessageStatsInput {
  id: string;
  channelId: string;
  createdAt: string;
}

export interface ChannelStatsInput {
  id: string;
  name: string;
  isPrivate: boolean;
  messageCount: number;
}

export interface StorageStatsInput {
  used: number;
  limit: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface UserGrowthData {
  date: string;
  count: number;
}

export interface MessageVolumeData {
  hour: number;
  count: number;
}

export interface ChannelActivityData {
  channelId: string;
  channelName: string;
  messageCount: number;
}

// ============================================================================
// Constants
// ============================================================================

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;
const DAYS_FOR_ACTIVE_USER = 30;
const DAYS_FOR_NEW_USER = 7;

// ============================================================================
// User Statistics
// ============================================================================

/**
 * Calculate user statistics from raw user data
 */
export function aggregateUserStats(
  users: UserStatsInput[],
  referenceDate: Date = new Date(),
): DashboardStats["users"] {
  const totalUsers = users.length;
  const now = referenceDate.getTime();
  const activeThreshold = now - DAYS_FOR_ACTIVE_USER * MS_PER_DAY;
  const newThreshold = now - DAYS_FOR_NEW_USER * MS_PER_DAY;

  let activeUsers = 0;
  let newUsers = 0;

  for (const user of users) {
    // Count active users (active in last 30 days)
    if (user.isActive) {
      if (user.lastSeenAt) {
        const lastSeen = new Date(user.lastSeenAt).getTime();
        if (lastSeen >= activeThreshold) {
          activeUsers++;
        }
      }
    }

    // Count new users (created in last 7 days)
    const createdAt = new Date(user.createdAt).getTime();
    if (createdAt >= newThreshold) {
      newUsers++;
    }
  }

  // Calculate growth percentage (new users / total users * 100)
  const growth = totalUsers > 0 ? (newUsers / totalUsers) * 100 : 0;

  return {
    total: totalUsers,
    active: activeUsers,
    new: newUsers,
    growth: Math.round(growth * 100) / 100,
  };
}

/**
 * Calculate user growth over a date range
 */
export function calculateUserGrowth(
  users: UserStatsInput[],
  dateRange: DateRange,
): UserGrowthData[] {
  const { start, end } = dateRange;
  const growthMap = new Map<string, number>();

  // Initialize all dates in range with 0
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dateKey = currentDate.toISOString().split("T")[0];
    growthMap.set(dateKey, 0);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Count users per day
  for (const user of users) {
    const createdDate = new Date(user.createdAt);
    if (createdDate >= start && createdDate <= end) {
      const dateKey = createdDate.toISOString().split("T")[0];
      const current = growthMap.get(dateKey) ?? 0;
      growthMap.set(dateKey, current + 1);
    }
  }

  // Convert to array
  return Array.from(growthMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Count users by role
 */
export function countUsersByRole(
  users: Array<{ role: string }>,
): Record<string, number> {
  const roleCounts: Record<string, number> = {};

  for (const user of users) {
    const role = user.role || "unknown";
    roleCounts[role] = (roleCounts[role] ?? 0) + 1;
  }

  return roleCounts;
}

// ============================================================================
// Message Statistics
// ============================================================================

/**
 * Calculate message statistics from raw message data
 */
export function aggregateMessageStats(
  messages: MessageStatsInput[],
  referenceDate: Date = new Date(),
): DashboardStats["messages"] {
  const totalMessages = messages.length;
  const now = referenceDate.getTime();
  const todayStart = new Date(referenceDate);
  todayStart.setHours(0, 0, 0, 0);

  // Count messages by hour for peak calculation
  const hourCounts = new Array<number>(24).fill(0);
  let todayCount = 0;

  // Find earliest message for average calculation
  let earliestDate = now;

  for (const message of messages) {
    const createdAt = new Date(message.createdAt);
    const createdTime = createdAt.getTime();

    // Track earliest message
    if (createdTime < earliestDate) {
      earliestDate = createdTime;
    }

    // Count today's messages
    if (createdTime >= todayStart.getTime()) {
      todayCount++;
    }

    // Count by hour
    const hour = createdAt.getHours();
    hourCounts[hour]++;
  }

  // Find peak hour
  let peakHour = 0;
  let maxCount = 0;
  for (let i = 0; i < 24; i++) {
    if (hourCounts[i] > maxCount) {
      maxCount = hourCounts[i];
      peakHour = i;
    }
  }

  // Calculate average messages per day
  const daysSinceFirst = Math.max(
    1,
    Math.ceil((now - earliestDate) / MS_PER_DAY),
  );
  const avgPerDay = Math.round(totalMessages / daysSinceFirst);

  return {
    total: totalMessages,
    today: todayCount,
    avgPerDay,
    peakHour,
  };
}

/**
 * Calculate message volume by hour
 */
export function calculateMessageVolumeByHour(
  messages: MessageStatsInput[],
): MessageVolumeData[] {
  const hourCounts = new Array<number>(24).fill(0);

  for (const message of messages) {
    const hour = new Date(message.createdAt).getHours();
    hourCounts[hour]++;
  }

  return hourCounts.map((count, hour) => ({ hour, count }));
}

/**
 * Calculate message volume by day
 */
export function calculateMessageVolumeByDay(
  messages: MessageStatsInput[],
  dateRange: DateRange,
): UserGrowthData[] {
  const { start, end } = dateRange;
  const volumeMap = new Map<string, number>();

  // Initialize all dates in range with 0
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const dateKey = currentDate.toISOString().split("T")[0];
    volumeMap.set(dateKey, 0);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Count messages per day
  for (const message of messages) {
    const createdDate = new Date(message.createdAt);
    if (createdDate >= start && createdDate <= end) {
      const dateKey = createdDate.toISOString().split("T")[0];
      const current = volumeMap.get(dateKey) ?? 0;
      volumeMap.set(dateKey, current + 1);
    }
  }

  return Array.from(volumeMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================================================
// Channel Statistics
// ============================================================================

/**
 * Calculate channel statistics from raw channel data
 */
export function aggregateChannelStats(
  channels: ChannelStatsInput[],
  topCount: number = 5,
): DashboardStats["channels"] {
  const totalChannels = channels.length;
  let publicChannels = 0;
  let privateChannels = 0;

  for (const channel of channels) {
    if (channel.isPrivate) {
      privateChannels++;
    } else {
      publicChannels++;
    }
  }

  // Find most active channels
  const sortedChannels = [...channels].sort(
    (a, b) => b.messageCount - a.messageCount,
  );
  const mostActive = sortedChannels.slice(0, topCount).map((c) => c.name);

  return {
    total: totalChannels,
    public: publicChannels,
    private: privateChannels,
    mostActive,
  };
}

/**
 * Calculate channel activity ranking
 */
export function calculateChannelActivity(
  channels: ChannelStatsInput[],
): ChannelActivityData[] {
  return channels
    .map((channel) => ({
      channelId: channel.id,
      channelName: channel.name,
      messageCount: channel.messageCount,
    }))
    .sort((a, b) => b.messageCount - a.messageCount);
}

/**
 * Calculate channel distribution by type
 */
export function calculateChannelDistribution(
  channels: ChannelStatsInput[],
): { type: string; count: number }[] {
  let publicCount = 0;
  let privateCount = 0;

  for (const channel of channels) {
    if (channel.isPrivate) {
      privateCount++;
    } else {
      publicCount++;
    }
  }

  return [
    { type: "public", count: publicCount },
    { type: "private", count: privateCount },
  ];
}

// ============================================================================
// Storage Statistics
// ============================================================================

/**
 * Calculate storage statistics
 */
export function aggregateStorageStats(
  input: StorageStatsInput,
): DashboardStats["storage"] {
  const { used, limit } = input;
  const percentage = limit > 0 ? (used / limit) * 100 : 0;

  return {
    used,
    limit,
    percentage: Math.round(percentage * 100) / 100,
  };
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Parse bytes from human-readable string
 */
export function parseBytes(str: string): number {
  const units: Record<string, number> = {
    bytes: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
    tb: 1024 * 1024 * 1024 * 1024,
  };

  const match = str
    .toLowerCase()
    .match(/^(\d+(?:\.\d+)?)\s*(bytes|kb|mb|gb|tb)?$/i);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2]?.toLowerCase() || "bytes";

  return Math.round(value * (units[unit] || 1));
}

// ============================================================================
// Combined Statistics
// ============================================================================

/**
 * Aggregate all dashboard statistics
 */
export function aggregateDashboardStats(
  users: UserStatsInput[],
  messages: MessageStatsInput[],
  channels: ChannelStatsInput[],
  storage: StorageStatsInput,
  referenceDate: Date = new Date(),
): DashboardStats {
  return {
    users: aggregateUserStats(users, referenceDate),
    messages: aggregateMessageStats(messages, referenceDate),
    channels: aggregateChannelStats(channels),
    storage: aggregateStorageStats(storage),
  };
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(
  current: number,
  previous: number,
): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 100) / 100;
}

/**
 * Calculate trend direction
 */
export function calculateTrend(
  current: number,
  previous: number,
): "up" | "down" | "stable" {
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "stable";
}
