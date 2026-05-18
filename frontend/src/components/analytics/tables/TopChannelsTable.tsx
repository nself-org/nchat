"use client";

/**
 * TopChannelsTable - Table showing most active channels
 */

import * as React from "react";
import {
  Hash,
  Lock,
  MessageSquare,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useAnalyticsStore } from "@/stores/analytics-store";

// ============================================================================
// Types
// ============================================================================

interface TopChannelsTableProps {
  limit?: number;
  sortBy?: "messages" | "members" | "engagement";
  showEngagement?: boolean;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatNumber(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

function getChannelIcon(type: string) {
  switch (type) {
    case "private":
      return <Lock className="h-4 w-4 text-muted-foreground" />;
    case "direct":
      return <Users className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Hash className="h-4 w-4 text-muted-foreground" />;
  }
}

function getTrendIcon(rate: number) {
  if (rate > 5) return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (rate < -5) return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

// ============================================================================
// Component
// ============================================================================

export function TopChannelsTable({
  limit = 10,
  sortBy = "messages",
  showEngagement = true,
  className,
}: TopChannelsTableProps) {
  const { channelActivity, isLoading } = useAnalyticsStore();

  // Sort and limit data
  const tableData = React.useMemo(() => {
    if (!channelActivity || channelActivity.length === 0) return [];

    return [...channelActivity]
      .sort((a, b) => {
        switch (sortBy) {
          case "members":
            return b.memberCount - a.memberCount;
          case "engagement":
            return b.engagementRate - a.engagementRate;
          default:
            return b.messageCount - a.messageCount;
        }
      })
      .slice(0, limit);
  }, [channelActivity, sortBy, limit]);

  // Calculate max values for progress bars
  const maxMessages = React.useMemo(() => {
    if (tableData.length === 0) return 1;
    return Math.max(...tableData.map((c) => c.messageCount));
  }, [tableData]);

  if (isLoading) {
    return (
      <div className={cn("w-full", className)}>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tableData.length === 0) {
    return (
      <div
        className={cn(
          "flex h-40 items-center justify-center text-muted-foreground",
          className,
        )}
      >
        No channel data available
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">#</TableHead>
            <TableHead>Channel</TableHead>
            <TableHead className="text-right">Messages</TableHead>
            <TableHead className="text-right">Members</TableHead>
            {showEngagement && (
              <TableHead className="text-right">Engagement</TableHead>
            )}
            <TableHead className="w-[100px]">Activity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableData.map((channel, index) => (
            <TableRow key={channel.channelId}>
              <TableCell className="font-medium text-muted-foreground">
                {index + 1}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getChannelIcon(channel.channelType)}
                  <span className="font-medium">{channel.channelName}</span>
                  {channel.channelType === "private" && (
                    <Badge variant="outline" className="text-xs">
                      Private
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span>{formatNumber(channel.messageCount)}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{channel.memberCount}</span>
                </div>
              </TableCell>
              {showEngagement && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {getTrendIcon(channel.growthRate)}
                    <span
                      className={cn(
                        "font-medium",
                        channel.engagementRate > 50
                          ? "text-green-600"
                          : channel.engagementRate > 20
                            ? "text-amber-600"
                            : "text-red-600",
                      )}
                    >
                      {channel.engagementRate.toFixed(0)}%
                    </span>
                  </div>
                </TableCell>
              )}
              <TableCell>
                <Progress
                  value={(channel.messageCount / maxMessages) * 100}
                  className="h-2"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default TopChannelsTable;
