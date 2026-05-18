/**
 * Channel Statistics - Statistics and analytics for channels
 */

import type { Channel } from "@/stores/channel-store";

// ============================================================================
// Types
// ============================================================================

export interface ChannelStats {
  id: string;
  memberCount: number;
  messageCount: number;
  messageCountToday: number;
  messageCountWeek: number;
  messageCountMonth: number;
  activeMembers: number;
  activeMembersToday: number;
  reactionCount: number;
  threadCount: number;
  fileCount: number;
  averageResponseTime: number | null; // minutes
  peakActivityHour: number | null; // 0-23
  growthRate: number; // percentage
  engagementRate: number; // percentage
  lastActivityAt: Date | null;
  createdAt: Date;
}

export interface ChannelActivity {
  date: string;
  messageCount: number;
  uniquePosters: number;
  reactionCount: number;
  threadCount: number;
}

export interface ChannelGrowth {
  date: string;
  memberCount: number;
  joined: number;
  left: number;
}

export interface TopContributor {
  userId: string;
  userName: string;
  userAvatar?: string;
  messageCount: number;
  reactionCount: number;
  threadCount: number;
}

export interface ChannelInsights {
  busyDays: string[]; // Day names
  busyHours: number[]; // 0-23
  topEmojis: Array<{ emoji: string; count: number }>;
  topFileTypes: Array<{ type: string; count: number }>;
  averageMessageLength: number;
  threadParticipationRate: number;
}

// ============================================================================
// Stats Calculation
// ============================================================================

export function calculateChannelStats(
  channel: Channel,
  activityData?: ChannelActivity[],
  growthData?: ChannelGrowth[],
): ChannelStats {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Calculate message counts from activity data
  let messageCountToday = 0;
  let messageCountWeek = 0;
  let messageCountMonth = 0;
  let totalMessages = 0;
  let totalReactions = 0;
  let totalThreads = 0;

  if (activityData) {
    for (const activity of activityData) {
      const activityDate = new Date(activity.date);
      totalMessages += activity.messageCount;
      totalReactions += activity.reactionCount;
      totalThreads += activity.threadCount;

      if (activityDate >= today) {
        messageCountToday += activity.messageCount;
      }
      if (activityDate >= weekAgo) {
        messageCountWeek += activity.messageCount;
      }
      if (activityDate >= monthAgo) {
        messageCountMonth += activity.messageCount;
      }
    }
  }

  // Calculate growth rate from growth data
  let growthRate = 0;
  if (growthData && growthData.length >= 2) {
    const oldest = growthData[0].memberCount;
    const newest = growthData[growthData.length - 1].memberCount;
    if (oldest > 0) {
      growthRate = ((newest - oldest) / oldest) * 100;
    }
  }

  // Calculate engagement rate
  const engagementRate =
    channel.memberCount > 0 && totalMessages > 0
      ? (totalMessages / (channel.memberCount * 30)) * 100 // Messages per member per month
      : 0;

  return {
    id: channel.id,
    memberCount: channel.memberCount,
    messageCount: totalMessages,
    messageCountToday,
    messageCountWeek,
    messageCountMonth,
    activeMembers: Math.min(
      channel.memberCount,
      Math.ceil(channel.memberCount * 0.3),
    ), // Placeholder
    activeMembersToday: Math.min(
      channel.memberCount,
      Math.ceil(channel.memberCount * 0.1),
    ), // Placeholder
    reactionCount: totalReactions,
    threadCount: totalThreads,
    fileCount: 0, // Would need file data
    averageResponseTime: null, // Would need message timing data
    peakActivityHour: calculatePeakHour(activityData),
    growthRate,
    engagementRate: Math.min(100, engagementRate),
    lastActivityAt: channel.lastMessageAt
      ? new Date(channel.lastMessageAt)
      : null,
    createdAt: new Date(channel.createdAt),
  };
}

function calculatePeakHour(activityData?: ChannelActivity[]): number | null {
  if (!activityData || activityData.length === 0) return null;

  // This would need hourly data; returning a placeholder
  // In a real implementation, we'd aggregate by hour
  return 14; // 2 PM as placeholder
}

// ============================================================================
// Activity Analysis
// ============================================================================

export function getActivityTrend(
  activityData: ChannelActivity[],
  days: number = 7,
): "increasing" | "decreasing" | "stable" {
  if (activityData.length < 2) return "stable";

  const recentData = activityData.slice(-days);
  if (recentData.length < 2) return "stable";

  const firstHalf = recentData.slice(0, Math.floor(recentData.length / 2));
  const secondHalf = recentData.slice(Math.floor(recentData.length / 2));

  const firstAvg =
    firstHalf.reduce((sum, d) => sum + d.messageCount, 0) / firstHalf.length;
  const secondAvg =
    secondHalf.reduce((sum, d) => sum + d.messageCount, 0) / secondHalf.length;

  const changePercent = ((secondAvg - firstAvg) / (firstAvg || 1)) * 100;

  if (changePercent > 10) return "increasing";
  if (changePercent < -10) return "decreasing";
  return "stable";
}

export function getActivityLevel(
  channel: Channel,
): "very-active" | "active" | "moderate" | "quiet" | "inactive" {
  if (!channel.lastMessageAt) return "inactive";

  const lastActivity = new Date(channel.lastMessageAt);
  const now = new Date();
  const hoursSinceActivity =
    (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

  if (hoursSinceActivity < 1) return "very-active";
  if (hoursSinceActivity < 24) return "active";
  if (hoursSinceActivity < 72) return "moderate";
  if (hoursSinceActivity < 168) return "quiet";
  return "inactive";
}

export function getActivityLevelLabel(
  level: "very-active" | "active" | "moderate" | "quiet" | "inactive",
): string {
  switch (level) {
    case "very-active":
      return "Very Active";
    case "active":
      return "Active";
    case "moderate":
      return "Moderate";
    case "quiet":
      return "Quiet";
    case "inactive":
      return "Inactive";
  }
}

export function getActivityLevelColor(
  level: "very-active" | "active" | "moderate" | "quiet" | "inactive",
): string {
  switch (level) {
    case "very-active":
      return "green";
    case "active":
      return "emerald";
    case "moderate":
      return "yellow";
    case "quiet":
      return "orange";
    case "inactive":
      return "gray";
  }
}

// ============================================================================
// Insights Generation
// ============================================================================

export function generateChannelInsights(
  channel: Channel,
  activityData?: ChannelActivity[],
): ChannelInsights {
  // Generate placeholder insights
  // In a real implementation, this would analyze actual data
  return {
    busyDays: ["Tuesday", "Wednesday", "Thursday"],
    busyHours: [10, 11, 14, 15, 16],
    topEmojis: [
      { emoji: "+1", count: 45 },
      { emoji: "heart", count: 32 },
      { emoji: "rocket", count: 18 },
    ],
    topFileTypes: [
      { type: "image", count: 24 },
      { type: "pdf", count: 12 },
      { type: "document", count: 8 },
    ],
    averageMessageLength: 85,
    threadParticipationRate: 0.23,
  };
}

// ============================================================================
// Formatting Utilities
// ============================================================================

export function formatMemberCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

export function formatMessageCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

export function formatGrowthRate(rate: number): string {
  const sign = rate >= 0 ? "+" : "";
  return `${sign}${rate.toFixed(1)}%`;
}

export function formatEngagementRate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

// ============================================================================
// Comparison
// ============================================================================

export interface ChannelComparison {
  channel: Channel;
  stats: ChannelStats;
  rank: {
    overall: number;
    byMemberCount: number;
    byActivity: number;
    byEngagement: number;
  };
  percentile: {
    memberCount: number;
    activity: number;
    engagement: number;
  };
}

export function compareChannels(
  channels: Channel[],
  statsMap: Map<string, ChannelStats>,
): ChannelComparison[] {
  const comparisons: ChannelComparison[] = channels
    .map((channel) => {
      const stats = statsMap.get(channel.id);
      if (!stats) return null;

      return {
        channel,
        stats,
        rank: { overall: 0, byMemberCount: 0, byActivity: 0, byEngagement: 0 },
        percentile: { memberCount: 0, activity: 0, engagement: 0 },
      };
    })
    .filter((c): c is ChannelComparison => c !== null);

  // Calculate ranks
  const sortedByMembers = [...comparisons].sort(
    (a, b) => b.stats.memberCount - a.stats.memberCount,
  );
  const sortedByActivity = [...comparisons].sort(
    (a, b) => b.stats.messageCountWeek - a.stats.messageCountWeek,
  );
  const sortedByEngagement = [...comparisons].sort(
    (a, b) => b.stats.engagementRate - a.stats.engagementRate,
  );

  sortedByMembers.forEach((c, i) => {
    c.rank.byMemberCount = i + 1;
    c.percentile.memberCount =
      ((comparisons.length - i) / comparisons.length) * 100;
  });

  sortedByActivity.forEach((c, i) => {
    c.rank.byActivity = i + 1;
    c.percentile.activity =
      ((comparisons.length - i) / comparisons.length) * 100;
  });

  sortedByEngagement.forEach((c, i) => {
    c.rank.byEngagement = i + 1;
    c.percentile.engagement =
      ((comparisons.length - i) / comparisons.length) * 100;
  });

  // Calculate overall rank (average of other ranks)
  comparisons.forEach((c) => {
    c.rank.overall = Math.round(
      (c.rank.byMemberCount + c.rank.byActivity + c.rank.byEngagement) / 3,
    );
  });

  return comparisons.sort((a, b) => a.rank.overall - b.rank.overall);
}
