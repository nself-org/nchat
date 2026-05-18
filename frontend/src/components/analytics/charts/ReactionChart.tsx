"use client";

/**
 * ReactionChart - Shows popular reactions
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

interface ReactionChartProps {
  height?: number;
  variant?: "bar" | "pie";
  limit?: number;
  className?: string;
}

// ============================================================================
// Colors
// ============================================================================

const COLORS = [
  "#fbbf24", // yellow for common emojis
  "#ef4444", // red
  "#10b981", // green
  "#3b82f6", // blue
  "#ec4899", // pink
  "#8b5cf6", // purple
  "#f97316", // orange
  "#14b8a6", // teal
  "#84cc16", // lime
  "#a855f7", // violet
];

// ============================================================================
// Emoji Display Map
// ============================================================================

const EMOJI_MAP: Record<string, string> = {
  thumbsup: "\uD83D\uDC4D",
  heart: "\u2764\uFE0F",
  laugh: "\uD83D\uDE02",
  wow: "\uD83D\uDE2E",
  sad: "\uD83D\uDE22",
  angry: "\uD83D\uDE21",
  fire: "\uD83D\uDD25",
  rocket: "\uD83D\uDE80",
  eyes: "\uD83D\uDC40",
  clap: "\uD83D\uDC4F",
  thinking: "\uD83E\uDD14",
  party: "\uD83C\uDF89",
  "+1": "\uD83D\uDC4D",
  "-1": "\uD83D\uDC4E",
  tada: "\uD83C\uDF89",
};

function getEmoji(name: string): string {
  return EMOJI_MAP[name.toLowerCase()] || name;
}

// ============================================================================
// Custom Tooltip
// ============================================================================

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: {
      emoji: string;
      count: number;
      percentage: number;
      users: number;
    };
  }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-2 text-2xl">{getEmoji(data.emoji)}</p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Count:</span>
          <span className="font-medium">{data.count.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Share:</span>
          <span className="font-medium">{data.percentage.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Users:</span>
          <span className="font-medium">{data.users}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function ReactionChart({
  height = 300,
  variant = "bar",
  limit = 10,
  className,
}: ReactionChartProps) {
  const { reactions, isLoading } = useAnalyticsStore();

  // Transform data
  const chartData = React.useMemo(() => {
    if (!reactions || reactions.length === 0) return [];

    return reactions.slice(0, limit).map((reaction) => ({
      emoji: reaction.emoji,
      displayEmoji: getEmoji(reaction.emoji),
      count: reaction.count,
      percentage: reaction.percentage,
      users: reaction.users,
    }));
  }, [reactions, limit]);

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
        No reaction data available
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
              innerRadius={50}
              outerRadius={90}
              dataKey="count"
              nameKey="displayEmoji"
              label={({ displayEmoji, percentage }) =>
                `${displayEmoji} ${percentage.toFixed(0)}%`
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
            dataKey="displayEmoji"
            tick={{ fontSize: 20 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {chartData.map((_, index) => (
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

export default ReactionChart;
