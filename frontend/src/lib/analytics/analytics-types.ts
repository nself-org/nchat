/**
 * Analytics Types for nself-chat
 *
 * Comprehensive TypeScript types for the analytics dashboard
 */

// ============================================================================
// Date Range Types
// ============================================================================

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last7days"
  | "last30days"
  | "last90days"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "custom";

export interface DateRange {
  start: Date;
  end: Date;
  preset?: DateRangePreset;
}

// ============================================================================
// Granularity Types
// ============================================================================

export type TimeGranularity = "hour" | "day" | "week" | "month" | "year";

// ============================================================================
// Metric Types
// ============================================================================

export interface MetricValue {
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  trend?: "up" | "down" | "stable";
}

export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface SparklineData {
  data: number[];
  min: number;
  max: number;
  average: number;
}

// ============================================================================
// Message Analytics
// ============================================================================

export interface MessageStats {
  total: MetricValue;
  sent: MetricValue;
  edited: MetricValue;
  deleted: MetricValue;
  averageLength: MetricValue;
  withAttachments: MetricValue;
  withReactions: MetricValue;
  inThreads: MetricValue;
}

export interface MessageVolumeData {
  timestamp: Date;
  count: number;
  channelBreakdown?: Record<string, number>;
}

export interface MessagePatternData {
  hourOfDay: number[];
  dayOfWeek: number[];
  peakHour: number;
  peakDay: string;
}

// ============================================================================
// User Analytics
// ============================================================================

export interface UserStats {
  totalUsers: MetricValue;
  activeUsers: MetricValue;
  newUsers: MetricValue;
  returningUsers: MetricValue;
  churned: MetricValue;
  averageSessionDuration: MetricValue;
}

export interface ActiveUsersData {
  dau: number; // Daily Active Users
  wau: number; // Weekly Active Users
  mau: number; // Monthly Active Users
  dauWauRatio: number;
  dauMauRatio: number;
}

export interface UserEngagementMetrics {
  messagesPerUser: number;
  reactionsPerUser: number;
  channelsPerUser: number;
  threadsParticipated: number;
  filesUploaded: number;
  mentionsReceived: number;
  mentionsGiven: number;
}

export interface UserActivityData {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  lastActive: Date;
  messageCount: number;
  reactionCount: number;
  fileCount: number;
  threadCount: number;
  engagementScore: number;
}

export interface InactiveUserData {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  lastActive: Date;
  daysSinceActive: number;
  totalMessages: number;
}

export interface UserGrowthData {
  timestamp: Date;
  newUsers: number;
  totalUsers: number;
  churnedUsers: number;
  netGrowth: number;
}

// ============================================================================
// Channel Analytics
// ============================================================================

export interface ChannelStats {
  totalChannels: MetricValue;
  activeChannels: MetricValue;
  publicChannels: MetricValue;
  privateChannels: MetricValue;
  directMessages: MetricValue;
  averageMembers: MetricValue;
}

export interface ChannelActivityData {
  channelId: string;
  channelName: string;
  channelType: "public" | "private" | "direct";
  memberCount: number;
  messageCount: number;
  activeUsers: number;
  lastActivity: Date;
  engagementRate: number;
  growthRate: number;
}

export interface ChannelGrowthData {
  timestamp: Date;
  channelId: string;
  channelName: string;
  newMembers: number;
  leftMembers: number;
  totalMembers: number;
}

// ============================================================================
// Reaction Analytics
// ============================================================================

export interface ReactionStats {
  totalReactions: MetricValue;
  uniqueEmojis: MetricValue;
  reactionsPerMessage: MetricValue;
  topReactors: UserActivityData[];
}

export interface ReactionData {
  emoji: string;
  emojiName: string;
  count: number;
  percentage: number;
  users: number;
}

export interface ReactionTrendData {
  timestamp: Date;
  emoji: string;
  count: number;
}

// ============================================================================
// File Analytics
// ============================================================================

export interface FileStats {
  totalFiles: MetricValue;
  totalSize: MetricValue;
  averageSize: MetricValue;
  uniqueUploaders: MetricValue;
}

export interface FileTypeBreakdown {
  type: string;
  mimeType: string;
  count: number;
  totalSize: number;
  percentage: number;
}

export interface FileUploadData {
  timestamp: Date;
  count: number;
  totalSize: number;
  fileTypes: Record<string, number>;
}

// ============================================================================
// Search Analytics
// ============================================================================

export interface SearchStats {
  totalSearches: MetricValue;
  uniqueSearchers: MetricValue;
  averageResultCount: MetricValue;
  noResultsRate: MetricValue;
}

export interface SearchQueryData {
  query: string;
  count: number;
  resultCount: number;
  clickThroughRate: number;
  lastSearched: Date;
}

export interface SearchTrendData {
  timestamp: Date;
  searchCount: number;
  uniqueUsers: number;
  noResultsCount: number;
}

// ============================================================================
// Response Time Analytics
// ============================================================================

export interface ResponseTimeStats {
  averageResponseTime: MetricValue;
  medianResponseTime: MetricValue;
  p95ResponseTime: MetricValue;
  p99ResponseTime: MetricValue;
}

export interface ResponseTimeData {
  timestamp: Date;
  channelId: string;
  channelName: string;
  averageTime: number;
  medianTime: number;
  messageCount: number;
}

// ============================================================================
// Bot Analytics
// ============================================================================

export interface BotStats {
  totalBots: MetricValue;
  activeBots: MetricValue;
  messagesFromBots: MetricValue;
  commandsExecuted: MetricValue;
}

export interface BotActivityData {
  botId: string;
  botName: string;
  avatarUrl?: string;
  messageCount: number;
  commandCount: number;
  errorCount: number;
  lastActive: Date;
  channels: string[];
}

// ============================================================================
// Peak Hours Analytics
// ============================================================================

export interface PeakHoursData {
  hour: number;
  messageCount: number;
  activeUsers: number;
  averageResponseTime: number;
}

export interface DayOfWeekData {
  day: string;
  dayIndex: number;
  messageCount: number;
  activeUsers: number;
}

// ============================================================================
// Top Content Analytics
// ============================================================================

export interface TopMessageData {
  messageId: string;
  content: string;
  channelId: string;
  channelName: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  reactionCount: number;
  replyCount: number;
  timestamp: Date;
}

// ============================================================================
// Aggregate Dashboard Data
// ============================================================================

export interface AnalyticsSummary {
  messages: MessageStats;
  users: UserStats;
  channels: ChannelStats;
  reactions: ReactionStats;
  files: FileStats;
  search: SearchStats;
  responseTime: ResponseTimeStats;
}

export interface DashboardData {
  summary: AnalyticsSummary;
  messageVolume: MessageVolumeData[];
  activeUsers: ActiveUsersData;
  userGrowth: UserGrowthData[];
  channelActivity: ChannelActivityData[];
  topChannels: ChannelActivityData[];
  topUsers: UserActivityData[];
  topMessages: TopMessageData[];
  inactiveUsers: InactiveUserData[];
  reactions: ReactionData[];
  fileUploads: FileUploadData[];
  peakHours: PeakHoursData[];
  searchQueries: SearchQueryData[];
}

// ============================================================================
// Filter Types
// ============================================================================

export interface AnalyticsFilters {
  dateRange: DateRange;
  granularity: TimeGranularity;
  channelIds?: string[];
  userIds?: string[];
  channelTypes?: ("public" | "private" | "direct")[];
  includeDeleted?: boolean;
  includeBots?: boolean;
}

// ============================================================================
// Export Types
// ============================================================================

export type ExportFormat = "csv" | "json" | "pdf" | "xlsx";

export interface ExportOptions {
  format: ExportFormat;
  sections: AnalyticsSectionType[];
  dateRange: DateRange;
  includeCharts?: boolean;
  fileName?: string;
}

export type AnalyticsSectionType =
  | "summary"
  | "messages"
  | "users"
  | "channels"
  | "reactions"
  | "files"
  | "search"
  | "responseTime"
  | "bots"
  | "peakHours";

// ============================================================================
// Report Types
// ============================================================================

export interface ScheduledReportConfig {
  id: string;
  name: string;
  frequency: "daily" | "weekly" | "monthly";
  dayOfWeek?: number;
  dayOfMonth?: number;
  time: string;
  recipients: string[];
  sections: AnalyticsSectionType[];
  format: ExportFormat;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  createdBy: string;
}

export interface ReportHistory {
  id: string;
  reportConfigId: string;
  reportName: string;
  generatedAt: Date;
  dateRange: DateRange;
  format: ExportFormat;
  fileUrl?: string;
  status: "pending" | "generating" | "completed" | "failed";
  error?: string;
}

// ============================================================================
// Comparison Types
// ============================================================================

export interface ComparisonData<T> {
  current: T;
  previous: T;
  change: number;
  changePercent: number;
  trend: "up" | "down" | "stable";
}

// ============================================================================
// Chart Configuration Types
// ============================================================================

export interface ChartConfig {
  type: "line" | "bar" | "area" | "pie" | "donut" | "radar" | "scatter";
  title: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  animate?: boolean;
  stacked?: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface AnalyticsApiResponse<T> {
  data: T;
  meta: {
    dateRange: DateRange;
    granularity: TimeGranularity;
    generatedAt: Date;
    cached: boolean;
    cacheExpiry?: Date;
  };
}

export interface AnalyticsError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
