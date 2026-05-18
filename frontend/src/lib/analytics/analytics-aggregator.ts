/**
 * Analytics Aggregator - Aggregates processed data into dashboard-ready formats
 *
 * Combines data from collector and processor into unified dashboard data
 */

import type {
  DateRange,
  TimeGranularity,
  AnalyticsFilters,
  AnalyticsSummary,
  DashboardData,
  MessageStats,
  UserStats,
  ChannelStats,
  ReactionStats,
  FileStats,
  SearchStats,
  ResponseTimeStats,
  ActiveUsersData,
  MessageVolumeData,
  UserActivityData,
  ChannelActivityData,
  ReactionData,
  FileUploadData,
  PeakHoursData,
  TopMessageData,
  InactiveUserData,
  UserGrowthData,
  SearchQueryData,
  DayOfWeekData,
} from "./analytics-types";

// Internal types for method return values
interface MessagePatternsResult {
  hourOfDay: number[];
  dayOfWeek: DayOfWeekData[];
  peakHour: number;
  peakDay: string;
}

interface PeakHoursAnalysisResult {
  peakHour: number;
  quietHour: number;
  peakDay: DayOfWeekData | null;
  averageByHour: number[];
}

import {
  AnalyticsCollector,
  getAnalyticsCollector,
} from "./analytics-collector";
import {
  AnalyticsProcessor,
  getAnalyticsProcessor,
} from "./analytics-processor";

// ============================================================================
// Aggregator Class
// ============================================================================

export class AnalyticsAggregator {
  private collector: AnalyticsCollector;
  private processor: AnalyticsProcessor;
  private cache: Map<string, { data: unknown; timestamp: number }>;
  private cacheTTL: number; // milliseconds

  constructor(
    collector?: AnalyticsCollector,
    processor?: AnalyticsProcessor,
    cacheTTL: number = 5 * 60 * 1000, // 5 minutes default
  ) {
    this.collector = collector || getAnalyticsCollector();
    this.processor = processor || getAnalyticsProcessor();
    this.cache = new Map();
    this.cacheTTL = cacheTTL;
  }

  // --------------------------------------------------------------------------
  // Cache Management
  // --------------------------------------------------------------------------

  private getCacheKey(prefix: string, filters: AnalyticsFilters): string {
    return `${prefix}-${filters.dateRange.start.toISOString()}-${filters.dateRange.end.toISOString()}-${filters.granularity}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache(): void {
    this.cache.clear();
  }

  // --------------------------------------------------------------------------
  // Full Dashboard Aggregation
  // --------------------------------------------------------------------------

  async aggregateDashboardData(
    filters: AnalyticsFilters,
  ): Promise<DashboardData> {
    const cacheKey = this.getCacheKey("dashboard", filters);
    const cached = this.getFromCache<DashboardData>(cacheKey);
    if (cached) return cached;

    // Collect all data in parallel
    const [
      messageVolume,
      topMessages,
      userActivity,
      inactiveUsers,
      userGrowth,
      channelActivity,
      reactions,
      fileUploads,
      peakHours,
      searchQueries,
    ] = await Promise.all([
      this.collector.collectMessageVolume(filters),
      this.collector.collectTopMessages(filters, 10),
      this.collector.collectUserActivity(filters, 100),
      this.collector.collectInactiveUsers(30, 20),
      this.collector.collectUserGrowth(filters),
      this.collector.collectChannelActivity(filters, 20),
      this.collector.collectReactions(filters, 15),
      this.collector.collectFileUploads(filters),
      this.collector.collectPeakHours(filters),
      this.collector.collectSearchQueries(filters, 20),
    ]);

    // Process into stats
    const summary = this.aggregateSummary(
      messageVolume,
      userActivity,
      channelActivity,
      reactions,
      fileUploads,
      searchQueries,
      filters.dateRange,
    );

    const activeUsers =
      this.processor.calculateActiveUsersMetrics(userActivity);

    // Rank top items
    const topChannels = this.processor.rankChannels(
      channelActivity,
      "messages",
      10,
    );
    const topUsers = this.processor.rankUsers(userActivity, 10);

    const dashboardData: DashboardData = {
      summary,
      messageVolume,
      activeUsers,
      userGrowth,
      channelActivity,
      topChannels,
      topUsers,
      topMessages,
      inactiveUsers,
      reactions,
      fileUploads,
      peakHours,
      searchQueries,
    };

    this.setCache(cacheKey, dashboardData);
    return dashboardData;
  }

  // --------------------------------------------------------------------------
  // Summary Aggregation
  // --------------------------------------------------------------------------

  aggregateSummary(
    messageVolume: MessageVolumeData[],
    users: UserActivityData[],
    channels: ChannelActivityData[],
    reactions: ReactionData[],
    fileUploads: FileUploadData[],
    searchQueries: SearchQueryData[],
    dateRange: DateRange,
  ): AnalyticsSummary {
    const messageStats = this.processor.processMessageStats(messageVolume);
    const userStats = this.processor.processUserStats(users, dateRange);
    const channelStats = this.processor.processChannelStats(channels);
    const reactionStats = this.processor.processReactionStats(reactions, users);
    const fileStats = this.processor.processFileStats(fileUploads);
    const searchStats = this.processor.processSearchStats(searchQueries);
    const responseTimeStats = this.generateDefaultResponseTimeStats();

    return {
      messages: messageStats,
      users: userStats,
      channels: channelStats,
      reactions: reactionStats,
      files: fileStats,
      search: searchStats,
      responseTime: responseTimeStats,
    };
  }

  private generateDefaultResponseTimeStats(): ResponseTimeStats {
    return {
      averageResponseTime: { value: 180, trend: "stable" },
      medianResponseTime: { value: 120, trend: "stable" },
      p95ResponseTime: { value: 600, trend: "stable" },
      p99ResponseTime: { value: 900, trend: "stable" },
    };
  }

  // --------------------------------------------------------------------------
  // Individual Section Aggregation
  // --------------------------------------------------------------------------

  async aggregateMessageData(filters: AnalyticsFilters): Promise<{
    stats: MessageStats;
    volume: MessageVolumeData[];
    topMessages: TopMessageData[];
    patterns: MessagePatternsResult;
  }> {
    const [volume, topMessages] = await Promise.all([
      this.collector.collectMessageVolume(filters),
      this.collector.collectTopMessages(filters, 20),
    ]);

    const stats = this.processor.processMessageStats(volume);
    const patterns = this.processor.calculateMessagePatterns(volume);

    return { stats, volume, topMessages, patterns };
  }

  async aggregateUserData(filters: AnalyticsFilters): Promise<{
    stats: UserStats;
    activeUsers: ActiveUsersData;
    topUsers: UserActivityData[];
    inactiveUsers: InactiveUserData[];
    growth: UserGrowthData[];
    engagementDistribution: { low: number; medium: number; high: number };
  }> {
    const [userActivity, inactiveUsers, growth] = await Promise.all([
      this.collector.collectUserActivity(filters, 100),
      this.collector.collectInactiveUsers(30, 50),
      this.collector.collectUserGrowth(filters),
    ]);

    const stats = this.processor.processUserStats(
      userActivity,
      filters.dateRange,
    );
    const activeUsers =
      this.processor.calculateActiveUsersMetrics(userActivity);
    const topUsers = this.processor.rankUsers(userActivity, 20);
    const engagementDistribution =
      this.processor.calculateUserEngagementDistribution(userActivity);

    return {
      stats,
      activeUsers,
      topUsers,
      inactiveUsers,
      growth,
      engagementDistribution,
    };
  }

  async aggregateChannelData(filters: AnalyticsFilters): Promise<{
    stats: ChannelStats;
    channels: ChannelActivityData[];
    topByMessages: ChannelActivityData[];
    topByMembers: ChannelActivityData[];
    topByEngagement: ChannelActivityData[];
  }> {
    const channels = await this.collector.collectChannelActivity(filters, 50);

    const stats = this.processor.processChannelStats(channels);
    const topByMessages = this.processor.rankChannels(channels, "messages", 10);
    const topByMembers = this.processor.rankChannels(channels, "members", 10);
    const topByEngagement = this.processor.rankChannels(
      channels,
      "engagement",
      10,
    );

    return {
      stats,
      channels,
      topByMessages,
      topByMembers,
      topByEngagement,
    };
  }

  async aggregateReactionData(filters: AnalyticsFilters): Promise<{
    stats: ReactionStats;
    reactions: ReactionData[];
    diversity: number;
  }> {
    const [reactions, userActivity] = await Promise.all([
      this.collector.collectReactions(filters, 30),
      this.collector.collectUserActivity(filters, 50),
    ]);

    const stats = this.processor.processReactionStats(reactions, userActivity);
    const diversity = this.processor.calculateReactionDiversity(reactions);

    return { stats, reactions, diversity };
  }

  async aggregateFileData(filters: AnalyticsFilters): Promise<{
    stats: FileStats;
    uploads: FileUploadData[];
    typeBreakdown: Array<{ type: string; count: number; percentage: number }>;
  }> {
    const uploads = await this.collector.collectFileUploads(filters);

    const stats = this.processor.processFileStats(uploads);
    const typeBreakdown = this.processor.calculateFileTypeBreakdown(uploads);

    return { stats, uploads, typeBreakdown };
  }

  async aggregateSearchData(filters: AnalyticsFilters): Promise<{
    stats: SearchStats;
    topQueries: SearchQueryData[];
    noResultsQueries: SearchQueryData[];
  }> {
    const queries = await this.collector.collectSearchQueries(filters, 100);

    const stats = this.processor.processSearchStats(queries);
    const topQueries = this.processor.getTopSearchQueries(queries, 20);
    const noResultsQueries = this.processor.getNoResultsQueries(queries, 10);

    return { stats, topQueries, noResultsQueries };
  }

  async aggregatePeakHoursData(filters: AnalyticsFilters): Promise<{
    hours: PeakHoursData[];
    analysis: PeakHoursAnalysisResult;
  }> {
    const hours = await this.collector.collectPeakHours(filters);
    const analysis = this.processor.processPeakHours(hours);

    return { hours, analysis };
  }

  // --------------------------------------------------------------------------
  // Comparison Aggregation
  // --------------------------------------------------------------------------

  async aggregateComparison(
    currentFilters: AnalyticsFilters,
    previousFilters: AnalyticsFilters,
  ): Promise<{
    current: AnalyticsSummary;
    previous: AnalyticsSummary;
    comparison: {
      messages: { current: number; previous: number; change: number };
      users: { current: number; previous: number; change: number };
      channels: { current: number; previous: number; change: number };
    };
  }> {
    const [currentDashboard, previousDashboard] = await Promise.all([
      this.aggregateDashboardData(currentFilters),
      this.aggregateDashboardData(previousFilters),
    ]);

    return {
      current: currentDashboard.summary,
      previous: previousDashboard.summary,
      comparison: {
        messages: {
          current: currentDashboard.summary.messages.total.value,
          previous: previousDashboard.summary.messages.total.value,
          change:
            currentDashboard.summary.messages.total.value -
            previousDashboard.summary.messages.total.value,
        },
        users: {
          current: currentDashboard.summary.users.totalUsers.value,
          previous: previousDashboard.summary.users.totalUsers.value,
          change:
            currentDashboard.summary.users.totalUsers.value -
            previousDashboard.summary.users.totalUsers.value,
        },
        channels: {
          current: currentDashboard.summary.channels.totalChannels.value,
          previous: previousDashboard.summary.channels.totalChannels.value,
          change:
            currentDashboard.summary.channels.totalChannels.value -
            previousDashboard.summary.channels.totalChannels.value,
        },
      },
    };
  }

  // --------------------------------------------------------------------------
  // Helper Methods
  // --------------------------------------------------------------------------

  getPreviousDateRange(dateRange: DateRange): DateRange {
    const duration = dateRange.end.getTime() - dateRange.start.getTime();
    return {
      start: new Date(dateRange.start.getTime() - duration),
      end: new Date(dateRange.start.getTime()),
    };
  }

  getDateRangePreset(
    preset:
      | "today"
      | "yesterday"
      | "last7days"
      | "last30days"
      | "last90days"
      | "thisMonth"
      | "lastMonth"
      | "thisYear",
  ): DateRange {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (preset) {
      case "today":
        return {
          start: today,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          preset,
        };
      case "yesterday":
        return {
          start: new Date(today.getTime() - 24 * 60 * 60 * 1000),
          end: today,
          preset,
        };
      case "last7days":
        return {
          start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          preset,
        };
      case "last30days":
        return {
          start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          preset,
        };
      case "last90days":
        return {
          start: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          preset,
        };
      case "thisMonth":
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          preset,
        };
      case "lastMonth":
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return {
          start: lastMonth,
          end: new Date(now.getFullYear(), now.getMonth(), 1),
          preset,
        };
      case "thisYear":
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          preset,
        };
    }
  }

  getRecommendedGranularity(dateRange: DateRange): TimeGranularity {
    const durationMs = dateRange.end.getTime() - dateRange.start.getTime();
    const durationDays = durationMs / (24 * 60 * 60 * 1000);

    if (durationDays <= 1) return "hour";
    if (durationDays <= 14) return "day";
    if (durationDays <= 90) return "week";
    if (durationDays <= 365) return "month";
    return "year";
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let aggregatorInstance: AnalyticsAggregator | null = null;

export function getAnalyticsAggregator(): AnalyticsAggregator {
  if (!aggregatorInstance) {
    aggregatorInstance = new AnalyticsAggregator();
  }
  return aggregatorInstance;
}

export function resetAnalyticsAggregator(): void {
  aggregatorInstance?.clearCache();
  aggregatorInstance = null;
}
