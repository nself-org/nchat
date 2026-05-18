"use client";

/**
 * ResponseTimeChart - Shows response time metrics
 */

import * as React from "react";
import { format } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  ReferenceLine,
} from "recharts";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsStore } from "@/stores/analytics-store";

// ============================================================================
// Types
// ============================================================================

interface ResponseTimeChartProps {
  height?: number;
  variant?: "timeline" | "distribution" | "percentiles";
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

// ============================================================================
// Mock Data Generator
// ============================================================================

function generateMockResponseTimeData() {
  const now = new Date();
  const data = [];

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Simulate response times with some variation
    const baseTime = 120 + Math.random() * 60; // 2-3 minutes base
    const variation = Math.sin(i / 5) * 30; // Some wave pattern

    data.push({
      date: format(date, "MMM d"),
      average: Math.round(baseTime + variation),
      median: Math.round((baseTime + variation) * 0.8),
      p95: Math.round((baseTime + variation) * 2),
      p99: Math.round((baseTime + variation) * 3),
    });
  }

  return data;
}

function generateDistributionData() {
  // Response time buckets in seconds
  const buckets = [
    { range: "0-30s", min: 0, max: 30 },
    { range: "30s-1m", min: 30, max: 60 },
    { range: "1-2m", min: 60, max: 120 },
    { range: "2-5m", min: 120, max: 300 },
    { range: "5-10m", min: 300, max: 600 },
    { range: "10m+", min: 600, max: Infinity },
  ];

  // Simulate a distribution (most responses are quick)
  const total = 1000;
  const distribution = [350, 280, 200, 100, 50, 20];

  return buckets.map((bucket, index) => ({
    range: bucket.range,
    count: distribution[index],
    percentage: (distribution[index] / total) * 100,
  }));
}

// ============================================================================
// Custom Tooltips
// ============================================================================

interface TimelineTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

function TimelineTooltip({ active, payload, label }: TimelineTooltipProps) {
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
          <span className="font-medium">{formatDuration(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function ResponseTimeChart({
  height = 300,
  variant = "timeline",
  className,
}: ResponseTimeChartProps) {
  const { isLoading, summary } = useAnalyticsStore();

  // Generate mock data since we don't have real response time tracking
  const timelineData = React.useMemo(() => generateMockResponseTimeData(), []);
  const distributionData = React.useMemo(() => generateDistributionData(), []);

  // Calculate overall averages
  const averages = React.useMemo(() => {
    if (timelineData.length === 0) return null;

    const avgAverage =
      timelineData.reduce((sum, d) => sum + d.average, 0) / timelineData.length;
    const avgMedian =
      timelineData.reduce((sum, d) => sum + d.median, 0) / timelineData.length;
    const avgP95 =
      timelineData.reduce((sum, d) => sum + d.p95, 0) / timelineData.length;

    return { average: avgAverage, median: avgMedian, p95: avgP95 };
  }, [timelineData]);

  if (isLoading) {
    return (
      <div className={cn("w-full", className)} style={{ height }}>
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (variant === "distribution") {
    return (
      <div className={cn("w-full", className)} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distributionData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="range"
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
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-md">
                    <p className="font-medium">{data.range}</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Count:</span>
                        <span className="font-medium">{data.count}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">Share:</span>
                        <span className="font-medium">
                          {data.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="percentage" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (variant === "percentiles") {
    return (
      <div className={cn("w-full", className)} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
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
              tickFormatter={formatDuration}
            />
            <Tooltip content={<TimelineTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="p99"
              name="P99"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.1}
              stackId="1"
            />
            <Area
              type="monotone"
              dataKey="p95"
              name="P95"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.2}
              stackId="2"
            />
            <Area
              type="monotone"
              dataKey="median"
              name="Median"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.3}
              stackId="3"
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Percentile summary */}
        {averages && (
          <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="font-medium text-green-600">
                {formatDuration(averages.median)}
              </div>
              <div className="text-muted-foreground">Median</div>
            </div>
            <div>
              <div className="font-medium text-amber-600">
                {formatDuration(averages.p95)}
              </div>
              <div className="text-muted-foreground">P95</div>
            </div>
            <div>
              <div className="font-medium text-red-600">
                {formatDuration(averages.average)}
              </div>
              <div className="text-muted-foreground">Average</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default timeline variant
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={timelineData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
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
            tickFormatter={formatDuration}
          />
          <Tooltip content={<TimelineTooltip />} />
          <Legend />
          {averages && (
            <ReferenceLine
              y={averages.average}
              stroke="#9ca3af"
              strokeDasharray="5 5"
              label={{
                value: "Avg",
                position: "right",
                fill: "#9ca3af",
                fontSize: 12,
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="average"
            name="Average"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="median"
            name="Median"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ResponseTimeChart;
