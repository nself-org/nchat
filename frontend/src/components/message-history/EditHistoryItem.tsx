"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, User, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatMessageTime, formatMessageTimeTooltip } from "@/lib/date";
import type { MessageVersion, VersionDiff } from "@/lib/message-history";
import { DiffPreview, DiffStatsBar } from "./EditDiff";

export interface EditHistoryItemProps {
  /** The version to display */
  version: MessageVersion;
  /** The diff from the previous version (if any) */
  diff?: VersionDiff | null;
  /** Whether the item is selected */
  isSelected?: boolean;
  /** Click handler for selection */
  onSelect?: () => void;
  /** Handler for restore action */
  onRestore?: () => void;
  /** Whether restore is allowed */
  canRestore?: boolean;
  /** Whether to show full content */
  showFullContent?: boolean;
  /** Whether this is the first item (newest) */
  isFirst?: boolean;
  /** Whether this is the last item (oldest) */
  isLast?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Single item in the edit history list.
 * Shows version info, editor, timestamp, and diff preview.
 */
export function EditHistoryItem({
  version,
  diff,
  isSelected = false,
  onSelect,
  onRestore,
  canRestore = false,
  showFullContent = false,
  isFirst = false,
  isLast = false,
  className,
}: EditHistoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(showFullContent);

  const { editedBy, createdAt, content, versionNumber, isOriginal, isCurrent } =
    version;

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-card p-4 transition-colors",
        isSelected && "bg-primary/5 border-primary",
        onSelect && "hover:border-primary/50 cursor-pointer",
        className,
      )}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      {/* Timeline connector */}
      {!isFirst && (
        <div className="absolute -top-4 left-6 h-4 w-0.5 bg-border" />
      )}
      {!isLast && (
        <div className="absolute -bottom-4 left-6 h-4 w-0.5 bg-border" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={editedBy.avatarUrl} alt={editedBy.displayName} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{editedBy.displayName}</span>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm text-muted-foreground">
                      {formatMessageTime(createdAt)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {formatMessageTimeTooltip(createdAt)}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Version {versionNumber}</span>
              {isOriginal && (
                <Badge variant="outline" className="text-xs">
                  Original
                </Badge>
              )}
              {isCurrent && (
                <Badge variant="default" className="text-xs">
                  Current
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canRestore && !isCurrent && onRestore && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore();
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Restore this version</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Diff preview (when collapsed) */}
      {!isExpanded && diff && (
        <div className="mt-3">
          <DiffPreview diff={diff} maxChars={100} />
          <div className="mt-2">
            <DiffStatsBar
              charsAdded={diff.charsAdded}
              charsRemoved={diff.charsRemoved}
            />
          </div>
        </div>
      )}

      {/* Full content (when expanded) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3">
              <div className="bg-muted/30 rounded-md border p-3">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {content}
                </pre>
              </div>
              {diff && (
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Changes from previous version:
                  </p>
                  <DiffStatsBar
                    charsAdded={diff.charsAdded}
                    charsRemoved={diff.charsRemoved}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Skeleton loader for edit history item.
 */
export function EditHistoryItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="h-8 w-8 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

/**
 * Compact version for timeline views.
 */
export interface CompactHistoryItemProps {
  version: MessageVersion;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function CompactHistoryItem({
  version,
  isSelected = false,
  onClick,
  className,
}: CompactHistoryItemProps) {
  const { editedBy, createdAt, versionNumber, isOriginal, isCurrent } = version;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
        isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted",
        className,
      )}
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
        {versionNumber}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {editedBy.displayName}
          </span>
          {isOriginal && (
            <span className="text-xs text-muted-foreground">(original)</span>
          )}
          {isCurrent && <span className="text-xs text-primary">(current)</span>}
        </div>
        <span className="text-xs text-muted-foreground">
          {formatMessageTime(createdAt)}
        </span>
      </div>
    </button>
  );
}
