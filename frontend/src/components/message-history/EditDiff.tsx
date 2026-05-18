"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type {
  DiffSegment,
  MessageVersion,
  VersionDiff,
} from "@/lib/message-history";
import {
  calculateVersionDiff,
  calculateCharDiff,
  truncateDiff,
  getChangePercentage,
} from "@/lib/message-history";

export interface EditDiffProps {
  /** The diff to display */
  diff: VersionDiff;
  /** Display mode */
  mode?: "inline" | "word";
  /** Maximum length for preview (0 = unlimited) */
  maxLength?: number;
  /** Whether to show summary stats */
  showStats?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays the diff between two message versions.
 * Highlights additions and deletions with colors.
 */
export function EditDiff({
  diff,
  mode = "word",
  maxLength = 0,
  showStats = false,
  className,
}: EditDiffProps) {
  const segments = useMemo(() => {
    if (maxLength > 0) {
      return truncateDiff(diff.segments, maxLength);
    }
    return diff.segments;
  }, [diff.segments, maxLength]);

  return (
    <div className={cn("space-y-2", className)}>
      {showStats && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {diff.charsAdded > 0 && (
            <span className="text-green-600 dark:text-green-400">
              +{diff.charsAdded}
            </span>
          )}
          {diff.charsRemoved > 0 && (
            <span className="text-red-600 dark:text-red-400">
              -{diff.charsRemoved}
            </span>
          )}
          <span>{diff.summary}</span>
        </div>
      )}
      <div className="bg-muted/30 rounded-md border p-3 font-mono text-sm">
        <DiffSegments segments={segments} />
      </div>
    </div>
  );
}

/**
 * Renders diff segments with appropriate styling.
 */
export interface DiffSegmentsProps {
  segments: DiffSegment[];
  className?: string;
}

export function DiffSegments({ segments, className }: DiffSegmentsProps) {
  return (
    <span className={className}>
      {segments.map((segment, index) => (
        <DiffSegmentSpan key={index} segment={segment} />
      ))}
    </span>
  );
}

/**
 * Single diff segment with styling.
 */
function DiffSegmentSpan({ segment }: { segment: DiffSegment }) {
  switch (segment.type) {
    case "added":
      return (
        <span className="bg-green-200 text-green-900 dark:bg-green-900/50 dark:text-green-200">
          {segment.text}
        </span>
      );
    case "removed":
      return (
        <span className="bg-red-200 text-red-900 line-through dark:bg-red-900/50 dark:text-red-200">
          {segment.text}
        </span>
      );
    default:
      return <span>{segment.text}</span>;
  }
}

/**
 * Simple comparison of two text strings.
 */
export interface TextDiffProps {
  /** Old/original text */
  oldText: string;
  /** New/updated text */
  newText: string;
  /** Diff granularity */
  granularity?: "word" | "char";
  /** Whether to show change percentage */
  showPercentage?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function TextDiff({
  oldText,
  newText,
  granularity = "word",
  showPercentage = false,
  className,
}: TextDiffProps) {
  const segments = useMemo(() => {
    if (granularity === "char") {
      return calculateCharDiff(oldText, newText);
    }
    // For word-level, create mock versions
    const fromVersion: MessageVersion = {
      id: "old",
      messageId: "",
      versionNumber: 1,
      content: oldText,
      createdAt: new Date(),
      editedBy: { id: "", username: "", displayName: "" },
      isOriginal: true,
      isCurrent: false,
    };
    const toVersion: MessageVersion = {
      id: "new",
      messageId: "",
      versionNumber: 2,
      content: newText,
      createdAt: new Date(),
      editedBy: { id: "", username: "", displayName: "" },
      isOriginal: false,
      isCurrent: true,
    };
    const diff = calculateVersionDiff(fromVersion, toVersion);
    return diff.segments;
  }, [oldText, newText, granularity]);

  const changePercent = useMemo(
    () => (showPercentage ? getChangePercentage(oldText, newText) : 0),
    [oldText, newText, showPercentage],
  );

  return (
    <div className={cn("space-y-2", className)}>
      {showPercentage && changePercent > 0 && (
        <div className="text-xs text-muted-foreground">
          {changePercent}% changed
        </div>
      )}
      <div className="bg-muted/30 rounded-md border p-3 font-mono text-sm">
        <DiffSegments segments={segments} />
      </div>
    </div>
  );
}

/**
 * Side-by-side diff view.
 */
export interface SideBySideDiffProps {
  /** Old/original text */
  oldText: string;
  /** New/updated text */
  newText: string;
  /** Old version label */
  oldLabel?: string;
  /** New version label */
  newLabel?: string;
  /** Additional CSS classes */
  className?: string;
}

export function SideBySideDiff({
  oldText,
  newText,
  oldLabel = "Before",
  newLabel = "After",
  className,
}: SideBySideDiffProps) {
  const segments = useMemo(
    () => calculateCharDiff(oldText, newText),
    [oldText, newText],
  );

  // Separate into old and new segments
  const oldSegments: DiffSegment[] = [];
  const newSegments: DiffSegment[] = [];

  for (const segment of segments) {
    if (segment.type === "removed") {
      oldSegments.push({ ...segment, type: "removed" });
    } else if (segment.type === "added") {
      newSegments.push({ ...segment, type: "added" });
    } else {
      oldSegments.push(segment);
      newSegments.push(segment);
    }
  }

  return (
    <div className={cn("grid gap-4 md:grid-cols-2", className)}>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-muted-foreground">{oldLabel}</span>
          <span className="text-xs text-red-600 dark:text-red-400">
            Removed
          </span>
        </div>
        <div className="rounded-md border border-red-200 bg-red-50/50 p-3 font-mono text-sm dark:border-red-900/50 dark:bg-red-950/20">
          {oldText || (
            <span className="italic text-muted-foreground">Empty</span>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-muted-foreground">{newLabel}</span>
          <span className="text-xs text-green-600 dark:text-green-400">
            Added
          </span>
        </div>
        <div className="rounded-md border border-green-200 bg-green-50/50 p-3 font-mono text-sm dark:border-green-900/50 dark:bg-green-950/20">
          {newText || (
            <span className="italic text-muted-foreground">Empty</span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact diff preview for lists.
 */
export interface DiffPreviewProps {
  /** The diff to preview */
  diff: VersionDiff;
  /** Maximum characters to show */
  maxChars?: number;
  /** Additional CSS classes */
  className?: string;
}

export function DiffPreview({
  diff,
  maxChars = 50,
  className,
}: DiffPreviewProps) {
  const segments = useMemo(
    () => truncateDiff(diff.segments, maxChars),
    [diff.segments, maxChars],
  );

  return (
    <span className={cn("text-sm", className)}>
      <DiffSegments segments={segments} />
    </span>
  );
}

/**
 * Diff statistics bar.
 */
export interface DiffStatsBarProps {
  /** Characters added */
  charsAdded: number;
  /** Characters removed */
  charsRemoved: number;
  /** Additional CSS classes */
  className?: string;
}

export function DiffStatsBar({
  charsAdded,
  charsRemoved,
  className,
}: DiffStatsBarProps) {
  const total = charsAdded + charsRemoved;
  const addedPercent = total > 0 ? (charsAdded / total) * 100 : 50;
  const removedPercent = total > 0 ? (charsRemoved / total) * 100 : 50;

  if (total === 0) {
    return (
      <div className={cn("text-xs text-muted-foreground", className)}>
        No changes
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="bg-green-500 transition-all"
          style={{ width: `${addedPercent}%` }}
        />
        <div
          className="bg-red-500 transition-all"
          style={{ width: `${removedPercent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-green-600 dark:text-green-400">
          +{charsAdded} added
        </span>
        <span className="text-red-600 dark:text-red-400">
          -{charsRemoved} removed
        </span>
      </div>
    </div>
  );
}
