"use client";

/**
 * AnalyticsCards - Metric cards with sparklines
 */

import * as React from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  MessageSquare,
  Users,
  Hash,
  Heart,
  FileText,
  Search,
  Bot,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useAnalyticsStore } from "@/stores/analytics-store";
import type { SparklineData } from "@/lib/analytics/analytics-types";

// ============================================================================
// Types
// ============================================================================

interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  changePercent?: number;
  trend?: "up" | "down" | "stable";
  icon: React.ReactNode;
  sparklineData?: number[];
  sparklineColor?: string;
  subtitle?: string;
  isLoading?: boolean;
  onClick?: () => void;
  className?: string;
}

interface AnalyticsCardsProps {
  variant?: "grid" | "list";
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

function formatChange(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

// ============================================================================
// Sparkline Component
// ============================================================================

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

function Sparkline({ data, color = "#6366f1", height = 40 }: SparklineProps) {
  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={chartData}
        margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-md border bg-background px-2 py-1 text-xs shadow-sm">
                  {payload[0].value}
                </div>
              );
            }
            return null;
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#gradient-${color})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// Metric Card Component
// ============================================================================

function MetricCard({
  title,
  value,
  change,
  changePercent,
  trend,
  icon,
  sparklineData,
  sparklineColor = "#6366f1",
  subtitle,
  isLoading,
  onClick,
  className,
}: MetricCardProps) {
  if (isLoading) {
    return (
      <Card className={cn("cursor-default", className)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  const trendColor =
    trend === "up"
      ? "text-green-600"
      : trend === "down"
        ? "text-red-600"
        : "text-muted-foreground";

  return (
    <Card
      className={cn(
        "transition-colors",
        onClick && "hover:bg-muted/50 cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {icon}
              <span>{title}</span>
            </div>
            <div className="text-2xl font-bold">
              {typeof value === "number" ? formatNumber(value) : value}
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              {changePercent !== undefined && (
                <>
                  <TrendIcon className={cn("h-3 w-3", trendColor)} />
                  <span className={cn("font-medium", trendColor)}>
                    {formatChange(changePercent)}
                  </span>
                </>
              )}
              {subtitle && (
                <span className="text-muted-foreground">{subtitle}</span>
              )}
            </div>
          </div>
          {sparklineData && sparklineData.length > 0 && (
            <div className="w-24">
              <Sparkline data={sparklineData} color={sparklineColor} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AnalyticsCards({
  variant = "grid",
  className,
}: AnalyticsCardsProps) {
  const { summary, messageVolume, userGrowth, isLoading, setCurrentView } =
    useAnalyticsStore();

  // Generate sparkline data from message volume
  const messageSparkline = React.useMemo(() => {
    if (!messageVolume || messageVolume.length === 0) return [];
    return messageVolume.slice(-14).map((d) => d.count);
  }, [messageVolume]);

  // Generate user growth sparkline
  const userSparkline = React.useMemo(() => {
    if (!userGrowth || userGrowth.length === 0) return [];
    return userGrowth.slice(-14).map((d) => d.totalUsers);
  }, [userGrowth]);

  const cards = [
    {
      title: "Messages",
      value: summary?.messages.total.value ?? 0,
      changePercent: summary?.messages.total.changePercent,
      trend: summary?.messages.total.trend,
      icon: <MessageSquare className="h-4 w-4" />,
      sparklineData: messageSparkline,
      sparklineColor: "#6366f1",
      subtitle: "vs. previous period",
      onClick: () => setCurrentView("messages"),
    },
    {
      title: "Active Users",
      value: summary?.users.activeUsers.value ?? 0,
      changePercent: summary?.users.activeUsers.changePercent,
      trend: summary?.users.activeUsers.trend,
      icon: <Users className="h-4 w-4" />,
      sparklineData: userSparkline,
      sparklineColor: "#10b981",
      subtitle: "in this period",
      onClick: () => setCurrentView("users"),
    },
    {
      title: "Channels",
      value: summary?.channels.activeChannels.value ?? 0,
      changePercent: summary?.channels.activeChannels.changePercent,
      trend: summary?.channels.activeChannels.trend,
      icon: <Hash className="h-4 w-4" />,
      sparklineColor: "#f59e0b",
      subtitle: "with activity",
      onClick: () => setCurrentView("channels"),
    },
    {
      title: "Reactions",
      value: summary?.reactions.totalReactions.value ?? 0,
      changePercent: summary?.reactions.totalReactions.changePercent,
      trend: summary?.reactions.totalReactions.trend,
      icon: <Heart className="h-4 w-4" />,
      sparklineColor: "#ec4899",
      subtitle: "emoji reactions",
      onClick: () => setCurrentView("reactions"),
    },
    {
      title: "Files",
      value: summary?.files.totalFiles.value ?? 0,
      changePercent: summary?.files.totalFiles.changePercent,
      trend: summary?.files.totalFiles.trend,
      icon: <FileText className="h-4 w-4" />,
      sparklineColor: "#8b5cf6",
      subtitle: "uploaded",
      onClick: () => setCurrentView("files"),
    },
    {
      title: "Searches",
      value: summary?.search.totalSearches.value ?? 0,
      changePercent: summary?.search.totalSearches.changePercent,
      trend: summary?.search.totalSearches.trend,
      icon: <Search className="h-4 w-4" />,
      sparklineColor: "#14b8a6",
      subtitle: "performed",
      onClick: () => setCurrentView("search"),
    },
  ];

  return (
    <div
      className={cn(
        variant === "grid"
          ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          : "space-y-4",
        className,
      )}
    >
      {cards.map((card) => (
        <MetricCard key={card.title} {...card} isLoading={isLoading} />
      ))}
    </div>
  );
}

export default AnalyticsCards;
