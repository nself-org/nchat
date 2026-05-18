"use client";

/**
 * BookmarkList Component
 *
 * Displays a list of bookmarked messages with filtering, sorting, and actions.
 * Supports collections, tags, search, and various view modes.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark,
  BookmarkCheck,
  Search,
  Filter,
  Tag,
  Folder,
  Calendar,
  Hash,
  MessageSquare,
  MoreVertical,
  Trash2,
  Edit,
  FolderPlus,
  Download,
  Grid,
  List,
  SortAsc,
  SortDesc,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  useBookmarks,
  useBookmarkMutations,
  useBookmarkCollections,
  useBookmarkExport,
} from "@/hooks/use-bookmarks";
import { useJumpToMessage } from "@/hooks/use-messages";
import type {
  BookmarkFilter,
  BookmarkSortBy,
  BookmarkExportFormat,
} from "@/types/bookmark";
// formatRelativeTime is defined locally at the bottom of this file

interface BookmarkListProps {
  className?: string;
  showFilters?: boolean;
  showStats?: boolean;
  viewMode?: "list" | "grid";
  defaultCollection?: string;
}

export function BookmarkList({
  className,
  showFilters = true,
  showStats = true,
  viewMode: initialViewMode = "list",
}: BookmarkListProps) {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<BookmarkFilter>({});
  const [sortBy, setSortBy] = useState<BookmarkSortBy>("bookmarked_at_desc");
  const [viewMode, setViewMode] = useState<"list" | "grid">(initialViewMode);
  const [selectedBookmarks, setSelectedBookmarks] = useState<string[]>([]);

  // Hooks
  const { bookmarks, loading, loadMore } = useBookmarks(
    { ...filter, searchQuery: searchQuery || undefined },
    sortBy,
  );
  const { collections } = useBookmarkCollections();
  const { removeBookmark, batchRemoveBookmarks } = useBookmarkMutations();
  const { jumpToMessage } = useJumpToMessage();
  const { exportBookmarks } = useBookmarkExport();

  // Computed
  const channels = useMemo(() => {
    const channelMap = new Map();
    bookmarks.forEach((b) => {
      if (!channelMap.has(b.message.channel_id)) {
        channelMap.set(b.message.channel_id, {
          id: b.message.channel_id,
          name: b.message.channel.name,
        });
      }
    });
    return Array.from(channelMap.values());
  }, [bookmarks]);

  const tags = useMemo(() => {
    const tagSet = new Set<string>();
    bookmarks.forEach((b) => {
      b.tags?.forEach((tag: string) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [bookmarks]);

  // Handlers
  const handleRemove = async (bookmarkId: string) => {
    await removeBookmark(bookmarkId);
  };

  const handleBatchRemove = async () => {
    await batchRemoveBookmarks(selectedBookmarks);
    setSelectedBookmarks([]);
  };

  const handleJumpToMessage = (messageId: string, channelId: string) => {
    jumpToMessage(messageId, channelId);
  };

  const handleExport = async (format: BookmarkExportFormat) => {
    await exportBookmarks(format, {
      format,
      includeContent: true,
      includeAttachments: true,
      includeMetadata: true,
    });
  };

  const toggleSelection = (bookmarkId: string) => {
    setSelectedBookmarks((prev) =>
      prev.includes(bookmarkId)
        ? prev.filter((id) => id !== bookmarkId)
        : [...prev, bookmarkId],
    );
  };

  const clearFilters = () => {
    setFilter({});
    setSearchQuery("");
  };

  if (loading && bookmarks.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading bookmarks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bookmark className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-xl font-semibold">Bookmarks</h2>
              <p className="text-sm text-muted-foreground">
                {bookmarks.length}{" "}
                {bookmarks.length === 1 ? "bookmark" : "bookmarks"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center gap-1 rounded-lg border p-1">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-7 px-2"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-7 px-2"
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>

            {/* Export menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("json")}>
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Batch actions */}
            {selectedBookmarks.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchRemove}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {selectedBookmarks.length}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      {showFilters && (
        <div className="space-y-3 border-b px-6 py-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search bookmarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-2">
            {/* Channel filter */}
            <Select
              value={filter.channelId || "all"}
              onValueChange={(value) =>
                setFilter((f) => ({
                  ...f,
                  channelId: value === "all" ? undefined : value,
                }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                {channels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Collection filter */}
            <Select
              value={filter.collectionId || "all"}
              onValueChange={(value) =>
                setFilter((f) => ({
                  ...f,
                  collectionId: value === "all" ? undefined : value,
                }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All collections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All collections</SelectItem>
                {collections.map((collection: any) => (
                  <SelectItem key={collection.id} value={collection.id}>
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Tag filter */}
            {tags.length > 0 && (
              <Select
                value={filter.tag || "all"}
                onValueChange={(value) =>
                  setFilter((f) => ({
                    ...f,
                    tag: value === "all" ? undefined : value,
                  }))
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tags</SelectItem>
                  {tags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Sort */}
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as BookmarkSortBy)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bookmarked_at_desc">
                  <div className="flex items-center gap-2">
                    <SortDesc className="h-4 w-4" />
                    Newest first
                  </div>
                </SelectItem>
                <SelectItem value="bookmarked_at_asc">
                  <div className="flex items-center gap-2">
                    <SortAsc className="h-4 w-4" />
                    Oldest first
                  </div>
                </SelectItem>
                <SelectItem value="message_created_at_desc">
                  Message date (newest)
                </SelectItem>
                <SelectItem value="message_created_at_asc">
                  Message date (oldest)
                </SelectItem>
                <SelectItem value="channel_name">Channel name</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear filters */}
            {(filter.channelId ||
              filter.collectionId ||
              filter.tag ||
              searchQuery) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Bookmark list */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {bookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookmarkCheck className="text-muted-foreground/50 mb-4 h-12 w-12" />
              <h3 className="mb-2 text-lg font-medium">No bookmarks found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery ||
                filter.channelId ||
                filter.collectionId ||
                filter.tag
                  ? "Try adjusting your filters"
                  : "Start bookmarking messages to see them here"}
              </p>
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {bookmarks.map((bookmark) => (
                  <motion.div
                    key={bookmark.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    layout
                  >
                    <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {/* Selection checkbox */}
                          <input
                            type="checkbox"
                            checked={selectedBookmarks.includes(bookmark.id)}
                            onChange={() => toggleSelection(bookmark.id)}
                            className="mt-1"
                          />

                          {/* Author avatar */}
                          <div className="flex-shrink-0">
                            {bookmark.message.user.avatar_url ? (
                              <img
                                src={bookmark.message.user.avatar_url}
                                alt={bookmark.message.user.display_name}
                                className="h-10 w-10 rounded-full"
                              />
                            ) : (
                              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full text-primary">
                                {bookmark.message.user.display_name
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            {/* Header */}
                            <div className="mb-1 flex items-center gap-2">
                              <span className="font-medium">
                                {bookmark.message.user.display_name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                in #{bookmark.message.channel.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatRelativeTime(
                                  new Date(bookmark.message.created_at),
                                )}
                              </span>
                            </div>

                            {/* Message content */}
                            <p className="text-foreground/90 mb-2 line-clamp-2 text-sm">
                              {bookmark.message.content}
                            </p>

                            {/* Note */}
                            {bookmark.note && (
                              <div className="bg-muted/50 mb-2 rounded-md p-2">
                                <p className="text-xs text-muted-foreground">
                                  Note: {bookmark.note}
                                </p>
                              </div>
                            )}

                            {/* Tags and metadata */}
                            <div className="flex items-center gap-2">
                              {bookmark.tags?.map((tag: string) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  <Hash className="mr-1 h-3 w-3" />
                                  {tag}
                                </Badge>
                              ))}
                              <span className="text-xs text-muted-foreground">
                                Bookmarked{" "}
                                {formatRelativeTime(
                                  new Date(bookmark.bookmarked_at),
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  handleJumpToMessage(
                                    bookmark.message_id,
                                    bookmark.message.channel_id,
                                  )
                                }
                              >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Jump to message
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit note
                              </DropdownMenuItem>
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <FolderPlus className="mr-2 h-4 w-4" />
                                  Add to collection
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  {collections.map((collection: any) => (
                                    <DropdownMenuItem key={collection.id}>
                                      {collection.name}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleRemove(bookmark.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove bookmark
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            // Grid view
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {bookmarks.map((bookmark) => (
                  <motion.div
                    key={bookmark.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    layout
                  >
                    <Card className="group h-full cursor-pointer transition-shadow hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="flex h-full flex-col">
                          {/* Header */}
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {bookmark.message.user.avatar_url ? (
                                <img
                                  src={bookmark.message.user.avatar_url}
                                  alt={bookmark.message.user.display_name}
                                  className="h-8 w-8 rounded-full"
                                />
                              ) : (
                                <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full text-xs text-primary">
                                  {bookmark.message.user.display_name
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {bookmark.message.user.display_name}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  #{bookmark.message.channel.name}
                                </p>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleJumpToMessage(
                                      bookmark.message_id,
                                      bookmark.message.channel_id,
                                    )
                                  }
                                >
                                  <MessageSquare className="mr-2 h-4 w-4" />
                                  Jump to message
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleRemove(bookmark.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Content */}
                          <p className="text-foreground/90 mb-3 line-clamp-3 flex-1 text-sm">
                            {bookmark.message.content}
                          </p>

                          {/* Footer */}
                          <div className="space-y-2">
                            {bookmark.tags && bookmark.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {bookmark.tags
                                  .slice(0, 2)
                                  .map((tag: string) => (
                                    <Badge
                                      key={tag}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                {bookmark.tags.length > 2 && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    +{bookmark.tags.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {formatRelativeTime(
                                new Date(bookmark.bookmarked_at),
                              )}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Load more */}
          {bookmarks.length > 0 && (
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={loadMore}>
                Load more
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Helper function for relative time formatting
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return date.toLocaleDateString();
  } else if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return "Just now";
  }
}
