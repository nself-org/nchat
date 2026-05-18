/**
 * DashboardStats Component
 *
 * Displays admin dashboard statistics overview with cards for
 * users, messages, channels, and storage metrics.
 */

"use client";

import { useCallback, useMemo } from "react";
import {
  Users,
  MessageSquare,
  Hash,
  HardDrive,
  UserPlus,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard, StatsGrid } from "@/components/admin/stats-card";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/admin/stats-aggregator";
import type { DashboardStats as DashboardStatsType } from "@/lib/admin/stats-aggregator";

// ============================================================================
// Types
// ============================================================================

export interface DashboardStatsProps {
  stats: DashboardStatsType | null;
  previousStats?: DashboardStatsType | null;
  isLoading?: boolean;
  error?: string | null;
  lastUpdated?: Date | null;
  onRefresh?: () => void;
  onUserCardClick?: () => void;
  onMessageCardClick?: () => void;
  onChannelCardClick?: () => void;
  onStorageCardClick?: () => void;
  className?: string;
}

export interface StatCardData {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: {
    value: number;
    label?: string;
    direction: "up" | "down" | "neutral";
    isPositive?: boolean;
  };
  onClick?: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate percentage change between two values
 */
export function calculateChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Determine trend direction from change value
 */
export function getTrendDirection(change: number): "up" | "down" | "neutral" {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "neutral";
}

/**
 * Format a number with locale-specific separators
 */
export function formatNumber(value: number): string {
  return value.toLocaleString();
}

/**
 * Format time since last update
 */
export function formatTimeSince(date: Date | null): string {
  if (!date) return "Never";

  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

/**
 * Get storage status color based on percentage
 */
export function getStorageStatusColor(percentage: number): string {
  if (percentage >= 90) return "text-red-600 dark:text-red-400";
  if (percentage >= 75) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
}

/**
 * Get storage status label
 */
export function getStorageStatusLabel(percentage: number): string {
  if (percentage >= 90) return "Critical";
  if (percentage >= 75) return "Warning";
  if (percentage >= 50) return "Moderate";
  return "Healthy";
}

// ============================================================================
// Sub-Components
// ============================================================================

interface StatsHeaderProps {
  lastUpdated: Date | null;
  isLoading: boolean;
  onRefresh?: () => void;
}

export function StatsHeader({
  lastUpdated,
  isLoading,
  onRefresh,
}: StatsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Dashboard Overview
        </h2>
        <p className="text-muted-foreground">
          Real-time statistics and metrics for your platform
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Updated {formatTimeSince(lastUpdated)}</span>
        </div>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        )}
      </div>
    </div>
  );
}

interface StatsErrorProps {
  error: string;
  onRetry?: () => void;
}

export function StatsError({ error, onRetry }: StatsErrorProps) {
  return (
    <Card className="border-destructive">
      <CardContent className="flex flex-col items-center justify-center py-8">
        <p className="font-medium text-destructive">
          Failed to load statistics
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-4"
          >
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function StatsLoadingSkeleton() {
  return (
    <StatsGrid columns={4}>
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="mb-2 h-8 w-16" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      ))}
    </StatsGrid>
  );
}

interface StorageCardProps {
  used: number;
  limit: number;
  percentage: number;
  previousUsed?: number;
  isLoading?: boolean;
  onClick?: () => void;
}

export function StorageCard({
  used,
  limit,
  percentage,
  previousUsed,
  isLoading,
  onClick,
}: StorageCardProps) {
  const change =
    previousUsed !== undefined ? calculateChange(used, previousUsed) : null;
  const statusColor = getStorageStatusColor(percentage);
  const statusLabel = getStorageStatusLabel(percentage);

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all",
        onClick && "cursor-pointer hover:border-primary hover:shadow-md",
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
        <HardDrive className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{formatBytes(used)}</span>
              <span className="text-sm text-muted-foreground">
                / {formatBytes(limit)}
              </span>
            </div>
            <Progress value={percentage} className="mt-2 h-2" />
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className={statusColor}>
                {statusLabel} ({percentage}%)
              </span>
              {change !== null && (
                <span
                  className={cn(
                    "flex items-center gap-1",
                    change > 0
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-green-600 dark:text-green-400",
                  )}
                >
                  {change > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : change < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : null}
                  {change > 0 ? "+" : ""}
                  {change}% from previous
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface ActivitySummaryProps {
  messagesPerDay: number;
  peakHour: number;
  mostActiveChannels: string[];
  isLoading?: boolean;
}

export function ActivitySummary({
  messagesPerDay,
  peakHour,
  mostActiveChannels,
  isLoading,
}: ActivitySummaryProps) {
  const formatHour = (hour: number): string => {
    const ampm = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:00 ${ampm}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4" />
          Activity Summary
        </CardTitle>
        <CardDescription>Platform activity insights</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Avg. messages/day</span>
              <span className="font-medium">
                {formatNumber(messagesPerDay)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Peak activity</span>
              <span className="font-medium">{formatHour(peakHour)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Most active</span>
              <span className="max-w-[150px] truncate font-medium">
                {mostActiveChannels.length > 0
                  ? mostActiveChannels.slice(0, 2).join(", ")
                  : "No data"}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DashboardStats({
  stats,
  previousStats,
  isLoading = false,
  error = null,
  lastUpdated = null,
  onRefresh,
  onUserCardClick,
  onMessageCardClick,
  onChannelCardClick,
  onStorageCardClick,
  className,
}: DashboardStatsProps) {
  // Calculate trends for each stat category
  const userTrend = useMemo(() => {
    if (!stats || !previousStats) return undefined;
    const change = calculateChange(
      stats.users.total,
      previousStats.users.total,
    );
    return {
      value: Math.abs(change),
      label: "from last period",
      direction: getTrendDirection(change),
      isPositive: change >= 0,
    };
  }, [stats, previousStats]);

  const messageTrend = useMemo(() => {
    if (!stats || !previousStats) return undefined;
    const change = calculateChange(
      stats.messages.total,
      previousStats.messages.total,
    );
    return {
      value: Math.abs(change),
      label: "from last period",
      direction: getTrendDirection(change),
      isPositive: change >= 0,
    };
  }, [stats, previousStats]);

  const channelTrend = useMemo(() => {
    if (!stats || !previousStats) return undefined;
    const change = calculateChange(
      stats.channels.total,
      previousStats.channels.total,
    );
    return {
      value: Math.abs(change),
      label: "from last period",
      direction: getTrendDirection(change),
      isPositive: change >= 0,
    };
  }, [stats, previousStats]);

  // Build card data
  const cardData: StatCardData[] = useMemo(() => {
    if (!stats) return [];

    return [
      {
        title: "Total Users",
        value: stats.users.total,
        description: `${stats.users.active} active, ${stats.users.new} new this period`,
        icon: Users,
        trend: userTrend,
        onClick: onUserCardClick,
      },
      {
        title: "Total Messages",
        value: stats.messages.total,
        description: `${stats.messages.today} sent today`,
        icon: MessageSquare,
        trend: messageTrend,
        onClick: onMessageCardClick,
      },
      {
        title: "Channels",
        value: stats.channels.total,
        description: `${stats.channels.public} public, ${stats.channels.private} private`,
        icon: Hash,
        trend: channelTrend,
        onClick: onChannelCardClick,
      },
    ];
  }, [
    stats,
    userTrend,
    messageTrend,
    channelTrend,
    onUserCardClick,
    onMessageCardClick,
    onChannelCardClick,
  ]);

  // Render error state
  if (error) {
    return (
      <div className={cn("space-y-4", className)}>
        <StatsHeader
          lastUpdated={lastUpdated}
          isLoading={isLoading}
          onRefresh={onRefresh}
        />
        <StatsError error={error} onRetry={onRefresh} />
      </div>
    );
  }

  // Render loading state
  if (isLoading && !stats) {
    return (
      <div className={cn("space-y-4", className)}>
        <StatsHeader
          lastUpdated={lastUpdated}
          isLoading={isLoading}
          onRefresh={onRefresh}
        />
        <StatsLoadingSkeleton />
      </div>
    );
  }

  // Render empty state
  if (!stats) {
    return (
      <div className={cn("space-y-4", className)}>
        <StatsHeader
          lastUpdated={lastUpdated}
          isLoading={isLoading}
          onRefresh={onRefresh}
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground">No statistics available</p>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="mt-4"
              >
                Load Statistics
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <StatsHeader
        lastUpdated={lastUpdated}
        isLoading={isLoading}
        onRefresh={onRefresh}
      />

      {/* Main Stats Grid */}
      <StatsGrid columns={4}>
        {cardData.map((card) => (
          <StatsCard
            key={card.title}
            title={card.title}
            value={card.value}
            description={card.description}
            icon={card.icon as any}
            trend={card.trend}
            onClick={card.onClick}
            loading={isLoading}
          />
        ))}
        <StorageCard
          used={stats.storage.used}
          limit={stats.storage.limit}
          percentage={stats.storage.percentage}
          previousUsed={previousStats?.storage.used}
          isLoading={isLoading}
          onClick={onStorageCardClick}
        />
      </StatsGrid>

      {/* Activity Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ActivitySummary
          messagesPerDay={stats.messages.avgPerDay}
          peakHour={stats.messages.peakHour}
          mostActiveChannels={stats.channels.mostActive}
          isLoading={isLoading}
        />

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <UserPlus className="h-4 w-4" />
              User Growth
            </CardTitle>
            <CardDescription>User acquisition metrics</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">New users</span>
                  <span className="font-medium">
                    {formatNumber(stats.users.new)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Growth rate</span>
                  <span
                    className={cn(
                      "flex items-center gap-1 font-medium",
                      stats.users.growth >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {stats.users.growth >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {stats.users.growth >= 0 ? "+" : ""}
                    {stats.users.growth}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Active rate</span>
                  <span className="font-medium">
                    {stats.users.total > 0
                      ? Math.round(
                          (stats.users.active / stats.users.total) * 100,
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Channel Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Hash className="h-4 w-4" />
              Channel Distribution
            </CardTitle>
            <CardDescription>Channel type breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Public channels</span>
                  <span className="font-medium">{stats.channels.public}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Private channels
                  </span>
                  <span className="font-medium">{stats.channels.private}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Public ratio</span>
                  <span className="font-medium">
                    {stats.channels.total > 0
                      ? Math.round(
                          (stats.channels.public / stats.channels.total) * 100,
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DashboardStats;
