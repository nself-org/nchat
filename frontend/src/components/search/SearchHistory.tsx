"use client";

/**
 * SearchHistory - Manage and display search history
 *
 * Features:
 * - Recent searches list with timestamps
 * - Clear all history
 * - Remove individual searches
 * - Re-run previous search
 * - Filter count badges
 * - Export history
 */

import * as React from "react";
import {
  Clock,
  X,
  Trash2,
  Search,
  Download,
  RotateCcw,
  Filter,
  Calendar,
  User,
  Hash,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSearchStore, type RecentSearch } from "@/stores/search-store";

// ============================================================================
// Types
// ============================================================================

export interface SearchHistoryProps {
  /** Maximum number of items to display */
  maxItems?: number;
  /** Callback when a search is selected */
  onSelect?: (search: RecentSearch) => void;
  /** Callback when export is clicked */
  onExport?: (searches: RecentSearch[]) => void;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function SearchHistory({
  maxItems = 50,
  onSelect,
  onExport,
  className,
}: SearchHistoryProps) {
  const recentSearches = useSearchStore((state) => state.recentSearches);
  const removeRecentSearch = useSearchStore(
    (state) => state.removeRecentSearch,
  );
  const clearRecentSearches = useSearchStore(
    (state) => state.clearRecentSearches,
  );
  const loadSavedSearch = useSearchStore((state) => state.loadSavedSearch);

  const displaySearches = recentSearches.slice(0, maxItems);

  const handleSelectSearch = (search: RecentSearch) => {
    // Load the search into the store
    loadSavedSearch({
      id: search.id,
      name: search.query,
      query: search.query,
      filters: {
        fromUsers: search.filters.fromUsers || [],
        inChannels: search.filters.inChannels || [],
        dateRange: search.filters.dateRange || { from: null, to: null },
        has: search.filters.has || [],
        is: search.filters.is || [],
      },
      createdAt: search.timestamp,
    });
    onSelect?.(search);
  };

  const handleRemoveSearch = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeRecentSearch(id);
  };

  const handleExport = () => {
    if (onExport) {
      onExport(recentSearches);
    } else {
      // Default export as JSON
      const dataStr = JSON.stringify(recentSearches, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `search-history-${format(new Date(), "yyyy-MM-dd")}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  if (displaySearches.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-12 text-center",
          className,
        )}
      >
        <Clock className="text-muted-foreground/50 h-12 w-12" />
        <h3 className="mt-4 text-lg font-medium">No search history</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Your recent searches will appear here
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Search History</h2>
          <Badge variant="secondary">{recentSearches.length}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-8 gap-1 px-2"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear all
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear search history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {recentSearches.length}{" "}
                  search
                  {recentSearches.length !== 1 ? "es" : ""} from your history.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={clearRecentSearches}
                  className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
                >
                  Clear history
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Search List */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {displaySearches.map((search) => (
            <SearchHistoryItem
              key={search.id}
              search={search}
              onClick={() => handleSelectSearch(search)}
              onRemove={(e) => handleRemoveSearch(e, search.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// Search History Item
// ============================================================================

interface SearchHistoryItemProps {
  search: RecentSearch;
  onClick: () => void;
  onRemove: (e: React.MouseEvent) => void;
}

function SearchHistoryItem({
  search,
  onClick,
  onRemove,
}: SearchHistoryItemProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  // Calculate filter count
  const filterCount = React.useMemo(() => {
    let count = 0;
    if (search.filters.fromUsers?.length)
      count += search.filters.fromUsers.length;
    if (search.filters.inChannels?.length)
      count += search.filters.inChannels.length;
    if (search.filters.dateRange?.from || search.filters.dateRange?.to)
      count += 1;
    if (search.filters.has?.length) count += search.filters.has.length;
    if (search.filters.is?.length) count += search.filters.is.length;
    return count;
  }, [search.filters]);

  const timeAgo = formatDistanceToNow(new Date(search.timestamp), {
    addSuffix: true,
  });

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg p-3",
        "text-left transition-colors hover:bg-accent",
      )}
    >
      {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
        <Search className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{search.query}</span>
          {filterCount > 0 && (
            <Badge variant="secondary" className="h-5 shrink-0 gap-1 px-1.5">
              <Filter className="h-3 w-3" />
              {filterCount}
            </Badge>
          )}
        </div>

        {/* Filter Summary */}
        {filterCount > 0 && (
          <div className="flex flex-wrap gap-1">
            {search.filters.fromUsers &&
              search.filters.fromUsers.length > 0 && (
                <Badge variant="outline" className="h-5 gap-0.5 px-1.5 text-xs">
                  <User className="h-2.5 w-2.5" />
                  {search.filters.fromUsers.length}
                </Badge>
              )}
            {search.filters.inChannels &&
              search.filters.inChannels.length > 0 && (
                <Badge variant="outline" className="h-5 gap-0.5 px-1.5 text-xs">
                  <Hash className="h-2.5 w-2.5" />
                  {search.filters.inChannels.length}
                </Badge>
              )}
            {(search.filters.dateRange?.from ||
              search.filters.dateRange?.to) && (
              <Badge variant="outline" className="h-5 gap-0.5 px-1.5 text-xs">
                <Calendar className="h-2.5 w-2.5" />
                Date
              </Badge>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span title={format(new Date(search.timestamp), "PPpp")}>
            {timeAgo}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div
        className={cn(
          "flex shrink-0 items-center gap-1 transition-opacity",
          isHovered ? "opacity-100" : "opacity-0",
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          title="Re-run search"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-destructive/10 h-8 w-8 text-destructive hover:text-destructive"
          onClick={onRemove}
          title="Remove from history"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </button>
  );
}

// ============================================================================
// Compact History List
// ============================================================================

export interface CompactSearchHistoryProps {
  maxItems?: number;
  onSelect?: (search: RecentSearch) => void;
  className?: string;
}

export function CompactSearchHistory({
  maxItems = 5,
  onSelect,
  className,
}: CompactSearchHistoryProps) {
  const recentSearches = useSearchStore((state) => state.recentSearches);
  const displaySearches = recentSearches.slice(0, maxItems);

  if (displaySearches.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-1", className)}>
      {displaySearches.map((search) => (
        <button
          key={search.id}
          type="button"
          onClick={() => onSelect?.(search)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5",
            "text-left text-sm transition-colors hover:bg-accent",
          )}
        >
          <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">{search.query}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(search.timestamp), {
              addSuffix: true,
            })}
          </span>
        </button>
      ))}
    </div>
  );
}

export default SearchHistory;
