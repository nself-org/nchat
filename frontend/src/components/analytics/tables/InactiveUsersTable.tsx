"use client";

/**
 * InactiveUsersTable - Table showing users who haven't been active recently
 */

import * as React from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Clock,
  MessageSquare,
  Mail,
  MoreHorizontal,
} from "lucide-react";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAnalyticsStore } from "@/stores/analytics-store";

// ============================================================================
// Types
// ============================================================================

interface InactiveUsersTableProps {
  limit?: number;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getInactivityLevel(days: number): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  if (days >= 90) return { label: "Critical", variant: "destructive" };
  if (days >= 60) return { label: "High", variant: "destructive" };
  if (days >= 30) return { label: "Medium", variant: "secondary" };
  return { label: "Low", variant: "outline" };
}

// ============================================================================
// Component
// ============================================================================

export function InactiveUsersTable({
  limit = 20,
  className,
}: InactiveUsersTableProps) {
  const { inactiveUsers, isLoading } = useAnalyticsStore();

  // Sort by days since active and limit
  const tableData = React.useMemo(() => {
    if (!inactiveUsers || inactiveUsers.length === 0) return [];

    return [...inactiveUsers]
      .sort((a, b) => b.daysSinceActive - a.daysSinceActive)
      .slice(0, limit);
  }, [inactiveUsers, limit]);

  // Calculate summary stats
  const summaryStats = React.useMemo(() => {
    if (tableData.length === 0) return null;

    const criticalCount = tableData.filter(
      (u) => u.daysSinceActive >= 90,
    ).length;
    const highCount = tableData.filter(
      (u) => u.daysSinceActive >= 60 && u.daysSinceActive < 90,
    ).length;
    const mediumCount = tableData.filter(
      (u) => u.daysSinceActive >= 30 && u.daysSinceActive < 60,
    ).length;

    return { criticalCount, highCount, mediumCount };
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
          "flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground",
          className,
        )}
      >
        <Clock className="h-8 w-8" />
        <span>No inactive users found</span>
        <span className="text-sm">All users are active - great!</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("w-full", className)}>
        {/* Summary Alert */}
        {summaryStats && summaryStats.criticalCount > 0 && (
          <div className="border-destructive/50 bg-destructive/10 mb-4 flex items-center gap-2 rounded-lg border p-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                {summaryStats.criticalCount} user
                {summaryStats.criticalCount > 1 ? "s" : ""} inactive for 90+
                days
              </p>
              <p className="text-xs text-muted-foreground">
                Consider reaching out to re-engage these users
              </p>
            </div>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right">Days Inactive</TableHead>
              <TableHead className="text-right">Total Messages</TableHead>
              <TableHead>Risk Level</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((user) => {
              const inactivityLevel = getInactivityLevel(user.daysSinceActive);

              return (
                <TableRow key={user.userId}>
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
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(user.lastActive), {
                            addSuffix: true,
                          })}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {format(new Date(user.lastActive), "PPpp")}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {user.daysSinceActive}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span>{user.totalMessages.toLocaleString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={inactivityLevel.variant}>
                      {inactivityLevel.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Mail className="mr-2 h-4 w-4" />
                          Send reminder email
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          View messages
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Summary footer */}
        {summaryStats && (
          <div className="mt-4 flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Badge
                variant="destructive"
                className="h-2 w-2 rounded-full p-0"
              />
              <span className="text-muted-foreground">
                Critical: {summaryStats.criticalCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="h-2 w-2 rounded-full p-0" />
              <span className="text-muted-foreground">
                High: {summaryStats.highCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="h-2 w-2 rounded-full p-0" />
              <span className="text-muted-foreground">
                Medium: {summaryStats.mediumCount}
              </span>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default InactiveUsersTable;
