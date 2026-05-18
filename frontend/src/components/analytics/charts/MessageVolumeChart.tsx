"use client";

/**
 * MessageVolumeChart - Shows message volume over time
 */

import * as React from "react";
import { format } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsStore } from "@/stores/analytics-store";

// ============================================================================
// Types
// ============================================================================

interface MessageVolumeChartProps {
  height?: number;
  stacked?: boolean;
  showGrid?: boolean;
  className?: string;
}

// ============================================================================
// Custom Tooltip
// ============================================================================

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-2 font-medium">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function MessageVolumeChart({
  height = 300,
  stacked = false,
  showGrid = true,
  className,
}: MessageVolumeChartProps) {
  const { messageVolume, isLoading, selectedChartType } = useAnalyticsStore();

  // Transform data for chart
  const chartData = React.useMemo(() => {
    if (!messageVolume || messageVolume.length === 0) return [];

    return messageVolume.map((d) => ({
      date: format(new Date(d.timestamp), "MMM d"),
      fullDate: format(new Date(d.timestamp), "MMM d, yyyy"),
      messages: d.count,
      ...(stacked && d.channelBreakdown
        ? Object.entries(d.channelBreakdown).reduce(
            (acc, [channel, count]) => ({
              ...acc,
              [channel]: count,
            }),
            {},
          )
        : {}),
    }));
  }, [messageVolume, stacked]);

  // Get channel names for stacked chart
  const channelNames = React.useMemo(() => {
    if (!stacked || !messageVolume || messageVolume.length === 0) return [];
    const allChannels = new Set<string>();
    messageVolume.forEach((d) => {
      if (d.channelBreakdown) {
        Object.keys(d.channelBreakdown).forEach((c) => allChannels.add(c));
      }
    });
    return Array.from(allChannels);
  }, [messageVolume, stacked]);

  const colors = [
    "#6366f1", // indigo
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ec4899", // pink
    "#8b5cf6", // violet
    "#14b8a6", // teal
    "#f97316", // orange
    "#06b6d4", // cyan
  ];

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
        No message data available
      </div>
    );
  }

  const ChartComponent =
    selectedChartType === "bar"
      ? BarChart
      : selectedChartType === "line"
        ? LineChart
        : AreaChart;

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={chartData}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          )}
          <XAxis
            dataKey="date"
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
            tickFormatter={(value) =>
              value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value
            }
          />
          <Tooltip content={<CustomTooltip />} />
          {stacked && channelNames.length > 0 ? (
            <>
              <Legend />
              {channelNames.map((channel, index) => {
                const color = colors[index % colors.length];
                if (selectedChartType === "bar") {
                  return (
                    <Bar
                      key={channel}
                      dataKey={channel}
                      stackId="stack"
                      fill={color}
                      radius={
                        index === channelNames.length - 1 ? [4, 4, 0, 0] : 0
                      }
                    />
                  );
                }
                return (
                  <Area
                    key={channel}
                    type="monotone"
                    dataKey={channel}
                    stackId="stack"
                    stroke={color}
                    fill={color}
                    fillOpacity={0.6}
                  />
                );
              })}
            </>
          ) : (
            <>
              {selectedChartType === "bar" ? (
                <Bar dataKey="messages" fill="#6366f1" radius={[4, 4, 0, 0]} />
              ) : selectedChartType === "line" ? (
                <Line
                  type="monotone"
                  dataKey="messages"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ) : (
                <Area
                  type="monotone"
                  dataKey="messages"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.2}
                />
              )}
            </>
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}

export default MessageVolumeChart;
