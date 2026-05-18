"use client";

import * as React from "react";
import {
  Users,
  MessageSquare,
  Heart,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Activity,
  Calendar,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Channel } from "@/stores/channel-store";
import {
  calculateChannelStats,
  getActivityLevel,
  getActivityLevelLabel,
  getActivityTrend,
  formatMemberCount,
  formatMessageCount,
  formatGrowthRate,
  formatEngagementRate,
  formatTimeAgo,
  type ChannelStats as ChannelStatsType,
  type ChannelActivity,
} from "@/lib/channels/channel-stats";

// ============================================================================
// Types
// ============================================================================

export interface ChannelStatsProps {
  channel: Channel;
  activityData?: ChannelActivity[];
  variant?: "default" | "compact" | "detailed";
  showTrends?: boolean;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ChannelStats({
  channel,
  activityData,
  variant = "default",
  showTrends = true,
  className,
}: ChannelStatsProps) {
  const stats = calculateChannelStats(channel, activityData);
  const activityLevel = getActivityLevel(channel);
  const trend = activityData ? getActivityTrend(activityData) : "stable";

  if (variant === "compact") {
    return (
      <div className={cn("grid grid-cols-2 gap-4", className)}>
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Members"
          value={formatMemberCount(stats.memberCount)}
          subValue={`${stats.activeMembersToday} active today`}
        />
        <StatCard
          icon={<MessageSquare className="h-4 w-4" />}
          label="Messages"
          value={formatMessageCount(stats.messageCountWeek)}
          subValue="this week"
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Activity"
          value={getActivityLevelLabel(activityLevel)}
          trend={showTrends ? trend : undefined}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Growth"
          value={formatGrowthRate(stats.growthRate)}
          subValue="last 30 days"
        />
      </div>
    );
  }

  if (variant === "detailed") {
    return (
      <div className={cn("space-y-6", className)}>
        {/* Overview Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Total Members"
            value={formatMemberCount(stats.memberCount)}
            subValue={`${stats.activeMembersToday} active today`}
          />
          <StatCard
            icon={<MessageSquare className="h-4 w-4" />}
            label="Total Messages"
            value={formatMessageCount(stats.messageCount)}
            subValue={`${formatMessageCount(stats.messageCountToday)} today`}
          />
          <StatCard
            icon={<Heart className="h-4 w-4" />}
            label="Reactions"
            value={formatMessageCount(stats.reactionCount)}
          />
          <StatCard
            icon={<MessageCircle className="h-4 w-4" />}
            label="Threads"
            value={formatMessageCount(stats.threadCount)}
          />
        </div>

        {/* Activity & Engagement */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activity & Engagement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Activity Level
              </span>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    activityLevel === "very-active" &&
                      "border-green-500 text-green-600",
                    activityLevel === "active" &&
                      "border-emerald-500 text-emerald-600",
                    activityLevel === "moderate" &&
                      "border-yellow-500 text-yellow-600",
                    activityLevel === "quiet" &&
                      "border-orange-500 text-orange-600",
                    activityLevel === "inactive" &&
                      "border-gray-400 text-gray-500",
                  )}
                >
                  {getActivityLevelLabel(activityLevel)}
                </Badge>
                {showTrends && <TrendIndicator trend={trend} />}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Engagement Rate</span>
                <span className="font-medium">
                  {formatEngagementRate(stats.engagementRate)}
                </span>
              </div>
              <Progress value={stats.engagementRate} className="h-2" />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Growth Rate (30d)</span>
              <span
                className={cn(
                  "font-medium",
                  stats.growthRate > 0 && "text-green-600",
                  stats.growthRate < 0 && "text-red-600",
                )}
              >
                {formatGrowthRate(stats.growthRate)}
              </span>
            </div>

            {stats.lastActivityAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Activity</span>
                <span className="font-medium">
                  {formatTimeAgo(stats.lastActivityAt)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time-based Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Message Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Today</span>
                <span className="font-medium">
                  {formatMessageCount(stats.messageCountToday)} messages
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">This Week</span>
                <span className="font-medium">
                  {formatMessageCount(stats.messageCountWeek)} messages
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  This Month
                </span>
                <span className="font-medium">
                  {formatMessageCount(stats.messageCountMonth)} messages
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Channel Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Channel Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">
                  {formatTimeAgo(stats.createdAt)}
                </span>
              </div>
              {stats.peakActivityHour !== null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Peak Activity Hour
                  </span>
                  <span className="font-medium">
                    {stats.peakActivityHour}:00 - {stats.peakActivityHour + 1}
                    :00
                  </span>
                </div>
              )}
              {stats.averageResponseTime !== null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Avg Response Time
                  </span>
                  <span className="font-medium">
                    {stats.averageResponseTime} min
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("grid grid-cols-2 gap-4 sm:grid-cols-4", className)}>
      <StatCard
        icon={<Users className="h-4 w-4" />}
        label="Members"
        value={formatMemberCount(stats.memberCount)}
      />
      <StatCard
        icon={<MessageSquare className="h-4 w-4" />}
        label="Messages"
        value={formatMessageCount(stats.messageCountWeek)}
        subValue="this week"
      />
      <StatCard
        icon={<Activity className="h-4 w-4" />}
        label="Activity"
        value={getActivityLevelLabel(activityLevel)}
        trend={showTrends ? trend : undefined}
      />
      <StatCard
        icon={<Clock className="h-4 w-4" />}
        label="Last Active"
        value={
          stats.lastActivityAt ? formatTimeAgo(stats.lastActivityAt) : "Never"
        }
      />
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  trend?: "increasing" | "decreasing" | "stable";
}

function StatCard({ icon, label, value, subValue, trend }: StatCardProps) {
  return (
    <div className="bg-muted/50 flex items-start gap-3 rounded-lg p-3">
      <div className="rounded-md bg-background p-2 text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1.5">
          <p className="truncate text-lg font-semibold">{value}</p>
          {trend && <TrendIndicator trend={trend} size="sm" />}
        </div>
        {subValue && (
          <p className="text-xs text-muted-foreground">{subValue}</p>
        )}
      </div>
    </div>
  );
}

interface TrendIndicatorProps {
  trend: "increasing" | "decreasing" | "stable";
  size?: "sm" | "default";
}

function TrendIndicator({ trend, size = "default" }: TrendIndicatorProps) {
  const iconClass = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  switch (trend) {
    case "increasing":
      return <TrendingUp className={cn(iconClass, "text-green-500")} />;
    case "decreasing":
      return <TrendingDown className={cn(iconClass, "text-red-500")} />;
    case "stable":
    default:
      return <Minus className={cn(iconClass, "text-muted-foreground")} />;
  }
}

ChannelStats.displayName = "ChannelStats";
