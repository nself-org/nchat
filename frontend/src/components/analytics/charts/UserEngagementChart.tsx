"use client";

/**
 * UserEngagementChart - Shows user engagement metrics
 */

import * as React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsStore } from "@/stores/analytics-store";

// ============================================================================
// Types
// ============================================================================

interface UserEngagementChartProps {
  height?: number;
  variant?: "radar" | "bar";
  className?: string;
}

// ============================================================================
// Colors
// ============================================================================

const COLORS = {
  primary: "#6366f1",
  secondary: "#10b981",
  tertiary: "#f59e0b",
};

// ============================================================================
// Component
// ============================================================================

export function UserEngagementChart({
  height = 300,
  variant = "radar",
  className,
}: UserEngagementChartProps) {
  const { summary, userActivity, isLoading } = useAnalyticsStore();

  // Radar chart data - engagement metrics normalized to 100
  const radarData = React.useMemo(() => {
    if (!summary || !userActivity) return [];

    const totalUsers = userActivity.length || 1;
    const totalMessages = userActivity.reduce(
      (sum, u) => sum + u.messageCount,
      0,
    );
    const totalReactions = userActivity.reduce(
      (sum, u) => sum + u.reactionCount,
      0,
    );
    const totalFiles = userActivity.reduce((sum, u) => sum + u.fileCount, 0);
    const totalThreads = userActivity.reduce(
      (sum, u) => sum + u.threadCount,
      0,
    );

    // Normalize to percentage of "ideal" engagement
    const maxMessagesPerUser = 100;
    const maxReactionsPerUser = 50;
    const maxFilesPerUser = 10;
    const maxThreadsPerUser = 20;

    return [
      {
        metric: "Messages",
        value: Math.min(
          100,
          (totalMessages / totalUsers / maxMessagesPerUser) * 100,
        ),
        fullMark: 100,
      },
      {
        metric: "Reactions",
        value: Math.min(
          100,
          (totalReactions / totalUsers / maxReactionsPerUser) * 100,
        ),
        fullMark: 100,
      },
      {
        metric: "Files",
        value: Math.min(100, (totalFiles / totalUsers / maxFilesPerUser) * 100),
        fullMark: 100,
      },
      {
        metric: "Threads",
        value: Math.min(
          100,
          (totalThreads / totalUsers / maxThreadsPerUser) * 100,
        ),
        fullMark: 100,
      },
      {
        metric: "Active Rate",
        value:
          summary.users.activeUsers.value > 0
            ? (summary.users.activeUsers.value /
                summary.users.totalUsers.value) *
              100
            : 0,
        fullMark: 100,
      },
    ];
  }, [summary, userActivity]);

  // Bar chart data - per-user averages
  const barData = React.useMemo(() => {
    if (!userActivity || userActivity.length === 0) return [];

    const totalUsers = userActivity.length;
    const totals = userActivity.reduce(
      (acc, user) => ({
        messages: acc.messages + user.messageCount,
        reactions: acc.reactions + user.reactionCount,
        files: acc.files + user.fileCount,
        threads: acc.threads + user.threadCount,
      }),
      { messages: 0, reactions: 0, files: 0, threads: 0 },
    );

    return [
      {
        name: "Messages",
        value: Math.round(totals.messages / totalUsers),
        color: "#6366f1",
      },
      {
        name: "Reactions",
        value: Math.round(totals.reactions / totalUsers),
        color: "#10b981",
      },
      {
        name: "Files",
        value: Math.round(totals.files / totalUsers),
        color: "#f59e0b",
      },
      {
        name: "Threads",
        value: Math.round(totals.threads / totalUsers),
        color: "#ec4899",
      },
    ];
  }, [userActivity]);

  if (isLoading) {
    return (
      <div className={cn("w-full", className)} style={{ height }}>
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (
    (variant === "radar" && radarData.length === 0) ||
    (variant === "bar" && barData.length === 0)
  ) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-muted-foreground",
          className,
        )}
        style={{ height }}
      >
        No engagement data available
      </div>
    );
  }

  if (variant === "radar") {
    return (
      <div className={cn("w-full", className)} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid className="stroke-muted" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              className="fill-muted-foreground"
            />
            <Radar
              name="Engagement"
              dataKey="value"
              stroke={COLORS.primary}
              fill={COLORS.primary}
              fillOpacity={0.3}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                return (
                  <div className="rounded-lg border bg-background p-2 text-sm shadow-md">
                    <span className="font-medium">
                      {payload[0].payload.metric}:
                    </span>{" "}
                    <span>
                      {typeof payload[0].value === "number"
                        ? payload[0].value.toFixed(1)
                        : payload[0].value}
                      %
                    </span>
                  </div>
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={barData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="fill-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="fill-muted-foreground"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              return (
                <div className="rounded-lg border bg-background p-2 text-sm shadow-md">
                  <span className="font-medium">
                    {payload[0].payload.name}:
                  </span>{" "}
                  <span>{payload[0].value} per user</span>
                </div>
              );
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {barData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-4 gap-4 text-center text-sm">
        {barData.map((item) => (
          <div key={item.name}>
            <div className="font-medium">{item.value}</div>
            <div className="text-muted-foreground">{item.name}/user</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UserEngagementChart;
