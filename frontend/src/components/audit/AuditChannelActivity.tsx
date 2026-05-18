"use client";

/**
 * AuditChannelActivity - Channel activity log component
 */

import { useState, useMemo } from "react";
import { Hash, Users, Clock, Activity, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { AuditLogEntry, AuditAction } from "@/lib/audit/audit-types";
import { formatTimestamp } from "@/lib/audit/audit-formatter";
import { getActionDisplayName } from "@/lib/audit/audit-events";
import { AuditTimeline } from "./AuditTimeline";
import { AuditEventCard } from "./AuditEventCard";

// ============================================================================
// Types
// ============================================================================

interface AuditChannelActivityProps {
  channelId: string;
  channelInfo?: {
    name?: string;
    description?: string;
    isPrivate?: boolean;
    memberCount?: number;
  };
  entries: AuditLogEntry[];
  onEntryClick?: (entry: AuditLogEntry) => void;
  className?: string;
}

interface ChannelActivitySummary {
  totalEvents: number;
  messagesCreated: number;
  messagesEdited: number;
  messagesDeleted: number;
  membersAdded: number;
  membersRemoved: number;
  uniqueActors: number;
  topActors: { id: string; name: string; count: number }[];
  lastActivity: Date | null;
}

// ============================================================================
// Helpers
// ============================================================================

function calculateChannelSummary(
  entries: AuditLogEntry[],
): ChannelActivitySummary {
  let messagesCreated = 0;
  let messagesEdited = 0;
  let messagesDeleted = 0;
  let membersAdded = 0;
  let membersRemoved = 0;

  const actorCounts = new Map<string, { name: string; count: number }>();

  entries.forEach((entry) => {
    // Count by action
    switch (entry.action) {
      case "create":
        if (entry.category === "message") messagesCreated++;
        break;
      case "edit":
        if (entry.category === "message") messagesEdited++;
        break;
      case "delete":
        if (entry.category === "message") messagesDeleted++;
        break;
      case "member_add":
        membersAdded++;
        break;
      case "member_remove":
        membersRemoved++;
        break;
    }

    // Count actors
    const actorId = entry.actor.id;
    const actorName =
      entry.actor.displayName || entry.actor.username || entry.actor.id;
    const existing = actorCounts.get(actorId);
    if (existing) {
      existing.count++;
    } else {
      actorCounts.set(actorId, { name: actorName, count: 1 });
    }
  });

  const topActors = Array.from(actorCounts.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalEvents: entries.length,
    messagesCreated,
    messagesEdited,
    messagesDeleted,
    membersAdded,
    membersRemoved,
    uniqueActors: actorCounts.size,
    topActors,
    lastActivity: entries.length > 0 ? new Date(entries[0].timestamp) : null,
  };
}

// ============================================================================
// Component
// ============================================================================

export function AuditChannelActivity({
  channelId,
  channelInfo,
  entries,
  onEntryClick,
  className,
}: AuditChannelActivityProps) {
  const [viewMode, setViewMode] = useState<"timeline" | "cards">("timeline");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<
    "today" | "week" | "month" | "all"
  >("all");

  const filteredEntries = useMemo(() => {
    let result = entries;

    // Action filter
    if (actionFilter !== "all") {
      result = result.filter((e) => e.action === actionFilter);
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
  }, [entries, actionFilter, timeRange]);

  const summary = useMemo(() => calculateChannelSummary(entries), [entries]);

  const channelName = channelInfo?.name || channelId;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Channel Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-lg">
              <Hash className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{channelName}</h2>
                {channelInfo?.isPrivate && (
                  <Badge variant="secondary">Private</Badge>
                )}
              </div>
              {channelInfo?.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {channelInfo.description}
                </p>
              )}
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {channelId}
              </p>
            </div>
            <div className="text-right">
              {channelInfo?.memberCount !== undefined && (
                <div className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {channelInfo.memberCount} members
                </div>
              )}
              <div className="mt-1 flex items-center justify-end gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Last activity
              </div>
              <p className="font-medium">
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
            <p className="text-sm text-muted-foreground">Messages Created</p>
            <p className="text-2xl font-bold">{summary.messagesCreated}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Unique Users</p>
            <p className="text-2xl font-bold">{summary.uniqueActors}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Member Changes</p>
            <p className="text-2xl font-bold">
              +{summary.membersAdded} / -{summary.membersRemoved}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Contributors */}
      {summary.topActors.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Top Contributors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {summary.topActors.map((actor, index) => (
                <div
                  key={actor.id}
                  className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2"
                >
                  <span className="text-sm font-medium text-muted-foreground">
                    #{index + 1}
                  </span>
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {actor.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{actor.name}</span>
                  <Badge variant="secondary">{actor.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="create">Created</SelectItem>
              <SelectItem value="edit">Edited</SelectItem>
              <SelectItem value="delete">Deleted</SelectItem>
              <SelectItem value="member_add">Member Added</SelectItem>
              <SelectItem value="member_remove">Member Removed</SelectItem>
              <SelectItem value="topic_change">Topic Changed</SelectItem>
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
