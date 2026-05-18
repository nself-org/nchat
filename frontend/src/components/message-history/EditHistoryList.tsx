"use client";

import { useMemo, useState } from "react";
import { History, Filter, SortAsc, SortDesc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type {
  MessageEditHistory,
  MessageVersion,
  VersionDiff,
} from "@/lib/message-history";
import {
  calculateVersionDiff,
  getOriginalVersion,
} from "@/lib/message-history";
import {
  EditHistoryItem,
  EditHistoryItemSkeleton,
  CompactHistoryItem,
} from "./EditHistoryItem";

export interface EditHistoryListProps {
  /** The message edit history */
  history: MessageEditHistory | null;
  /** Selected version IDs */
  selectedVersionIds?: string[];
  /** Callback when a version is selected */
  onSelectVersion?: (version: MessageVersion) => void;
  /** Callback to restore a version */
  onRestore?: (version: MessageVersion) => void;
  /** Whether user can restore versions */
  canRestore?: boolean;
  /** Whether loading */
  isLoading?: boolean;
  /** Display mode */
  mode?: "full" | "compact";
  /** Maximum height (scrollable) */
  maxHeight?: string | number;
  /** Additional CSS classes */
  className?: string;
}

type SortOrder = "newest" | "oldest";
type FilterType = "all" | "by-me" | "by-others";

/**
 * List of all edit history entries for a message.
 * Supports sorting, filtering, and selection.
 */
export function EditHistoryList({
  history,
  selectedVersionIds = [],
  onSelectVersion,
  onRestore,
  canRestore = false,
  isLoading = false,
  mode = "full",
  maxHeight = "400px",
  className,
}: EditHistoryListProps) {
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [filter, setFilter] = useState<FilterType>("all");

  // Calculate diffs for each version (comparing to previous)
  const versionsWithDiffs = useMemo(() => {
    if (!history) return [];

    const sorted = [...history.versions].sort((a, b) =>
      sortOrder === "newest"
        ? b.versionNumber - a.versionNumber
        : a.versionNumber - b.versionNumber,
    );

    return sorted.map((version) => {
      // Find the previous version
      const prevVersion = history.versions.find(
        (v) => v.versionNumber === version.versionNumber - 1,
      );

      let diff: VersionDiff | null = null;
      if (prevVersion) {
        diff = calculateVersionDiff(prevVersion, version);
      }

      return { version, diff };
    });
  }, [history, sortOrder]);

  // Apply filter
  const filteredVersions = useMemo(() => {
    if (!history || filter === "all") return versionsWithDiffs;

    // This would need currentUserId from context in a real implementation
    // For now, just return all
    return versionsWithDiffs;
  }, [versionsWithDiffs, history, filter]);

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <EditHistoryItemSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!history || history.versions.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-8 text-center",
          className,
        )}
      >
        <History className="text-muted-foreground/50 h-12 w-12" />
        <h3 className="mt-4 text-lg font-medium">No Edit History</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          This message has not been edited yet.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {history.editCount} edit{history.editCount !== 1 ? "s" : ""}
          </span>
          <Badge variant="outline" className="text-xs">
            {history.versions.length} version
            {history.versions.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort control */}
          <Select
            value={sortOrder}
            onValueChange={(value) => setSortOrder(value as SortOrder)}
          >
            <SelectTrigger className="h-8 w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">
                <span className="flex items-center gap-2">
                  <SortDesc className="h-3 w-3" />
                  Newest
                </span>
              </SelectItem>
              <SelectItem value="oldest">
                <span className="flex items-center gap-2">
                  <SortAsc className="h-3 w-3" />
                  Oldest
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Filter control */}
          <Select
            value={filter}
            onValueChange={(value) => setFilter(value as FilterType)}
          >
            <SelectTrigger className="h-8 w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="flex items-center gap-2">
                  <Filter className="h-3 w-3" />
                  All
                </span>
              </SelectItem>
              <SelectItem value="by-me">By me</SelectItem>
              <SelectItem value="by-others">By others</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Version list */}
      <ScrollArea
        className="pr-4"
        style={{
          maxHeight:
            typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight,
        }}
      >
        <div className="space-y-3">
          {mode === "full"
            ? filteredVersions.map(({ version, diff }, index) => (
                <EditHistoryItem
                  key={version.id}
                  version={version}
                  diff={diff}
                  isSelected={selectedVersionIds.includes(version.id)}
                  onSelect={() => onSelectVersion?.(version)}
                  onRestore={() => onRestore?.(version)}
                  canRestore={canRestore}
                  isFirst={index === 0}
                  isLast={index === filteredVersions.length - 1}
                />
              ))
            : filteredVersions.map(({ version }) => (
                <CompactHistoryItem
                  key={version.id}
                  version={version}
                  isSelected={selectedVersionIds.includes(version.id)}
                  onClick={() => onSelectVersion?.(version)}
                />
              ))}
        </div>
      </ScrollArea>
    </div>
  );
}

/**
 * Timeline view of edit history.
 */
export interface HistoryTimelineProps {
  history: MessageEditHistory;
  onSelectVersion?: (version: MessageVersion) => void;
  className?: string;
}

export function HistoryTimeline({
  history,
  onSelectVersion,
  className,
}: HistoryTimelineProps) {
  const sortedVersions = [...history.versions].sort(
    (a, b) => a.versionNumber - b.versionNumber,
  );

  return (
    <div className={cn("relative", className)}>
      {/* Timeline line */}
      <div className="absolute bottom-0 left-4 top-0 w-0.5 bg-border" />

      {/* Timeline items */}
      <div className="space-y-4">
        {sortedVersions.map((version, index) => (
          <div
            key={version.id}
            className="relative flex items-start gap-4 pl-10"
          >
            {/* Timeline dot */}
            <div
              className={cn(
                "absolute left-2.5 h-3 w-3 rounded-full border-2",
                version.isCurrent
                  ? "border-primary bg-primary"
                  : version.isOriginal
                    ? "border-green-500 bg-green-500"
                    : "border-muted-foreground bg-background",
              )}
            />

            {/* Content */}
            <button
              type="button"
              onClick={() => onSelectVersion?.(version)}
              className="hover:bg-muted/50 flex-1 rounded-md border bg-card p-3 text-left transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  Version {version.versionNumber}
                  {version.isOriginal && " (original)"}
                  {version.isCurrent && " (current)"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {version.editedBy.displayName}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {version.content}
              </p>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Summary statistics for edit history.
 */
export interface HistoryStatsProps {
  history: MessageEditHistory;
  className?: string;
}

export function HistoryStats({ history, className }: HistoryStatsProps) {
  const uniqueEditors = new Set(history.versions.map((v) => v.editedBy.id));
  const original = getOriginalVersion(history);
  const lengthChange = original
    ? history.currentContent.length - original.content.length
    : 0;

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 rounded-md border p-4 sm:grid-cols-4",
        className,
      )}
    >
      <div>
        <p className="text-sm text-muted-foreground">Total Edits</p>
        <p className="text-2xl font-bold">{history.editCount}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Versions</p>
        <p className="text-2xl font-bold">{history.versions.length}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Editors</p>
        <p className="text-2xl font-bold">{uniqueEditors.size}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Length Change</p>
        <p
          className={cn(
            "text-2xl font-bold",
            lengthChange > 0 && "text-green-600",
            lengthChange < 0 && "text-red-600",
          )}
        >
          {lengthChange > 0 ? "+" : ""}
          {lengthChange}
        </p>
      </div>
    </div>
  );
}
