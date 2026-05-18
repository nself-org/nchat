"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Hash,
  Lock,
  Users,
  MessageSquare,
  LogIn,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ChannelSearchResult } from "@/stores/search-store";
import { HighlightedText } from "./search-result-message";

// ============================================================================
// Types
// ============================================================================

export interface SearchResultChannelProps {
  /** The channel search result data */
  result: ChannelSearchResult;
  /** The search query to highlight */
  query?: string;
  /** Whether this result is currently selected/focused */
  isSelected?: boolean;
  /** Callback when "Join" button is clicked */
  onJoin?: (result: ChannelSearchResult) => void;
  /** Callback when "Open" button is clicked (for channels user is already in) */
  onOpen?: (result: ChannelSearchResult) => void;
  /** Callback when the result is clicked */
  onClick?: (result: ChannelSearchResult) => void;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function SearchResultChannel({
  result,
  query = "",
  isSelected = false,
  onJoin,
  onOpen,
  onClick,
  className,
}: SearchResultChannelProps) {
  const handleClick = () => {
    onClick?.(result);
  };

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (result.isMember) {
      onOpen?.(result);
    } else {
      onJoin?.(result);
    }
  };

  // Format last activity
  const lastActivityText = result.lastActivityAt
    ? `Active ${formatDistanceToNow(new Date(result.lastActivityAt), { addSuffix: true })}`
    : "No recent activity";

  // Format member count
  const memberCountText =
    result.memberCount === 1
      ? "1 member"
      : `${result.memberCount.toLocaleString()} members`;

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
        "group relative flex items-start gap-3 rounded-lg border p-3 transition-colors",
        "hover:bg-accent/50 cursor-pointer",
        isSelected && "border-primary/50 bg-accent",
        className,
      )}
    >
      {/* Channel icon */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          "bg-primary/10 text-primary",
        )}
      >
        {result.isPrivate ? (
          <Lock className="h-5 w-5" />
        ) : (
          <Hash className="h-5 w-5" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Channel name */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            <HighlightedText text={result.name} query={query} />
          </span>
          {result.isPrivate && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              Private
            </Badge>
          )}
          {result.isMember && (
            <Badge
              variant="outline"
              className="h-5 px-1.5 text-xs text-green-600"
            >
              Joined
            </Badge>
          )}
        </div>

        {/* Description */}
        {result.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
            <HighlightedText
              text={result.description}
              query={query}
              maxLength={120}
            />
          </p>
        )}

        {/* Meta info */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {/* Member count */}
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {memberCountText}
          </span>

          {/* Last activity */}
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {lastActivityText}
          </span>
        </div>
      </div>

      {/* Action button */}
      <div
        className={cn(
          "shrink-0 opacity-0 transition-opacity",
          "group-hover:opacity-100",
          isSelected && "opacity-100",
        )}
      >
        <Button
          variant={result.isMember ? "secondary" : "default"}
          size="sm"
          onClick={handleAction}
          className="h-8 gap-1.5 px-3"
        >
          {result.isMember ? (
            <>
              <ExternalLink className="h-4 w-4" />
              Open
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Join
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Compact Variant
// ============================================================================

export interface CompactChannelResultProps {
  result: ChannelSearchResult;
  query?: string;
  isSelected?: boolean;
  onClick?: (result: ChannelSearchResult) => void;
  className?: string;
}

export function CompactChannelResult({
  result,
  query = "",
  isSelected = false,
  onClick,
  className,
}: CompactChannelResultProps) {
  const handleClick = () => {
    onClick?.(result);
  };

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
      {/* Icon */}
      {result.isPrivate ? (
        <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
      ) : (
        <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}

      {/* Name */}
      <span className="min-w-0 flex-1 truncate">
        <HighlightedText text={result.name} query={query} />
      </span>

      {/* Member count */}
      <span className="shrink-0 text-xs text-muted-foreground">
        {result.memberCount} members
      </span>
    </div>
  );
}

// ============================================================================
// Channel List Item (for sidebar/quick switcher)
// ============================================================================

export interface ChannelListItemProps {
  result: ChannelSearchResult;
  query?: string;
  isSelected?: boolean;
  isActive?: boolean;
  unreadCount?: number;
  hasMention?: boolean;
  onClick?: (result: ChannelSearchResult) => void;
  className?: string;
}

export function ChannelListItem({
  result,
  query = "",
  isSelected = false,
  isActive = false,
  unreadCount = 0,
  hasMention = false,
  onClick,
  className,
}: ChannelListItemProps) {
  const handleClick = () => {
    onClick?.(result);
  };

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
        "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        "cursor-pointer hover:bg-accent",
        isSelected && "bg-accent",
        isActive && "bg-accent/70 font-medium",
        className,
      )}
    >
      {/* Icon */}
      <span className="shrink-0 text-muted-foreground">
        {result.isPrivate ? (
          <Lock className="h-4 w-4" />
        ) : (
          <Hash className="h-4 w-4" />
        )}
      </span>

      {/* Name */}
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          unreadCount > 0 && "font-semibold text-foreground",
        )}
      >
        {query ? (
          <HighlightedText text={result.name} query={query} />
        ) : (
          result.name
        )}
      </span>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <Badge
          variant={hasMention ? "destructive" : "secondary"}
          className={cn(
            "h-5 min-w-5 justify-center px-1.5 text-xs",
            hasMention && "animate-pulse",
          )}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </div>
  );
}

// ============================================================================
// Channel Card (for preview/hover)
// ============================================================================

export interface ChannelCardProps {
  result: ChannelSearchResult;
  onJoin?: (result: ChannelSearchResult) => void;
  onOpen?: (result: ChannelSearchResult) => void;
  className?: string;
}

export function ChannelCard({
  result,
  onJoin,
  onOpen,
  className,
}: ChannelCardProps) {
  const lastActivityText = result.lastActivityAt
    ? `Active ${formatDistanceToNow(new Date(result.lastActivityAt), { addSuffix: true })}`
    : "No recent activity";

  const memberCountText =
    result.memberCount === 1
      ? "1 member"
      : `${result.memberCount.toLocaleString()} members`;

  return (
    <div className={cn("w-72 rounded-lg border bg-popover p-4", className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
            "bg-primary/10 text-primary",
          )}
        >
          {result.isPrivate ? (
            <Lock className="h-6 w-6" />
          ) : (
            <Hash className="h-6 w-6" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{result.name}</span>
            {result.isPrivate && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                Private
              </Badge>
            )}
          </div>

          {result.description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {result.description}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          {memberCountText}
        </span>
        <span className="flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4" />
          {lastActivityText}
        </span>
      </div>

      {/* Action */}
      <div className="mt-4">
        {result.isMember ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpen?.(result)}
            className="w-full gap-1.5"
          >
            <ExternalLink className="h-4 w-4" />
            Open Channel
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => onJoin?.(result)}
            className="w-full gap-1.5"
          >
            <LogIn className="h-4 w-4" />
            Join Channel
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Channel Result Skeleton
// ============================================================================

export function ChannelResultSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex animate-pulse items-start gap-3 rounded-lg border p-3",
        className,
      )}
    >
      <div className="h-10 w-10 shrink-0 rounded-lg bg-muted" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
        <div className="flex gap-3">
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="h-3 w-24 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

export default SearchResultChannel;
