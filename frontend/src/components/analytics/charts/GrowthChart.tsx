"use client";

/**
 * GrowthChart - Shows user/channel growth over time
 */

import * as React from "react";
import { format } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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

interface GrowthChartProps {
  height?: number;
  variant?: "cumulative" | "net" | "combined";
  showTarget?: boolean;
  targetValue?: number;
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
          <span className="font-medium">
            {entry.name === "Growth Rate"
              ? `${entry.value.toFixed(1)}%`
              : entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function GrowthChart({
  height = 250,
  variant = "cumulative",
  showTarget = false,
  targetValue,
  className,
}: GrowthChartProps) {
  const { userGrowth, isLoading } = useAnalyticsStore();

  // Transform data for chart
  const chartData = React.useMemo(() => {
    if (!userGrowth || userGrowth.length === 0) return [];

    return userGrowth.map((d, index) => {
      const prevTotal =
        index > 0 ? userGrowth[index - 1].totalUsers : d.totalUsers;
      const growthRate =
        prevTotal > 0 ? ((d.totalUsers - prevTotal) / prevTotal) * 100 : 0;

      return {
        date: format(new Date(d.timestamp), "MMM d"),
        totalUsers: d.totalUsers,
        newUsers: d.newUsers,
        churnedUsers: d.churnedUsers,
        netGrowth: d.netGrowth,
        growthRate,
      };
    });
  }, [userGrowth]);

  // Calculate summary stats
  const summaryStats = React.useMemo(() => {
    if (chartData.length === 0) return null;

    const totalNew = chartData.reduce((sum, d) => sum + d.newUsers, 0);
    const totalChurned = chartData.reduce((sum, d) => sum + d.churnedUsers, 0);
    const netGrowth = totalNew - totalChurned;
    const avgGrowthRate =
      chartData.reduce((sum, d) => sum + d.growthRate, 0) / chartData.length;

    return {
      totalNew,
      totalChurned,
      netGrowth,
      avgGrowthRate,
      startUsers: chartData[0].totalUsers,
      endUsers: chartData[chartData.length - 1].totalUsers,
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
        No growth data available
      </div>
    );
  }

  if (variant === "net") {
    return (
      <div className={cn("w-full", className)} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
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
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <ReferenceLine y={0} stroke="#9ca3af" />
            <Bar
              dataKey="newUsers"
              name="New Users"
              fill="#10b981"
              stackId="stack"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="churnedUsers"
              name="Churned"
              fill="#ef4444"
              stackId="stack2"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Summary stats */}
        {summaryStats && (
          <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="font-medium text-green-600">
                +{summaryStats.totalNew}
              </div>
              <div className="text-muted-foreground">New users</div>
            </div>
            <div>
              <div className="font-medium text-red-600">
                -{summaryStats.totalChurned}
              </div>
              <div className="text-muted-foreground">Churned</div>
            </div>
            <div>
              <div
                className={cn(
                  "font-medium",
                  summaryStats.netGrowth >= 0
                    ? "text-green-600"
                    : "text-red-600",
                )}
              >
                {summaryStats.netGrowth >= 0 ? "+" : ""}
                {summaryStats.netGrowth}
              </div>
              <div className="text-muted-foreground">Net growth</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (variant === "combined") {
    return (
      <div className={cn("w-full", className)} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {showTarget && targetValue && (
              <ReferenceLine
                yAxisId="left"
                y={targetValue}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                label={{
                  value: "Target",
                  position: "right",
                  fill: "#f59e0b",
                  fontSize: 12,
                }}
              />
            )}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="totalUsers"
              name="Total Users"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.2}
            />
            <Bar
              yAxisId="left"
              dataKey="newUsers"
              name="New Users"
              fill="#10b981"
              opacity={0.8}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="growthRate"
              name="Growth Rate"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Default cumulative variant
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
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
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {showTarget && targetValue && (
            <ReferenceLine
              y={targetValue}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              label={{
                value: "Target",
                position: "right",
                fill: "#f59e0b",
                fontSize: 12,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="totalUsers"
            name="Total Users"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.2}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Growth summary */}
      {summaryStats && (
        <div className="mt-4 flex justify-center gap-8 text-sm">
          <div className="text-center">
            <div className="font-medium">
              {summaryStats.startUsers} → {summaryStats.endUsers}
            </div>
            <div className="text-muted-foreground">User count</div>
          </div>
          <div className="text-center">
            <div
              className={cn(
                "font-medium",
                summaryStats.avgGrowthRate >= 0
                  ? "text-green-600"
                  : "text-red-600",
              )}
            >
              {summaryStats.avgGrowthRate >= 0 ? "+" : ""}
              {summaryStats.avgGrowthRate.toFixed(1)}%
            </div>
            <div className="text-muted-foreground">Avg. growth</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GrowthChart;
