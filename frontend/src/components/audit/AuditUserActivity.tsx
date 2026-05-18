"use client";

/**
 * AuditUserActivity - User activity log component
 */

import { useState, useMemo } from "react";
import {
  User,
  Calendar,
  Clock,
  Activity,
  Filter,
  ChevronDown,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  AuditLogEntry,
  AuditCategory,
  AuditActor,
} from "@/lib/audit/audit-types";
import {
  formatTimestamp,
  getCategoryBadgeClass,
} from "@/lib/audit/audit-formatter";
import {
  getActionDisplayName,
  getActionsByCategory,
} from "@/lib/audit/audit-events";
import { AuditTimeline } from "./AuditTimeline";
import { AuditEventCard } from "./AuditEventCard";

// ============================================================================
// Types
// ============================================================================

interface AuditUserActivityProps {
  userId: string;
  userInfo?: {
    displayName?: string;
    username?: string;
    email?: string;
    avatarUrl?: string;
  };
  entries: AuditLogEntry[];
  onEntryClick?: (entry: AuditLogEntry) => void;
  className?: string;
}

interface ActivitySummary {
  totalEvents: number;
  successRate: number;
  mostActiveCategory: AuditCategory | null;
  lastActivity: Date | null;
  eventsByCategory: Record<AuditCategory, number>;
  eventsByDay: { date: string; count: number }[];
}

// ============================================================================
// Helpers
// ============================================================================

function calculateActivitySummary(entries: AuditLogEntry[]): ActivitySummary {
  const eventsByCategory: Record<AuditCategory, number> = {
    user: 0,
    message: 0,
    channel: 0,
    file: 0,
    attachment: 0,
    moderation: 0,
    admin: 0,
    security: 0,
    integration: 0,
  };

  const eventsByDayMap = new Map<string, number>();
  let successCount = 0;

  entries.forEach((entry) => {
    eventsByCategory[entry.category]++;
    if (entry.success) successCount++;

    const date = new Date(entry.timestamp).toISOString().split("T")[0];
    eventsByDayMap.set(date, (eventsByDayMap.get(date) || 0) + 1);
  });

  const mostActiveCategory =
    (Object.entries(eventsByCategory) as [AuditCategory, number][])
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

  const eventsByDay = Array.from(eventsByDayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);

  return {
    totalEvents: entries.length,
    successRate: entries.length > 0 ? (successCount / entries.length) * 100 : 0,
    mostActiveCategory,
    lastActivity: entries.length > 0 ? new Date(entries[0].timestamp) : null,
    eventsByCategory,
    eventsByDay,
  };
}

// ============================================================================
// Component
// ============================================================================

export function AuditUserActivity({
  userId,
  userInfo,
  entries,
  onEntryClick,
  className,
}: AuditUserActivityProps) {
  const [viewMode, setViewMode] = useState<"timeline" | "cards">("timeline");
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory | "all">(
    "all",
  );
  const [timeRange, setTimeRange] = useState<
    "today" | "week" | "month" | "all"
  >("all");

  const filteredEntries = useMemo(() => {
    let result = entries;

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((e) => e.category === categoryFilter);
    }

    // Time range filter
    if (timeRange !== "all") {
      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "week":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "month":
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          startDate = new Date(0);
      }

      result = result.filter((e) => new Date(e.timestamp) >= startDate);
    }

    return result;
  }, [entries, categoryFilter, timeRange]);

  const summary = useMemo(() => calculateActivitySummary(entries), [entries]);

  const displayName =
    userInfo?.displayName || userInfo?.username || userInfo?.email || userId;

  return (
    <div className={cn("space-y-6", className)}>
      {/* User Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={userInfo?.avatarUrl} />
              <AvatarFallback className="text-xl">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{displayName}</h2>
              {userInfo?.email && userInfo.email !== displayName && (
                <p className="text-sm text-muted-foreground">
                  {userInfo.email}
                </p>
              )}
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {userId}
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div className="flex items-center justify-end gap-1">
                <Clock className="h-4 w-4" />
                Last activity
              </div>
              <p className="font-medium text-foreground">
                {summary.lastActivity
                  ? formatTimestamp(summary.lastActivity, "relative")
                  : "No activity"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Events</p>
            <p className="text-2xl font-bold">{summary.totalEvents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Success Rate</p>
            <p className="text-2xl font-bold">
              {summary.successRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Most Active</p>
            <p className="text-2xl font-bold capitalize">
              {summary.mostActiveCategory || "N/A"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="text-2xl font-bold">
              {summary.eventsByDay.find(
                (d) => d.date === new Date().toISOString().split("T")[0],
              )?.count || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Activity by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(
              Object.entries(summary.eventsByCategory) as [
                AuditCategory,
                number,
              ][]
            )
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) => (
                <Badge
                  key={category}
                  variant="outline"
                  className={cn(
                    "px-3 py-1 text-sm",
                    getCategoryBadgeClass(category),
                  )}
                >
                  <span className="capitalize">{category}</span>
                  <span className="ml-2 font-bold">{count}</span>
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters and View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select
            value={categoryFilter}
            onValueChange={(v) => setCategoryFilter(v as AuditCategory | "all")}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="message">Message</SelectItem>
              <SelectItem value="channel">Channel</SelectItem>
              <SelectItem value="file">File</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="integration">Integration</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={timeRange}
            onValueChange={(v) => setTimeRange(v as typeof timeRange)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button
            variant={viewMode === "timeline" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("timeline")}
          >
            Timeline
          </Button>
          <Button
            variant={viewMode === "cards" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("cards")}
          >
            Cards
          </Button>
        </div>
      </div>

      {/* Activity List */}
      {filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Activity className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>No activity found for the selected filters</p>
          </CardContent>
        </Card>
      ) : viewMode === "timeline" ? (
        <AuditTimeline
          entries={filteredEntries}
          onEntryClick={onEntryClick}
          groupByDate
          maxHeight="500px"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredEntries.map((entry) => (
            <AuditEventCard
              key={entry.id}
              entry={entry}
              onClick={() => onEntryClick?.(entry)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
