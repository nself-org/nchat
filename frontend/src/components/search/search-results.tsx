"use client";

import * as React from "react";
import { useInView } from "react-intersection-observer";
import { ArrowUpDown, Loader2, Search, Frown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useSearchStore,
  type SearchResult,
  type SearchSortBy,
  type MessageSearchResult,
  type FileSearchResult,
  type UserSearchResult,
  type ChannelSearchResult,
  selectFilteredResults,
} from "@/stores/search-store";
import {
  SearchResultMessage,
  MessageResultSkeleton,
} from "./search-result-message";
import { SearchResultFile, FileResultSkeleton } from "./search-result-file";
import { SearchResultUser, UserResultSkeleton } from "./search-result-user";
import {
  SearchResultChannel,
  ChannelResultSkeleton,
} from "./search-result-channel";

// ============================================================================
// Types
// ============================================================================

export interface SearchResultsProps {
  /** Additional class names */
  className?: string;
  /** Callback when a message result is clicked */
  onMessageClick?: (result: MessageSearchResult) => void;
  /** Callback when jump to message is clicked */
  onJumpToMessage?: (result: MessageSearchResult) => void;
  /** Callback when show context is clicked */
  onShowContext?: (result: MessageSearchResult) => void;
  /** Callback when a file result is clicked */
  onFileClick?: (result: FileSearchResult) => void;
  /** Callback when file download is clicked */
  onFileDownload?: (result: FileSearchResult) => void;
  /** Callback when a user result is clicked */
  onUserClick?: (result: UserSearchResult) => void;
  /** Callback when message user is clicked */
  onMessageUser?: (result: UserSearchResult) => void;
  /** Callback when a channel result is clicked */
  onChannelClick?: (result: ChannelSearchResult) => void;
  /** Callback when join channel is clicked */
  onJoinChannel?: (result: ChannelSearchResult) => void;
  /** Callback when open channel is clicked */
  onOpenChannel?: (result: ChannelSearchResult) => void;
  /** Callback to load more results */
  onLoadMore?: () => void;
  /** Maximum height of the results container */
  maxHeight?: number | string;
}

// ============================================================================
// Sort Options
// ============================================================================

const sortOptions: { value: SearchSortBy; label: string }[] = [
  { value: "relevance", label: "Best match" },
  { value: "date_desc", label: "Newest first" },
  { value: "date_asc", label: "Oldest first" },
];

// ============================================================================
// Main Component
// ============================================================================

export function SearchResults({
  className,
  onMessageClick,
  onJumpToMessage,
  onShowContext,
  onFileClick,
  onFileDownload,
  onUserClick,
  onMessageUser,
  onChannelClick,
  onJoinChannel,
  onOpenChannel,
  onLoadMore,
  maxHeight = "calc(100vh - 200px)",
}: SearchResultsProps) {
  const results = useSearchStore(selectFilteredResults);
  const totalResults = useSearchStore((state) => state.totalResults);
  const hasMore = useSearchStore((state) => state.hasMore);
  const isSearching = useSearchStore((state) => state.isSearching);
  const isLoadingMore = useSearchStore((state) => state.isLoadingMore);
  const query = useSearchStore((state) => state.debouncedQuery);
  const sortBy = useSearchStore((state) => state.sortBy);
  const setSortBy = useSearchStore((state) => state.setSortBy);

  // Infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: "100px",
  });

  // Load more when scrolled to bottom
  React.useEffect(() => {
    if (inView && hasMore && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  }, [inView, hasMore, isLoadingMore, onLoadMore]);

  // Empty state
  if (!isSearching && results.length === 0 && query) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-12",
          className,
        )}
      >
        <Frown className="text-muted-foreground/50 h-12 w-12" />
        <h3 className="mt-4 text-lg font-medium">No results found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Try different keywords or adjust your filters
        </p>
      </div>
    );
  }

  // Initial state (no query)
  if (!query && results.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-12",
          className,
        )}
      >
        <Search className="text-muted-foreground/50 h-12 w-12" />
        <h3 className="mt-4 text-lg font-medium">Search your workspace</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Find messages, files, people, and channels
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      {results.length > 0 && (
        <div className="flex items-center justify-between border-b px-4 py-2">
          <span className="text-sm text-muted-foreground">
            {totalResults.toLocaleString()} result
            {totalResults !== 1 ? "s" : ""}
          </span>

          <SortDropdown value={sortBy} onChange={setSortBy} />
        </div>
      )}

      {/* Results list */}
      <ScrollArea style={{ maxHeight }}>
        <div className="space-y-2 p-4">
          {/* Loading skeleton */}
          {isSearching && results.length === 0 && (
            <>
              <MessageResultSkeleton />
              <MessageResultSkeleton />
              <FileResultSkeleton />
              <UserResultSkeleton />
              <ChannelResultSkeleton />
            </>
          )}

          {/* Results */}
          {results.map((result) => (
            <SearchResultItem
              key={result.id}
              result={result}
              query={query}
              onMessageClick={onMessageClick}
              onJumpToMessage={onJumpToMessage}
              onShowContext={onShowContext}
              onFileClick={onFileClick}
              onFileDownload={onFileDownload}
              onUserClick={onUserClick}
              onMessageUser={onMessageUser}
              onChannelClick={onChannelClick}
              onJoinChannel={onJoinChannel}
              onOpenChannel={onOpenChannel}
            />
          ))}

          {/* Load more trigger */}
          {hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-4">
              {isLoadingMore && (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// Search Result Item
// ============================================================================

interface SearchResultItemProps {
  result: SearchResult;
  query: string;
  onMessageClick?: (result: MessageSearchResult) => void;
  onJumpToMessage?: (result: MessageSearchResult) => void;
  onShowContext?: (result: MessageSearchResult) => void;
  onFileClick?: (result: FileSearchResult) => void;
  onFileDownload?: (result: FileSearchResult) => void;
  onUserClick?: (result: UserSearchResult) => void;
  onMessageUser?: (result: UserSearchResult) => void;
  onChannelClick?: (result: ChannelSearchResult) => void;
  onJoinChannel?: (result: ChannelSearchResult) => void;
  onOpenChannel?: (result: ChannelSearchResult) => void;
}

function SearchResultItem({
  result,
  query,
  onMessageClick,
  onJumpToMessage,
  onShowContext,
  onFileClick,
  onFileDownload,
  onUserClick,
  onMessageUser,
  onChannelClick,
  onJoinChannel,
  onOpenChannel,
}: SearchResultItemProps) {
  switch (result.type) {
    case "message":
      return (
        <SearchResultMessage
          result={result}
          query={query}
          onClick={onMessageClick}
          onJumpToMessage={onJumpToMessage}
          onShowContext={onShowContext}
        />
      );
    case "file":
      return (
        <SearchResultFile
          result={result}
          query={query}
          onClick={onFileClick}
          onDownload={onFileDownload}
          onJumpToMessage={(r) => {
            // File's jump to message needs special handling
            if (onJumpToMessage) {
              // Create a minimal message result to jump to
              const messageResult: MessageSearchResult = {
                id: r.messageId,
                type: "message",
                score: r.score,
                highlights: r.highlights,
                channelId: r.channelId,
                channelName: r.channelName,
                authorId: r.uploaderId,
                authorName: r.uploaderName,
                authorAvatar: null,
                content: "",
                timestamp: r.uploadedAt,
                threadId: null,
                isPinned: false,
                isStarred: false,
                reactions: [],
                hasAttachments: true,
              };
              onJumpToMessage(messageResult);
            }
          }}
        />
      );
    case "user":
      return (
        <SearchResultUser
          result={result}
          query={query}
          onClick={onUserClick}
          onMessage={onMessageUser}
        />
      );
    case "channel":
      return (
        <SearchResultChannel
          result={result}
          query={query}
          onClick={onChannelClick}
          onJoin={onJoinChannel}
          onOpen={onOpenChannel}
        />
      );
    default:
      return null;
  }
}

// ============================================================================
// Sort Dropdown
// ============================================================================

interface SortDropdownProps {
  value: SearchSortBy;
  onChange: (value: SearchSortBy) => void;
}

function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentOption = sortOptions.find((opt) => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="h-8 gap-1.5 px-2 text-xs"
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
        {currentOption?.label}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-md border bg-popover p-1 shadow-md">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center rounded-sm px-2 py-1.5 text-sm",
                "hover:text-accent-foreground hover:bg-accent",
                value === option.value && "bg-accent",
              )}
            >
              {option.label}
              {value === option.value && (
                <span className="ml-auto text-primary">&#10003;</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Grouped Results View
// ============================================================================

export interface GroupedSearchResultsProps extends Omit<
  SearchResultsProps,
  "className"
> {
  className?: string;
  /** Whether to show section headers */
  showHeaders?: boolean;
}

export function GroupedSearchResults({
  className,
  showHeaders = true,
  ...callbacks
}: GroupedSearchResultsProps) {
  const results = useSearchStore(selectFilteredResults);
  const query = useSearchStore((state) => state.debouncedQuery);
  const isSearching = useSearchStore((state) => state.isSearching);

  // Group results by type
  const grouped = React.useMemo(() => {
    const messages: MessageSearchResult[] = [];
    const files: FileSearchResult[] = [];
    const users: UserSearchResult[] = [];
    const channels: ChannelSearchResult[] = [];

    for (const result of results) {
      switch (result.type) {
        case "message":
          messages.push(result);
          break;
        case "file":
          files.push(result);
          break;
        case "user":
          users.push(result);
          break;
        case "channel":
          channels.push(result);
          break;
      }
    }

    return { messages, files, users, channels };
  }, [results]);

  // Empty state
  if (!isSearching && results.length === 0 && query) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-12",
          className,
        )}
      >
        <Frown className="text-muted-foreground/50 h-12 w-12" />
        <h3 className="mt-4 text-lg font-medium">No results found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Try different keywords or adjust your filters
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Messages */}
      {grouped.messages.length > 0 && (
        <ResultSection
          title="Messages"
          count={grouped.messages.length}
          show={showHeaders}
        >
          {grouped.messages.map((result) => (
            <SearchResultMessage
              key={result.id}
              result={result}
              query={query}
              onClick={callbacks.onMessageClick}
              onJumpToMessage={callbacks.onJumpToMessage}
              onShowContext={callbacks.onShowContext}
            />
          ))}
        </ResultSection>
      )}

      {/* Files */}
      {grouped.files.length > 0 && (
        <ResultSection
          title="Files"
          count={grouped.files.length}
          show={showHeaders}
        >
          {grouped.files.map((result) => (
            <SearchResultFile
              key={result.id}
              result={result}
              query={query}
              onClick={callbacks.onFileClick}
              onDownload={callbacks.onFileDownload}
            />
          ))}
        </ResultSection>
      )}

      {/* People */}
      {grouped.users.length > 0 && (
        <ResultSection
          title="People"
          count={grouped.users.length}
          show={showHeaders}
        >
          {grouped.users.map((result) => (
            <SearchResultUser
              key={result.id}
              result={result}
              query={query}
              onClick={callbacks.onUserClick}
              onMessage={callbacks.onMessageUser}
            />
          ))}
        </ResultSection>
      )}

      {/* Channels */}
      {grouped.channels.length > 0 && (
        <ResultSection
          title="Channels"
          count={grouped.channels.length}
          show={showHeaders}
        >
          {grouped.channels.map((result) => (
            <SearchResultChannel
              key={result.id}
              result={result}
              query={query}
              onClick={callbacks.onChannelClick}
              onJoin={callbacks.onJoinChannel}
              onOpen={callbacks.onOpenChannel}
            />
          ))}
        </ResultSection>
      )}
    </div>
  );
}

// ============================================================================
// Result Section
// ============================================================================

interface ResultSectionProps {
  title: string;
  count: number;
  show: boolean;
  children: React.ReactNode;
}

function ResultSection({ title, count, show, children }: ResultSectionProps) {
  return (
    <div>
      {show && (
        <div className="mb-2 flex items-center gap-2 px-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <span className="text-xs text-muted-foreground">({count})</span>
        </div>
      )}
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export default SearchResults;
