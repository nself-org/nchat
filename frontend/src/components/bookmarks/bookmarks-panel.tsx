"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useBookmarks,
  useBookmarkFilters,
  useBookmarkPanel,
} from "@/lib/bookmarks/use-bookmarks";
import {
  useBookmarkStore,
  selectUniqueChannels,
} from "@/lib/bookmarks/bookmark-store";
import { BookmarkItem } from "./bookmark-item";
import { BookmarkFolders } from "./bookmark-folders";
import { AddToFolderModal } from "./add-to-folder-modal";

// ============================================================================
// Types
// ============================================================================

export interface BookmarksPanelProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onJumpToMessage?: (messageId: string, channelId: string) => void;
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

function BookmarkIcon({
  className,
  filled = false,
}: {
  className?: string;
  filled?: boolean;
}) {
  if (filled) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={cn("h-5 w-5", className)}
      >
        <path
          fillRule="evenodd"
          d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("h-5 w-5", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
      />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("h-4 w-4", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
  );
}

function XMarkIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("h-4 w-4", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18 18 6M6 6l12 12"
      />
    </svg>
  );
}

function HashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("h-4 w-4", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5-3.9 19.5m-2.1-19.5-3.9 19.5"
      />
    </svg>
  );
}

function ArrowUpDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("h-4 w-4", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5"
      />
    </svg>
  );
}

function FunnelIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={cn("h-4 w-4", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z"
      />
    </svg>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <BookmarkIcon className="text-muted-foreground/50 mb-4 h-12 w-12" />
      {hasFilters ? (
        <>
          <h3 className="mb-2 text-lg font-medium">No matching saved items</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or search query to find what you are
            looking for.
          </p>
        </>
      ) : (
        <>
          <h3 className="mb-2 text-lg font-medium">No saved items yet</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Save messages by clicking the bookmark icon on any message. Saved
            items will appear here for quick access.
          </p>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Loading State
// ============================================================================

function LoadingState() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-muted" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Bookmarks Panel Content
// ============================================================================

interface BookmarksPanelContentProps {
  onJumpToMessage?: (messageId: string, channelId: string) => void;
}

function BookmarksPanelContent({
  onJumpToMessage,
}: BookmarksPanelContentProps) {
  const router = useRouter();
  const { loading, hasMore, loadMore } = useBookmarks();
  const {
    searchQuery,
    sortBy,
    sortOrder,
    selectedChannelFilter,
    filteredBookmarks,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    setChannelFilter,
    clearFilters,
  } = useBookmarkFilters();

  const channels = useBookmarkStore(selectUniqueChannels);
  const [showFilters, setShowFilters] = React.useState(false);

  const hasFilters = !!(searchQuery || selectedChannelFilter);

  const handleJumpToMessage = (messageId: string, channelId: string) => {
    if (onJumpToMessage) {
      onJumpToMessage(messageId, channelId);
    } else {
      const bookmark = filteredBookmarks.find(
        (b) => b.message.id === messageId,
      );
      if (bookmark?.message.channel.slug) {
        router.push(
          `/chat/${bookmark.message.channel.slug}?message=${messageId}`,
        );
      }
    }
  };

  const handleSortChange = (value: string) => {
    if (value === "date-desc") {
      setSortBy("date");
      setSortOrder("desc");
    } else if (value === "date-asc") {
      setSortBy("date");
      setSortOrder("asc");
    } else if (value === "channel") {
      setSortBy("channel");
      setSortOrder("asc");
    } else if (value === "folder") {
      setSortBy("folder");
      setSortOrder("asc");
    }
  };

  const getSortValue = (): string => {
    if (sortBy === "date" && sortOrder === "desc") return "date-desc";
    if (sortBy === "date" && sortOrder === "asc") return "date-asc";
    if (sortBy === "channel") return "channel";
    if (sortBy === "folder") return "folder";
    return "date-desc";
  };

  return (
    <div className="flex h-full flex-col">
      {/* Search and Filters */}
      <div className="space-y-3 border-b p-4">
        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search saved items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={() => setSearchQuery("")}
            >
              <XMarkIcon className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className={cn("gap-2", showFilters && "bg-accent")}
            onClick={() => setShowFilters(!showFilters)}
          >
            <FunnelIcon className="h-4 w-4" />
            Filters
            {hasFilters && (
              <span className="text-primary-foreground ml-1 rounded-full bg-primary px-1.5 py-0.5 text-xs">
                {[searchQuery, selectedChannelFilter].filter(Boolean).length}
              </span>
            )}
          </Button>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <ArrowUpDownIcon className="h-4 w-4 text-muted-foreground" />
            <Select value={getSortValue()} onValueChange={handleSortChange}>
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest first</SelectItem>
                <SelectItem value="date-asc">Oldest first</SelectItem>
                <SelectItem value="channel">By channel</SelectItem>
                <SelectItem value="folder">By folder</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <HashIcon className="h-4 w-4 text-muted-foreground" />
              <Select
                value={selectedChannelFilter ?? "all"}
                onValueChange={(value) =>
                  setChannelFilter(value === "all" ? null : value)
                }
              >
                <SelectTrigger className="h-8 flex-1">
                  <SelectValue placeholder="All channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All channels</SelectItem>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      # {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={clearFilters}
              >
                Clear all filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Folders Sidebar */}
          <div className="w-48 flex-shrink-0 overflow-y-auto border-r p-2">
            <BookmarkFolders />
          </div>

          {/* Bookmarks List */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <LoadingState />
            ) : filteredBookmarks.length === 0 ? (
              <EmptyState hasFilters={hasFilters} />
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-3 p-4">
                  {/* Results count */}
                  <p className="text-sm text-muted-foreground">
                    {filteredBookmarks.length} saved item
                    {filteredBookmarks.length !== 1 ? "s" : ""}
                    {hasFilters && " (filtered)"}
                  </p>

                  {/* Bookmark items */}
                  {filteredBookmarks.map((bookmark) => (
                    <BookmarkItem
                      key={bookmark.id}
                      bookmark={bookmark}
                      showChannel
                      showFolder
                      onJumpToMessage={handleJumpToMessage}
                    />
                  ))}

                  {/* Load more */}
                  {hasMore && (
                    <div className="py-4 text-center">
                      <Button variant="outline" onClick={loadMore}>
                        Load more
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </div>

      {/* Add to Folder Modal */}
      <AddToFolderModal />
    </div>
  );
}

// ============================================================================
// Slide-over Panel Components (using Radix Dialog)
// ============================================================================

const SlideOverOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
SlideOverOverlay.displayName = "SlideOverOverlay";

const SlideOverContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <SlideOverOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-y-0 right-0 z-50 h-full w-full bg-background shadow-lg duration-300",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
        "sm:max-w-2xl",
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SlideOverContent.displayName = "SlideOverContent";

// ============================================================================
// Bookmarks Panel (Slide-over)
// ============================================================================

export function BookmarksPanel({
  open,
  onOpenChange,
  onJumpToMessage,
  className,
}: BookmarksPanelProps) {
  const { isOpen, close } = useBookmarkPanel();

  // Use controlled or internal state
  const isPanelOpen = open !== undefined ? open : isOpen;
  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else if (!newOpen) {
      close();
    }
  };

  return (
    <DialogPrimitive.Root open={isPanelOpen} onOpenChange={handleOpenChange}>
      <SlideOverContent className={className}>
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <BookmarkIcon filled className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-semibold">Saved Items</h2>
          </div>
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <XMarkIcon className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogPrimitive.Close>
        </div>

        {/* Content */}
        <div className="h-[calc(100vh-57px)]">
          <BookmarksPanelContent onJumpToMessage={onJumpToMessage} />
        </div>
      </SlideOverContent>
    </DialogPrimitive.Root>
  );
}

// ============================================================================
// Inline Bookmarks Panel (for embedding in page)
// ============================================================================

export interface InlineBookmarksPanelProps {
  onJumpToMessage?: (messageId: string, channelId: string) => void;
  className?: string;
}

export function InlineBookmarksPanel({
  onJumpToMessage,
  className,
}: InlineBookmarksPanelProps) {
  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      {/* Header */}
      <div className="border-b px-4 py-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <BookmarkIcon filled className="h-5 w-5 text-yellow-500" />
          Saved Items
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <BookmarksPanelContent onJumpToMessage={onJumpToMessage} />
      </div>
    </div>
  );
}

export default BookmarksPanel;
