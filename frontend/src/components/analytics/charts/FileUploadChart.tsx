"use client";

/**
 * FileUploadChart - Shows file upload statistics
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
  PieChart,
  Pie,
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

interface FileUploadChartProps {
  height?: number;
  variant?: "timeline" | "types" | "combined";
  className?: string;
}

// ============================================================================
// Colors
// ============================================================================

const TYPE_COLORS: Record<string, string> = {
  Images: "#10b981",
  Documents: "#3b82f6",
  Videos: "#f59e0b",
  Audio: "#8b5cf6",
  Spreadsheets: "#14b8a6",
  Presentations: "#ec4899",
  Archives: "#6366f1",
  Other: "#9ca3af",
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes >= 1073741824) {
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  }
  if (bytes >= 1048576) {
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

// ============================================================================
// Custom Tooltips
// ============================================================================

interface TimelineTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      date: string;
      count: number;
      totalSize: number;
    };
  }>;
}

function TimelineTooltip({ active, payload }: TimelineTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-2 font-medium">{data.date}</p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Files:</span>
          <span className="font-medium">{data.count.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Size:</span>
          <span className="font-medium">{formatFileSize(data.totalSize)}</span>
        </div>
      </div>
    </div>
  );
}

interface TypeTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      name: string;
      value: number;
      percentage: number;
    };
  }>;
}

function TypeTooltip({ active, payload }: TypeTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="mb-2 font-medium">{data.name}</p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Files:</span>
          <span className="font-medium">{data.value.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Share:</span>
          <span className="font-medium">{data.percentage.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function FileUploadChart({
  height = 300,
  variant = "timeline",
  className,
}: FileUploadChartProps) {
  const { fileUploads, isLoading } = useAnalyticsStore();

  // Timeline data
  const timelineData = React.useMemo(() => {
    if (!fileUploads || fileUploads.length === 0) return [];

    return fileUploads.map((upload) => ({
      date: format(new Date(upload.timestamp), "MMM d"),
      count: upload.count,
      totalSize: upload.totalSize,
    }));
  }, [fileUploads]);

  // File type breakdown
  const typeData = React.useMemo(() => {
    if (!fileUploads || fileUploads.length === 0) return [];

    const aggregated: Record<string, number> = {};

    fileUploads.forEach((upload) => {
      Object.entries(upload.fileTypes).forEach(([type, count]) => {
        aggregated[type] = (aggregated[type] || 0) + count;
      });
    });

    const total = Object.values(aggregated).reduce(
      (sum, count) => sum + count,
      0,
    );

    return Object.entries(aggregated)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0,
        color: TYPE_COLORS[name] || TYPE_COLORS.Other,
      }))
      .sort((a, b) => b.value - a.value);
  }, [fileUploads]);

  if (isLoading) {
    return (
      <div className={cn("w-full", className)} style={{ height }}>
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (fileUploads.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-muted-foreground",
          className,
        )}
        style={{ height }}
      >
        No file upload data available
      </div>
    );
  }

  if (variant === "types") {
    return (
      <div className={cn("w-full", className)} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={typeData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              dataKey="value"
              nameKey="name"
              label={({ name, percentage }) =>
                percentage > 5 ? `${name} ${percentage.toFixed(0)}%` : ""
              }
              labelLine={false}
            >
              {typeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<TypeTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (variant === "combined") {
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
              tickFormatter={(value) => formatFileSize(value)}
            />
            <Tooltip content={<TimelineTooltip />} />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="count"
              name="Files"
              fill="#6366f1"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="totalSize"
              name="Total Size"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Default timeline variant
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
          />
          <Tooltip content={<TimelineTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            name="Files Uploaded"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default FileUploadChart;
