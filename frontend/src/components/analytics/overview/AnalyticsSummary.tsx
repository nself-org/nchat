"use client";

/**
 * AnalyticsSummary - Key metrics summary grid
 */

import * as React from "react";
import {
  MessageSquare,
  Users,
  Hash,
  Heart,
  FileText,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useAnalyticsStore } from "@/stores/analytics-store";
import type { MetricValue } from "@/lib/analytics/analytics-types";

// ============================================================================
// Types
// ============================================================================

interface SummaryCardProps {
  title: string;
  value: number | string;
  change?: number;
  changePercent?: number;
  trend?: "up" | "down" | "stable";
  icon: React.ReactNode;
  description?: string;
  isLoading?: boolean;
  className?: string;
}

interface AnalyticsSummaryProps {
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

function formatPercentChange(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function getTrendIcon(trend: "up" | "down" | "stable" | undefined) {
  switch (trend) {
    case "up":
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case "down":
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    case "stable":
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
}

function getTrendColor(trend: "up" | "down" | "stable" | undefined): string {
  switch (trend) {
    case "up":
      return "text-green-600";
    case "down":
      return "text-red-600";
    default:
      return "text-muted-foreground";
  }
}

// ============================================================================
// Summary Card Component
// ============================================================================

function SummaryCard({
  title,
  value,
  change,
  changePercent,
  trend,
  icon,
  description,
  isLoading,
  className,
}: SummaryCardProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-1 h-8 w-20" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof value === "number" ? formatNumber(value) : value}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {changePercent !== undefined && (
            <>
              {getTrendIcon(trend)}
              <span className={cn("font-medium", getTrendColor(trend))}>
                {formatPercentChange(changePercent)}
              </span>
            </>
          )}
          {description && (
            <span className="text-muted-foreground">{description}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AnalyticsSummary({ className }: AnalyticsSummaryProps) {
  const { summary, isLoading, activeUsers } = useAnalyticsStore();

  const getMetricProps = (metric: MetricValue | undefined) => ({
    value: metric?.value ?? 0,
    change: metric?.change,
    changePercent: metric?.changePercent,
    trend: metric?.trend,
  });

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {/* Total Messages */}
      <SummaryCard
        title="Total Messages"
        {...getMetricProps(summary?.messages.total)}
        icon={<MessageSquare className="h-4 w-4" />}
        description="vs. previous period"
        isLoading={isLoading}
      />

      {/* Active Users */}
      <SummaryCard
        title="Active Users"
        {...getMetricProps(summary?.users.activeUsers)}
        icon={<Users className="h-4 w-4" />}
        description={activeUsers ? `${activeUsers.dau} today` : undefined}
        isLoading={isLoading}
      />

      {/* Active Channels */}
      <SummaryCard
        title="Active Channels"
        {...getMetricProps(summary?.channels.activeChannels)}
        icon={<Hash className="h-4 w-4" />}
        description="with activity"
        isLoading={isLoading}
      />

      {/* Total Reactions */}
      <SummaryCard
        title="Total Reactions"
        {...getMetricProps(summary?.reactions.totalReactions)}
        icon={<Heart className="h-4 w-4" />}
        description="emoji reactions"
        isLoading={isLoading}
      />

      {/* Files Uploaded */}
      <SummaryCard
        title="Files Uploaded"
        {...getMetricProps(summary?.files.totalFiles)}
        icon={<FileText className="h-4 w-4" />}
        description="files shared"
        isLoading={isLoading}
      />

      {/* Search Queries */}
      <SummaryCard
        title="Search Queries"
        {...getMetricProps(summary?.search.totalSearches)}
        icon={<Search className="h-4 w-4" />}
        description="searches performed"
        isLoading={isLoading}
      />

      {/* New Users */}
      <SummaryCard
        title="New Users"
        {...getMetricProps(summary?.users.newUsers)}
        icon={<Users className="h-4 w-4" />}
        description="joined this period"
        isLoading={isLoading}
      />

      {/* Messages in Threads */}
      <SummaryCard
        title="Thread Messages"
        {...getMetricProps(summary?.messages.inThreads)}
        icon={<MessageSquare className="h-4 w-4" />}
        description="in conversations"
        isLoading={isLoading}
      />
    </div>
  );
}

export default AnalyticsSummary;
