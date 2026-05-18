"use client";

import * as React from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Hash,
  ExternalLink,
  MessageSquare,
  Pin,
  Star,
  Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MessageSearchResult } from "@/stores/search-store";

// ============================================================================
// Types
// ============================================================================

export interface SearchResultMessageProps {
  /** The message search result data */
  result: MessageSearchResult;
  /** The search query to highlight */
  query?: string;
  /** Whether this result is currently selected/focused */
  isSelected?: boolean;
  /** Callback when "Jump to message" is clicked */
  onJumpToMessage?: (result: MessageSearchResult) => void;
  /** Callback when "Show context" is clicked */
  onShowContext?: (result: MessageSearchResult) => void;
  /** Callback when the result is clicked */
  onClick?: (result: MessageSearchResult) => void;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function SearchResultMessage({
  result,
  query = "",
  isSelected = false,
  onJumpToMessage,
  onShowContext,
  onClick,
  className,
}: SearchResultMessageProps) {
  const handleClick = () => {
    onClick?.(result);
  };

  const handleJump = (e: React.MouseEvent) => {
    e.stopPropagation();
    onJumpToMessage?.(result);
  };

  const handleContext = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShowContext?.(result);
  };

  // Format timestamp
  const timestamp = new Date(result.timestamp);
  const isRecent = Date.now() - timestamp.getTime() < 24 * 60 * 60 * 1000;
  const timeDisplay = isRecent
    ? formatDistanceToNow(timestamp, { addSuffix: true })
    : format(timestamp, "MMM d, yyyy");

  // Get author initials for avatar fallback
  const initials = result.authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        "group relative flex gap-3 rounded-lg border p-3 transition-colors",
        "hover:bg-accent/50 cursor-pointer",
        isSelected && "border-primary/50 bg-accent",
        className,
      )}
    >
      {/* Avatar */}
      <Avatar className="h-9 w-9 shrink-0">
        {result.authorAvatar && (
          <AvatarImage src={result.authorAvatar} alt={result.authorName} />
        )}
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Header */}
        <div className="mb-1 flex items-center gap-2 text-sm">
          {/* Channel */}
          <span className="flex items-center gap-0.5 text-muted-foreground">
            <Hash className="h-3.5 w-3.5" />
            <span className="font-medium">{result.channelName}</span>
          </span>

          <span className="text-muted-foreground/50">|</span>

          {/* Author */}
          <span className="font-semibold text-foreground">
            {result.authorName}
          </span>

          {/* Timestamp */}
          <span className="text-muted-foreground">{timeDisplay}</span>

          {/* Indicators */}
          <div className="ml-auto flex items-center gap-1">
            {result.isPinned && (
              <Pin className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            {result.isStarred && (
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            )}
            {result.threadId && (
              <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-xs">
                <MessageSquare className="h-3 w-3" />
                Thread
              </Badge>
            )}
            {result.hasAttachments && (
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Message content with highlights */}
        <div className="text-sm text-foreground">
          <HighlightedText text={result.content} query={query} />
        </div>

        {/* Reactions */}
        {result.reactions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {result.reactions.slice(0, 5).map((reaction, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
              >
                {reaction.emoji}
                <span className="text-muted-foreground">{reaction.count}</span>
              </span>
            ))}
            {result.reactions.length > 5 && (
              <span className="text-xs text-muted-foreground">
                +{result.reactions.length - 5} more
              </span>
            )}
          </div>
        )}

        {/* Actions (visible on hover) */}
        <div
          className={cn(
            "mt-2 flex gap-2 opacity-0 transition-opacity",
            "group-hover:opacity-100",
            isSelected && "opacity-100",
          )}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={handleJump}
            className="h-7 gap-1 px-2 text-xs"
          >
            <ExternalLink className="h-3 w-3" />
            Jump to message
          </Button>
          {onShowContext && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleContext}
              className="h-7 gap-1 px-2 text-xs"
            >
              <MessageSquare className="h-3 w-3" />
              Show context
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Compact Variant
// ============================================================================

export interface CompactMessageResultProps {
  result: MessageSearchResult;
  query?: string;
  isSelected?: boolean;
  onClick?: (result: MessageSearchResult) => void;
  className?: string;
}

export function CompactMessageResult({
  result,
  query = "",
  isSelected = false,
  onClick,
  className,
}: CompactMessageResultProps) {
  const handleClick = () => {
    onClick?.(result);
  };

  const timestamp = new Date(result.timestamp);
  const timeDisplay = format(timestamp, "MMM d");

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        "hover:bg-accent/50 cursor-pointer",
        isSelected && "bg-accent",
        className,
      )}
    >
      <Hash className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="shrink-0 font-medium text-muted-foreground">
        {result.channelName}
      </span>
      <span className="min-w-0 flex-1 truncate">
        <HighlightedText text={result.content} query={query} maxLength={80} />
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {timeDisplay}
      </span>
    </div>
  );
}

// ============================================================================
// Highlighted Text Component
// ============================================================================

interface HighlightedTextProps {
  text: string;
  query: string;
  maxLength?: number;
  className?: string;
}

export function HighlightedText({
  text,
  query,
  maxLength,
  className,
}: HighlightedTextProps) {
  const displayText =
    maxLength && text.length > maxLength
      ? text.slice(0, maxLength) + "..."
      : text;

  if (!query.trim()) {
    return <span className={className}>{displayText}</span>;
  }

  // Escape regex special characters
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  const parts = displayText.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            className="rounded-sm bg-yellow-200 px-0.5 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-100"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        ),
      )}
    </span>
  );
}

// ============================================================================
// Message Result Skeleton
// ============================================================================

export function MessageResultSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex animate-pulse gap-3 rounded-lg border p-3",
        className,
      )}
    >
      <div className="h-9 w-9 shrink-0 rounded-full bg-muted" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-4 w-16 rounded bg-muted" />
        </div>
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-3/4 rounded bg-muted" />
      </div>
    </div>
  );
}

export default SearchResultMessage;
