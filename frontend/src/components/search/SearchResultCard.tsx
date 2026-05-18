"use client";

/**
 * SearchResultCard - Individual search result card with highlighting and actions
 *
 * Features:
 * - Message preview with highlighted terms
 * - Author, channel, timestamp metadata
 * - Quick actions (open, share, bookmark)
 * - Thread preview
 * - Attachment thumbnails
 * - Context preview (messages before/after)
 * - Relevance score display
 */

import * as React from "react";
import {
  MessageSquare,
  Hash,
  Clock,
  ExternalLink,
  Share2,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  File,
  Image as ImageIcon,
  Paperclip,
  MoreVertical,
  Pin,
  Star,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MessageSearchResult } from "@/stores/search-store";

// ============================================================================
// Types
// ============================================================================

export interface SearchResultCardProps {
  /** Search result data */
  result: MessageSearchResult;
  /** Search query for highlighting */
  query?: string;
  /** Whether to show context */
  showContext?: boolean;
  /** Number of context messages to show */
  contextSize?: number;
  /** Whether the result is bookmarked */
  isBookmarked?: boolean;
  /** Callback when card is clicked */
  onClick?: (result: MessageSearchResult) => void;
  /** Callback when jump to message is clicked */
  onJumpToMessage?: (result: MessageSearchResult) => void;
  /** Callback when share is clicked */
  onShare?: (result: MessageSearchResult) => void;
  /** Callback when bookmark is toggled */
  onToggleBookmark?: (result: MessageSearchResult) => void;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function SearchResultCard({
  result,
  query = "",
  showContext = true,
  contextSize = 1,
  isBookmarked = false,
  onClick,
  onJumpToMessage,
  onShare,
  onToggleBookmark,
  className,
}: SearchResultCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  // Highlight search terms in text
  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery) return text;

    const terms = searchQuery.split(" ").filter(Boolean);
    const regex = new RegExp(`(${terms.join("|")})`, "gi");
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <mark
              key={index}
              className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-900/50"
            >
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          ),
        )}
      </>
    );
  };

  const handleCardClick = () => {
    onClick?.(result);
  };

  const handleJumpClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onJumpToMessage?.(result);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare?.(result);
  };

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleBookmark?.(result);
  };

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card p-4 transition-all",
        "hover:border-primary/50 hover:shadow-md",
        "cursor-pointer",
        className,
      )}
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        {/* Author Info */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={result.authorAvatar || undefined} />
            <AvatarFallback>
              {result.authorName[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">
                {result.authorName}
              </span>
              {result.isPinned && (
                <Pin className="h-3 w-3 shrink-0 text-primary" />
              )}
              {result.isStarred && (
                <Star className="h-3 w-3 shrink-0 fill-yellow-500 text-yellow-500" />
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Hash className="h-3 w-3" />
              <span className="truncate">{result.channelName}</span>
              <ChevronRight className="h-3 w-3 shrink-0" />
              <Clock className="h-3 w-3 shrink-0" />
              <span title={format(result.timestamp, "PPpp")}>
                {formatDistanceToNow(result.timestamp, { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {/* Relevance Score & Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="secondary" className="h-6 px-2 text-xs">
            {Math.round(result.score * 100)}% match
          </Badge>

          {/* Quick Actions (visible on hover) */}
          <div
            className={cn(
              "flex items-center gap-1 transition-opacity",
              isHovered ? "opacity-100" : "opacity-0",
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleJumpClick}
              title="Jump to message"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleShareClick}
              title="Share"
            >
              <Share2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7", isBookmarked && "text-primary")}
              onClick={handleBookmarkClick}
              title={isBookmarked ? "Remove bookmark" : "Bookmark"}
            >
              {isBookmarked ? (
                <BookmarkCheck className="h-3.5 w-3.5" />
              ) : (
                <Bookmark className="h-3.5 w-3.5" />
              )}
            </Button>

            {/* More Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleJumpClick}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Jump to message
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareClick}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBookmarkClick}>
                  <Bookmark className="mr-2 h-4 w-4" />
                  {isBookmarked ? "Remove bookmark" : "Bookmark"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Pin className="mr-2 h-4 w-4" />
                  Pin message
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Star className="mr-2 h-4 w-4" />
                  Star message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {/* Main Message Content */}
        <div className="text-sm leading-relaxed">
          {highlightText(result.content, query)}
        </div>

        {/* Attachments */}
        {result.hasAttachments && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="h-6 gap-1 px-2 text-xs">
              <Paperclip className="h-3 w-3" />
              Attachments
            </Badge>
          </div>
        )}

        {/* Thread Info */}
        {result.threadId && (
          <div className="flex items-center gap-2 rounded-md border border-dashed p-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Part of a thread
            </span>
          </div>
        )}

        {/* Reactions */}
        {result.reactions && result.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {result.reactions.slice(0, 5).map((reaction, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="h-6 gap-1 px-2 text-xs"
              >
                {reaction.emoji} {reaction.count}
              </Badge>
            ))}
            {result.reactions.length > 5 && (
              <Badge variant="secondary" className="h-6 px-2 text-xs">
                +{result.reactions.length - 5} more
              </Badge>
            )}
          </div>
        )}

        {/* Context Preview */}
        {showContext && (
          <div className="space-y-1 border-l-2 border-muted pl-3 text-xs text-muted-foreground">
            <div className="font-medium">Context</div>
            <div className="space-y-0.5">
              {result.highlights
                .slice(0, contextSize)
                .map((highlight, index) => (
                  <div key={index} className="line-clamp-1">
                    {highlight}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Compact Card Variant
// ============================================================================

export interface CompactSearchResultCardProps extends Omit<
  SearchResultCardProps,
  "showContext" | "contextSize"
> {}

export function CompactSearchResultCard({
  result,
  query = "",
  onClick,
  className,
}: CompactSearchResultCardProps) {
  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery) return text;

    const terms = searchQuery.split(" ").filter(Boolean);
    const regex = new RegExp(`(${terms.join("|")})`, "gi");
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <mark
              key={index}
              className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-900/50"
            >
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          ),
        )}
      </>
    );
  };

  return (
    <button
      type="button"
      onClick={() => onClick?.(result)}
      className={cn(
        "flex w-full items-start gap-3 rounded-md p-3 text-left",
        "transition-colors hover:bg-accent",
        className,
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={result.authorAvatar || undefined} />
        <AvatarFallback>{result.authorName[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {result.authorName}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDistanceToNow(result.timestamp, { addSuffix: true })}
          </span>
        </div>

        <div className="line-clamp-2 text-sm text-muted-foreground">
          {highlightText(result.content, query)}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Hash className="h-3 w-3" />
          <span className="truncate">{result.channelName}</span>
          {result.threadId && (
            <>
              <MessageSquare className="h-3 w-3" />
              <span>Thread</span>
            </>
          )}
        </div>
      </div>

      <Badge variant="secondary" className="shrink-0 text-xs">
        {Math.round(result.score * 100)}%
      </Badge>
    </button>
  );
}

export default SearchResultCard;
