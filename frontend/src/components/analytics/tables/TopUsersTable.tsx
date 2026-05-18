"use client";

/**
 * TopUsersTable - Table showing most active users
 */

import * as React from "react";
import { format } from "date-fns";
import {
  MessageSquare,
  Heart,
  FileText,
  MessagesSquare,
  Crown,
  Medal,
  Award,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface TopUsersTableProps {
  limit?: number;
  sortBy?: "messages" | "reactions" | "engagement";
  showDetails?: boolean;
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

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Crown className="h-4 w-4 text-yellow-500" />;
    case 2:
      return <Medal className="h-4 w-4 text-gray-400" />;
    case 3:
      return <Award className="h-4 w-4 text-amber-600" />;
    default:
      return null;
  }
}

function getEngagementLevel(score: number): { label: string; color: string } {
  if (score >= 500) return { label: "Very High", color: "text-green-600" };
  if (score >= 200) return { label: "High", color: "text-emerald-600" };
  if (score >= 100) return { label: "Medium", color: "text-amber-600" };
  if (score >= 50) return { label: "Low", color: "text-orange-600" };
  return { label: "Very Low", color: "text-red-600" };
}

// ============================================================================
// Component
// ============================================================================

export function TopUsersTable({
  limit = 10,
  sortBy = "engagement",
  showDetails = true,
  className,
}: TopUsersTableProps) {
  const { userActivity, isLoading } = useAnalyticsStore();

  // Sort and limit data
  const tableData = React.useMemo(() => {
    if (!userActivity || userActivity.length === 0) return [];

    return [...userActivity]
      .sort((a, b) => {
        switch (sortBy) {
          case "messages":
            return b.messageCount - a.messageCount;
          case "reactions":
            return b.reactionCount - a.reactionCount;
          default:
            return b.engagementScore - a.engagementScore;
        }
      })
      .slice(0, limit);
  }, [userActivity, sortBy, limit]);

  // Calculate max engagement for progress bars
  const maxEngagement = React.useMemo(() => {
    if (tableData.length === 0) return 1;
    return Math.max(...tableData.map((u) => u.engagementScore));
  }, [tableData]);

  if (isLoading) {
    return (
      <div className={cn("w-full", className)}>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-full" />
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
        No user data available
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("w-full", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">#</TableHead>
              <TableHead>User</TableHead>
              {showDetails && (
                <>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead className="text-right">Reactions</TableHead>
                  <TableHead className="text-right">Files</TableHead>
                </>
              )}
              <TableHead className="text-right">Engagement</TableHead>
              <TableHead className="w-[100px]">Activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((user, index) => {
              const engagement = getEngagementLevel(user.engagementScore);
              const rank = index + 1;

              return (
                <TableRow key={user.userId}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {getRankIcon(rank)}
                      {!getRankIcon(rank) && (
                        <span className="font-medium text-muted-foreground">
                          {rank}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={user.avatarUrl}
                          alt={user.displayName}
                        />
                        <AvatarFallback className="text-xs">
                          {getInitials(user.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.displayName}</div>
                        <div className="text-xs text-muted-foreground">
                          @{user.username}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  {showDetails && (
                    <>
                      <TableCell className="text-right">
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center justify-end gap-1">
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              <span>{formatNumber(user.messageCount)}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {user.messageCount.toLocaleString()} messages sent
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-right">
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center justify-end gap-1">
                              <Heart className="h-4 w-4 text-muted-foreground" />
                              <span>{formatNumber(user.reactionCount)}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {user.reactionCount.toLocaleString()} reactions
                            given
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-right">
                        <Tooltip>
                          <TooltipTrigger>
                            <div className="flex items-center justify-end gap-1">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span>{formatNumber(user.fileCount)}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {user.fileCount.toLocaleString()} files uploaded
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </>
                  )}
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={cn("font-medium", engagement.color)}
                    >
                      {engagement.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Progress
                      value={(user.engagementScore / maxEngagement) * 100}
                      className="h-2"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Last active summary */}
        {tableData.length > 0 && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Showing top {tableData.length} users by{" "}
            {sortBy === "messages"
              ? "message count"
              : sortBy === "reactions"
                ? "reaction count"
                : "engagement score"}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default TopUsersTable;
