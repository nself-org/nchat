"use client";

import * as React from "react";
import {
  Clock,
  TrendingUp,
  X,
  Hash,
  User,
  FileIcon,
  Search,
  Trash2,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useSearchStore,
  type RecentSearch,
  type HasFilter,
} from "@/stores/search-store";

// ============================================================================
// Types
// ============================================================================

export interface SearchSuggestionsProps {
  /** Additional class names */
  className?: string;
  /** Callback when a suggestion is selected */
  onSelect?: (query: string, filters?: Partial<{ has: HasFilter[] }>) => void;
  /** Callback when a quick action is selected */
  onQuickAction?: (action: QuickAction) => void;
  /** Whether to show the popular searches section */
  showPopular?: boolean;
  /** Whether to show the quick actions section */
  showQuickActions?: boolean;
  /** Maximum height of the suggestions container */
  maxHeight?: number | string;
}

export type QuickAction =
  | "search-messages"
  | "search-files"
  | "search-people"
  | "search-channels"
  | "search-links"
  | "search-images";

// ============================================================================
// Quick Action Configuration
// ============================================================================

const quickActions: {
  id: QuickAction;
  label: string;
  icon: React.ElementType;
  query?: string;
  filters?: { has: HasFilter[] };
}[] = [
  { id: "search-messages", label: "Search messages", icon: Search },
  {
    id: "search-files",
    label: "Search files",
    icon: FileIcon,
    filters: { has: ["file"] },
  },
  { id: "search-people", label: "Find people", icon: User },
  { id: "search-channels", label: "Browse channels", icon: Hash },
  {
    id: "search-links",
    label: "Find links",
    icon: Sparkles,
    filters: { has: ["link"] },
  },
  {
    id: "search-images",
    label: "Find images",
    icon: Sparkles,
    filters: { has: ["image"] },
  },
];

// ============================================================================
// Popular Searches (Static for now, could be API-driven)
// ============================================================================

const popularSearches = [
  "meeting notes",
  "project update",
  "design review",
  "bug fix",
  "deployment",
];

// ============================================================================
// Main Component
// ============================================================================

export function SearchSuggestions({
  className,
  onSelect,
  onQuickAction,
  showPopular = true,
  showQuickActions = true,
  maxHeight = 400,
}: SearchSuggestionsProps) {
  const recentSearches = useSearchStore((state) => state.recentSearches);
  const removeRecentSearch = useSearchStore(
    (state) => state.removeRecentSearch,
  );
  const clearRecentSearches = useSearchStore(
    (state) => state.clearRecentSearches,
  );

  const handleSelectRecent = (search: RecentSearch) => {
    onSelect?.(search.query, search.filters);
  };

  const handleSelectPopular = (query: string) => {
    onSelect?.(query);
  };

  const handleQuickAction = (action: (typeof quickActions)[0]) => {
    if (action.filters) {
      onSelect?.("", action.filters);
    }
    onQuickAction?.(action.id);
  };

  const handleRemoveRecent = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeRecentSearch(id);
  };

  return (
    <ScrollArea style={{ maxHeight }} className={cn("px-2", className)}>
      <div className="space-y-6 py-2">
        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <section>
            <div className="mb-2 flex items-center justify-between px-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                Recent searches
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearRecentSearches}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Clear all
              </Button>
            </div>

            <div className="space-y-1">
              {recentSearches.map((search) => (
                <RecentSearchItem
                  key={search.id}
                  search={search}
                  onClick={() => handleSelectRecent(search)}
                  onRemove={(e) => handleRemoveRecent(e, search.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Quick Actions */}
        {showQuickActions && (
          <section>
            <div className="mb-2 flex items-center gap-2 px-2 text-sm font-medium text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              Quick actions
            </div>

            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <QuickActionButton
                  key={action.id}
                  icon={action.icon}
                  label={action.label}
                  onClick={() => handleQuickAction(action)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Popular Searches */}
        {showPopular && (
          <section>
            <div className="mb-2 flex items-center gap-2 px-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Popular searches
            </div>

            <div className="flex flex-wrap gap-2 px-2">
              {popularSearches.map((query) => (
                <Button
                  key={query}
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSelectPopular(query)}
                  className="h-7 px-2.5 text-xs"
                >
                  {query}
                </Button>
              ))}
            </div>
          </section>
        )}

        {/* Suggested Filters */}
        <section>
          <div className="mb-2 flex items-center gap-2 px-2 text-sm font-medium text-muted-foreground">
            <Search className="h-4 w-4" />
            Try searching for
          </div>

          <div className="space-y-1 px-2">
            <SuggestedFilter
              label="has:file"
              description="Messages with file attachments"
              onClick={() => onSelect?.("", { has: ["file"] })}
            />
            <SuggestedFilter
              label="has:link"
              description="Messages with links"
              onClick={() => onSelect?.("", { has: ["link"] })}
            />
            <SuggestedFilter
              label="has:code"
              description="Messages with code snippets"
              onClick={() => onSelect?.("", { has: ["code"] })}
            />
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}

// ============================================================================
// Recent Search Item
// ============================================================================

interface RecentSearchItemProps {
  search: RecentSearch;
  onClick: () => void;
  onRemove: (e: React.MouseEvent) => void;
}

function RecentSearchItem({
  search,
  onClick,
  onRemove,
}: RecentSearchItemProps) {
  const timeAgo = formatDistanceToNow(new Date(search.timestamp), {
    addSuffix: true,
  });

  // Count active filters
  const filterCount = Object.values(search.filters).reduce((count, val) => {
    if (Array.isArray(val)) return count + val.length;
    if (val) return count + 1;
    return count;
  }, 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-2 rounded-md px-2 py-1.5",
        "text-sm transition-colors hover:bg-accent",
      )}
    >
      <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-left">{search.query}</span>
      {filterCount > 0 && (
        <span className="shrink-0 text-xs text-muted-foreground">
          +{filterCount} filter{filterCount !== 1 ? "s" : ""}
        </span>
      )}
      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo}</span>
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          "shrink-0 rounded-full p-0.5 opacity-0 transition-opacity",
          "hover:bg-muted-foreground/20 group-hover:opacity-100",
        )}
        aria-label="Remove from recent searches"
      >
        <X className="h-3 w-3" />
      </button>
    </button>
  );
}

// ============================================================================
// Quick Action Button
// ============================================================================

interface QuickActionButtonProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}

function QuickActionButton({
  icon: Icon,
  label,
  onClick,
}: QuickActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg border p-3 text-left",
        "transition-colors hover:border-accent hover:bg-accent",
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="text-sm">{label}</span>
    </button>
  );
}

// ============================================================================
// Suggested Filter
// ============================================================================

interface SuggestedFilterProps {
  label: string;
  description: string;
  onClick: () => void;
}

function SuggestedFilter({
  label,
  description,
  onClick,
}: SuggestedFilterProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-md py-1.5",
        "text-sm transition-colors hover:bg-accent",
      )}
    >
      <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
        {label}
      </code>
      <span className="min-w-0 flex-1 truncate text-muted-foreground">
        {description}
      </span>
    </button>
  );
}

// ============================================================================
// Compact Suggestions (for inline use)
// ============================================================================

export interface CompactSuggestionsProps {
  className?: string;
  onSelect?: (query: string) => void;
  maxItems?: number;
}

export function CompactSuggestions({
  className,
  onSelect,
  maxItems = 5,
}: CompactSuggestionsProps) {
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
          onClick={() => onSelect?.(search.query)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1",
            "text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          <span className="truncate">{search.query}</span>
        </button>
      ))}
    </div>
  );
}

export default SearchSuggestions;
