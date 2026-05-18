"use client";

/**
 * ChannelActivityChart - Shows activity by channel
 */

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Legend,
} from "recharts";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsStore } from "@/stores/analytics-store";

// ============================================================================
// Types
// ============================================================================

interface ChannelActivityChartProps {
  height?: number;
  variant?: "bar" | "pie";
  limit?: number;
  className?: string;
}

// ============================================================================
// Colors
// ============================================================================

const COLORS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#14b8a6", // teal
  "#f97316", // orange
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#a855f7", // purple
];

// ============================================================================
// Custom Tooltip
// ============================================================================

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      name: string;
      members: number;
      engagement: number;
    };
  }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-2 font-medium">{data.name}</p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Messages:</span>
          <span className="font-medium">
            {payload[0].value.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Members:</span>
          <span className="font-medium">{data.members}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Engagement:</span>
          <span className="font-medium">{data.engagement.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function ChannelActivityChart({
  height = 300,
  variant = "bar",
  limit = 10,
  className,
}: ChannelActivityChartProps) {
  const { channelActivity, isLoading } = useAnalyticsStore();

  // Transform and limit data
  const chartData = React.useMemo(() => {
    if (!channelActivity || channelActivity.length === 0) return [];

    return channelActivity
      .slice(0, limit)
      .sort((a, b) => b.messageCount - a.messageCount)
      .map((channel) => ({
        name: channel.channelName,
        messages: channel.messageCount,
        members: channel.memberCount,
        engagement: channel.engagementRate,
        type: channel.channelType,
      }));
  }, [channelActivity, limit]);

  if (isLoading) {
    return (
      <div className={cn("w-full", className)} style={{ height }}>
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-muted-foreground",
          className,
        )}
        style={{ height }}
      >
        No channel data available
      </div>
    );
  }

  if (variant === "pie") {
    return (
      <div className={cn("w-full", className)} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              dataKey="messages"
              nameKey="name"
              label={({ name, percent }) =>
                `${name} (${(percent * 100).toFixed(0)}%)`
              }
              labelLine={false}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-muted"
            horizontal
          />
          <XAxis
            type="number"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="fill-muted-foreground"
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="fill-muted-foreground"
            width={100}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="messages" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ChannelActivityChart;
