"use client";

/**
 * TopMessagesTable - Table showing most reacted/popular messages
 */

import * as React from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Hash, Heart, MessageSquare, ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useAnalyticsStore } from "@/stores/analytics-store";

// ============================================================================
// Types
// ============================================================================

interface TopMessagesTableProps {
  limit?: number;
  sortBy?: "reactions" | "replies";
  maxContentLength?: number;
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength).trim() + "...";
}

// ============================================================================
// Component
// ============================================================================

export function TopMessagesTable({
  limit = 10,
  sortBy = "reactions",
  maxContentLength = 100,
  className,
}: TopMessagesTableProps) {
  const { topMessages, isLoading } = useAnalyticsStore();

  // Sort and limit data
  const tableData = React.useMemo(() => {
    if (!topMessages || topMessages.length === 0) return [];

    return [...topMessages]
      .sort((a, b) => {
        if (sortBy === "replies") {
          return b.replyCount - a.replyCount;
        }
        return b.reactionCount - a.reactionCount;
      })
      .slice(0, limit);
  }, [topMessages, sortBy, limit]);

  if (isLoading) {
    return (
      <div className={cn("w-full", className)}>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-12 w-full" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
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
        No message data available
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("w-full space-y-4", className)}>
        {tableData.map((message, index) => (
          <div
            key={message.messageId}
            className="hover:bg-muted/50 rounded-lg border bg-card p-4 transition-colors"
          >
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium text-primary">
                  {index + 1}
                </div>
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={message.authorAvatar}
                    alt={message.authorName}
                  />
                  <AvatarFallback className="text-xs">
                    {getInitials(message.authorName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span className="font-medium">{message.authorName}</span>
                  <span className="mx-2 text-muted-foreground">in</span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Hash className="h-3 w-3" />
                    {message.channelName}
                  </span>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(message.timestamp), {
                      addSuffix: true,
                    })}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {format(new Date(message.timestamp), "PPpp")}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Content */}
            <p className="mb-3 text-sm">
              {truncateContent(message.content, maxContentLength)}
            </p>

            {/* Stats */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="gap-1">
                      <Heart className="h-3 w-3" />
                      {formatNumber(message.reactionCount)}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    {message.reactionCount.toLocaleString()} reactions
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {formatNumber(message.replyCount)}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    {message.replyCount.toLocaleString()} replies
                  </TooltipContent>
                </Tooltip>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                View message
                <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}

        {/* Summary */}
        <div className="text-center text-sm text-muted-foreground">
          Showing top {tableData.length} messages by{" "}
          {sortBy === "reactions" ? "reaction count" : "reply count"}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default TopMessagesTable;
