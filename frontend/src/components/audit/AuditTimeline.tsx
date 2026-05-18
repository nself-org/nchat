"use client";

/**
 * AuditTimeline - Timeline view of audit events
 */

import {
  User,
  MessageSquare,
  Hash,
  File,
  Shield,
  Lock,
  Puzzle,
  Check,
  X,
  Clock,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import type { AuditLogEntry, AuditCategory } from "@/lib/audit/audit-types";
import {
  formatTimestamp,
  getCategoryBadgeClass,
  getSeverityBadgeClass,
} from "@/lib/audit/audit-formatter";
import { getActionDisplayName } from "@/lib/audit/audit-events";

// ============================================================================
// Icons
// ============================================================================

const categoryIcons: Record<AuditCategory, React.ReactNode> = {
  user: <User className="h-4 w-4" />,
  message: <MessageSquare className="h-4 w-4" />,
  channel: <Hash className="h-4 w-4" />,
  file: <File className="h-4 w-4" />,
  attachment: <File className="h-4 w-4" />,
  moderation: <Shield className="h-4 w-4" />,
  admin: <Shield className="h-4 w-4" />,
  security: <Lock className="h-4 w-4" />,
  integration: <Puzzle className="h-4 w-4" />,
};

// ============================================================================
// Types
// ============================================================================

interface AuditTimelineProps {
  entries: AuditLogEntry[];
  onEntryClick?: (entry: AuditLogEntry) => void;
  groupByDate?: boolean;
  showConnector?: boolean;
  maxHeight?: string;
  className?: string;
}

interface TimelineGroup {
  date: string;
  entries: AuditLogEntry[];
}

// ============================================================================
// Helpers
// ============================================================================

function groupEntriesByDate(entries: AuditLogEntry[]): TimelineGroup[] {
  const groups = new Map<string, AuditLogEntry[]>();

  entries.forEach((entry) => {
    const date = new Date(entry.timestamp).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const existing = groups.get(date) || [];
    groups.set(date, [...existing, entry]);
  });

  return Array.from(groups.entries()).map(([date, entries]) => ({
    date,
    entries,
  }));
}

// ============================================================================
// Timeline Item Component
// ============================================================================

interface TimelineItemProps {
  entry: AuditLogEntry;
  onClick?: () => void;
  showConnector?: boolean;
  isLast?: boolean;
}

function TimelineItem({
  entry,
  onClick,
  showConnector = true,
  isLast = false,
}: TimelineItemProps) {
  const actorName =
    entry.actor.displayName ||
    entry.actor.username ||
    entry.actor.email ||
    entry.actor.id;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  const interactiveProps = onClick
    ? {
        role: "button" as const,
        tabIndex: 0,
        onClick,
        onKeyDown: handleKeyDown,
      }
    : {};

  return (
    <div className="relative flex gap-4">
      {/* Connector Line */}
      {showConnector && !isLast && (
        <div className="absolute bottom-0 left-5 top-10 w-px bg-border" />
      )}

      {/* Icon */}
      <div
        className={cn(
          "relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
          getCategoryBadgeClass(entry.category),
        )}
      >
        {categoryIcons[entry.category]}
      </div>

      {/* Content */}
      <div
        className={cn("min-w-0 flex-1 pb-6", onClick && "cursor-pointer")}
        {...interactiveProps}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
                {getActionDisplayName(entry.action)}
              </span>
              <Badge
                variant="outline"
                className={cn("text-xs", getSeverityBadgeClass(entry.severity))}
              >
                {entry.severity}
              </Badge>
              {!entry.success && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <X className="h-3 w-3" />
                  Failed
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {entry.description}
            </p>
          </div>
          <span className="flex-shrink-0 whitespace-nowrap text-xs text-muted-foreground">
            {formatTimestamp(entry.timestamp, "short")}
          </span>
        </div>

        {/* Actor & Details */}
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[10px]">
                {actorName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[150px] truncate">{actorName}</span>
          </div>
          {entry.resource && (
            <span className="truncate">
              <span className="capitalize">{entry.resource.type}</span>:{" "}
              {entry.resource.name || entry.resource.id}
            </span>
          )}
          {entry.ipAddress && (
            <span className="font-mono">{entry.ipAddress}</span>
          )}
        </div>

        {/* Error */}
        {entry.errorMessage && (
          <div className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {entry.errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AuditTimeline({
  entries,
  onEntryClick,
  groupByDate = true,
  showConnector = true,
  maxHeight,
  className,
}: AuditTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className={cn("py-8 text-center text-muted-foreground", className)}>
        <Clock className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p>No audit events to display</p>
      </div>
    );
  }

  const style = maxHeight
    ? { maxHeight, overflow: "auto" as const }
    : undefined;

  if (groupByDate) {
    const groups = groupEntriesByDate(entries);

    return (
      <div className={className} style={style}>
        {groups.map((group, groupIndex) => (
          <div key={group.date} className={cn(groupIndex > 0 && "mt-6")}>
            {/* Date Header */}
            <div className="sticky top-0 z-20 bg-background py-2">
              <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                {group.date}
                <Badge variant="secondary" className="ml-2">
                  {group.entries.length} events
                </Badge>
              </h3>
            </div>

            {/* Timeline Items */}
            <div className="mt-2">
              {group.entries.map((entry, entryIndex) => (
                <TimelineItem
                  key={entry.id}
                  entry={entry}
                  onClick={() => onEntryClick?.(entry)}
                  showConnector={showConnector}
                  isLast={
                    groupIndex === groups.length - 1 &&
                    entryIndex === group.entries.length - 1
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      {entries.map((entry, index) => (
        <TimelineItem
          key={entry.id}
          entry={entry}
          onClick={() => onEntryClick?.(entry)}
          showConnector={showConnector}
          isLast={index === entries.length - 1}
        />
      ))}
    </div>
  );
}
