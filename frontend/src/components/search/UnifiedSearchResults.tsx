"use client";

/**
 * UnifiedSearchResults Component
 *
 * Displays search results with:
 * - Proper highlighting of matched terms
 * - Grouping by channel/date
 * - Jump to message functionality
 * - Infinite scroll pagination
 * - Result type filtering
 *
 * @module components/search/UnifiedSearchResults
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  isThisWeek,
} from "date-fns";
import {
  MessageSquare,
  FileText,
  User,
  Hash,
  ChevronRight,
  ExternalLink,
  Download,
  Pin,
  Star,
  AtSign,
  Link2,
  Code,
  Image,
  Clock,
  Loader2,
  ArrowUpRight,
  FileImage,
  FileVideo,
  FileAudio,
  File,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  SearchResult,
  MessageResult,
  FileResult,
  UserResult,
  ChannelResult,
} from "@/lib/search/search-engine";

// ============================================================================
// Types
// ============================================================================

export type GroupBy = "none" | "channel" | "date" | "type";

export interface UnifiedSearchResultsProps {
  /** Search results to display */
  results: SearchResult[];
  /** Total number of results */
  totalHits: number;
  /** The search query (for highlighting) */
  query: string;
  /** Whether more results are being loaded */
  isLoading?: boolean;
  /** Whether initial search is loading */
  isLoadingInitial?: boolean;
  /** Whether there are more results to load */
  hasMore?: boolean;
  /** How to group results */
  groupBy?: GroupBy;
  /** Callback when a message result is clicked */
  onMessageClick?: (messageId: string, channelId: string) => void;
  /** Callback when a file result is clicked */
  onFileClick?: (fileId: string) => void;
  /** Callback when a user result is clicked */
  onUserClick?: (userId: string) => void;
  /** Callback when a channel result is clicked */
  onChannelClick?: (channelId: string) => void;
  /** Callback when load more is triggered */
  onLoadMore?: () => void;
  /** Additional class names */
  className?: string;
}

interface ResultGroup {
  key: string;
  label: string;
  results: SearchResult[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Highlight search terms in text
 */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  // Handle pre-highlighted content (with <mark> tags)
  if (text.includes("<mark>")) {
    const parts = text.split(/(<mark>.*?<\/mark>)/g);
    return (
      <>
        {parts.map((part, i) => {
          if (part.startsWith("<mark>") && part.endsWith("</mark>")) {
            const content = part.slice(6, -7);
            return (
              <mark
                key={i}
                className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-900/50"
              >
                {content}
              </mark>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </>
    );
  }

  // Extract search terms (ignoring operators)
  const terms = query
    .split(/\s+/)
    .filter((term) => !term.includes(":"))
    .map((term) => term.replace(/[^a-zA-Z0-9]/g, ""))
    .filter((term) => term.length > 1);

  if (terms.length === 0) return text;

  // Build regex pattern
  const pattern = new RegExp(
    `(${terms.map((t) => escapeRegex(t)).join("|")})`,
    "gi",
  );
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, i) => {
        if (terms.some((term) => part.toLowerCase() === term.toLowerCase())) {
          return (
            <mark
              key={i}
              className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-900/50"
            >
              {part}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Format date for grouping
 */
function formatDateGroup(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (isThisWeek(date)) return format(date, "EEEE");
  return format(date, "MMMM d, yyyy");
}

/**
 * Get file icon based on mime type
 */
function getFileIcon(mimeType: string): React.ReactNode {
  if (mimeType.startsWith("image/")) {
    return <FileImage className="h-4 w-4" />;
  }
  if (mimeType.startsWith("video/")) {
    return <FileVideo className="h-4 w-4" />;
  }
  if (mimeType.startsWith("audio/")) {
    return <FileAudio className="h-4 w-4" />;
  }
  return <File className="h-4 w-4" />;
}

/**
 * Format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Group results by specified criteria
 */
function groupResults(
  results: SearchResult[],
  groupBy: GroupBy,
): ResultGroup[] {
  if (groupBy === "none") {
    return [{ key: "all", label: "Results", results }];
  }

  const groups = new Map<string, SearchResult[]>();

  for (const result of results) {
    let key: string;
    let label: string;

    switch (groupBy) {
      case "channel":
        if (result.type === "message" || result.type === "file") {
          key = (result as MessageResult | FileResult).channelId;
          label = `#${(result as MessageResult | FileResult).channelName}`;
        } else {
          key = "_other";
          label = "Other";
        }
        break;

      case "date":
        if (result.type === "message") {
          const date = new Date((result as MessageResult).timestamp);
          key = formatDateGroup(date);
          label = key;
        } else if (result.type === "file") {
          const date = new Date((result as FileResult).uploadedAt);
          key = formatDateGroup(date);
          label = key;
        } else {
          key = "_other";
          label = "Other";
        }
        break;

      case "type":
        key = result.type;
        label =
          result.type === "message"
            ? "Messages"
            : result.type === "file"
              ? "Files"
              : result.type === "user"
                ? "People"
                : "Channels";
        break;

      default:
        key = "all";
        label = "Results";
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(result);
  }

  return Array.from(groups.entries()).map(([key, items]) => ({
    key,
    label: key.startsWith("_") ? key.slice(1) : key,
    results: items,
  }));
}

// ============================================================================
// Result Item Components
// ============================================================================

interface MessageResultItemProps {
  result: MessageResult;
  query: string;
  onClick?: () => void;
}

function MessageResultItem({ result, query, onClick }: MessageResultItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent"
    >
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={result.authorAvatar} alt={result.authorName} />
        <AvatarFallback>
          {result.authorName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {result.authorName}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(result.timestamp), {
              addSuffix: true,
            })}
          </span>
        </div>

        <div className="mt-1 line-clamp-2 text-sm text-foreground/90">
          {highlightText(result.contentPlain || result.content, query)}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Hash className="h-3 w-3" />
            <span>{result.channelName}</span>
          </div>

          {result.isPinned && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              <Pin className="mr-0.5 h-2.5 w-2.5" />
              Pinned
            </Badge>
          )}

          {result.isStarred && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              <Star className="mr-0.5 h-2.5 w-2.5" />
              Starred
            </Badge>
          )}

          {result.hasLink && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              <Link2 className="mr-0.5 h-2.5 w-2.5" />
              Link
            </Badge>
          )}

          {result.hasCode && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              <Code className="mr-0.5 h-2.5 w-2.5" />
              Code
            </Badge>
          )}

          {result.attachments.length > 0 && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              <FileText className="mr-0.5 h-2.5 w-2.5" />
              {result.attachments.length} file
              {result.attachments.length > 1 ? "s" : ""}
            </Badge>
          )}

          {result.threadId && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              <MessageSquare className="mr-0.5 h-2.5 w-2.5" />
              Thread
            </Badge>
          )}
        </div>
      </div>

      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

interface FileResultItemProps {
  result: FileResult;
  query: string;
  onClick?: () => void;
}

function FileResultItem({ result, query, onClick }: FileResultItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent"
    >
      {result.thumbnailUrl ? (
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
          <img
            src={result.thumbnailUrl}
            alt={result.name}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted">
          {getFileIcon(result.mimeType)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {highlightText(result.originalName || result.name, query)}
        </div>

        {result.description && (
          <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {highlightText(result.description, query)}
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(result.size)}</span>
          <span>·</span>
          <span>
            Uploaded by {result.uploaderName}{" "}
            {formatDistanceToNow(new Date(result.uploadedAt), {
              addSuffix: true,
            })}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Hash className="h-3 w-3" />
            {result.channelName}
          </span>
        </div>
      </div>

      <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

interface UserResultItemProps {
  result: UserResult;
  query: string;
  onClick?: () => void;
}

function UserResultItem({ result, query, onClick }: UserResultItemProps) {
  const statusColors = {
    online: "bg-green-500",
    away: "bg-yellow-500",
    busy: "bg-red-500",
    offline: "bg-gray-400",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent"
    >
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={result.avatar} alt={result.displayName} />
          <AvatarFallback>
            {result.displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
            statusColors[result.status],
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {highlightText(result.displayName, query)}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            @{result.username}
          </span>
        </div>

        {result.bio && (
          <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {highlightText(result.bio, query)}
          </div>
        )}

        <div className="mt-1 flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {result.role}
          </Badge>
          {result.lastSeen && result.status === "offline" && (
            <span className="text-[10px] text-muted-foreground">
              Last seen{" "}
              {formatDistanceToNow(new Date(result.lastSeen), {
                addSuffix: true,
              })}
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

interface ChannelResultItemProps {
  result: ChannelResult;
  query: string;
  onClick?: () => void;
}

function ChannelResultItem({ result, query, onClick }: ChannelResultItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
        {result.isPrivate ? (
          <Lock className="h-5 w-5 text-muted-foreground" />
        ) : (
          <Hash className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {highlightText(result.name, query)}
          </span>
          {result.isPrivate && (
            <Badge variant="secondary" className="text-[10px]">
              Private
            </Badge>
          )}
          {result.isMember && (
            <Badge variant="outline" className="text-[10px]">
              Member
            </Badge>
          )}
        </div>

        {result.description && (
          <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {highlightText(result.description, query)}
          </div>
        )}

        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{result.memberCount} members</span>
          {result.lastActivityAt && (
            <>
              <span>·</span>
              <span>
                Active{" "}
                {formatDistanceToNow(new Date(result.lastActivityAt), {
                  addSuffix: true,
                })}
              </span>
            </>
          )}
        </div>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function ResultSkeleton() {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function UnifiedSearchResults({
  results,
  totalHits,
  query,
  isLoading = false,
  isLoadingInitial = false,
  hasMore = false,
  groupBy = "none",
  onMessageClick,
  onFileClick,
  onUserClick,
  onChannelClick,
  onLoadMore,
  className,
}: UnifiedSearchResultsProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [groupedResults, setGroupedResults] = useState<ResultGroup[]>([]);

  // Group results when they change
  useEffect(() => {
    setGroupedResults(groupResults(results, groupBy));
  }, [results, groupBy]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!hasMore || isLoading || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  // Render a result item based on type
  const renderResult = useCallback(
    (result: SearchResult) => {
      switch (result.type) {
        case "message":
          return (
            <MessageResultItem
              key={result.id}
              result={result as MessageResult}
              query={query}
              onClick={() =>
                onMessageClick?.(result.id, (result as MessageResult).channelId)
              }
            />
          );
        case "file":
          return (
            <FileResultItem
              key={result.id}
              result={result as FileResult}
              query={query}
              onClick={() => onFileClick?.(result.id)}
            />
          );
        case "user":
          return (
            <UserResultItem
              key={result.id}
              result={result as UserResult}
              query={query}
              onClick={() => onUserClick?.(result.id)}
            />
          );
        case "channel":
          return (
            <ChannelResultItem
              key={result.id}
              result={result as ChannelResult}
              query={query}
              onClick={() => onChannelClick?.(result.id)}
            />
          );
        default:
          return null;
      }
    },
    [query, onMessageClick, onFileClick, onUserClick, onChannelClick],
  );

  // Initial loading
  if (isLoadingInitial) {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <ResultSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (results.length === 0 && !isLoading) {
    return (
      <div className={cn("py-12 text-center", className)}>
        <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No results found</p>
        <p className="mt-1 text-xs text-muted-foreground/75">
          Try different keywords or remove some filters
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Results summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {totalHits.toLocaleString()} result{totalHits !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grouped results */}
      {groupedResults.map((group) => (
        <div key={group.key} className="space-y-2">
          {groupBy !== "none" && groupedResults.length > 1 && (
            <h3 className="sticky top-0 z-10 bg-background/95 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
              {group.label} ({group.results.length})
            </h3>
          )}

          <div className="space-y-2">{group.results.map(renderResult)}</div>
        </div>
      ))}

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="py-4">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading more results...</span>
          </div>
        )}

        {hasMore && !isLoading && (
          <Button variant="ghost" onClick={onLoadMore} className="w-full">
            Load more results
          </Button>
        )}
      </div>
    </div>
  );
}

export default UnifiedSearchResults;
