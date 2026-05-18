"use client";

/**
 * PeakHoursChart - Shows activity by hour of day
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
  Legend,
  ComposedChart,
  Line,
} from "recharts";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsStore } from "@/stores/analytics-store";

// ============================================================================
// Types
// ============================================================================

interface PeakHoursChartProps {
  height?: number;
  variant?: "bar" | "heatmap";
  showActiveUsers?: boolean;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}${period}`;
}

function getActivityColor(value: number, max: number): string {
  const intensity = value / max;
  if (intensity > 0.8) return "#6366f1"; // High activity - indigo
  if (intensity > 0.6) return "#818cf8"; // Medium-high
  if (intensity > 0.4) return "#a5b4fc"; // Medium
  if (intensity > 0.2) return "#c7d2fe"; // Low-medium
  return "#e0e7ff"; // Low activity
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

  const hour = parseInt(label || "0", 10);

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-2 font-medium">{formatHour(hour)}</p>
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

export function PeakHoursChart({
  height = 250,
  variant = "bar",
  showActiveUsers = true,
  className,
}: PeakHoursChartProps) {
  const { peakHours, isLoading } = useAnalyticsStore();

  // Transform data for chart
  const chartData = React.useMemo(() => {
    if (!peakHours || peakHours.length === 0) return [];

    return peakHours.map((d) => ({
      hour: d.hour,
      hourLabel: formatHour(d.hour),
      messages: d.messageCount,
      users: d.activeUsers,
    }));
  }, [peakHours]);

  // Find peak hour
  const peakInfo = React.useMemo(() => {
    if (chartData.length === 0) return null;

    const maxMessages = Math.max(...chartData.map((d) => d.messages));
    const peakHour = chartData.find((d) => d.messages === maxMessages);

    const minMessages = Math.min(...chartData.map((d) => d.messages));
    const quietHour = chartData.find((d) => d.messages === minMessages);

    return {
      peak: peakHour,
      quiet: quietHour,
      maxMessages,
    };
  }, [chartData]);

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
        No activity data available
      </div>
    );
  }

  if (variant === "heatmap") {
    // Render as a heatmap-style grid
    const maxMessages = Math.max(...chartData.map((d) => d.messages));

    return (
      <div className={cn("w-full", className)}>
        <div className="mb-4 grid grid-cols-12 gap-1">
          {chartData.map((d) => (
            <div
              key={d.hour}
              className="flex aspect-square cursor-default items-center justify-center rounded-sm text-xs font-medium transition-colors"
              style={{
                backgroundColor: getActivityColor(d.messages, maxMessages),
                color: d.messages / maxMessages > 0.6 ? "white" : "inherit",
              }}
              title={`${d.hourLabel}: ${d.messages} messages`}
            >
              {d.hour}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Low</span>
          <div className="flex gap-0.5">
            {["#e0e7ff", "#c7d2fe", "#a5b4fc", "#818cf8", "#6366f1"].map(
              (color) => (
                <div
                  key={color}
                  className="h-4 w-4 rounded-sm"
                  style={{ backgroundColor: color }}
                />
              ),
            )}
          </div>
          <span>High</span>
        </div>

        {/* Peak/Quiet info */}
        {peakInfo && (
          <div className="mt-4 flex justify-center gap-8 text-sm">
            <div className="text-center">
              <div className="font-medium text-green-600">
                {peakInfo.peak?.hourLabel}
              </div>
              <div className="text-muted-foreground">Peak hour</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-amber-600">
                {peakInfo.quiet?.hourLabel}
              </div>
              <div className="text-muted-foreground">Quiet hour</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default bar chart variant
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="hourLabel"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            className="fill-muted-foreground"
            interval={1}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="fill-muted-foreground"
          />
          {showActiveUsers && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="messages"
            name="Messages"
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getActivityColor(
                  entry.messages,
                  peakInfo?.maxMessages || 1,
                )}
              />
            ))}
          </Bar>
          {showActiveUsers && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="users"
              name="Active Users"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Peak hour indicator */}
      {peakInfo && (
        <div className="mt-4 flex justify-center gap-8 text-sm">
          <div className="text-center">
            <div className="font-medium text-indigo-600">
              {peakInfo.peak?.hourLabel}
            </div>
            <div className="text-muted-foreground">
              Peak ({peakInfo.peak?.messages.toLocaleString()} messages)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PeakHoursChart;
